/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { isServiceRoleRequest } from "../shared/notification-delivery.ts";

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

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (
    !isServiceRoleRequest(req, serviceKey, Deno.env.get("SUPABASE_SECRET_KEYS"))
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    // This v4-owned RPC atomically checks edit access, active pockets, review state,
    // timezone/cycle boundaries, and the one-event-per-user/cycle uniqueness rule.
    const { data, error } = await supabase.rpc(
      "enqueue_pockets_month_review_notifications_v1",
    );
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, result: data ?? {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "[pockets-month-review-notifications] failed",
      error instanceof Error ? error.message : String(error),
    );
    return new Response(
      JSON.stringify({
        error: "Unable to enqueue pocket review notifications",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
