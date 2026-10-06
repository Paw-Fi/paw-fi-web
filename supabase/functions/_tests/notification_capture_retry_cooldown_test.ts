/// <reference lib="deno.ns" />
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const user = "00000000-0000-4000-8000-000000000001";
const context = "a".repeat(64);
const pipeline = "android_notification_classifier_v12";

Deno.test("actual classification claim throttles temporary outages without terminalizing and resumes after cooldown", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table notification_capture_classifications(
        id uuid primary key default gen_random_uuid(), user_id uuid, event_key text,
        source_package text, source_app_label text, status text, result jsonb,
        created_at timestamptz, updated_at timestamptz, context_hash text, processing_token uuid
      );
      create table notification_capture_ai_attempts(
        user_id uuid, event_id uuid, pipeline_version text, context_hash text, created_at timestamptz
      );
    `);
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../migrations/20261006183000_notification_capture_transient_retry_cooldown.sql",
          import.meta.url,
        ),
      ),
    );
    async function claim(event = "original-event", limit = 60) {
      return (await db.query<{ result: Record<string, unknown> }>(
        "select claim_notification_capture_classification_v2($1,$2,'bank','Bank',$3,$4,$5,3) result",
        [user, event, limit, pipeline, context],
      )).rows[0].result;
    }
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await claim();
      assertEquals(result.status, "claimed");
      assertEquals(result.attemptNumber, attempt);
      await db.query(
        `update notification_capture_classifications set status='failed', result=$1::jsonb`,
        [JSON.stringify({
          success: false,
          retryable: true,
          pipelineVersion: pipeline,
          diagnosticCode: "NOTIFICATION_CLASSIFICATION_TIMEOUT",
        })],
      );
    }
    assertEquals((await claim()).status, "rate_limited");
    const pending =
      (await db.query<{ result: Record<string, unknown>; status: string }>(
        "select status,result from notification_capture_classifications",
      )).rows[0];
    assertEquals(pending.status, "failed");
    assertEquals(pending.result.retryable, true);
    assertEquals(
      pending.result.diagnosticCode,
      "NOTIFICATION_CLASSIFICATION_TIMEOUT",
    );
    // A global hourly limit also retains the source instead of caching a denial.
    assertEquals((await claim("different-event", 3)).status, "rate_limited");
    await db.exec(
      "update notification_capture_ai_attempts set created_at=now()-interval '61 minutes'",
    );
    assertEquals((await claim()).status, "claimed");
    // Retry completion remains idempotent after the outage has cleared.
    const saved = { success: true, data: { id: "saved-expense" } };
    await db.query(
      "update notification_capture_classifications set status='saved',result=$1::jsonb",
      [JSON.stringify(saved)],
    );
    assertEquals(await claim(), { status: "cached", result: saved });
  } finally {
    await db.close();
  }
});

Deno.test("actual classification claim preserves processing, terminal domain failure and context isolation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table notification_capture_classifications(id uuid primary key default gen_random_uuid(),
        user_id uuid, event_key text, source_package text, source_app_label text, status text,
        result jsonb, created_at timestamptz, updated_at timestamptz, context_hash text, processing_token uuid);
      create table notification_capture_ai_attempts(user_id uuid,event_id uuid,pipeline_version text,context_hash text,created_at timestamptz);
    `);
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "../../migrations/20261006183000_notification_capture_transient_retry_cooldown.sql",
          import.meta.url,
        ),
      ),
    );
    async function claim(hash = context) {
      return (await db.query<{ result: Record<string, unknown> }>(
        "select claim_notification_capture_classification_v2($1,'event','bank','Bank',60,$2,$3,3) result",
        [user, pipeline, hash],
      )).rows[0].result;
    }
    const first = await claim();
    assertEquals(first.status, "claimed");
    assertEquals((await claim()).status, "processing");
    await db.exec(
      "update notification_capture_classifications set updated_at=now()-interval '11 minutes'",
    );
    const reclaimed = await claim();
    assertEquals(reclaimed.status, "claimed");
    assertEquals(first.processingToken === reclaimed.processingToken, false);
    const terminal = {
      success: false,
      retryable: false,
      pipelineVersion: pipeline,
      diagnosticCode: "NOTIFICATION_VERIFICATION_BLOCKED",
    };
    await db.query(
      "update notification_capture_classifications set status='failed',result=$1::jsonb",
      [JSON.stringify(terminal)],
    );
    assertEquals(await claim(), { status: "cached", result: terminal });
    assertEquals((await claim("b".repeat(64))).status, "claimed");
  } finally {
    await db.close();
  }
});
