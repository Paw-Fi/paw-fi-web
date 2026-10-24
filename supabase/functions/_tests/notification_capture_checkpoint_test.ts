/// <reference lib="deno.ns" />
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const user = "00000000-0000-4000-8000-000000000001";
const otherUser = "00000000-0000-4000-8000-000000000002";
const context = "a".repeat(64);
const pipeline = "android_notification_classifier_v20";

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table notification_capture_classifications(
      id uuid primary key default gen_random_uuid(), user_id uuid, event_key text,
      source_package text, source_app_label text, status text, result jsonb,
      created_at timestamptz, updated_at timestamptz, context_hash text, processing_token uuid,
      unique(user_id,event_key)
    );
    alter table notification_capture_classifications enable row level security;
    revoke all on notification_capture_classifications from public, anon, authenticated;
    grant all on notification_capture_classifications to service_role;
    create table notification_capture_ai_attempts(
      user_id uuid, event_id uuid, pipeline_version text, context_hash text, created_at timestamptz
    );
  `);
  await db.exec(
    await Deno.readTextFile(
      new URL(
        "../../migrations/20261023090000_notification_capture_analysis_checkpoint.sql",
        import.meta.url,
      ),
    ),
  );
  async function claim(hash = context, version = pipeline, actor = user) {
    return (
      await db.query<{ result: Record<string, unknown> }>(
        "select claim_notification_capture_classification_v2($1,'event','bank','Bank',60,$2,$3,3) result",
        [actor, version, hash],
      )
    ).rows[0].result;
  }
  async function fail(id: unknown, version = pipeline) {
    await db.query(
      "update notification_capture_classifications set status='failed',processing_token=null,result=$2::jsonb where id=$1",
      [id, JSON.stringify({ retryable: true, pipelineVersion: version })],
    );
  }
  return { db, claim, fail };
}

Deno.test(
  "checkpoint claim resumes atomically, fences stale workers, and retains hourly cooldown",
  async () => {
    const { db, claim, fail } = await fixture();
    try {
      const first = await claim();
      const checkpoint = {
        pipelineVersion: pipeline,
        inputHash: "b".repeat(64),
        state: {
          version: 1,
          model: "gemini-3.1-flash-lite",
          proposal: { action: "ignore" },
          verifierModel: "gemini-3.5-flash-lite",
        },
      };
      await db.query(
        "update notification_capture_classifications set analysis_checkpoint=$2::jsonb where id=$1 and processing_token=$3 and status='processing'",
        [first.eventId, JSON.stringify(checkpoint), first.processingToken],
      );
      assertEquals((await claim()).status, "processing");
      await fail(first.eventId);
      const second = await claim();
      assertEquals(second.checkpoint, checkpoint);
      assertEquals(second.processingToken === first.processingToken, false);
      const stale = await db.query(
        "update notification_capture_classifications set analysis_checkpoint=null where id=$1 and processing_token=$2 and status='processing' returning id",
        [first.eventId, first.processingToken],
      );
      assertEquals(stale.rows.length, 0);
      await fail(first.eventId);
      assertEquals((await claim()).checkpoint, checkpoint);
      await fail(first.eventId);
      assertEquals((await claim()).status, "rate_limited");
      assertEquals(
        (
          await db.query<{ analysis_checkpoint: unknown }>(
            "select analysis_checkpoint from notification_capture_classifications",
          )
        ).rows[0].analysis_checkpoint,
        checkpoint,
      );
      await db.exec(
        "update notification_capture_ai_attempts set created_at=now()-interval '61 minutes'",
      );
      assertEquals((await claim()).checkpoint, checkpoint);
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "checkpoint is isolated by actor, current context and pipeline; saved results remain idempotent",
  async () => {
    const { db, claim, fail } = await fixture();
    try {
      const first = await claim();
      const checkpoint = {
        pipelineVersion: pipeline,
        inputHash: "b".repeat(64),
        state: { version: 1, model: "gemini-3.1-flash-lite" },
      };
      async function seed() {
        await db.query(
          "update notification_capture_classifications set analysis_checkpoint=$2::jsonb where id=$1",
          [first.eventId, JSON.stringify(checkpoint)],
        );
        await fail(first.eventId);
      }
      await seed();
      assertEquals(
        (await claim(context, pipeline, otherUser)).checkpoint,
        null,
      );
      assertEquals((await claim("c".repeat(64))).checkpoint, null);
      await seed();
      assertEquals((await claim(context, "new_pipeline")).checkpoint, null);
      const saved = { success: true, data: { id: "saved-expense" } };
      await db.query(
        "update notification_capture_classifications set status='saved',result=$2::jsonb,analysis_checkpoint=null where id=$1",
        [first.eventId, JSON.stringify(saved)],
      );
      assertEquals(await claim(), { status: "cached", result: saved });
      const count = await db.query<{ count: number }>(
        "select count(*)::int count from notification_capture_ai_attempts where event_id=$1",
        [first.eventId],
      );
      assertEquals(count.rows[0].count, 3);
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "checkpoint migration bounds storage and does not expose proposals to client roles",
  async () => {
    const { db, claim } = await fixture();
    try {
      const first = await claim();
      for (const value of [
        "[]",
        JSON.stringify({ large: "x".repeat(65536) }),
      ]) {
        await assertRejects(() =>
          db.query(
            "update notification_capture_classifications set analysis_checkpoint=$2::jsonb where id=$1",
            [first.eventId, value],
          ),
        );
      }
      for (const role of ["anon", "authenticated"]) {
        const access = await db.query<{ read: boolean; write: boolean }>(
          "select has_column_privilege($1,'notification_capture_classifications','analysis_checkpoint','SELECT') as read, has_column_privilege($1,'notification_capture_classifications','analysis_checkpoint','UPDATE') as write",
          [role],
        );
        assertEquals(access.rows[0], { read: false, write: false });
        const rpc = await db.query<{ allowed: boolean }>(
          "select has_function_privilege($1,'claim_notification_capture_classification_v2(uuid,text,text,text,integer,text,text,integer)','EXECUTE') as allowed",
          [role],
        );
        assertEquals(rpc.rows[0].allowed, false);
      }
    } finally {
      await db.close();
    }
  },
);
