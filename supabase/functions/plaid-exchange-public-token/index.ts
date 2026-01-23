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

    const plaidResponse = await exchangePublicToken(body.publicToken);
    const encryptedToken = await encryptSecret(plaidResponse.access_token);

    const payload = {
      user_id: authResult.userId,
      provider: PLAID_PROVIDER,
      plaid_item_id: plaidResponse.item_id,
      provider_item_id: plaidResponse.item_id,
      plaid_access_token_encrypted: encryptedToken,
      access_token_encrypted: encryptedToken,
      cursor: null,
      status: "active",
      metadata: {
        institution_id: body.institutionId || null,
        institution_name: body.institutionName || null,
      },
    };

    const { data: connection, error: connectionError } = await supabase
      .from("bank_connections")
      .upsert(payload, { onConflict: "user_id,provider,provider_item_id" })
      .select("id")
      .single();

    if (connectionError) {
      console.error(
        "[plaid-exchange-public-token] Failed to persist connection",
        connectionError,
      );
      return new Response(
        JSON.stringify({ error: "Failed to save connection" }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    if (connection?.id) {
      await supabase.from("bank_connection_tokens").insert({
        bank_connection_id: connection.id,
        token_type: "access",
        token_encrypted: encryptedToken,
      });
    }

    const accounts = await getPlaidAccounts(plaidResponse.access_token);
    const upsertResult = await upsertPlaidAccounts({
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
