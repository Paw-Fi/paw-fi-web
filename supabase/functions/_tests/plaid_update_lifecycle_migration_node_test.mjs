import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const { PGlite } = await import(process.env.PGLITE_MODULE_PATH ?? "@electric-sql/pglite");
const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const user = id(1), actor = id(2), household = id(3), connection = id(4), session = id(5);
const selected = id(6), deselected = id(7);
const fix = "20261002100000_preserve_plaid_update_resync.sql";

async function migration(name) {
  return readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
}

async function loadFunction(db, file, name) {
  const sql = await migration(file);
  const start = sql.toLowerCase().indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1);
  await db.exec(sql.slice(start, sql.indexOf("$$;", start) + 3));
}

async function fixture(role = "owner", shared = true) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create table households(id uuid primary key);
    create table bank_institutions(id uuid primary key);
    insert into auth.users values ('${user}'), ('${actor}');
    insert into households values ('${household}');
  `);
  // The account table is the actual migration schema, not an invented fixture.
  const original = await migration("20260115_salt_edge_integration.sql");
  for (const table of ["bank_connections", "bank_accounts"]) {
    const start = original.indexOf(`CREATE TABLE IF NOT EXISTS public.${table} (`);
    await db.exec(original.slice(start, original.indexOf("\n);", start) + 3));
  }
  await db.exec(`
    alter table bank_connections drop constraint bank_connections_status_check;
    alter table bank_connections add column item_status text, add column item_health_state text,
      add column relink_state text, add column removed_at timestamptz,
      add column needs_resync boolean default false;
    alter table bank_accounts drop constraint unique_plaid_account;
    alter table bank_accounts add column provider_account_id text, add column provider_persistent_account_id text,
      add column provider_balance_current_cents bigint, add column provider_balance_available_cents bigint,
      add column provider_balance_limit_cents bigint, add column provider_balance_updated_at timestamptz;
    create table household_members(household_id uuid, user_id uuid, role text);
    create table expenses(id uuid primary key, user_id uuid, provider text, bank_account_id uuid,
      deleted_at timestamptz, deleted_reason text, updated_at timestamptz);
    create table plaid_link_update_sessions(id uuid primary key, user_id uuid, actor_user_id uuid,
      connection_id uuid, target_household_id uuid, mode text, processing_started_at timestamptz,
      consumed_at timestamptz, expires_at timestamptz, completed_at timestamptz,
      link_request_id text, link_session_id text, updated_at timestamptz);
    create table bank_sync_jobs(id uuid primary key default gen_random_uuid(), bank_connection_id uuid,
      provider text, trigger_source text, job_type text, dedupe_key text, payload jsonb,
      next_attempt_at timestamptz, attempt_count integer, status text default 'pending');
    create unique index active_sync_dedupe on bank_sync_jobs(dedupe_key) where status in ('pending','processing');
    insert into household_members values ('${household}','${actor}','${role}');
    insert into bank_connections(id,user_id,plaid_item_id,plaid_access_token_encrypted,household_id,status,item_status,relink_state)
      values ('${connection}','${user}','item-test','encrypted',${shared ? `'${household}'` : "null"},'needs_reauth','pending_relink','required');
    insert into bank_accounts(id,user_id,bank_connection_id,plaid_account_id,provider_account_id,name,currency,status)
      values ('${selected}','${user}','${connection}','selected-old','selected-old','Selected','CAD','disabled'),
        ('${deselected}','${user}','${connection}','deselected','deselected','Deselected','CAD','active');
    insert into expenses values ('${id(10)}','${user}','plaid','${selected}',now(),'bank_account_inactive',now()),
      ('${id(11)}','${user}','plaid','${deselected}',null,null,now()),
      ('${id(12)}','${user}','plaid','${selected}',now(),'user_deleted',now());
    insert into plaid_link_update_sessions(id,user_id,actor_user_id,connection_id,target_household_id,mode,processing_started_at,expires_at)
      values ('${session}','${shared ? actor : user}','${shared ? actor : user}','${connection}',
        ${shared ? `'${household}'` : "null"},'reconnect',now(),now()+interval '1 hour');
  `);
  await loadFunction(db, "20260719146000_atomic_plaid_update_mode_completion.sql", "complete_plaid_update_mode_v1");
  await loadFunction(db, "20260731150000_plaid_connection_management_recovery.sql", "complete_plaid_update_mode_v2");
  return db;
}

async function complete(db, shared = true, metadata = {}) {
  return db.query(`select public.complete_plaid_update_mode_v2($1,$2,$3,'reconnect',$4,$5,
    array['deselected'],$6,'accounts_updated',null,null) as completed`, [
    shared ? actor : user, connection, session, shared ? household : null,
    JSON.stringify([{ id: selected, user_id: user, bank_connection_id: connection, provider: "plaid",
      plaid_account_id: "selected-new", provider_account_id: "selected-new", name: "Selected", currency: "CAD",
      provider_balance_current_cents: 0 }]),
    JSON.stringify(metadata),
  ]);
}

test("Plaid update SQL: stale Link metadata cannot erase newer webhook completeness", async () => {
  const db = await fixture();
  try {
    await db.exec(await migration("20261002105000_preserve_plaid_update_sync_metadata.sql"));
    await db.query("update bank_connections set metadata=$1", [JSON.stringify({
      plaid_sync_status: { initial_update_complete: true, historical_update_complete: true },
      initial_update_complete: true, historical_update_complete: true,
      sync_status_updated_at: "newer-webhook", server_marker: "preserve",
    })]);
    await complete(db, true, { plaid_sync_status: { initial_update_complete: false, historical_update_complete: false },
      initial_update_complete: false, historical_update_complete: false,
      sync_status_updated_at: "stale-link", institution_name: "Updated Institution" });
    assert.deepEqual((await db.query("select metadata from bank_connections")).rows, [{ metadata: {
      plaid_sync_status: { initial_update_complete: true, historical_update_complete: true },
      initial_update_complete: true, historical_update_complete: true,
      sync_status_updated_at: "newer-webhook", server_marker: "preserve", institution_name: "Updated Institution",
    } }]);
  } finally { await db.close(); }
});

for (const [label, role, shared] of [["personal owner", "owner", false], ["household owner", "owner", true], ["household admin", "admin", true]]) {
  test(`Plaid update SQL: ${label} commits reactivation, deselection, session and queue atomically`, async () => {
    const db = await fixture(role, shared);
    try {
      await db.exec(await migration(fix));
      assert.deepEqual((await complete(db, shared)).rows, [{ completed: true }]);
      assert.deepEqual((await db.query("select status,provider_account_id,provider_balance_current_cents::int as balance from bank_accounts where id=$1", [selected])).rows,
        [{ status: "active", provider_account_id: "selected-new", balance: 0 }]);
      assert.deepEqual((await db.query("select status from bank_accounts where id=$1", [deselected])).rows, [{ status: "disabled" }]);
      assert.deepEqual((await db.query("select deleted_reason from expenses order by id")).rows,
        [{ deleted_reason: null }, { deleted_reason: "bank_account_inactive" }, { deleted_reason: "user_deleted" }]);
      assert.deepEqual((await db.query("select consumed_at is not null as consumed,actor_user_id from plaid_link_update_sessions")).rows,
        [{ consumed: true, actor_user_id: shared ? actor : user }]);
      assert.deepEqual((await db.query("select count(*)::int as count from bank_sync_jobs where status='pending'")).rows, [{ count: 1 }]);
    } finally { await db.close(); }
  });
}

test("Plaid update SQL: household member cannot mutate an owner's bank connection", async () => {
  const db = await fixture("member");
  try {
    await db.exec(await migration(fix));
    await assert.rejects(complete(db), (error) => error.code === "42501");
    assert.deepEqual((await db.query("select status from bank_accounts where id=$1", [selected])).rows, [{ status: "disabled" }]);
    assert.deepEqual((await db.query("select consumed_at from plaid_link_update_sessions")).rows, [{ consumed_at: null }]);
  } finally { await db.close(); }
});

for (const status of ["pending", "processing"]) {
  test(`Plaid update SQL: existing ${status} job retains a follow-up resync signal`, async () => {
    const db = await fixture();
    try {
      await db.exec(await migration(fix));
      await db.exec(await migration(fix));
      await db.query("insert into bank_sync_jobs(bank_connection_id,dedupe_key,status) values ($1,$2,$3)",
        [connection, `transactions_sync:${connection}`, status]);
      await complete(db);
      assert.deepEqual((await db.query("select needs_resync from bank_connections")).rows, [{ needs_resync: true }]);
      assert.deepEqual((await db.query("select count(*)::int as count from bank_sync_jobs")).rows, [{ count: 1 }]);
    } finally { await db.close(); }
  });
}
