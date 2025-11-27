import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { formatInvokeError } from "./formatting-helpers.ts";

export type SupabaseClient = ReturnType<typeof createClient>;

export async function insertChatMessage(
  supabase: SupabaseClient,
  chat_session_id: string,
  role: "user" | "assistant",
  content: string,
  debugNotes: string[],
  debugEnabled: boolean
) {
  const { error } = await supabase.from("chat_messages").insert({
    chat_session_id,
    role,
    content,
    timestamp: new Date().toISOString()
  });
  if (error) {
    const formatted = formatInvokeError(error);
    if (debugEnabled) debugNotes.push(`chat_messages insert error (${role}): ${formatted}`);
    console.error("[whatsapp-bot] chat_messages insert error", { role, error, formatted });
  }
}
