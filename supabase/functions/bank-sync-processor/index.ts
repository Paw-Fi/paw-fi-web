import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import {
  authenticateInternalSecret,
  buildInternalInvokeHeaders,
  resolveAnyInternalFunctionKey,
} from "../shared/auth.ts";
import {
  isTransientBankNetworkError,
  withTransientBankReadRetry,
} from "../shared/bank-retry.ts";
import { buildBankSyncJobFailureUpdate } from "../shared/bank-sync-job-retry.ts";
import { requiresPlaidRelinkForError } from "../shared/plaid-update-mode.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  canUsePlaidBankSync,
  loadPlaidUserAccessState,
} from "../shared/plaid-access.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { removePlaidConnection } from "../shared/plaid-remove.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import { TINK_PROVIDER } from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const INTERNAL_FUNCTION_KEY = Deno.env.get(
  "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
);
const RESOLVED_INTERNAL_FUNCTION_KEY =
  INTERNAL_FUNCTION_KEY || resolveAnyInternalFunctionKey();
const AUTO_BANK_SYNC_ENABLED =
  Deno.env.get("AUTO_BANK_SYNC_ENABLED")?.toLowerCase() !== "false";

// Fixed batch size to prevent DoS attacks
const BATCH_SIZE = 3;
const POSTGRES_STATEMENT_TIMEOUT_CODE = "57014";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for bank-sync-processor");
}

interface BankSyncJob {
  id: string;
  bank_connection_id: string;
  provider: string;
  trigger_source: string;
  job_type?: string;
  status: string;
  attempt_count?: number;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  needs_resync?: boolean;
  access_token_encrypted?: string | null;
  plaid_access_token_encrypted?: string | null;
  removed_at?: string | null;
  status?: string | null;
  item_status?: string | null;
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

  if (!RESOLVED_INTERNAL_FUNCTION_KEY) {
    console.error(
      "[bank-sync-processor] Internal invoke secret not configured",
    );
    await reportEdgeFunctionError({
      functionName: "bank-sync-processor",
      error: new Error("Internal invoke secret not configured"),
      context: { phase: "configuration" },
    });
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  const internalAuth = await authenticateInternalSecret(req);
  if (!internalAuth.success) {
    console.warn("[bank-sync-processor] Unauthorized access attempt");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: internalAuth.statusCode || 401,
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
    if (!AUTO_BANK_SYNC_ENABLED) {
      console.log(
        "[bank-sync-processor] Auto bank sync disabled; skipping job processing",
      );
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "Auto bank sync is disabled",
        }),
        {
          status: 200,
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
      global: { headers: { "X-Client-Info": "moneko-bank-sync-processor" } },
    });

    // Release stuck jobs before fetching new ones (TTL: 60 minutes)
    // Must match or exceed sync endpoint lock durations to avoid requeueing in-flight jobs
    const { data: releasedCount, error: releaseError } = await supabase.rpc(
      "release_stuck_sync_jobs",
      { p_ttl_minutes: 60 },
    );

    if (releaseError) {
      console.error(
        "[bank-sync-processor] Failed to release stuck jobs:",
        releaseError,
      );
      await reportEdgeFunctionError({
        functionName: "bank-sync-processor",
        error: releaseError,
        context: { phase: "release_stuck_sync_jobs" },
      });
    } else if (releasedCount > 0) {
      console.log(`[bank-sync-processor] Released ${releasedCount} stuck jobs`);
    }

    let recoveryQueued = 0;
    let webhooksRecovered = 0;

    // Fetch pending jobs (atomic claim via update with returning)
    // Use FOR UPDATE SKIP LOCKED pattern for atomic job claiming via RPC
    const processorId = crypto.randomUUID();
    let claimResult = await claimPendingSyncJobsWithTimeoutRetry(
      supabase,
      processorId,
    );
    let jobs = claimResult.data;
    let jobsError = claimResult.error;

