import { createClient, type SupabaseClient as SupabaseJsClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { formatInvokeError } from "./formatting-helpers.ts";

export type SupabaseClient = SupabaseJsClient;

export async function insertChatMessage(
  supabase: SupabaseClient,
  chat_session_id: string,
  role: "user" | "assistant",
  content: string,
  debugNotes: string[],
  debugEnabled: boolean,
  metadata?: Record<string, unknown> | null
) {
  const row = {
    chat_session_id,
    role,
    content,
    timestamp: new Date().toISOString()
  };
  let { error } = await supabase.from("chat_messages").insert(
    metadata ? { ...row, metadata } : row
  );
  if (error && metadata) {
    // Audit metadata is optional; the conversation record itself must not be
    // lost because of it.
    ({ error } = await supabase.from("chat_messages").insert(row));
  }
  if (error) {
    const formatted = formatInvokeError(error);
    if (debugEnabled) debugNotes.push(`chat_messages insert error (${role}): ${formatted}`);
    console.error("[whatsapp-bot] chat_messages insert error", { role, error, formatted });
  }
}
