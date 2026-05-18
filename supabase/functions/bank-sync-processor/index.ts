import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import {
  authenticateInternalSecret,
  buildInternalInvokeHeaders,
  resolveAnyInternalFunctionKey,
} from "../shared/auth.ts";
import { buildBankSyncJobFailureUpdate } from "../shared/bank-sync-job-retry.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import { TINK_PROVIDER } from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const INTERNAL_FUNCTION_KEY = Deno.env.get(
  "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
);
const RESOLVED_INTERNAL_FUNCTION_KEY = INTERNAL_FUNCTION_KEY ||
  resolveAnyInternalFunctionKey();
const AUTO_BANK_SYNC_ENABLED =
  Deno.env.get("AUTO_BANK_SYNC_ENABLED")?.toLowerCase() !== "false";

// Fixed batch size to prevent DoS attacks
const BATCH_SIZE = 10;

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
    } else if (releasedCount > 0) {
      console.log(`[bank-sync-processor] Released ${releasedCount} stuck jobs`);
    }

    // Fetch pending jobs (atomic claim via update with returning)
    // Use FOR UPDATE SKIP LOCKED pattern for atomic job claiming via RPC
    const processorId = crypto.randomUUID();
    const { data: jobs, error: jobsError } = await supabase.rpc(
      "claim_pending_sync_jobs",
      {
        p_batch_size: BATCH_SIZE,
        p_processor_id: processorId,
      },
    );

    if (jobsError) {
      console.error("[bank-sync-processor] Failed to claim jobs", jobsError);
      return new Response(JSON.stringify({ error: "Failed to claim jobs" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No pending jobs",
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
          .select("id, user_id, provider, needs_resync")
          .eq("id", job.bank_connection_id)
          .maybeSingle();

        if (connectionError || !connection) {
          throw new Error(
            `Bank connection not found: ${job.bank_connection_id}`,
          );
        }

        // Process based on provider
        if (connection.provider === TINK_PROVIDER) {
          await processTinkJob(
            supabase as any,
            job,
            connection as BankConnection,
          );
        } else if (connection.provider === PLAID_PROVIDER) {
          await processPlaidJob(
            supabase as any,
            job,
            connection as BankConnection,
          );
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
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
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
        } else if (!failedRows?.length) {
          console.warn(
            `[bank-sync-processor] Skipped retry update for job ${job.id}; processor ownership was lost`,
          );
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
    return new Response(
      JSON.stringify({
        error: "Failed to process jobs",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});

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
    connections?: { connectionId: string; status: string; error?: string }[];
  } | null;

  console.log(
    "[bank-sync-processor] Plaid sync response payload",
    JSON.stringify({
      jobId: job.id,
      connectionId: connection.id,
      payload: syncPayload,
    }),
  );

  if (
    syncPayload?.status === "partial_error" ||
    syncPayload?.connections?.some((item) => item.status !== "succeeded")
  ) {
    const failedConnection = syncPayload?.connections?.find(
      (item) =>
        item.connectionId === connection.id && item.status !== "succeeded",
    );
    throw new Error(
      failedConnection?.error || "Plaid sync completed with an error summary",
    );
  }
}