    if (jobsError) {
      console.error("[bank-sync-processor] Failed to claim jobs", jobsError);
      await reportEdgeFunctionError({
        functionName: "bank-sync-processor",
        error: jobsError,
        context: { phase: "claim_pending_sync_jobs" },
      });
      return new Response(JSON.stringify({ error: "Failed to claim jobs" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      const { data: activeJob, error: activeJobError } = await supabase
        .from("bank_sync_jobs")
        .select("id")
        .eq("status", "processing")
        .gte(
          "processing_started_at",
          new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        )
        .limit(1)
        .maybeSingle();
      if (activeJobError) throw activeJobError;
      if (activeJob?.id) {
        return new Response(
          JSON.stringify({
            success: true,
            processed: 0,
            recoveryQueued: 0,
            webhooksRecovered: 0,
            message: "Another bank sync processor is active",
          }),
          {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
          },
        );
      }

      try {
        webhooksRecovered = await recoverStalePlaidWebhookEvents(supabase);
        recoveryQueued = await enqueueStalePlaidRecoveryJobs(supabase as any);
      } catch (recoveryError) {
        await reportEdgeFunctionError({
          functionName: "bank-sync-processor",
          error: isTransientBankNetworkError(recoveryError)
            ? new Error("Bank sync recovery transport failed after retries")
            : recoveryError,
          context: { phase: "enqueue_stale_plaid_recovery" },
        });
      }

      if (recoveryQueued > 0 || webhooksRecovered > 0) {
        claimResult = await claimPendingSyncJobsWithTimeoutRetry(
          supabase,
          processorId,
        );
        jobs = claimResult.data;
        jobsError = claimResult.error;
        if (jobsError) {
          await reportEdgeFunctionError({
            functionName: "bank-sync-processor",
            error: jobsError,
            context: { phase: "claim_recovered_sync_jobs" },
          });
          return new Response(
            JSON.stringify({ error: "Failed to claim recovered jobs" }),
            {
              status: 500,
              headers: { ...headers, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          recoveryQueued,
          webhooksRecovered,
          message:
            recoveryQueued > 0
              ? "Queued stale Plaid connections for recovery"
              : "No pending jobs",
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[bank-sync-processor] Claimed ${jobs.length} jobs with processor ${processorId}`,
    );

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as { jobId: string; error: string }[],
    };

    for (const job of jobs as BankSyncJob[]) {
      try {
        // Jobs are already marked as processing by the RPC call
        // Load bank connection
        const { data: connection, error: connectionError } = await supabase
          .from("bank_connections")
          .select(
            "id, user_id, provider, needs_resync, access_token_encrypted, plaid_access_token_encrypted, removed_at, status, item_status",
          )
          .eq("id", job.bank_connection_id)
          .maybeSingle();

        if (connectionError || !connection) {
          throw new Error(
            `Bank connection not found: ${job.bank_connection_id}`,
          );
        }

        if (
          connection.removed_at != null ||
          connection.status === "disabled" ||
          connection.status === "disconnected" ||
          connection.item_status === "pending_removal"
        ) {
          console.log(
            `[bank-sync-processor] Skipping inactive bank connection for job ${job.id}`,
          );
          const { data: skippedRows, error: skipCompleteError } = await supabase
            .from("bank_sync_jobs")
            .update({
              status: "completed",
              processing_started_at: null,
              updated_at: new Date().toISOString(),
              processed_at: new Date().toISOString(),
              last_error_code: null,
              last_error_at: null,
            })
            .eq("id", job.id)
            .eq("status", "processing")
            .contains("payload", { processor_id: processorId })
            .select("id");

          if (skipCompleteError) {
            throw skipCompleteError;
          }

          if (!skippedRows?.length) {
            throw new Error("Lost sync job ownership before skip completion");
          }

          results.succeeded++;
          results.processed++;
          continue;
        }

        // Process based on provider
        if (connection.provider === TINK_PROVIDER) {
          await processTinkJob(
            supabase as any,
            job,
            connection as BankConnection,
          );
        } else if (connection.provider === PLAID_PROVIDER) {
          const accessState = await loadPlaidUserAccessState(
            supabase as any,
            connection.user_id,
          );
          if (!canUsePlaidBankSync(accessState)) {
            console.log(
              `[bank-sync-processor] Removing Plaid item without active entitlement for job ${job.id}`,
            );
            await removePlaidConnection({
              supabase,
              connection: connection as BankConnection,
              removalReason: "subscription_entitlement_expired",
            });
            const { data: completedRows, error: completeError } = await supabase
              .from("bank_sync_jobs")
              .update({
                status: "completed",
                processing_started_at: null,
                updated_at: new Date().toISOString(),
                processed_at: new Date().toISOString(),
                last_error_code: null,
                last_error_at: null,
              })
              .eq("id", job.id)
              .eq("status", "processing")
              .contains("payload", { processor_id: processorId })
              .select("id");
            if (completeError) throw completeError;
            if (!completedRows?.length) {
              throw new Error(
                "Lost sync job ownership after entitlement removal",
              );
            }
            results.succeeded++;
            results.processed++;
            continue;
          } else {
            await processPlaidJob(
              supabase as any,
              job,
              connection as BankConnection,
            );
          }
        } else {
          throw new Error(`Unknown provider: ${connection.provider}`);
        }

        if (
          connection.provider === PLAID_PROVIDER &&
          (connection as BankConnection).needs_resync === true
        ) {
          await supabase
            .from("bank_connections")
            .update({
              needs_resync: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          await enqueuePlaidSyncJob({
            supabase,
            connectionId: connection.id,
            triggerSource: "post_processing_resync",
          });
        }

        // Mark job as completed (clear processing_started_at)
        const { data: completedRows, error: completeError } = await supabase
          .from("bank_sync_jobs")
          .update({
            status: "completed",
            processing_started_at: null,
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            last_error_code: null,
            last_error_at: null,
          })
          .eq("id", job.id)
          .eq("status", "processing")
          .contains("payload", { processor_id: processorId })
          .select("id");

        if (completeError) {
          throw completeError;
        }

        if (!completedRows?.length) {
          throw new Error("Lost sync job ownership before completion update");
        }

        results.succeeded++;
      } catch (error) {
        console.error(`[bank-sync-processor] Job ${job.id} failed`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const failureUpdate = buildBankSyncJobFailureUpdate({
          attemptCount: job.attempt_count ?? 0,
          errorMessage,
        });

        const { data: failedRows, error: failureUpdateError } = await supabase
          .from("bank_sync_jobs")
          .update(failureUpdate)
          .eq("id", job.id)
          .eq("status", "processing")
          .contains("payload", { processor_id: processorId })
          .select("id");

        if (failureUpdateError) {
          console.error(
            `[bank-sync-processor] Failed to update retry state for job ${job.id}`,
            failureUpdateError,
          );
          await reportEdgeFunctionError({
            functionName: "bank-sync-processor",
            error: failureUpdateError,
            context: {
              phase: "update_job_retry_state",
              job_id: job.id,
              bank_connection_id: job.bank_connection_id,
              provider: job.provider,
            },
          });
        } else if (!failedRows?.length) {
          console.warn(
            `[bank-sync-processor] Skipped retry update for job ${job.id}; processor ownership was lost`,
          );
        }

        if (failureUpdate.status === "failed") {
          await reportEdgeFunctionError({
            functionName: "bank-sync-processor",
            error,
            context: {
              phase: "bank_sync_job_exhausted",
              job_id: job.id,
              bank_connection_id: job.bank_connection_id,
              provider: job.provider,
              trigger_source: job.trigger_source,
              attempt_count: failureUpdate.attempt_count,
              last_error_code: failureUpdate.last_error_code,
            },
          });
        }

        results.failed++;
        results.errors.push({ jobId: job.id, error: errorMessage });
      }

      results.processed++;
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[bank-sync-processor] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "bank-sync-processor",
      error,
      context: { phase: "unexpected" },
    });
    return new Response(
      JSON.stringify({
        error: "Failed to process jobs",
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});

async function claimPendingSyncJobsWithTimeoutRetry(
  supabase: ReturnType<typeof createClient>,
  processorId: string,
) {
  const claim = () =>
    supabase.rpc("claim_pending_sync_jobs", {
      p_batch_size: BATCH_SIZE,
      p_processor_id: processorId,
    });
  const firstAttempt = await claim();
  if (firstAttempt.error?.code !== POSTGRES_STATEMENT_TIMEOUT_CODE) {
    return firstAttempt;
  }

  // SQLSTATE 57014 cancels and rolls back this atomic claim, so one retry with
  // the same processor ID cannot duplicate ownership.
  await new Promise((resolve) => setTimeout(resolve, 250));
  return await claim();
}

async function enqueueStalePlaidRecoveryJobs(
  supabase: ReturnType<typeof createClient>,
): Promise<number> {
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const connections = await withTransientBankReadRetry(
    async () => {
      // Build a fresh query for each retry; PostgREST builders are single-use.
      const { data, error } = await supabase
        .from("bank_connections")
        .select("id, status, error_code, plaid_not_ready_retry_at")
        .eq("provider", PLAID_PROVIDER)
        .in("status", ["active", "pending", "error"])
        .is("removed_at", null)
        .or("item_status.is.null,item_status.not.in.(removed,pending_removal)")
        .or(
          `needs_resync.eq.true,plaid_recurring_refresh_pending.eq.true,last_successful_sync_at.is.null,last_successful_sync_at.lt.${staleBefore}`,
        )
        .order("last_successful_sync_at", { ascending: true, nullsFirst: true })
        .limit(BATCH_SIZE);
      if (error) throw error;
      return data || [];
    },
    {
      maxRetries: 2,
      initialDelayMs: 250,
      maxDelayMs: 1000,
    },
  );

  let queued = 0;
  for (const connection of connections) {
    if (
      connection.plaid_not_ready_retry_at &&
      Date.parse(String(connection.plaid_not_ready_retry_at)) > Date.now()
    ) {
      continue;
    }
    if (
      connection.status === "error" &&
      connection.error_code &&
      requiresPlaidRelinkForError(String(connection.error_code))
    ) {
      continue;
    }
    const result = await enqueuePlaidSyncJob({
      supabase,
      connectionId: String(connection.id),
      triggerSource: "scheduled_recovery",
      setNeedsResyncOnDuplicate: false,
    });
    if (result.enqueued) queued += 1;
  }
  return queued;
}

async function recoverStalePlaidWebhookEvents(
  supabase: ReturnType<typeof createClient>,
): Promise<number> {
  const lockToken = crypto.randomUUID();
  const { data: events, error } = await supabase.rpc(
    "claim_pending_bank_webhook_events_v2",
    {
      p_provider: PLAID_PROVIDER,
      p_batch_size: BATCH_SIZE,
      p_lock_token: lockToken,
      p_lease_minutes: 15,
    },
  );
  if (error) throw error;

  let recovered = 0;
  for (const event of events || []) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/plaid-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildInternalInvokeHeaders(RESOLVED_INTERNAL_FUNCTION_KEY),
      },
      body: JSON.stringify({ eventId: event.id, lockToken }),
    });
    if (response.ok) recovered += 1;
  }
  await alertPlaidWebhookDeadLetters(supabase);
  return recovered;
}

async function alertPlaidWebhookDeadLetters(
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const { data: deadLetters, error } = await supabase
    .from("bank_webhook_events")
    .select("id, provider_item_id, processing_error")
    .eq("provider", PLAID_PROVIDER)
    .eq("recovery_status", "dead_letter")
    .is("dead_letter_alerted_at", null)
    .order("dead_lettered_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;

  for (const event of deadLetters || []) {
    const alertedAt = new Date().toISOString();
    const { data: claimedAlert, error: claimError } = await supabase
      .from("bank_webhook_events")
      .update({ dead_letter_alerted_at: alertedAt })
      .eq("id", event.id)
      .is("dead_letter_alerted_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimedAlert?.id) continue;

    await reportEdgeFunctionError({
      functionName: "bank-sync-processor",
      error: new Error(
        String(event.processing_error || "Plaid webhook recovery exhausted"),
      ),
      context: {
        phase: "plaid_webhook_dead_letter",
        webhook_event_id: event.id,
        provider_item_id: event.provider_item_id || null,
      },
    });
  }
}

async function processTinkJob(
  supabase: any,
  job: BankSyncJob,
  connection: BankConnection,
): Promise<void> {
  const internalHeaders = buildInternalInvokeHeaders(
    RESOLVED_INTERNAL_FUNCTION_KEY,
  );

  const payload = job.payload as Record<string, unknown> | null;
  const event = payload?.event as string | undefined;

  // Handle Tink account-transactions:deleted event
  if (event === "account-transactions:deleted") {
    const content = payload?.content as Record<string, unknown> | undefined;
    const transactions = content?.transactions as
      | Record<string, unknown>
      | undefined;
    const deletedIds = transactions?.ids as string[] | undefined;

    if (deletedIds && deletedIds.length > 0) {
      // Soft-delete the transactions
      await supabase
        .from("expenses")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: "provider_removed",
        })
        .eq("provider", TINK_PROVIDER)
        .eq("user_id", connection.user_id)
        .is("deleted_at", null)
        .in("provider_transaction_id", deletedIds);

      console.log(
        `[bank-sync-processor] Soft-deleted ${deletedIds.length} Tink transactions for job ${job.id}`,
      );
      return;
    }
  }

  // For other Tink events, call tink-sync-transactions
  console.log(`[bank-sync-processor] Triggering Tink sync for job ${job.id}`);
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tink-sync-transactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...internalHeaders,
      },
      body: JSON.stringify({
        connectionId: connection.id,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tink sync failed: ${response.status} ${errorText}`);
  }
}

async function processPlaidJob(
  supabase: any,
  job: BankSyncJob,
  connection: BankConnection,
): Promise<void> {
  const internalHeaders = buildInternalInvokeHeaders(
    RESOLVED_INTERNAL_FUNCTION_KEY,
  );
  const jobPayload = (job.payload || {}) as Record<string, unknown>;

  // Call plaid-sync-transactions
  console.log(`[bank-sync-processor] Triggering Plaid sync for job ${job.id}`);
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/plaid-sync-transactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...internalHeaders,
      },
      body: JSON.stringify({
        connectionId: connection.id,
        cursorOverride: jobPayload.cursorOverride,
        expectedCursorGeneration: jobPayload.cursorGeneration,
        targetHouseholdId: jobPayload.targetHouseholdId,
      }),
    },
  );

  console.log(
    `[bank-sync-processor] Plaid sync response status for job ${job.id}: ${response.status}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Plaid sync failed: ${response.status} ${errorText}`);
  }

  const syncPayload = (await response.json().catch(() => null)) as {
    status?: string;
    connections?: {
      connectionId: string;
      status: string;
      error?: string;
      errorCode?: string;
    }[];
  } | null;

  console.log(
    "[bank-sync-processor] Plaid sync response payload",
    JSON.stringify({
      status: syncPayload?.status ?? null,
      connectionCount: syncPayload?.connections?.length ?? 0,
    }),
  );

  if (!syncPayload || !Array.isArray(syncPayload.connections)) {
    throw new Error("Plaid sync returned an invalid response payload");
  }
  const connectionSummary = syncPayload.connections.find(
    (item) => item.connectionId === connection.id,
  );
  if (
    !connectionSummary ||
    (syncPayload.status !== "succeeded" &&
      syncPayload.status !== "pending" &&
      syncPayload.status !== "partial_error")
  ) {
    throw new Error("Plaid sync returned an invalid response payload");
  }

  if (
    syncPayload.status === "pending" &&
    connectionSummary.status === "pending"
  ) {
    return;
  }

  if (
    syncPayload.status === "partial_error" ||
    connectionSummary.status !== "succeeded"
  ) {
    const failedConnection =
      connectionSummary.status !== "succeeded" ? connectionSummary : null;
    if (
      failedConnection?.errorCode &&
      isPlaidSyncTerminalHandoffError(failedConnection.errorCode)
    ) {
      console.log(
        `[bank-sync-processor] Plaid sync handed off terminal state for job ${job.id}`,
        JSON.stringify({
          connectionId: connection.id,
          errorCode: failedConnection.errorCode,
        }),
      );
      return;
    }

    throw new Error(
      failedConnection?.error || "Plaid sync completed with an error summary",
    );
  }
}

function isPlaidSyncTerminalHandoffError(errorCode: string): boolean {
  return (
    requiresPlaidRelinkForError(errorCode) ||
    errorCode === "INVALID_CURSOR" ||
    errorCode === "STALE_CURSOR_GENERATION"
  );
}
