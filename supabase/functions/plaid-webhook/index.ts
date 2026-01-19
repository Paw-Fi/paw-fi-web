import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-webhook");
}

const SYNC_EVENT_CODES = new Set([
  "SYNC_UPDATES_AVAILABLE",
  "DEFAULT_UPDATE",
  "INITIAL_UPDATE",
  "HISTORICAL_UPDATE",
  "TRANSACTIONS_REMOVED",
]);

interface PlaidWebhookPayload {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: unknown;
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
    const payload = (await req.json().catch(() => null)) as PlaidWebhookPayload | null;
    if (!payload?.item_id) {
      return new Response(JSON.stringify({ error: "item_id is required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { "X-Client-Info": "moneko-plaid-webhook" } },
    });

    const { data: connection } = await supabase
      .from("bank_connections")
      .select("id")
      .eq("provider", PLAID_PROVIDER)
      .eq("provider_item_id", payload.item_id)
      .maybeSingle();

    await supabase.from("bank_webhook_events").insert({
      provider: PLAID_PROVIDER,
      event_type: payload.webhook_type || null,
      event_code: payload.webhook_code || null,
      provider_item_id: payload.item_id,
      bank_connection_id: connection?.id || null,
      payload,
    });

    if (
      connection?.id
      && payload.webhook_type === "TRANSACTIONS"
      && payload.webhook_code
      && SYNC_EVENT_CODES.has(payload.webhook_code)
    ) {
      await supabase.from("bank_sync_jobs").insert({
        bank_connection_id: connection.id,
        provider: PLAID_PROVIDER,
        trigger_source: "webhook",
        payload,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[plaid-webhook] Failed to handle webhook", error);
    return new Response(JSON.stringify({ error: "Failed to process webhook" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
