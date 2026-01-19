import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { TINK_PROVIDER } from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for tink-webhook");
}

const SYNC_EVENTS = new Set([
  "account-transactions:modified",
  "account-booked-transactions:modified",
  "account-transactions:deleted",
  "refresh:finished",
]);

interface TinkWebhookPayload {
  event?: string;
  context?: {
    userId?: string;
    externalUserId?: string;
  };
  content?: {
    userId?: string;
    credentialsId?: string;
    account?: { id?: string };
    transactions?: { ids?: string[] };
  };
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
    const payload = (await req
      .json()
      .catch(() => null)) as TinkWebhookPayload | null;
    const providerItemId =
      payload?.context?.userId || payload?.content?.userId || null;

    if (!payload?.event) {
      return new Response(JSON.stringify({ error: "event is required" }), {
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
      global: { headers: { "X-Client-Info": "moneko-tink-webhook" } },
    });

    const { data: connection } = await supabase
      .from("bank_connections")
      .select("id")
      .eq("provider", TINK_PROVIDER)
      .eq("provider_item_id", providerItemId)
      .maybeSingle();

    await supabase.from("bank_webhook_events").insert({
      provider: TINK_PROVIDER,
      event_type: payload.event,
      event_code: payload.content?.credentialsId || null,
      provider_item_id: providerItemId,
      bank_connection_id: connection?.id || null,
      payload,
    });

    if (connection?.id && SYNC_EVENTS.has(payload.event)) {
      await supabase.from("bank_sync_jobs").insert({
        bank_connection_id: connection.id,
        provider: TINK_PROVIDER,
        trigger_source: "webhook",
        payload,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tink-webhook] Failed to handle webhook", error);
    return new Response(
      JSON.stringify({ error: "Failed to process webhook" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
