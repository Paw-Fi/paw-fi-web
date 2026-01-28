import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { encryptSecret } from "../shared/token-encryption.ts";
import {
  exchangeTinkAuthorizationCode,
  getTinkAccounts,
  TINK_PROVIDER,
} from "../shared/tink-client.ts";
import { upsertTinkAccounts } from "../shared/bank-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for tink-exchange-auth-code");
}

interface ExchangeRequest {
  code: string;
  state?: string;
  credentialsId?: string;
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
    if (!body?.code) {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-tink-exchange-auth-code" },
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

    // Validate state for CSRF protection
    if (!body.state) {
      return new Response(
        JSON.stringify({ error: "state is required for security validation" }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    // Atomically consume the state (delete and return it in one operation)
    const { data: stateRecord, error: stateError } = await supabase
      .from("tink_auth_states")
      .delete()
      .eq("state", body.state)
      .eq("user_id", authResult.userId)
      .gt("expires_at", new Date().toISOString())
      .select("state")
      .maybeSingle();

    if (stateError) {
      console.error("[tink-exchange] Failed to validate state", stateError);
      return new Response(
        JSON.stringify({ error: "Failed to validate security state" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (!stateRecord) {
      console.warn(
        `[tink-exchange] Invalid or expired state for user ${authResult.userId}`,
      );
      return new Response(
        JSON.stringify({
          error:
            "Invalid or expired security state. Please restart the connection flow.",
        }),
        {
          status: 400,
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
          `[tink-exchange] Idempotent request detected, returning existing connection: ${existingConnection.id}`,
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

    const tokenResponse = await exchangeTinkAuthorizationCode(body.code);
    const encryptedAccess = await encryptSecret(tokenResponse.access_token);
    const encryptedRefresh = tokenResponse.refresh_token
      ? await encryptSecret(tokenResponse.refresh_token)
      : null;
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null;

    // SECURITY: Never use access token material as an identifier.
    // Prefer: user_id from token response > id_hint > credentialsId from callback > random UUID
    const itemId =
      tokenResponse.user_id ||
      tokenResponse.id_hint ||
      body.credentialsId ||
      crypto.randomUUID();

    const providerItemId = itemId.startsWith("tink_")
      ? itemId
      : `tink_${itemId}`;

    // Use atomic RPC to create/update connection with household
    // This prevents race conditions where concurrent requests create duplicate households
    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      "upsert_bank_connection_with_household",
      {
        p_user_id: authResult.userId,
        p_provider: TINK_PROVIDER,
        p_provider_item_id: providerItemId,
        p_access_token_encrypted: encryptedAccess,
        p_refresh_token_encrypted: encryptedRefresh,
        p_expires_at: expiresAt,
        p_country_code: body.countryCode?.toUpperCase() || null,
        p_idempotency_key: body.idempotencyKey || null,
        p_institution_name: body.institutionName || "Bank Account",
        p_institution_logo: body.institutionLogo || null,
        p_metadata: {
          scope: tokenResponse.scope || null,
          institution_name: body.institutionName || null,
          institution_logo: body.institutionLogo || null,
        },
      },
    );

    if (upsertError || !upsertResult || upsertResult.length === 0) {
      console.error(
        "[tink-exchange-auth-code] Failed to upsert connection",
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
        `[tink-exchange] Created new connection ${connectionId} with household ${householdId}`,
      );
    } else {
      console.log(
        `[tink-exchange] Updated existing connection ${connectionId}, reusing household ${householdId}`,
      );
    }

    // Store tokens in bank_connection_tokens table
    if (connectionId) {
      const tokensToUpsert = [
        {
          bank_connection_id: connectionId,
          token_type: "access",
          token_encrypted: encryptedAccess,
          expires_at: expiresAt,
        },
      ];

      if (encryptedRefresh) {
        tokensToUpsert.push({
          bank_connection_id: connectionId,
          token_type: "refresh",
          token_encrypted: encryptedRefresh,
          expires_at: null,
        });
      }

      await supabase.from("bank_connection_tokens").upsert(tokensToUpsert, {
        onConflict: "bank_connection_id,token_type",
      });
    }

    const accounts = await getTinkAccounts(tokenResponse.access_token);
    const upsertAccountsResult = await upsertTinkAccounts({
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
    console.error("[tink-exchange-auth-code] Unexpected error", error);
    return new Response(
      JSON.stringify({
        error: "Failed to exchange Tink code",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
