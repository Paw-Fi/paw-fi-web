/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { resolveMerchant } from "../shared/merchant-resolver.ts";

interface ResolutionJob {
  id: string;
  descriptor_key: string;
  evidence_context_key: string;
  structured_merchant_key: string | null;
  transaction_id: string;
  claim_token: string;
}

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function finishJobs(params: {
  supabase: any;
  jobId: string;
  claimToken: string;
  descriptorKey: string;
  status: "resolved" | "unresolved" | "failed";
  merchantId?: string;
  error?: string;
  logoDevQueried?: boolean;
}): Promise<number> {
  const { data, error } = await params.supabase.rpc(
    "complete_merchant_resolution_job",
    {
      p_job_id: params.jobId,
      p_claim_token: params.claimToken,
      p_expected_descriptor_key: params.descriptorKey,
      p_status: params.status,
      p_merchant_id: params.merchantId ?? null,
      p_error: params.error ?? null,
    },
  );
  if (error) throw error;
  return Number(data ?? 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const internalKey = Deno.env.get("MONEKO_INTERNAL_API_KEY");
  if (!url || !serviceRoleKey || !internalKey) {
    return response({ error: "Server configuration error" }, 500);
  }
  if (req.headers.get("X-Moneko-Internal-Key") !== internalKey) {
    return response({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(url, serviceRoleKey);
  const { error: backfillError } = await supabase.rpc(
    "enqueue_merchant_resolution_backfill_batch",
    {
      p_batch_size: 10,
    },
  );
  if (backfillError) {
    return response({ error: "Failed to enqueue backfill" }, 500);
  }
  const { data: jobs, error } = await supabase.rpc(
    "claim_merchant_resolution_jobs",
    {
      p_batch_size: 10,
      p_processor_id: crypto.randomUUID(),
    },
  );
  if (error) return response({ error: "Failed to claim jobs" }, 500);
  const claimedJobs = (jobs ?? []) as ResolutionJob[];
  const { data: expenses, error: expensesError } =
    claimedJobs.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("expenses")
          .select("id, merchant, raw_text, user_id, bank_account_id")
          .in(
            "id",
            claimedJobs.map((job) => job.transaction_id),
          );
  if (expensesError)
    return response({ error: "Failed to load transactions" }, 500);
  const expensesById = new Map(
    (expenses ?? []).map((expense: any) => [expense.id, expense] as const),
  );

  const metrics = {
    processed: 0,
    resolved: 0,
    unresolved: 0,
    failed: 0,
    logoDevQueried: 0,
  };
  for (const job of claimedJobs) {
    metrics.processed += 1;
    try {
      const expense = expensesById.get(job.transaction_id) as any;
      if (!expense) throw new Error("TRANSACTION_NOT_FOUND");
      // descriptor_key is the SQL-authoritative mechanical fingerprint that
      // was claimed with this job; do not independently reinterpret text here.
      if (!job.descriptor_key) {
        await finishJobs({
          supabase,
          jobId: job.id,
          claimToken: job.claim_token,
          descriptorKey: job.descriptor_key,
          status: "unresolved",
        });
        metrics.unresolved += 1;
        continue;
      }

      const resolution = await resolveMerchant({
        supabase,
        input: {
          userId: expense.user_id,
          descriptorKey: job.descriptor_key,
          evidenceContextKey: job.evidence_context_key,
          structuredKey: job.structured_merchant_key,
          mode: "INTERNAL_ONLY",
        },
      });
      if (resolution.suppressed) {
        await finishJobs({
          supabase,
          jobId: job.id,
          claimToken: job.claim_token,
          descriptorKey: job.descriptor_key,
          status: "unresolved",
        });
        metrics.unresolved += 1;
        continue;
      }
      const merchantId = resolution.merchantId ?? undefined;

      if (!merchantId) {
        // Community Search calls are reserved for an explicit user action.
        await finishJobs({
          supabase,
          jobId: job.id,
          claimToken: job.claim_token,
          descriptorKey: job.descriptor_key,
          status: "unresolved",
        });
        metrics.unresolved += 1;
        continue;
      }
      const count = await finishJobs({
        supabase,
        jobId: job.id,
        claimToken: job.claim_token,
        descriptorKey: job.descriptor_key,
        status: "resolved",
        merchantId,
      });
      metrics.resolved += count;
    } catch (error) {
      await finishJobs({
        supabase,
        jobId: job.id,
        claimToken: job.claim_token,
        descriptorKey: job.descriptor_key,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      metrics.failed += 1;
    }
  }
  return response({ success: true, metrics });
});
