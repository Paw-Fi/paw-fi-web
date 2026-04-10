import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { mergePlaidSyncStatusMetadata } from "../shared/plaid-sync-status.ts";
import {
  generateWebhookEventId,
  verifyPlaidWebhook,
} from "../shared/webhook-verification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Skip verification ONLY if explicitly set via SKIP_WEBHOOK_VERIFICATION=true
// This is secure by default - verification is required unless explicitly disabled
const SKIP_WEBHOOK_VERIFICATION =
  Deno.env.get("SKIP_WEBHOOK_VERIFICATION")?.toLowerCase() === "true";

if (SKIP_WEBHOOK_VERIFICATION) {
  console.warn(
    "[plaid-webhook] WARNING: Webhook verification is disabled. This should only be used in development.",
  );
}

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

// Event codes that indicate the user needs to re-authenticate
const REAUTH_EVENT_CODES = new Set([
  "PENDING_EXPIRATION",
  "USER_PERMISSION_REVOKED",
]);

interface PlaidWebhookPayload {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  initial_update_complete?: boolean;
  historical_update_complete?: boolean;
  error?: {
    error_code?: string;
    error_type?: string;
    error_message?: string;
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
    const plaidVerificationHeader = req.headers.get("Plaid-Verification");
    const verificationResult = await verifyPlaidWebhook(
      rawBody,
      plaidVerificationHeader,
    );

    if (!verificationResult.valid) {
      console.error(
        "[plaid-webhook] Signature verification failed:",
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
      "[plaid-webhook] Signature verified successfully, keyId:",
      verificationResult.keyId,
    );
  }

  try {
    const payload = JSON.parse(rawBody) as PlaidWebhookPayload | null;

    if (!payload?.item_id) {
      return new Response(JSON.stringify({ error: "item_id is required" }), {
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
      global: { headers: { "X-Client-Info": "moneko-plaid-webhook" } },
    });

    // Look up the connection
    const { data: connection } = await supabase
      .from("bank_connections")
      .select("id, status, metadata")
      .eq("provider", PLAID_PROVIDER)
      .eq("provider_item_id", payload.item_id)
      .maybeSingle();

    // Log the webhook event
    await supabase.from("bank_webhook_events").insert({
      provider: PLAID_PROVIDER,
      event_type: payload.webhook_type || null,
      event_code: payload.webhook_code || null,
      provider_item_id: payload.item_id,
      bank_connection_id: connection?.id || null,
      payload,
    });

    if (connection?.id && payload.webhook_type === "TRANSACTIONS") {
      await supabase
        .from("bank_connections")
        .update({
          metadata: mergePlaidSyncStatusMetadata(connection.metadata, {
            webhookCode: payload.webhook_code,
            initialUpdateComplete: payload.initial_update_complete,
            historicalUpdateComplete: payload.historical_update_complete,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    // Handle ITEM webhook type (for reauth and error scenarios)
    if (payload.webhook_type === "ITEM") {
      if (
        payload.webhook_code === "ERROR" &&
        payload.error?.error_code === "ITEM_LOGIN_REQUIRED"
      ) {
        // Mark connection as needs_reauth
        if (connection?.id) {
          await supabase
            .from("bank_connections")
            .update({
              status: "needs_reauth",
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);
          console.log(
            `[plaid-webhook] Marked connection ${connection.id} as needs_reauth (ITEM_LOGIN_REQUIRED)`,
          );
        }
      } else if (
        payload.webhook_code &&
        REAUTH_EVENT_CODES.has(payload.webhook_code)
      ) {
        // Mark connection as needs_reauth for other reauth-related events
        if (connection?.id) {
          await supabase
            .from("bank_connections")
            .update({
              status: "needs_reauth",
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);
          console.log(
            `[plaid-webhook] Marked connection ${connection.id} as needs_reauth (${payload.webhook_code})`,
          );
        }
      }
    }

    // Handle TRANSACTIONS webhook type - create sync job
    if (
      connection?.id &&
      payload.webhook_type === "TRANSACTIONS" &&
      payload.webhook_code &&
      SYNC_EVENT_CODES.has(payload.webhook_code)
    ) {
      // Generate idempotency key for webhook (async - uses content hash)
      const webhookEventId = await generateWebhookEventId(
        "plaid",
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
          `[plaid-webhook] Duplicate webhook detected, skipping: ${webhookEventId}`,
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
          provider: PLAID_PROVIDER,
          trigger_source: "webhook",
          webhook_event_id: webhookEventId,
          payload,
        });

      if (insertError) {
        // If it's a unique constraint violation, it's a duplicate
        if (insertError.code === "23505") {
          console.log(
            `[plaid-webhook] Duplicate sync job detected via constraint: ${webhookEventId}`,
          );
          return new Response(
            JSON.stringify({ received: true, duplicate: true }),
            {
              status: 200,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
        console.error(
          "[plaid-webhook] Failed to create sync job:",
          insertError,
        );
        return new Response(
          JSON.stringify({ error: "Failed to enqueue sync job" }),
          {
            status: 500,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      } else {
        console.log(
          `[plaid-webhook] Created sync job for connection ${connection.id}, event: ${webhookEventId}`,
        );
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[plaid-webhook] Failed to handle webhook", error);
    return new Response(
      JSON.stringify({ error: "Failed to process webhook" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
