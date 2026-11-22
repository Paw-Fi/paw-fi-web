import { deliverFileImportPush } from "../shared/file-import-push.ts";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deliverFileImportEmails } from "../file-import-maintenance/index.ts";
import { fileImportMessage } from "../shared/file-import-message.ts";

Deno.test("email delivery is independent of push tokens, honors opt-out and reuses the event key after an acknowledgement failure", async () => {
  const recipients = ["enabled", "disabled"];
  const sent: string[] = [];
  const acknowledged = new Set<string>();
  let failAcknowledgement = true;
  const db = createClient("http://fixture.invalid", "test", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const response = (body: unknown, status = 200) =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json" },
          });
        if (url.pathname.endsWith("/rpc/claim_file_import_emails")) {
          return response(
            recipients.filter((id) => !acknowledged.has(id)).map((id) => ({
              id,
              user_id: id,
              status: "processing",
              email_allowed: true,
            })),
          );
        }
        if (url.pathname.endsWith("/users")) {
          const id = url.searchParams.get("id")!.slice(3);
          return response([{
            email: id + "@example.com",
            unsubscribed_from_newsletter: id === "disabled",
          }]);
        }
        if (init?.method === "PATCH") {
          const id = url.searchParams.get("id")!.slice(3);
          if (failAcknowledgement && id === "enabled") {
            failAcknowledgement = false;
            return response({ message: "unavailable" }, 400);
          }
          acknowledged.add(id);
          return response({});
        }
        throw new Error("Unexpected request: " + url.pathname);
      },
    },
  });
  const transport: NonNullable<Parameters<typeof deliverFileImportEmails>[1]> =
    async (options) => {
      sent.push(String(options.idempotencyKey));
      assertEquals(options.to, "enabled@example.com");
      assertEquals(options.localize!("de").subject, "Dateiimport gestartet");
      return { success: true, id: "fixture" };
    };
  await deliverFileImportEmails(db, transport);
  await deliverFileImportEmails(db, transport);
  assertEquals(sent, ["file-import/enabled", "file-import/enabled"]);
  assertEquals(acknowledged.size, 2);
  assertEquals(
    fileImportMessage({ status: "completed", imported: 32, skipped: 4 }).body,
    "Imported 32 transactions. Skipped 4 duplicate or grouped rows.",
  );
  assertEquals(
    fileImportMessage({
      status: "failed",
      message: "Choose Review before importing.",
    }).body,
    "Choose Review before importing.",
  );
});

Deno.test("partial push fan-out retries only the unacknowledged device", async () => {
  const sent = new Set<string>();
  const calls: string[] = [];
  const db = createClient("http://fixture.invalid", "fixture", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        const req = new Request(input, init);
        const url = new URL(req.url);
        if (url.pathname.endsWith("/rpc/claim_file_import_push")) {
          const { p_device } = await req.json();
          return Response.json(sent.has(p_device) ? "sent" : "send");
        }
        assertEquals(req.method, "PATCH");
        sent.add(url.searchParams.get("device_id")!.slice(3));
        return Response.json([{ event_id: "event" }]);
      },
    },
  });
  const deliver = (device: string, ok: boolean) =>
    deliverFileImportPush(db, "event", device, async () => {
      calls.push(device);
      return ok;
    });
  assertEquals(await deliver("phone", true), true);
  assertEquals(await deliver("tablet", false), false);
  assertEquals(await deliver("phone", true), true);
  assertEquals(await deliver("tablet", true), true);
  assertEquals(calls, ["phone", "tablet", "tablet"]);
});
