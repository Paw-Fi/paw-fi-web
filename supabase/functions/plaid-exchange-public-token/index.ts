import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess } from "../shared/accounts.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { loadPlaidUserAccessState } from "../shared/plaid-access.ts";
import { canReusePlaidExchangeSnapshot } from "../shared/plaid-exchange-idempotency.ts";
import { computePlaidBillingWindow } from "../shared/plaid-lifecycle.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import {
  exchangePublicToken,
  getPlaidAccounts,
  PLAID_PROVIDER,
} from "../shared/plaid-client.ts";
import { encryptSecret } from "../shared/token-encryption.ts";
import {
  loadLinkedWalletsForBankAccounts,
  sanitizeOptionalUuid,
  upsertBankConnection,
  upsertPlaidAccounts,
} from "../shared/bank-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const INTERNAL_SERVICE_SECRET = Deno.env.get("INTERNAL_SERVICE_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-exchange-public-token");
}

interface ExchangeRequest {
  publicToken: string;
  institutionId?: string;
  institutionName?: string;
  institutionLogo?: string;
  countryCode?: string;
  idempotencyKey?: string;
  targetHouseholdId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = getCorsHeaders(req.headers.get("Origin") || undefined);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = (await req.json()) as ExchangeRequest;
    if (!body?.publicToken) {
      return new Response(
        JSON.stringify({ error: "publicToken is required" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-plaid-exchange-public-token" },
      },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        {
          status: authResult.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const accessState = await loadPlaidUserAccessState(
      supabase,
      authResult.userId,
    );

    const targetHouseholdId = sanitizeOptionalUuid(body.targetHouseholdId);
    if (body.targetHouseholdId && !targetHouseholdId) {
      return new Response(
        JSON.stringify({ error: "Invalid targetHouseholdId" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (
      targetHouseholdId &&
      !(await assertScopeAccess(supabase, authResult.userId, targetHouseholdId))
    ) {
      return new Response(JSON.stringify({ error: "Forbidden scope" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Check idempotency - return existing connection if found
    if (body.idempotencyKey) {
      const { data: existingConnection } = await supabase
        .from("bank_connections")
        .select("id")
        .eq("user_id", authResult.userId)
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();

      if (existingConnection) {
        // Fetch accounts for the existing connection
        const { data: existingAccounts } = await supabase
          .from("bank_accounts")
          .select(
            "id, name, mask, type, subtype, currency, plaid_account_id, provider_account_id",
          )
          .eq("bank_connection_id", existingConnection.id);

        if (!canReusePlaidExchangeSnapshot((existingAccounts || []).length)) {
          console.warn(
            `[plaid-exchange] Idempotent connection ${existingConnection.id} has no stored accounts; continuing with fresh exchange attempt`,
          );
        } else {
          console.log(
            `[plaid-exchange] Idempotent request detected, returning existing connection: ${existingConnection.id}`,
          );

          const linkedWallets = await loadLinkedWalletsForBankAccounts({
            supabase,
            userId: authResult.userId,
            targetHouseholdId,
            bankAccountIds: (existingAccounts || []).map((account: any) =>
              String(account.id || "")
            ),
          });

          return new Response(
            JSON.stringify({
              success: true,
              connectionId: existingConnection.id,
              targetHouseholdId: targetHouseholdId,
              accounts: (existingAccounts || []).map((account: any) => ({
                ...account,
                linkedWallet: linkedWallets.get(String(account.id || "")) || null,
              })),
              idempotent: true,
            }),
            {
              status: 200,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    const plaidResponse = await exchangePublicToken(body.publicToken);
    const encryptedToken = await encryptSecret(plaidResponse.access_token);

    if (!accessState.isConvertedPaidUser) {
      const { data: existingConnectionForItem, error: existingItemError } =
        await supabase
          .from("bank_connections")
          .select("id")
          .eq("user_id", authResult.userId)
          .eq("provider", PLAID_PROVIDER)
          .eq("provider_item_id", plaidResponse.item_id)
          .maybeSingle();

      if (existingItemError) {
        throw existingItemError;
      }

      if (!existingConnectionForItem?.id) {
        const { count, error: connectionCountError } = await supabase
          .from("bank_connections")
          .select("id", { count: "exact", head: true })
          .eq("user_id", authResult.userId)
          .eq("provider", PLAID_PROVIDER)
          .is("removed_at", null)
          .in("status", ["pending", "active", "needs_reauth", "error"]);

        if (connectionCountError) {
          throw connectionCountError;
        }

        if ((count ?? 0) >= 1) {
          return new Response(
            JSON.stringify({
              error:
                "Trial and free users can only keep one active bank connection. Reconnect the existing bank instead.",
            }),
            {
              status: 403,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    let upsertResult;
    try {
      upsertResult = await upsertBankConnection({
        supabase,
        userId: authResult.userId,
        provider: PLAID_PROVIDER,
        providerItemId: plaidResponse.item_id,
        accessTokenEncrypted: encryptedToken,
        refreshTokenEncrypted: null,
        expiresAt: null,
        countryCode: body.countryCode?.toUpperCase() || "US",
        idempotencyKey: body.idempotencyKey || null,
        householdId: targetHouseholdId,
        metadata: {
          institution_id: body.institutionId || null,
          institution_name: body.institutionName || null,
          institution_logo: body.institutionLogo || null,
        },
      });
    } catch (upsertError) {
      console.error(
        "[plaid-exchange-public-token] Failed to upsert connection",
        upsertError,
      );
      return new Response(
        JSON.stringify({ error: "Failed to save connection" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const { connectionId, isNewConnection } = upsertResult;

    if (isNewConnection) {
      console.log(`[plaid-exchange] Created new connection ${connectionId}`);
    } else {
      console.log(
        `[plaid-exchange] Updated existing connection ${connectionId}`,
      );
    }

    // Store token in bank_connection_tokens table
    if (connectionId) {
      await supabase.from("bank_connection_tokens").upsert(
        {
          bank_connection_id: connectionId,
          token_type: "access",
          token_encrypted: encryptedToken,
        },
        { onConflict: "bank_connection_id,token_type" },
      );
    }

    const { data: connectionState, error: connectionStateError } = await supabase
      .from("bank_connections")
      .select(
        "id, item_created_at, cursor_generation, removed_at, status, household_id",
      )
      .eq("id", connectionId)
      .single();

    if (connectionStateError) {
      throw connectionStateError;
    }

    const billingWindow = computePlaidBillingWindow(
      connectionState.item_created_at || new Date().toISOString(),
    );

    await supabase
      .from("bank_connections")
      .update({
        household_id: targetHouseholdId ?? connectionState.household_id ?? null,
        item_created_at:
          connectionState.item_created_at || new Date().toISOString(),
        first_billing_month_start: billingWindow.firstBillingMonthStart,
        second_billing_month_start: billingWindow.secondBillingMonthStart,
        third_billing_month_start: billingWindow.thirdBillingMonthStart,
        scheduled_removal_at: billingWindow.scheduledRemovalAt,
        removed_at: null,
        status: "active",
        item_status: isNewConnection ? "newly_connected" : "reconnected",
        item_health_state: "healthy",
        relink_state: null,
        billing_keep_reason: accessState.isConvertedPaidUser
          ? "active_paid_use"
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    const accounts = await getPlaidAccounts(plaidResponse.access_token);
    const upsertAccountsResult = await upsertPlaidAccounts({
      supabase,
      userId: authResult.userId,
      bankConnectionId: connectionId,
      accounts,
    });

    const linkedWallets = await loadLinkedWalletsForBankAccounts({
      supabase,
      userId: authResult.userId,
      targetHouseholdId,
      bankAccountIds: upsertAccountsResult.records.map((record) => record.id),
    });

    const responseAccounts = upsertAccountsResult.records.map((record) => ({
      ...record,
      linkedWallet: linkedWallets.get(record.id) || null,
    }));

    const enqueueResult = await enqueuePlaidSyncJob({
      supabase,
      connectionId,
      triggerSource: isNewConnection ? "initial_sync" : "reconnect",
      payload: {
        initialSync: isNewConnection,
        targetHouseholdId,
      },
    });

    const shouldKickProcessorNow = enqueueResult.enqueued ||
      enqueueResult.duplicate;
    if (shouldKickProcessorNow && SUPABASE_URL && INTERNAL_SERVICE_SECRET) {
      try {
        console.log(
          `[plaid-exchange] Triggering immediate bank-sync-processor run for connection ${connectionId}`,
        );
        const processorResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/bank-sync-processor`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Service-Secret": INTERNAL_SERVICE_SECRET,
            },
            body: JSON.stringify({}),
          },
        );

        if (!processorResponse.ok) {
          const processorError = await processorResponse.text();
          console.error(
            `[plaid-exchange] Immediate bank-sync-processor trigger failed for connection ${connectionId}: ${processorResponse.status} ${processorError}`,
          );
        } else {
          const processorPayload = await processorResponse.json().catch(() =>
            null
          );
          console.log(
            "[plaid-exchange] Immediate bank-sync-processor response",
            JSON.stringify({
              connectionId,
              payload: processorPayload,
            }),
          );
        }
      } catch (processorError) {
        console.error(
          `[plaid-exchange] Immediate bank-sync-processor trigger threw for connection ${connectionId}`,
          processorError,
        );
      }
    } else if (!INTERNAL_SERVICE_SECRET) {
      console.warn(
        `[plaid-exchange] INTERNAL_SERVICE_SECRET missing, initial sync will wait for cron for connection ${connectionId}`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        connectionId: connectionId,
        targetHouseholdId,
        accounts: responseAccounts,
        initialSyncQueued: enqueueResult.enqueued || enqueueResult.duplicate,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-exchange-public-token] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-exchange-public-token",
      error,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to exchange public token",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
