import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { createTinkLinkUrl, getTinkConfig, TINK_PROVIDER } from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for tink-create-link-token");
}

interface CreateLinkRequest {
  countryCode?: string;
  locale?: string;
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
    const config = getTinkConfig();
    const body = (await req.json().catch(() => ({}))) as CreateLinkRequest;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-tink-create-link-token" } },
    });

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: authResult.error || "Unauthorized" }),
        { status: authResult.statusCode || 401, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const { link_url, state } = createTinkLinkUrl({
      market: body.countryCode || config.defaultMarket,
      locale: body.locale || config.defaultLocale,
    });

    return new Response(
      JSON.stringify({
        success: true,
        provider: TINK_PROVIDER,
        linkUrl: link_url,
        state,
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[tink-create-link-token] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Failed to create Tink link", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});
