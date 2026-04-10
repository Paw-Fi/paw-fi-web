import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { enqueuePlaidSyncJob } from "../shared/plaid-sync-jobs.ts";
import { TINK_PROVIDER } from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const INTERNAL_SERVICE_SECRET = Deno.env.get("INTERNAL_SERVICE_SECRET");

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

  // CRITICAL: Authenticate internal service calls only
  // This endpoint should NOT be publicly accessible
  if (!INTERNAL_SERVICE_SECRET) {
    console.error(
      "[bank-sync-processor] INTERNAL_SERVICE_SECRET not configured",
    );
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }

  const providedSecret = req.headers.get("X-Internal-Service-Secret");
  if (
    !providedSecret ||
    !constantTimeCompare(providedSecret, INTERNAL_SERVICE_SECRET)
  ) {
    console.warn("[bank-sync-processor] Unauthorized access attempt");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-bank-sync-processor" } },
    });

    // Release stuck jobs before fetching new ones (TTL: 15 minutes)
    // Must match or exceed sync endpoint lock durations to avoid requeueing in-flight jobs
    const { data: releasedCount, error: releaseError } = await supabase.rpc(
      "release_stuck_sync_jobs",
      { p_ttl_minutes: 15 },
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
        await supabase
          .from("bank_sync_jobs")
          .update({
            status: "completed",
            processing_started_at: null,
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            last_error_code: null,
            last_error_at: null,
          })
          .eq("id", job.id);

        results.succeeded++;
      } catch (error) {
        console.error(`[bank-sync-processor] Job ${job.id} failed`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await handleJobFailure(supabase, job, errorMessage);
        await reportEdgeFunctionError({
          functionName: "bank-sync-processor",
          error,
          context: {
            connection_id: job.bank_connection_id,
            job_id: job.id,
            job_type: job.job_type ?? "transactions_sync",
            attempt_count: (job.attempt_count ?? 0) + 1,
          },
        });

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
        "X-Internal-Service-Secret": INTERNAL_SERVICE_SECRET!,
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
  // Call plaid-sync-transactions
  console.log(`[bank-sync-processor] Triggering Plaid sync for job ${job.id}`);
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/plaid-sync-transactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Service-Secret": INTERNAL_SERVICE_SECRET!,
      },
      body: JSON.stringify({
        connectionId: connection.id,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Plaid sync failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json().catch(() => null) as
    | {
      status?: string;
      connections?: { connectionId: string; status: string; error?: string }[];
    }
    | null;

  if (payload?.status === "partial_error" || payload?.connections?.some((item) => item.status !== "succeeded")) {
    const failedConnection = payload?.connections?.find((item) =>
      item.connectionId === connection.id && item.status !== "succeeded"
    );
    throw new Error(
      failedConnection?.error ||
        "Plaid sync completed with an error summary",
    );
  }
}

async function handleJobFailure(
  supabase: any,
  job: BankSyncJob,
  errorMessage: string,
): Promise<void> {
  const nextAttemptCount = (job.attempt_count ?? 0) + 1;
  const retryDelayMs = computeRetryDelayMs(nextAttemptCount);
  const nowIso = new Date().toISOString();

  if (nextAttemptCount < 5) {
    await supabase
      .from("bank_sync_jobs")
      .update({
        status: "pending",
        attempt_count: nextAttemptCount,
        next_attempt_at: new Date(Date.now() + retryDelayMs).toISOString(),
        last_error_at: nowIso,
        updated_at: nowIso,
        processing_started_at: null,
        payload: {
          ...job.payload,
          error: errorMessage,
        },
      })
      .eq("id", job.id);
    return;
  }

  await supabase
    .from("bank_sync_jobs")
    .update({
      status: "failed",
      attempt_count: nextAttemptCount,
      last_error_at: nowIso,
      updated_at: nowIso,
      processing_started_at: null,
      processed_at: nowIso,
      payload: {
        ...job.payload,
        error: errorMessage,
      },
    })
    .eq("id", job.id);
}

function computeRetryDelayMs(attemptCount: number): number {
  if (attemptCount <= 1) return 15 * 60 * 1000;
  if (attemptCount === 2) return 60 * 60 * 1000;
  if (attemptCount === 3) return 6 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
