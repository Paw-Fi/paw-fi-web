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
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
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
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-tink-exchange-auth-code" } },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        { status: authResult.statusCode || 401, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const tokenResponse = await exchangeTinkAuthorizationCode(body.code);
    const encryptedAccess = await encryptSecret(tokenResponse.access_token);
    const encryptedRefresh = tokenResponse.refresh_token ? await encryptSecret(tokenResponse.refresh_token) : null;
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null;

    const itemId = tokenResponse.user_id || tokenResponse.id_hint || tokenResponse.access_token.slice(0, 24);

    const payload = {
      user_id: authResult.userId,
      provider: TINK_PROVIDER,
      plaid_item_id: itemId.startsWith("tink_") ? itemId : `tink_${itemId}`,
      plaid_access_token_encrypted: encryptedAccess,
      plaid_cursor: null,
      status: "active",
      metadata: {
        tink_refresh_token_encrypted: encryptedRefresh,
        scope: tokenResponse.scope || null,
        expires_at: expiresAt,
      },
    };

    const { data: connection, error: connectionError } = await supabase
      .from("bank_connections")
      .upsert(payload, { onConflict: "user_id,plaid_item_id" })
      .select("id")
      .single();

    if (connectionError) {
      console.error("[tink-exchange-auth-code] Failed to persist connection", connectionError);
      return new Response(JSON.stringify({ error: "Failed to save connection" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const accounts = await getTinkAccounts(tokenResponse.access_token);
    const upsertResult = await upsertTinkAccounts({
      supabase,
      userId: authResult.userId,
      bankConnectionId: connection.id,
      accounts,
    });

    return new Response(
      JSON.stringify({
        success: true,
        connectionId: connection.id,
        accounts: upsertResult.records,
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[tink-exchange-auth-code] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Failed to exchange Tink code", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});
