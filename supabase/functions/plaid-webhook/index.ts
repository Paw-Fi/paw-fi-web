import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import { mergePlaidSyncStatusMetadata } from "../shared/plaid-sync-status.ts";
import { classifyPlaidItemWebhook } from "../shared/plaid-update-mode.ts";
import { verifyPlaidWebhook } from "../shared/webhook-verification.ts";

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
      .select(
        "id, status, metadata, provider_item_id, cursor_generation, last_webhook_received_at",
      )
      .eq("provider", PLAID_PROVIDER)
      .eq("provider_item_id", payload.item_id)
      .maybeSingle();

    if (!connection?.id && payload.webhook_type === "TRANSACTIONS") {
      console.warn(
        `[plaid-webhook] No bank connection mapping for item ${payload.item_id}. Webhook will be logged but no sync job will be enqueued.`,
      );
    }

    const { data: insertedWebhookEvent, error: webhookInsertError } =
      await supabase
        .from("bank_webhook_events")
        .insert({
          provider: PLAID_PROVIDER,
          event_type: payload.webhook_type || null,
          event_code: payload.webhook_code || null,
          provider_item_id: payload.item_id,
          bank_connection_id: connection?.id || null,
          payload,
        })
        .select("id")
        .single();

    if (webhookInsertError) {
      throw webhookInsertError;
    }

    if (connection?.id && payload.webhook_type === "TRANSACTIONS") {
      await supabase
        .from("bank_connections")
        .update({
          metadata: mergePlaidSyncStatusMetadata(connection.metadata, {
            webhookCode: payload.webhook_code,
            initialUpdateComplete: payload.initial_update_complete,
            historicalUpdateComplete: payload.historical_update_complete,
          }),
          last_webhook_received_at: new Date().toISOString(),
          item_health_state: "healthy",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      const enqueueResult = await enqueuePlaidSyncJob({
        supabase,
        connectionId: connection.id,
        triggerSource: "plaid_transactions_webhook",
        payload: {
          webhookCode: payload.webhook_code || null,
          initialUpdateComplete: payload.initial_update_complete ?? null,
          historicalUpdateComplete: payload.historical_update_complete ?? null,
        },
        webhookEventId: insertedWebhookEvent?.id || null,
      });

      console.log(
        "[plaid-webhook] Queued transactions sync",
        JSON.stringify({
          connectionId: connection.id,
          duplicate: enqueueResult.duplicate,
          enqueued: enqueueResult.enqueued,
          itemId: payload.item_id || null,
          webhookCode: payload.webhook_code || null,
          webhookEventId: insertedWebhookEvent?.id || null,
        }),
      );
    }

    if (payload.webhook_type === "ITEM") {
      const action = classifyPlaidItemWebhook({
        webhookCode: payload.webhook_code,
        errorCode: payload.error?.error_code,
      });

      if (action && connection?.id) {
        const { error: updateError } = await supabase
          .from("bank_connections")
          .update({
            status: action.status,
            item_status: action.itemStatus,
            item_health_state: action.itemHealthState,
            relink_state: action.relinkState,
            error_code: action.relinkState == null
              ? null
              : payload.error?.error_code || payload.webhook_code || null,
            error_message: action.relinkState == null
              ? null
              : payload.error?.error_message || null,
            last_webhook_received_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        if (updateError) {
          throw updateError;
        }

        console.log(
          "[plaid-webhook] Applied item webhook action",
          JSON.stringify({
            connectionId: connection.id,
            itemId: payload.item_id || null,
            relinkState: action.relinkState,
            status: action.status,
            webhookCode: payload.webhook_code || null,
          }),
        );

        if (action.shouldEnqueueSync) {
          await enqueuePlaidSyncJob({
            supabase,
            connectionId: connection.id,
            triggerSource: "plaid_item_webhook",
            payload: {
              webhookCode: payload.webhook_code || null,
            },
            webhookEventId: insertedWebhookEvent?.id || null,
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[plaid-webhook] Failed to handle webhook", error);
    await reportEdgeFunctionError({
      functionName: "plaid-webhook",
      error,
      context: {
        provider_item_id: (() => {
          try {
            const parsed = JSON.parse(rawBody) as PlaidWebhookPayload;
            return parsed.item_id ?? null;
          } catch {
            return null;
          }
        })(),
      },
    });
    return new Response(
      JSON.stringify({ error: "Failed to process webhook" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
