import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const original = new URL(
  "../../migrations/20260719147000_close_plaid_audit_followups.sql",
  import.meta.url,
);
const fix = new URL(
  "../../migrations/20261119091000_preserve_plaid_webhooks_waiting_for_sync.sql",
  import.meta.url,
);

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table bank_connections(id uuid primary key default gen_random_uuid(), provider text default 'plaid',
      provider_item_id text default 'item', status text default 'active', item_status text default 'active',
      removed_at timestamptz, needs_resync boolean default true, last_successful_sync_at timestamptz);
    create table bank_sync_jobs(bank_connection_id uuid, provider text, job_type text, status text, next_attempt_at timestamptz);
    create table bank_webhook_events(id uuid primary key default gen_random_uuid(), provider text default 'plaid',
      bank_connection_id uuid, provider_item_id text default 'item', event_type text default 'TRANSACTIONS',
      received_at timestamptz default now(), processed_at timestamptz, processing_started_at timestamptz,
      processing_lock_token uuid, next_attempt_at timestamptz, processing_error text);
  `);
  const sql = await Deno.readTextFile(original);
  await db.exec(
    sql.slice(
      sql.indexOf("alter table public.bank_webhook_events"),
      sql.indexOf("create or replace function public.prevent_duplicate"),
    ),
  );
  const connection = (await db.query<{ id: string }>(
    "insert into bank_connections default values returning id",
  )).rows[0].id;
  return { db, connection };
}

Deno.test("Plaid webhook contention keeps a replayable event and its genuine failure budget", async () => {
  const { db, connection } = await fixture();
  try {
    await db.exec(await Deno.readTextFile(fix));
    const event = (await db.query<{ id: string }>(
      `insert into bank_webhook_events(bank_connection_id,
      recovery_attempt_count,recovery_max_attempts) values ($1,1,2) returning id`,
      [connection],
    )).rows[0].id;
    await db.query(
      "insert into bank_sync_jobs values ($1,'plaid','transactions_sync','pending',now()+interval '30 minutes')",
      [connection],
    );
    const token = crypto.randomUUID();
    const claim = () =>
      db.query(
        "select id from claim_pending_bank_webhook_events_v2('plaid',3,$1)",
        [token],
      );
    const finish = (lock: string, outcome: string, reason: string | null) =>
      db.query(
        "select complete_bank_webhook_event_v2($1,$2,$3,$4) as outcome",
        [event, lock, outcome, reason],
      );
    for (let round = 0; round < 3; round++) {
      assertEquals((await claim()).rows, [{ id: event }]);
      assertEquals(
        (await finish(crypto.randomUUID(), "retry", "deferred_active_sync"))
          .rows,
        [{ outcome: "lost_claim" }],
      );
      assertEquals(
        (await finish(token, "retry", "deferred_active_sync")).rows,
        [{ outcome: "pending" }],
      );
      assertEquals(
        (await db.query(
          `select recovery_attempt_count, processed_at, processing_lock_token,
        next_attempt_at >= now()+interval '29 minutes' as waits_for_job from bank_webhook_events`,
        )).rows,
        [{
          recovery_attempt_count: 1,
          processed_at: null,
          processing_lock_token: null,
          waits_for_job: true,
        }],
      );
      assertEquals((await claim()).rows, []);
      await db.exec("update bank_webhook_events set next_attempt_at=now()");
    }
    assertEquals((await claim()).rows, [{ id: event }]);
    assertEquals(
      (await finish(token, "retry", "deferred_missing_connection")).rows,
      [{ outcome: "dead_letter" }],
    );
  } finally {
    await db.close();
  }
});

Deno.test("Plaid webhook recovery reopens only outstanding transaction deliveries and allows normal completion", async () => {
  const { db, connection } = await fixture();
  try {
    const insert = async (eventType: string, reason: string, age: string) =>
      (await db.query<{ id: string }>(
        `insert into bank_webhook_events(bank_connection_id,event_type,
        processing_error,received_at,recovery_status,recovery_attempt_count,recovery_max_attempts,
        dead_lettered_at,dead_letter_alerted_at) values ($1,$2,$3,now()-$4::interval,'dead_letter',12,12,now(),now())
        returning id`,
        [connection, eventType, reason, age],
      )).rows[0].id;
    await db.query(
      "update bank_connections set last_successful_sync_at=now()-interval '1 day' where id=$1",
      [connection],
    );
    const waiting = await insert(
      "TRANSACTIONS",
      "deferred_active_sync",
      "2 hours",
    );
    await insert("ITEM", "deferred_active_sync", "2 hours");
    await insert("TRANSACTIONS", "deferred_missing_connection", "2 hours");
    await insert("TRANSACTIONS", "deferred_active_sync", "2 days");
    const otherItem = await insert(
      "TRANSACTIONS",
      "deferred_active_sync",
      "2 hours",
    );
    await db.query(
      "update bank_webhook_events set provider_item_id='other-item' where id=$1",
      [otherItem],
    );
    const removedConnection = (await db.query<{ id: string }>(
      "insert into bank_connections(removed_at) values (now()) returning id",
    )).rows[0].id;
    const removedEvent = await insert(
      "TRANSACTIONS",
      "deferred_active_sync",
      "2 hours",
    );
    await db.query(
      "update bank_webhook_events set bank_connection_id=$1 where id=$2",
      [removedConnection, removedEvent],
    );
    await db.exec(await Deno.readTextFile(fix));
    await db.exec(await Deno.readTextFile(fix));
    assertEquals(
      (await db.query(
        `select id,processed_at,dead_lettered_at,dead_letter_alerted_at
      from bank_webhook_events where recovery_status='pending'`,
      )).rows,
      [{
        id: waiting,
        processed_at: null,
        dead_lettered_at: null,
        dead_letter_alerted_at: null,
      }],
    );
    const token = crypto.randomUUID();
    assertEquals(
      (await db.query(
        "select id from claim_pending_bank_webhook_events_v2('plaid',3,$1)",
        [token],
      )).rows,
      [{ id: waiting }],
    );
    assertEquals(
      (await db.query(
        "select complete_bank_webhook_event_v2($1,$2,'completed') as outcome",
        [waiting, token],
      )).rows,
      [{ outcome: "completed" }],
    );
    assertEquals(
      (await db.query(
        "select count(*)::int as count from bank_webhook_events where recovery_status='dead_letter'",
      )).rows,
      [{ count: 5 }],
    );
  } finally {
    await db.close();
  }
});
