import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { TINK_PROVIDER } from "../shared/tink-client.ts";
import {
  verifyTinkWebhook,
  generateWebhookEventId,
} from "../shared/webhook-verification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Skip verification ONLY if explicitly set via SKIP_WEBHOOK_VERIFICATION=true
// This is secure by default - verification is required unless explicitly disabled
const SKIP_WEBHOOK_VERIFICATION =
  Deno.env.get("SKIP_WEBHOOK_VERIFICATION")?.toLowerCase() === "true";

if (SKIP_WEBHOOK_VERIFICATION) {
  console.warn(
    "[tink-webhook] WARNING: Webhook verification is disabled. This should only be used in development.",
  );
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for tink-webhook");
}

// Events that trigger transaction sync
const SYNC_EVENTS = new Set([
  "account-transactions:modified",
  "account-booked-transactions:modified",
  "account-transactions:deleted",
  "refresh:finished",
]);

// Events that indicate credentials need re-authentication
const REAUTH_EVENTS = new Set([
  "credentials:status-updated", // Check status field for AUTHENTICATION_ERROR
  "credentials:deleted",
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
    status?: string;
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

  // Get raw body for signature verification
  const rawBody = await req.text();

  // Verify webhook signature (required by default, can be disabled via SKIP_WEBHOOK_VERIFICATION=true)
  if (!SKIP_WEBHOOK_VERIFICATION) {
    const tinkSignatureHeader = req.headers.get("X-Tink-Signature");
    const verificationResult = await verifyTinkWebhook(
      rawBody,
      tinkSignatureHeader,
    );

    if (!verificationResult.valid) {
      console.error(
        "[tink-webhook] Signature verification failed:",
        verificationResult.error,
      );
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      "[tink-webhook] Signature verified successfully, timestamp:",
      verificationResult.timestamp,
    );
  }

  try {
    const payload = JSON.parse(rawBody) as TinkWebhookPayload | null;
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

    // Look up the connection
    const { data: connection } = await supabase
      .from("bank_connections")
      .select("id, status")
      .eq("provider", TINK_PROVIDER)
      .eq("provider_item_id", providerItemId)
      .maybeSingle();

    // Log the webhook event
    await supabase.from("bank_webhook_events").insert({
      provider: TINK_PROVIDER,
      event_type: payload.event,
      event_code: payload.content?.credentialsId || null,
      provider_item_id: providerItemId,
      bank_connection_id: connection?.id || null,
      payload,
    });

    // Handle reauth events
    if (REAUTH_EVENTS.has(payload.event)) {
      // Check if credentials status indicates authentication error
      const needsReauth =
        payload.event === "credentials:deleted" ||
        (payload.event === "credentials:status-updated" &&
          payload.content?.status === "AUTHENTICATION_ERROR");

      if (needsReauth && connection?.id) {
        await supabase
          .from("bank_connections")
          .update({
            status: "needs_reauth",
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
        console.log(
          `[tink-webhook] Marked connection ${connection.id} as needs_reauth (${payload.event})`,
        );
      }
    }

    // Handle sync events - create sync job
    if (connection?.id && SYNC_EVENTS.has(payload.event)) {
      // Generate idempotency key for webhook (async - uses content hash)
      const webhookEventId = await generateWebhookEventId(
        "tink",
        payload as Record<string, unknown>,
      );

      // Check idempotency using database function
      const { data: isDuplicate } = await supabase.rpc(
        "check_webhook_idempotency",
        {
          p_webhook_event_id: webhookEventId,
        },
      );

      if (isDuplicate) {
        console.log(
          `[tink-webhook] Duplicate webhook detected, skipping: ${webhookEventId}`,
        );
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      // Create sync job with webhook_event_id for idempotency
      const { error: insertError } = await supabase
        .from("bank_sync_jobs")
        .insert({
          bank_connection_id: connection.id,
          provider: TINK_PROVIDER,
          trigger_source: "webhook",
          webhook_event_id: webhookEventId,
          payload,
        });

      if (insertError) {
        // If it's a unique constraint violation, it's a duplicate
        if (insertError.code === "23505") {
          console.log(
            `[tink-webhook] Duplicate sync job detected via constraint: ${webhookEventId}`,
          );
          return new Response(
            JSON.stringify({ received: true, duplicate: true }),
            {
              status: 200,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
        console.error("[tink-webhook] Failed to create sync job:", insertError);
      } else {
        console.log(
          `[tink-webhook] Created sync job for connection ${connection.id}, event: ${webhookEventId}`,
        );
      }
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
