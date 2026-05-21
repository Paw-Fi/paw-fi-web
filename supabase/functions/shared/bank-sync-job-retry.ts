export interface BankSyncJobFailureUpdateParams {
  attemptCount?: number | null;
  errorMessage: string;
  now?: Date;
  maxAttempts?: number;
}

export interface BankSyncJobFailureUpdate {
  status: "pending" | "failed";
  attempt_count: number;
  next_attempt_at: string | null;
  processing_started_at: null;
  updated_at: string;
  processed_at?: string;
  last_error_code: string;
  last_error_at: string;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [5, 15, 60, 360];

export function buildBankSyncJobFailureUpdate(
  params: BankSyncJobFailureUpdateParams,
): BankSyncJobFailureUpdate {
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();
  const maxAttempts = params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const nextAttemptCount = Math.max(0, params.attemptCount ?? 0) + 1;
  const lastErrorCode = normalizeErrorCode(params.errorMessage);
  const baseUpdate = {
    attempt_count: nextAttemptCount,
    processing_started_at: null,
    updated_at: nowIso,
    last_error_code: lastErrorCode,
    last_error_at: nowIso,
  };

  if (nextAttemptCount >= maxAttempts) {
    return {
      ...baseUpdate,
      status: "failed",
      next_attempt_at: null,
      processed_at: nowIso,
    };
  }

  const backoffIndex = Math.min(
    nextAttemptCount - 1,
    BACKOFF_MINUTES.length - 1,
  );
  const nextAttemptAt = new Date(
    now.getTime() + BACKOFF_MINUTES[backoffIndex] * 60 * 1000,
  );

  return {
    ...baseUpdate,
    status: "pending",
    next_attempt_at: nextAttemptAt.toISOString(),
  };
}

function normalizeErrorCode(message: string): string {
  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return normalized || "bank_sync_job_failed";
}
