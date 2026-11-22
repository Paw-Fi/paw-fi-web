import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function deliverFileImportPush(
  db: Pick<SupabaseClient<any>, "rpc" | "from">,
  eventId: string,
  deviceId: string,
  send: () => Promise<boolean>,
): Promise<boolean> {
  const lease = crypto.randomUUID();
  const { data, error } = await db.rpc("claim_file_import_push", {
    p_event: eventId,
    p_device: deviceId,
    p_lease: lease,
  });
  if (error) throw error;
  if (data === "sent" || data === "skip") return true;
  if (data !== "send") return false;
  if (!await send()) return false;
  const { data: rows, error: ackError } = await db.from(
    "file_import_push_deliveries",
  )
    .update({ sent_at: new Date().toISOString() }).eq("event_id", eventId).eq(
      "device_id",
      deviceId,
    )
    .eq("lease", lease).select("event_id");
  if (ackError) throw ackError;
  return rows?.length === 1;
}
