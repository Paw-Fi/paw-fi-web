import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";

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
      global: { headers: { "X-Client-Info": "moneko-plaid-stale-reconciler" } },
    });

    const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: connections, error } = await supabase
      .from("bank_connections")
      .select(
        "id, last_successful_sync_at, last_webhook_received_at, needs_resync, item_status, item_health_state",
      )
      .eq("provider", PLAID_PROVIDER)
      .eq("status", "active")
      .is("removed_at", null);

    if (error) {
      throw error;
    }

    let enqueued = 0;
    for (const connection of connections || []) {
      const shouldEnqueue = connection.needs_resync === true ||
        !connection.last_successful_sync_at ||
        connection.last_successful_sync_at < staleBefore ||
        !connection.last_webhook_received_at ||
        connection.last_webhook_received_at < staleBefore;

      if (!shouldEnqueue) continue;

      const result = await enqueuePlaidSyncJob({
        supabase,
        connectionId: connection.id,
        triggerSource: "stale_reconciler",
      });

      if (result.enqueued || result.duplicate) {
        enqueued += 1;
      }

      await supabase
        .from("bank_connections")
        .update({
          item_status: "stale_but_healthy",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    return new Response(JSON.stringify({ success: true, enqueued }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[plaid-stale-reconciler] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "plaid-stale-reconciler",
      error,
    });
    return new Response(
      JSON.stringify({ error: "Failed to reconcile stale Plaid items" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
