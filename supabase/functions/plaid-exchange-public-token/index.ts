import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import {
  exchangePublicToken,
  getPlaidAccounts,
  PLAID_PROVIDER,
} from "../shared/plaid-client.ts";
import { encryptSecret } from "../shared/token-encryption.ts";
import { upsertPlaidAccounts } from "../shared/bank-sync.ts";

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

    // Check idempotency - return existing connection if found
    if (body.idempotencyKey) {
      const { data: existingConnection } = await supabase
        .from("bank_connections")
        .select("id, household_id")
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
          .select("id, name, mask, type, subtype, currency, balance_current")
          .eq("bank_connection_id", existingConnection.id);

        return new Response(
          JSON.stringify({
            success: true,
            connectionId: existingConnection.id,
            householdId: existingConnection.household_id,
            accounts: existingAccounts || [],
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

    // Use atomic RPC to create/update connection with household
    // This prevents race conditions where concurrent requests create duplicate households
    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      "upsert_bank_connection_with_household",
      {
        p_user_id: authResult.userId,
        p_provider: PLAID_PROVIDER,
        p_provider_item_id: plaidResponse.item_id,
        p_access_token_encrypted: encryptedToken,
        p_refresh_token_encrypted: null,
        p_expires_at: null,
        p_country_code: body.countryCode?.toUpperCase() || "US",
        p_idempotency_key: body.idempotencyKey || null,
        p_institution_name: body.institutionName || "Bank Account",
        p_institution_logo: body.institutionLogo || null,
        p_metadata: {
          institution_id: body.institutionId || null,
          institution_name: body.institutionName || null,
          institution_logo: body.institutionLogo || null,
        },
      },
    );

    if (upsertError || !upsertResult || upsertResult.length === 0) {
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

    const {
      connection_id: connectionId,
      household_id: householdId,
      is_new_connection: isNewConnection,
    } = upsertResult[0];

    if (isNewConnection) {
      console.log(
        `[plaid-exchange] Created new connection ${connectionId} with household ${householdId}`,
      );
    } else {
      console.log(
        `[plaid-exchange] Updated existing connection ${connectionId}, reusing household ${householdId}`,
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

    return new Response(
      JSON.stringify({
        success: true,
        connectionId: connectionId,
        householdId: householdId,
        accounts: upsertAccountsResult.records,
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
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
