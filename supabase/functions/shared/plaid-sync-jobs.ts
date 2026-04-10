import { PLAID_PROVIDER } from "./plaid-client.ts";

export interface EnqueuePlaidSyncJobParams {
  supabase: {
    from: (table: string) => any;
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

  const { error } = await params.supabase
    .from("bank_sync_jobs")
    .insert({
      bank_connection_id: params.connectionId,
      provider: PLAID_PROVIDER,
      trigger_source: params.triggerSource,
      job_type: jobType,
      dedupe_key: dedupeKey,
      webhook_event_id: params.webhookEventId ?? null,
      payload: params.payload ?? {},
      next_attempt_at: null,
      attempt_count: 0,
    });

  if (!error) {
    return {
      enqueued: true,
      duplicate: false,
      needsResyncQueued: false,
    };
  }

  if (error.code !== "23505") {
    throw error;
  }

  const duplicateReason = `${error.message ?? ""} ${error.details ?? ""}`;
  const isWebhookDuplicate = duplicateReason.includes("webhook_event_id");

  if (
    params.setNeedsResyncOnDuplicate !== false &&
    jobType === "transactions_sync" &&
    !isWebhookDuplicate
  ) {
    const { error: updateError } = await params.supabase
      .from("bank_connections")
      .update({
        needs_resync: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.connectionId);

    if (updateError) {
      throw updateError;
    }

    return {
      enqueued: false,
      duplicate: true,
      needsResyncQueued: true,
    };
  }

  return {
    enqueued: false,
    duplicate: true,
    needsResyncQueued: false,
  };
}
