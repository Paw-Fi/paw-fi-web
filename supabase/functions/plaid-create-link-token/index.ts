import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { createPlaidLinkToken, PLAID_PROVIDER } from "../shared/plaid-client.ts";
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
    const body = (await req.json().catch(() => ({}))) as CreateLinkTokenRequest;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-plaid-create-link-token" } },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        { status: authResult.statusCode || 401, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    let accessToken: string | undefined;
    if (body.connectionId) {
      const { data: connection, error: connectionError } = await supabase
        .from("bank_connections")
        .select("id, user_id, provider, access_token_encrypted, plaid_access_token_encrypted")
        .eq("id", body.connectionId)
        .eq("provider", PLAID_PROVIDER)
        .maybeSingle();

      if (connectionError) {
        console.error("[plaid-create-link-token] Failed to load connection", connectionError);
        return new Response(JSON.stringify({ error: "Failed to load connection" }), {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      if (!connection || connection.user_id !== authResult.userId) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }

      const encryptedToken = connection.access_token_encrypted || connection.plaid_access_token_encrypted;
      if (encryptedToken) {
        accessToken = await decryptSecret(encryptedToken);
      }
    }

    const response = await createPlaidLinkToken({
      userId: authResult.userId,
      accessToken,
      transactionsDaysRequested: body.transactionsDaysRequested,
      countryCodes: body.countryCode ? [body.countryCode] : undefined,
      platform: body.platform,
    });

    return new Response(
      JSON.stringify({ success: true, linkToken: response.link_token, expiration: response.expiration }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[plaid-create-link-token] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Failed to create link token", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});
