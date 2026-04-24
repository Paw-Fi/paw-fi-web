export interface InboundEventLeaseOwner {
  rowId: string;
  attemptCount: number;
}

export function resolveDuplicateWebhookStatusCode(
  _inProgress: boolean,
): number {
  return 200;
}

export function buildEmailImportDebugTraceId(emailId: string): string {
  return `email-import:${emailId}`;
}

export async function applyOwnedInboundEventUpdate(params: {
  supabase: any;
  owner: InboundEventLeaseOwner;
  patch: Record<string, unknown>;
  select?: string;
}): Promise<Record<string, unknown>> {
  const { supabase, owner, patch, select } = params;
  const { data, error } = await supabase
    .from("email_import_events")
    .update(patch)
    .eq("id", owner.rowId)
    .eq("status", "processing")
    .eq("processing_attempt_count", owner.attemptCount)
    .select(select || "id")
    .maybeSingle();

  if (error) {
    throw new Error(`INBOUND_EVENT_UPDATE_FAILED:${error.message}`);
  }
  if (!data?.id) {
    throw new Error("INBOUND_EVENT_LEASE_LOST");
  }
  return data as Record<string, unknown>;
}
