import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess } from "../shared/accounts.ts";
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
        console.log(
          `[plaid-exchange] Idempotent request detected, returning existing connection: ${existingConnection.id}`,
        );
        // Fetch accounts for the existing connection
        const { data: existingAccounts } = await supabase
          .from("bank_accounts")
          .select(
            "id, name, mask, type, subtype, currency, plaid_account_id, provider_account_id",
          )
          .eq("bank_connection_id", existingConnection.id);

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

    const plaidResponse = await exchangePublicToken(body.publicToken);
    const encryptedToken = await encryptSecret(plaidResponse.access_token);

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

    return new Response(
      JSON.stringify({
        success: true,
        connectionId: connectionId,
        targetHouseholdId,
        accounts: responseAccounts,
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[plaid-exchange-public-token] Unexpected error", error);
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
