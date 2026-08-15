import { PLAID_PROVIDER } from "./plaid-client.ts";

export interface EnqueuePlaidSyncJobParams {
  supabase: {
    from: (table: string) => any;
    rpc: (
      functionName: string,
      parameters: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: any;
    }>;
  };
  connectionId: string;
  triggerSource: string;
  payload?: Record<string, unknown>;
  webhookEventId?: string | null;
  jobType?: string;
  dedupeKey?: string | null;
  setNeedsResyncOnDuplicate?: boolean;
}

export interface EnqueuePlaidSyncJobResult {
  enqueued: boolean;
  duplicate: boolean;
  needsResyncQueued: boolean;
}

export async function enqueuePlaidSyncJob(
  params: EnqueuePlaidSyncJobParams,
): Promise<EnqueuePlaidSyncJobResult> {
  const jobType = params.jobType ?? "transactions_sync";
  const dedupeKey = params.dedupeKey === undefined
    ? `${jobType}:${params.connectionId}`
    : params.dedupeKey;

  const { data, error } = await params.supabase.rpc(
    "enqueue_bank_sync_job_v1",
    {
      p_bank_connection_id: params.connectionId,
      p_provider: PLAID_PROVIDER,
      p_trigger_source: params.triggerSource,
      p_job_type: jobType,
      p_dedupe_key: dedupeKey,
      p_webhook_event_id: params.webhookEventId ?? null,
      p_payload: params.payload ?? {},
      p_set_needs_resync_on_duplicate:
        params.setNeedsResyncOnDuplicate !== false,
    },
  );

  if (error) {
    throw error;
  }

  const result = data as {
    enqueued?: boolean;
    duplicate?: boolean;
    needs_resync_queued?: boolean;
  } | null;

  return {
    enqueued: result?.enqueued === true,
    duplicate: result?.duplicate === true,
    needsResyncQueued: result?.needs_resync_queued === true,
  };
}
