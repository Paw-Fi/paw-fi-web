import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess } from "../shared/accounts.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  canUsePlaidBankSync,
  loadPlaidUserAccessState,
} from "../shared/plaid-access.ts";
import {
  derivePlaidLinkProducts,
  resolvePlaidTransactionsDaysRequested,
} from "../shared/plaid-lifecycle.ts";
import { resolvePlaidCountryCode } from "../shared/plaid-country.ts";
import { sanitizeOptionalUuid } from "../shared/bank-sync.ts";
import {
  createPlaidLinkToken,
  getPlaidConfig,
  PLAID_PROVIDER,
} from "../shared/plaid-client.ts";
import {
  PLAID_NEW_ACCOUNTS_RELINK_STATE,
  shouldEnablePlaidAccountSelection,
} from "../shared/plaid-update-mode.ts";
import { decryptSecret } from "../shared/token-encryption.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-create-link-token");
}

interface CreateLinkTokenRequest {
  connectionId?: string;
  transactionsDaysRequested?: number;
  countryCode?: string;
  platform?: string;
  institutionId?: string;
  targetHouseholdId?: string;
  updateReason?: string;
  mode?: "new" | "update" | "reconnect" | "duplicate_blocked";
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
    const body = (await req.json().catch(() => ({}))) as CreateLinkTokenRequest;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-plaid-create-link-token" },
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

    if (!canUsePlaidBankSync(accessState)) {
      return new Response(
        JSON.stringify({
          error:
            "Bank sync is available during an active trial or with an active paid plan.",
          errorCode: "plaid_subscription_required",
        }),
        {
          status: 403,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

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

    let accessToken: string | undefined;
    let connectionCountryCode: string | undefined;
    let resolvedConnectionId = body.connectionId?.trim() || undefined;
    let modeUsed =
      body.mode ?? (resolvedConnectionId != null ? "update" : "new");
    let relinkState = body.updateReason?.trim() || undefined;

    const requestedInstitutionId = body.institutionId?.trim();
    if (!resolvedConnectionId && (requestedInstitutionId?.length ?? 0) > 0) {
      let duplicateQuery = supabase
        .from("bank_connections")
        .select(
          "id, user_id, provider, status, relink_state, country_code, access_token_encrypted, plaid_access_token_encrypted",
        )
        .eq("user_id", authResult.userId)
        .eq("provider", PLAID_PROVIDER)
        .eq("metadata->>institution_id", requestedInstitutionId!)
        .is("removed_at", null)
        .in("status", ["active", "needs_reauth"]);

      duplicateQuery = targetHouseholdId
        ? duplicateQuery.eq("household_id", targetHouseholdId)
        : duplicateQuery.is("household_id", null);

      const { data: duplicateConnection, error: duplicateError } =
        await duplicateQuery
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateConnection?.id) {
        resolvedConnectionId = duplicateConnection.id;
        relinkState = duplicateConnection.relink_state?.trim() || relinkState;
        modeUsed =
          duplicateConnection.status === "needs_reauth"
            ? "reconnect"
            : "update";
      }
    }

    if (!resolvedConnectionId && !accessState.isConvertedPaidUser) {
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

    if (resolvedConnectionId) {
      const { data: connection, error: connectionError } = await supabase
        .from("bank_connections")
        .select(
          "id, user_id, provider, household_id, country_code, relink_state, access_token_encrypted, plaid_access_token_encrypted",
        )
        .eq("id", resolvedConnectionId)
        .eq("provider", PLAID_PROVIDER)
        .maybeSingle();

      if (connectionError) {
        console.error(
          "[plaid-create-link-token] Failed to load connection",
          connectionError,
        );
        await reportEdgeFunctionError({
          functionName: "plaid-create-link-token",
          error: connectionError,
          context: {
            phase: "load_existing_connection",
            connection_id: resolvedConnectionId,
            user_id: authResult.userId,
          },
        });
        return new Response(
          JSON.stringify({ error: "Failed to load connection" }),
          {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      if (!connection || connection.user_id !== authResult.userId) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      if (
        body.targetHouseholdId &&
        targetHouseholdId !== (connection.household_id ?? null)
      ) {
        return new Response(
          JSON.stringify({
            error: "Bank connection belongs to a different wallet space",
            errorCode: "connection_scope_mismatch",
          }),
          {
            status: 409,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      const encryptedToken =
        connection.access_token_encrypted ||
        connection.plaid_access_token_encrypted;
      if (encryptedToken) {
        accessToken = await decryptSecret(encryptedToken);
      }

      connectionCountryCode =
        connection.country_code?.trim().toUpperCase() || undefined;
      relinkState = connection.relink_state?.trim() || relinkState;
    }

    const products = derivePlaidLinkProducts(getPlaidConfig().products, {
      isConvertedPaidUser: accessState.isConvertedPaidUser,
      enableRecurringTransactionsProduct:
        Deno.env.get("PLAID_ENABLE_RECURRING_FOR_PAID")?.toLowerCase() ===
        "true",
    });

    const countryCode = resolvePlaidCountryCode({
      requestedCountryCode: body.countryCode,
      connectionCountryCode,
    });
    const accountSelectionEnabled = shouldEnablePlaidAccountSelection({
      countryCode,
      relinkState,
    });

    const response = await createPlaidLinkToken({
      userId: authResult.userId,
      accessToken,
      products,
      transactionsDaysRequested: accessToken
        ? undefined
        : resolvePlaidTransactionsDaysRequested(body.transactionsDaysRequested),
      countryCodes: countryCode ? [countryCode] : undefined,
      platform: body.platform,
      omitProducts: accessToken != null,
      omitTransactions: accessToken != null,
      update: {
        accountSelectionEnabled,
      },
    });

    const linkCompletionNonce = crypto.randomUUID();
    const { error: sessionError } = await supabase
      .from("plaid_link_update_sessions")
      .insert({
        user_id: authResult.userId,
        connection_id: resolvedConnectionId ?? null,
        nonce: linkCompletionNonce,
        mode: modeUsed,
        expires_at: response.expiration,
      });

    if (sessionError) {
      throw sessionError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        linkToken: response.link_token,
        expiration: response.expiration,
        requestId: response.request_id || null,
        connectionId: resolvedConnectionId,
        updateReason: relinkState || null,
        modeUsed,
        linkCompletionNonce,
        updateCompletionNonce:
          accessToken && resolvedConnectionId ? linkCompletionNonce : null,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-create-link-token] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-create-link-token",
      error,
    });
    return new Response(
      JSON.stringify({
        error: "Failed to create link token",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
