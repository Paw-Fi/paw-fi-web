import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CaptureErrorSample {
  count: number;
  function_name: string;
  fingerprint: string;
  sample_message: string | null;
  sample_context: Record<string, unknown> | null;
}

const uuid = (id: unknown): id is string =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function isRecoveredCapture(
  db: SupabaseClient,
  row: CaptureErrorSample,
): Promise<boolean> {
  // An aggregate only retains one sample. Its recovery cannot vouch for other occurrences.
  const ctx = row.sample_context;
  if (row.count !== 1 || !ctx) return false;
  try {
    if (
      row.function_name === "classify-notification-capture" &&
      row.fingerprint === "29b5540e" &&
      row.sample_message === "NOTIFICATION_CLASSIFICATION_TIMEOUT" &&
      ctx.stage === "classification" &&
      ctx.attemptNumber === 1 &&
      uuid(ctx.eventId)
    ) {
      const { data, error } = await db
        .from("notification_capture_classifications")
        .select("status")
        .eq("id", ctx.eventId)
        .abortSignal(AbortSignal.timeout(1500))
        .maybeSingle();
      return !error && (data?.status === "saved" || data?.status === "ignored");
    }
    if (
      row.function_name === "save-wallet-transaction" &&
      row.fingerprint === "5c5cec67" &&
      row.sample_message === "MODEL_OUTPUT_TRUNCATED" &&
      ctx.phase === "ai_categorization" &&
      ctx.outcome === "category_degraded" &&
      uuid(ctx.captureId)
    ) {
      const { data, error } = await db
        .from("idempotency_keys")
        .select("success:result->success,expense_id:result->data->>id")
        .eq("id", ctx.captureId)
        .abortSignal(AbortSignal.timeout(1500))
        .maybeSingle();
      return !error && data?.success === true && uuid(data.expense_id);
    }
  } catch {
    // Keep the original alert if the optional recovery check is unavailable.
  }
  return false;
}
