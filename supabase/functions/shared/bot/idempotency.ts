import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { reportEdgeFunctionError } from "../edge-error-alert.ts";

export type IdempotencyRecord = {
  status: "processing" | "done" | "failed";
  ack_text?: string;
  response_text?: string;
  media_url?: string;
  delivery?: string;
  error?: string;
};

async function reportIdempotencyError(
  operation: "reserve" | "read_duplicate" | "update",
  error: unknown,
): Promise<void> {
  await reportEdgeFunctionError({
    functionName: "shared/bot/idempotency",
    error,
    context: { operation },
  });
}

export async function reserveIdempotency(
  supabase: SupabaseClient,
  key: string,
  ackText?: string | null,
  ttlMinutes: number = 60,
): Promise<{ status: "new" | "duplicate"; result?: IdempotencyRecord | null }> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const result: IdempotencyRecord = { status: "processing" };
  if (ackText) result.ack_text = ackText;

  const { error } = await supabase
    .from("idempotency_keys")
    .insert({ key, result, expires_at: expiresAt });

  if (!error) return { status: "new" };

  if (error.code === "23505") {
    const { data, error: readError } = await supabase
      .from("idempotency_keys")
      .select("result")
      .eq("key", key)
      .maybeSingle();
    if (readError) {
      console.error("[bot-idempotency] duplicate read error:", readError);
      await reportIdempotencyError("read_duplicate", readError);
    }
    return {
      status: "duplicate",
      result: (data?.result as IdempotencyRecord) || null,
    };
  }

  console.error("[bot-idempotency] reserve error:", error);
  await reportIdempotencyError("reserve", error);
  return { status: "new" };
}

export async function updateIdempotency(
  supabase: SupabaseClient,
  key: string,
  result: IdempotencyRecord,
  ttlMinutes: number = 60,
) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("idempotency_keys")
    .update({ result, expires_at: expiresAt })
    .eq("key", key);
  if (error) {
    console.error("[bot-idempotency] update error:", error);
    await reportIdempotencyError("update", error);
  }
}
