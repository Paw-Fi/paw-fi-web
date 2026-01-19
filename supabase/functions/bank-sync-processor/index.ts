import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders, getCorsHeaders } from "../shared/cors.ts";
import { PLAID_PROVIDER } from "../shared/plaid-client.ts";
import { TINK_PROVIDER } from "../shared/tink-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase credentials missing for bank-sync-processor");
}

interface BankSyncJob {
  id: string;
  bank_connection_id: string;
  provider: string;
  trigger_source: string;
  status: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
}

interface ProcessorRequest {
  batchSize?: number;
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
    const body = (await req.json().catch(() => ({}))) as ProcessorRequest;
    const batchSize = body.batchSize || 10;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-bank-sync-processor" } },
    });

    // Fetch pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from("bank_sync_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (jobsError) {
      console.error("[bank-sync-processor] Failed to fetch jobs", jobsError);
      return new Response(JSON.stringify({ error: "Failed to fetch jobs" }), {
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

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as { jobId: string; error: string }[],
    };

    for (const job of jobs as BankSyncJob[]) {
      try {
        // Mark job as processing
        await supabase
          .from("bank_sync_jobs")
          .update({
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        // Load bank connection
        const { data: connection, error: connectionError } = await supabase
          .from("bank_connections")
          .select("id, user_id, provider")
          .eq("id", job.bank_connection_id)
          .maybeSingle();

        if (connectionError || !connection) {
          throw new Error(
            `Bank connection not found: ${job.bank_connection_id}`,
          );
        }

        // Process based on provider
        if (connection.provider === TINK_PROVIDER) {
          await processTinkJob(supabase, job, connection as BankConnection);
        } else if (connection.provider === PLAID_PROVIDER) {
          await processPlaidJob(supabase, job, connection as BankConnection);
        } else {
          throw new Error(`Unknown provider: ${connection.provider}`);
        }

        // Mark job as completed
        await supabase
          .from("bank_sync_jobs")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        results.succeeded++;
      } catch (error) {
        console.error(`[bank-sync-processor] Job ${job.id} failed`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Mark job as failed
        await supabase
          .from("bank_sync_jobs")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            payload: {
              ...job.payload,
              error: errorMessage,
            },
          })
          .eq("id", job.id);

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
  supabase: ReturnType<typeof createClient>,
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
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
  supabase: ReturnType<typeof createClient>,
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
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
}
