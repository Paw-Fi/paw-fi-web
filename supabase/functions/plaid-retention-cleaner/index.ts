import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const authResult = await authenticateInternalSecret(req);
  if (!authResult.success) {
    return new Response(JSON.stringify({ error: authResult.error || "Unauthorized" }), {
      status: authResult.statusCode || 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-plaid-retention-cleaner" } },
    });

    const webhookCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const auditCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const { error: webhookError } = await supabase
      .from("bank_webhook_events")
      .delete()
      .lt("received_at", webhookCutoff);

    if (webhookError) {
      throw webhookError;
    }

    const { error: auditError } = await supabase
      .from("bank_sync_audit")
      .delete()
      .lt("created_at", auditCutoff);

    if (auditError) {
      throw auditError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[plaid-retention-cleaner] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-retention-cleaner",
      error,
    });
    return new Response(
      JSON.stringify({ error: "Failed to run Plaid retention cleanup" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
