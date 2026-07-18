import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import { mergePlaidSyncStatusMetadata } from "../shared/plaid-sync-status.ts";
import {
  classifyPlaidItemWebhook,
  PLAID_NEW_ACCOUNTS_RELINK_STATE,
} from "../shared/plaid-update-mode.ts";
import { verifyPlaidWebhook } from "../shared/webhook-verification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const SKIP_WEBHOOK_VERIFICATION =
  Deno.env.get("SKIP_WEBHOOK_VERIFICATION")?.toLowerCase() === "true" &&
  Deno.env.get("PLAID_ENV")?.toLowerCase() === "sandbox";

if (SKIP_WEBHOOK_VERIFICATION) {
  console.warn(
    "[plaid-webhook] Webhook verification is disabled for sandbox only.",
  );
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for plaid-webhook");
}

interface PlaidWebhookPayload {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  account_id?: string;
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
  const plaidVerificationHeader = req.headers.get("Plaid-Verification");

  // Production webhooks always require Plaid signature verification.
  if (!SKIP_WEBHOOK_VERIFICATION) {
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
  }

  let claimedWebhookLockToken: string | null = null;
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
        "[plaid-webhook] No bank connection mapping. Webhook will be logged without a sync job.",
      );
    }

    const verificationReplayKey = await sha256Hex(
      `${plaidVerificationHeader || "no-verification-header"}.${rawBody}`,
    );

    let webhookEventId: string | null = null;
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
          verification_replay_key: verificationReplayKey,
          processing_error: null,
        })
        .select("id, processed_at")
        .single();

    if (webhookInsertError) {
      if (webhookInsertError.code === "23505") {
        const { data: existingWebhookEvent, error: existingWebhookError } =
          await supabase
            .from("bank_webhook_events")
            .select("id, processed_at")
            .eq("provider", PLAID_PROVIDER)
            .eq("verification_replay_key", verificationReplayKey)
            .maybeSingle();

        if (existingWebhookError) {
          throw existingWebhookError;
        }

        if (existingWebhookEvent?.processed_at) {
          return new Response(
            JSON.stringify({ received: true, duplicate: true }),
            {
              status: 200,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }

        webhookEventId = existingWebhookEvent?.id || null;
      } else {
        throw webhookInsertError;
      }
    } else {
      webhookEventId = insertedWebhookEvent?.id || null;
    }

    if (webhookEventId) {
      claimedWebhookLockToken = crypto.randomUUID();
      const { data: claimed, error: claimError } = await supabase.rpc(
        "claim_bank_webhook_event_v1",
        {
          p_event_id: webhookEventId,
          p_lock_token: claimedWebhookLockToken,
          p_lease_minutes: 15,
        },
      );
      if (claimError) throw claimError;
      if (claimed !== true) {
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
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
        webhookEventId,
      });

      console.log(
        "[plaid-webhook] Queued transactions sync",
        JSON.stringify({
          duplicate: enqueueResult.duplicate,
          enqueued: enqueueResult.enqueued,
          webhookCode: payload.webhook_code || null,
        }),
      );
    }

    if (payload.webhook_type === "ITEM") {
      if (payload.webhook_code === "USER_ACCOUNT_REVOKED" && connection?.id) {
        await applyPlaidAccountRevokedWebhook({
          supabase,
          connection,
          accountId: payload.account_id || null,
        });
      }

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
            error_code:
              action.relinkState == null
                ? null
                : payload.error?.error_code || payload.webhook_code || null,
            error_message:
              action.relinkState == null
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
            webhookEventId,
          });
        }
      }
    }

    if (webhookEventId) {
      await supabase
        .from("bank_webhook_events")
        .update({
          processed_at: new Date().toISOString(),
          processing_started_at: null,
          processing_lock_token: null,
          processing_error: null,
        })
        .eq("id", webhookEventId)
        .eq("processing_lock_token", claimedWebhookLockToken);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[plaid-webhook] Failed to handle webhook", error);
    try {
      const parsed = JSON.parse(rawBody) as PlaidWebhookPayload;
      const replayKey = await sha256Hex(
        `${
          req.headers.get("Plaid-Verification") || "no-verification-header"
        }.${rawBody}`,
      );
      if (parsed.item_id) {
        const supabase = createClient(
          SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false,
            },
          },
        );
        let failureUpdate = supabase
          .from("bank_webhook_events")
          .update({
            processing_error:
              error instanceof Error ? error.message : String(error),
            processing_started_at: null,
            processing_lock_token: null,
          })
          .eq("provider", PLAID_PROVIDER)
          .eq("verification_replay_key", replayKey);
        if (claimedWebhookLockToken) {
          failureUpdate = failureUpdate.eq(
            "processing_lock_token",
            claimedWebhookLockToken,
          );
        }
        await failureUpdate;
      }
    } catch {
      // Best-effort failure annotation only.
    }
    await reportEdgeFunctionError({
      functionName: "plaid-webhook",
      error,
      context: {
        phase: "process_verified_webhook",
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

async function applyPlaidAccountRevokedWebhook(params: {
  supabase: {
    from: (table: string) => any;
  };
  connection: {
    id: string;
    metadata?: unknown;
  };
  accountId?: string | null;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const accountId = String(params.accountId || "").trim();
  const metadata =
    params.connection.metadata && typeof params.connection.metadata === "object"
      ? (params.connection.metadata as Record<string, unknown>)
      : {};
  const revokedAccountIds = Array.isArray(metadata.plaid_revoked_account_ids)
    ? metadata.plaid_revoked_account_ids
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    : [];
  const nextRevokedAccountIds = accountId
    ? Array.from(new Set([...revokedAccountIds, accountId])).sort()
    : revokedAccountIds;

  if (accountId) {
    const bankAccountIds = new Set<string>();
    for (const matchColumn of [
      "provider_account_id",
      "plaid_account_id",
    ] as const) {
      const { data: accounts, error: accountsError } = await params.supabase
        .from("bank_accounts")
        .select("id")
        .eq("bank_connection_id", params.connection.id)
        .eq("provider", PLAID_PROVIDER)
        .eq(matchColumn, accountId);

      if (accountsError) {
        throw accountsError;
      }

      for (const account of (accounts || []) as { id?: string | null }[]) {
        if (account.id) {
          bankAccountIds.add(account.id);
        }
      }
    }

    const matchedBankAccountIds = Array.from(bankAccountIds);
    if (matchedBankAccountIds.length > 0) {
      const { error: accountUpdateError } = await params.supabase
        .from("bank_accounts")
        .update({
          status: "disabled",
          updated_at: nowIso,
        })
        .in("id", matchedBankAccountIds);

      if (accountUpdateError) {
        throw accountUpdateError;
      }

      const { error: rawDeleteError } = await params.supabase
        .from("bank_transaction_raw")
        .delete()
        .in("bank_account_id", matchedBankAccountIds);

      if (rawDeleteError) {
        throw rawDeleteError;
      }

      const { error: expenseUpdateError } = await params.supabase
        .from("expenses")
        .update({
          bank_account_id: null,
          raw_provider_payload: null,
          updated_at: nowIso,
        })
        .eq("provider", PLAID_PROVIDER)
        .in("bank_account_id", matchedBankAccountIds);

      if (expenseUpdateError) {
        throw expenseUpdateError;
      }
    }
  }

  const { error: connectionUpdateError } = await params.supabase
    .from("bank_connections")
    .update({
      status: "active",
      item_status: "account_revoked",
      item_health_state: "degraded",
      relink_state: PLAID_NEW_ACCOUNTS_RELINK_STATE,
      error_code: "USER_ACCOUNT_REVOKED",
      error_message: accountId
        ? "Plaid account access was revoked by the user."
        : "Plaid account access was revoked by the user, but no account id was supplied.",
      metadata: {
        ...metadata,
        plaid_revoked_account_ids: nextRevokedAccountIds,
      },
      last_webhook_received_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", params.connection.id);

  if (connectionUpdateError) {
    throw connectionUpdateError;
  }
}

async function sha256Hex(value: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
