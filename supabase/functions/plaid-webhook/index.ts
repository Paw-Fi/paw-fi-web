import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import { mergePlaidSyncStatusMetadata } from "../shared/plaid-sync-status.ts";
import {
  classifyPlaidItemWebhook,
  PLAID_NEW_ACCOUNTS_RELINK_STATE,
} from "../shared/plaid-update-mode.ts";
import {
  buildPlaidWebhookReplayIdentity,
  isPlaidConnectionTerminalForWebhook,
} from "../shared/plaid-webhook-security.ts";
import { verifyPlaidWebhook } from "../shared/webhook-verification.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const POSTGRES_STATEMENT_TIMEOUT_CODE = "57014";
const WEBHOOK_BUILD_MARKER = "20260721-webhook-operation-probe-v1";
const SUPABASE_HOST = (() => {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).host : null;
  } catch {
    return null;
  }
})();

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "moneko-plaid-webhook" } },
  });
  let rawBody = "";
  let verificationToken: string | null = null;
  let recoveryWebhookEventId: string | null = null;
  let claimedWebhookLockToken: string | null = null;
  let deferWebhookCompletion = false;
  let deferredReason = "deferred_active_sync";
  let operationPhase = "parse_request";
  try {
    const hasInternalSecret =
      req.headers.has("X-Moneko-Internal-Key") ||
      req.headers.has("X-Internal-Service-Secret");
    if (hasInternalSecret) {
      const internalAuth = await authenticateInternalSecret(req);
      if (!internalAuth.success) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: internalAuth.statusCode || 401,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      const recoveryRequest = (await req.json()) as {
        eventId?: string;
        lockToken?: string;
      };
      recoveryWebhookEventId = String(recoveryRequest.eventId || "").trim();
      claimedWebhookLockToken = String(recoveryRequest.lockToken || "").trim();
      if (!recoveryWebhookEventId || !claimedWebhookLockToken) {
        return new Response(
          JSON.stringify({ error: "Invalid recovery claim" }),
          {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }
      operationPhase = "load_recovery_event";
      const { data: storedEvent, error: storedEventError } = await supabase
        .from("bank_webhook_events")
        .select("id, payload")
        .eq("id", recoveryWebhookEventId)
        .eq("provider", PLAID_PROVIDER)
        .eq("recovery_status", "processing")
        .eq("processing_lock_token", claimedWebhookLockToken)
        .is("processed_at", null)
        .maybeSingle();
      if (storedEventError) throw storedEventError;
      if (!storedEvent?.id) {
        return new Response(JSON.stringify({ received: true, missing: true }), {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
      rawBody = JSON.stringify(storedEvent.payload);
    } else {
      rawBody = await req.text();
      verificationToken = req.headers.get("Plaid-Verification");
      if (!SKIP_WEBHOOK_VERIFICATION) {
        const verificationResult = await verifyPlaidWebhook(
          rawBody,
          verificationToken,
        );
        if (!verificationResult.valid) {
          return new Response(
            JSON.stringify({ error: "Invalid webhook signature" }),
            {
              status: 401,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    const payload = JSON.parse(rawBody) as PlaidWebhookPayload | null;

    if (!payload?.item_id) {
      return new Response(JSON.stringify({ error: "item_id is required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // Look up the connection
    operationPhase = "lookup_bank_connection";
    const { data: connection, error: connectionLookupError } = await supabase
      .from("bank_connections")
      .select(
        "id, status, item_status, item_health_state, metadata, provider_item_id, cursor_generation, last_webhook_received_at, removed_at",
      )
      .eq("provider", PLAID_PROVIDER)
      .eq("provider_item_id", payload.item_id)
      .maybeSingle();
    if (connectionLookupError) throw connectionLookupError;

    if (!connection?.id && payload.webhook_type === "TRANSACTIONS") {
      console.warn(
        "[plaid-webhook] No bank connection mapping. Webhook will be logged without a sync job.",
      );
    }

    const verificationReplayKey = await buildPlaidWebhookReplayIdentity({
      rawBody,
      verificationToken,
    });

    let webhookEventId: string | null = recoveryWebhookEventId;
    if (!webhookEventId) {
      operationPhase = "insert_webhook_event";
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
          operationPhase = "lookup_duplicate_webhook_event";
          const { data: existingWebhookEvent, error: existingWebhookError } =
            await supabase
              .from("bank_webhook_events")
              .select("id, processed_at, recovery_status")
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
          if (existingWebhookEvent?.recovery_status === "dead_letter") {
            return new Response(
              JSON.stringify({ received: true, deadLettered: true }),
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
    }

    if (webhookEventId && !recoveryWebhookEventId) {
      operationPhase = "claim_webhook_event";
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
        return new Response(JSON.stringify({ received: false, retry: true }), {
          status: 503,
          headers: {
            ...headers,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        });
      }
    }

    if (!connection?.id) {
      deferWebhookCompletion = true;
      deferredReason = "deferred_missing_connection";
    } else if (recoveryWebhookEventId) {
      operationPhase = "bind_recovery_event_connection";
      const { error: eventConnectionError } = await supabase
        .from("bank_webhook_events")
        .update({ bank_connection_id: connection.id })
        .eq("id", recoveryWebhookEventId)
        .is("bank_connection_id", null);
      if (eventConnectionError) throw eventConnectionError;
    }

    if (connection?.id && isPlaidConnectionTerminalForWebhook(connection)) {
      console.warn(
        "[plaid-webhook] Ignoring webhook for terminal Plaid connection",
        JSON.stringify({
          connectionId: connection.id,
          providerItemId: payload.item_id,
          status: connection.status || null,
          itemStatus: connection.item_status || null,
          itemHealthState: connection.item_health_state || null,
          webhookType: payload.webhook_type || null,
          webhookCode: payload.webhook_code || null,
        }),
      );

      if (webhookEventId) {
        await transitionBankWebhookEvent({
          supabase,
          eventId: webhookEventId,
          lockToken: claimedWebhookLockToken,
          outcome: "completed",
          error: "ignored_terminal_connection",
        });
      }

      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (connection?.id && payload.webhook_type === "TRANSACTIONS") {
      operationPhase = "update_transactions_webhook_state";
      let connectionUpdateQuery = supabase
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
        .eq("id", connection.id)
        .is("removed_at", null)
        .neq("status", "disabled");
      connectionUpdateQuery =
        connection.item_status == null
          ? connectionUpdateQuery.is("item_status", null)
          : connectionUpdateQuery.eq("item_status", connection.item_status);
      const { data: updatedConnections, error: connectionUpdateError } =
        await connectionUpdateQuery.select("id");
      if (connectionUpdateError) throw connectionUpdateError;

      if (updatedConnections?.length === 1) {
        operationPhase = "enqueue_transactions_sync";
        const enqueueResult = await enqueuePlaidSyncJob({
          supabase,
          connectionId: connection.id,
          triggerSource: "plaid_transactions_webhook",
          payload: {
            webhookCode: payload.webhook_code || null,
            initialUpdateComplete: payload.initial_update_complete ?? null,
            historicalUpdateComplete:
              payload.historical_update_complete ?? null,
          },
          webhookEventId,
        });
        deferWebhookCompletion =
          enqueueResult.duplicate && enqueueResult.needsResyncQueued;

        console.log(
          "[plaid-webhook] Queued transactions sync",
          JSON.stringify({
            duplicate: enqueueResult.duplicate,
            enqueued: enqueueResult.enqueued,
            webhookCode: payload.webhook_code || null,
          }),
        );
      }
    }

    if (payload.webhook_type === "ITEM") {
      if (payload.webhook_code === "USER_ACCOUNT_REVOKED" && connection?.id) {
        operationPhase = "apply_account_revoked_webhook";
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
        operationPhase = "update_item_webhook_state";
        let itemUpdateQuery = supabase
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
          .eq("id", connection.id)
          .is("removed_at", null)
          .neq("status", "disabled");
        itemUpdateQuery =
          connection.item_status == null
            ? itemUpdateQuery.is("item_status", null)
            : itemUpdateQuery.eq("item_status", connection.item_status);
        const { data: updatedConnections, error: updateError } =
          await itemUpdateQuery.select("id");

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

        if (action.shouldEnqueueSync && updatedConnections?.length === 1) {
          operationPhase = "enqueue_item_sync";
          const enqueueResult = await enqueuePlaidSyncJob({
            supabase,
            connectionId: connection.id,
            triggerSource: "plaid_item_webhook",
            payload: {
              webhookCode: payload.webhook_code || null,
            },
            webhookEventId,
          });
          deferWebhookCompletion =
            deferWebhookCompletion ||
            (enqueueResult.duplicate && enqueueResult.needsResyncQueued);
        }
      }
    }

    if (webhookEventId && deferWebhookCompletion) {
      operationPhase = "defer_webhook_event";
      await transitionBankWebhookEvent({
        supabase,
        eventId: webhookEventId,
        lockToken: claimedWebhookLockToken,
        outcome: "retry",
        error: deferredReason,
      });
    } else if (webhookEventId) {
      operationPhase = "complete_webhook_event";
      await transitionBankWebhookEvent({
        supabase,
        eventId: webhookEventId,
        lockToken: claimedWebhookLockToken,
        outcome: "completed",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code || "") || null
        : null;
    let schemaProbe: Record<string, unknown> | null = null;
    if (errorCode === "42703") {
      const { error: baseColumnProbeError } = await supabase
        .from("bank_connections")
        .select("id")
        .limit(1);
      const { error: itemStatusProbeError } = await supabase
        .from("bank_connections")
        .select("id, item_status")
        .limit(1);
      schemaProbe = {
        base_select_succeeded: baseColumnProbeError == null,
        base_select_error_code: baseColumnProbeError?.code || null,
        base_select_error_message: baseColumnProbeError?.message || null,
        item_status_select_succeeded: itemStatusProbeError == null,
        item_status_select_error_code: itemStatusProbeError?.code || null,
        item_status_select_error_message: itemStatusProbeError?.message || null,
      };
    }
    console.error("[plaid-webhook] Failed to handle webhook", {
      buildMarker: WEBHOOK_BUILD_MARKER,
      operationPhase,
      supabaseHost: SUPABASE_HOST,
      errorCode,
      errorMessage: error instanceof Error ? error.message : String(error),
      schemaProbe,
    });
    try {
      const parsed = JSON.parse(rawBody) as PlaidWebhookPayload;
      const replayKey = await buildPlaidWebhookReplayIdentity({
        rawBody,
        verificationToken,
      });
      if (parsed.item_id && claimedWebhookLockToken) {
        let failedEventId = recoveryWebhookEventId;
        if (!failedEventId) {
          const { data: failedEvent } = await supabase
            .from("bank_webhook_events")
            .select("id")
            .eq("provider", PLAID_PROVIDER)
            .eq("verification_replay_key", replayKey)
            .eq("processing_lock_token", claimedWebhookLockToken)
            .maybeSingle();
          failedEventId = failedEvent?.id || null;
        }
        if (failedEventId) {
          await transitionBankWebhookEvent({
            supabase,
            eventId: failedEventId,
            lockToken: claimedWebhookLockToken,
            outcome: "retry",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch {
      // Best-effort failure annotation only.
    }
    await reportEdgeFunctionError({
      functionName: "plaid-webhook",
      error,
      context: {
        phase: "process_verified_webhook",
        operation_phase: operationPhase,
        build_marker: WEBHOOK_BUILD_MARKER,
        supabase_host: SUPABASE_HOST,
        schema_probe: schemaProbe,
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

async function transitionBankWebhookEvent(params: {
  supabase: ReturnType<typeof createClient>;
  eventId: string;
  lockToken: string | null;
  outcome: "completed" | "retry";
  error?: string;
  retryDelaySeconds?: number;
}): Promise<void> {
  if (!params.lockToken) {
    throw new Error("Webhook transition requires a live claim");
  }
  const transition = () =>
    params.supabase.rpc("complete_bank_webhook_event_v2", {
      p_event_id: params.eventId,
      p_lock_token: params.lockToken,
      p_outcome: params.outcome,
      p_error: params.error || null,
      p_retry_delay_seconds: params.retryDelaySeconds || null,
    });
  let { data: status, error } = await transition();
  if (error?.code === POSTGRES_STATEMENT_TIMEOUT_CODE) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const retry = await transition();
    status = retry.data;
    error = retry.error;
  }
  if (error) throw error;
  if (status === "lost_claim") {
    throw new Error("Webhook processing claim was lost before completion");
  }
  if (status === "dead_letter") {
    const { data: claimedAlert, error: alertClaimError } = await params.supabase
      .from("bank_webhook_events")
      .update({ dead_letter_alerted_at: new Date().toISOString() })
      .eq("id", params.eventId)
      .is("dead_letter_alerted_at", null)
      .select("id")
      .maybeSingle();
    if (alertClaimError) throw alertClaimError;
    if (claimedAlert?.id) {
      await reportEdgeFunctionError({
        functionName: "plaid-webhook",
        error: new Error(params.error || "Plaid webhook recovery exhausted"),
        context: {
          phase: "webhook_dead_letter",
          webhook_event_id: params.eventId,
        },
      });
    }
  }
}

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

  let connectionUpdateQuery = params.supabase
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
    .eq("id", params.connection.id)
    .is("removed_at", null)
    .neq("status", "disabled");
  connectionUpdateQuery =
    params.connection.item_status == null
      ? connectionUpdateQuery.is("item_status", null)
      : connectionUpdateQuery.eq("item_status", params.connection.item_status);
  const { error: connectionUpdateError } = await connectionUpdateQuery;

  if (connectionUpdateError) {
    throw connectionUpdateError;
  }
}
