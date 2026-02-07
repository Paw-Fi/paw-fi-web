import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export type IdempotencyRecord = {
  status: "processing" | "done" | "failed";
  ack_text?: string;
  response_text?: string;
  media_url?: string;
  delivery?: string;
  error?: string;
};

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
    const { data } = await supabase
      .from("idempotency_keys")
      .select("result")
      .eq("key", key)
      .maybeSingle();
    return {
      status: "duplicate",
      result: (data?.result as IdempotencyRecord) || null,
    };
  }

  console.error("[bot-idempotency] reserve error:", error);
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
  }
}
