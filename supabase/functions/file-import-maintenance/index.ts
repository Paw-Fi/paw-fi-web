import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { sendEmail } from "../shared/email-service.ts";
import { fileImportMessage } from "../shared/file-import-message.ts";

if (import.meta.main) {
  Deno.serve(async (req) => {
    if (
      req.method !== "POST" || !(await authenticateInternalSecret(req)).success
    ) return new Response(null, { status: 403 });
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    try {
      await deliverFileImportEmails(db);
    } finally {
      // Retention must keep running even during an email outbox outage.
      const { data: expired, error: expiryError } = await db.rpc(
        "file_import_cleanup_candidates",
      );
      if (expiryError) throw expiryError;
      if (expired?.length) {
        const { error: removeError } = await db.storage.from("file-imports")
          .remove(
            expired.map((r: { name: string }) => r.name),
          );
        if (removeError) throw removeError;
      }
    }
    return new Response(null, { status: 204 });
  });
}

export async function deliverFileImportEmails(
  db: ReturnType<typeof createClient<any>>,
  deliver: typeof sendEmail = sendEmail,
) {
  const { data: events, error } = await db.rpc("claim_file_import_emails");
  if (error) throw error;
  for (const event of events ?? []) {
    try {
      const { data: recipient, error: lookupError } = await db.from("users")
        .select("email,unsubscribed_from_newsletter").eq("id", event.user_id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (event.email_allowed && recipient?.email && !recipient.unsubscribed_from_newsletter) {
        const content = (language: string) => {
          const { title: subject, body: text } = fileImportMessage(
            event,
            language,
          );
          const html = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
          return { subject, text, html: `<p>${html}</p>` };
        };
        const sent = await deliver({
          to: recipient.email,
          ...content("en"),
          localize: content,
          recipientUserId: event.user_id,
          idempotencyKey: `file-import/${event.id}`,
        });
        if (!sent.success) throw new Error("Email deferred");
      }
      const { error: ackError } = await db.from("file_import_email_events")
        .update({ delivered_at: new Date().toISOString() }).eq("id", event.id);
      if (ackError) throw ackError;
    } catch {
      console.error("File import email deferred", event.id);
    }
  }
}
