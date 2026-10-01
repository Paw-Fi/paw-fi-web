import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";

// Point PGLITE_MODULE_PATH at an isolated PGlite distribution. No production
// connection, npm runner, Docker daemon or Supabase CLI is involved.
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH ?? "@electric-sql/pglite");
const db = new PGlite();
const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const user = id(1);
const otherUser = id(2);
const household = id(21);

async function migration(name) {
  return readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
}

async function loadFunction(file, name) {
  const sql = await migration(file);
  const start = sql.toLowerCase().indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1);
  const opening = sql.indexOf("$$", start);
  const closing = sql.indexOf("$$", opening + 2);
  const functionEnd = sql.indexOf(";", closing) + 1;
  await db.exec(sql.slice(start, functionEnd));
}

async function delta(actor = user, since = null, sinceId = null, limit = 500) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [actor]);
  return (await db.query(
    "select public.get_mobile_transfer_delta_v1($1, $2, $3, $4) as payload",
    [actor, since, sinceId, limit],
  )).rows[0].payload;
}

async function feed(wallet = id(31)) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  return (await db.query(
    "select public.get_user_transactions_page_v6(p_user_id => $1, p_account_id => $2) as payload",
    [user, wallet],
  )).rows[0].payload.items;
}

before(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table public.households (id uuid primary key);
    create table public.household_members (household_id uuid, user_id uuid);
    create table public.user_contacts (id uuid, user_id uuid);
    create table public.accounts (id uuid primary key, name text, icon text, color text);
    create table public.merchants (id uuid primary key, domain text);
    create table public.expenses (
      id uuid primary key, contact_id uuid, user_id uuid, household_id uuid,
      date date, amount_cents bigint, currency text, category text,
      created_at timestamptz, updated_at timestamptz, deleted_at timestamptz,
      raw_text text, merchant text, merchant_id uuid, breakdown jsonb,
      receipt_image_url text, split_group_id uuid, account_id uuid, type text,
      privacy_scope text, is_recurring boolean, analytics_class text,
      analytics_is_final boolean, analytics_spending_multiplier smallint,
      analytics_counts_toward_income boolean, provider_fields jsonb,
      provider text, provider_transaction_id text, bank_account_id uuid,
      parent_recurring_id uuid, scheduled_occurrence_date date,
      recurring_confirmed_at timestamptz, recurring_confirmation_source text
    );
  `);
  const original = await migration("20260331_accounts_feature.sql");
  const tableStart = original.indexOf("create table if not exists public.account_transfers (");
  await db.exec(original.slice(tableStart, original.indexOf("\n);", tableStart) + 3));
  await db.query("insert into auth.users values ($1), ($2)", [user, otherUser]);
  await db.query("insert into public.households values ($1)", [household]);
  await db.query("insert into public.household_members values ($1, $2)", [household, user]);
  for (const wallet of [31, 32, 33, 34]) {
    await db.query("insert into public.accounts values ($1, $2, 'wallet', '#112233')",
      [id(wallet), `Wallet ${wallet}`]);
  }
  for (const [transfer, actor, space] of [[11, user, null], [12, otherUser, null], [13, otherUser, household]]) {
    await db.query(`insert into public.account_transfers
      (id, from_account_id, to_account_id, amount_cents, currency, date,
       created_by_user_id, household_id, created_at, updated_at)
      values ($1, $2, $3, 1000, 'USD', '2026-10-01', $4, $5,
        '2026-10-01T01:00:00Z', '2026-10-01T01:00:00Z')`,
      [id(transfer), id(31), id(32), actor, space]);
  }
  // Load the actual production feed chain, not a synthetic JSON RPC stub.
  await loadFunction("20260716230000_plaid_analytics_classification.sql", "get_user_transactions_page_v2");
  await loadFunction("20260719151000_plaid_recurring_transaction_badges.sql", "get_user_transactions_page_v3");
  await loadFunction("20260722122000_surface_parent_recurring_id_in_mobile_feeds.sql", "get_user_transactions_page_v4");
  await loadFunction("20260726140000_recurring_occurrence_transaction_feed_v5.sql", "get_user_transactions_page_v5");
  await loadFunction("20260915130000_merchant_identity_resolution.sql", "enrich_merchant_identity_items");
  await db.exec(await migration("20261001120000_account_transfer_optional_wall_time.sql"));
  await db.exec(await migration("20261001121000_account_transfer_time_read_sync.sql"));
  await db.exec(await migration("20261001120000_account_transfer_optional_wall_time.sql"));
  await db.exec(await migration("20261001121000_account_transfer_time_read_sync.sql"));
});

after(() => db.close());

test("additive migrations preserve historical dates and unknown clocks", async () => {
  const rows = (await db.query("select date::text, time::text from public.account_transfers")).rows;
  assert.equal(rows.length, 3);
  for (const row of rows) assert.deepEqual(row, { date: "2026-10-01", time: null });
  const payload = await delta();
  assert.equal(payload.transactions.length, 4);
  for (const row of payload.transactions) {
    assert.equal(row.date, "2026-10-01");
    assert.equal(row.transfer_time, null);
  }
});

test("normal feed and delta reflect cross-device changes and explicit clears", async () => {
  await db.query("update public.account_transfers set time = '09:30:00', updated_at = '2026-10-01T02:00:00Z' where id = $1", [id(11)]);
  assert.equal((await feed()).find((row) => row.id.includes(id(11))).transfer_time, "09:30:00");
  await db.query("update public.account_transfers set time = '14:45:00', updated_at = '2026-10-01T03:00:00Z' where id = $1", [id(11)]);
  let payload = await delta(user, "2026-10-01T02:00:00Z");
  assert.equal(payload.transactions.length, 2);
  assert.ok(payload.transactions.every((row) => row.transfer_time === "14:45:00"));
  await db.query("update public.account_transfers set time = null, updated_at = '2026-10-01T04:00:00Z' where id = $1", [id(11)]);
  payload = await delta(user, payload.nextCursor, payload.nextCursorId);
  assert.ok(payload.transactions.every((row) => row.transfer_time === null));
  assert.equal((await feed()).find((row) => row.id.includes(id(11))).transfer_time, null);
});

test("clock payloads do not convert when the PostgreSQL session timezone changes", async () => {
  await db.query("update public.account_transfers set time = '23:45:00' where id = $1", [id(11)]);
  for (const zone of ["Asia/Tokyo", "America/New_York", "Europe/Paris"]) {
    await db.query("select set_config('TimeZone', $1, false)", [zone]);
    const row = (await feed()).find((entry) => entry.id.includes(id(11)));
    assert.equal(row.date, "2026-10-01");
    assert.equal(row.transfer_time, "23:45:00");
  }
});

test("transfer pagination keeps paired rows together and enforces user scope", async () => {
  const seen = [];
  let cursor = null;
  let cursorId = null;
  let payload;
  do {
    payload = await delta(user, cursor, cursorId, 1);
    assert.equal(payload.transactions.length, 2);
    seen.push(...payload.transactions.map((row) => row.id));
    cursor = payload.nextCursor;
    cursorId = payload.nextCursorId;
  } while (payload.hasMore);
  assert.equal(new Set(seen).size, 4);
  assert.ok(seen.every((value) => !value.includes(id(12))));
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [otherUser]);
  await assert.rejects(db.query("select public.get_mobile_transfer_delta_v1($1)", [user]),
    (error) => error.code === "42501");
  await db.exec("reset role");
});

test("cross-device deletes emit both synthetic tombstones and respect scope", async () => {
  await db.query("delete from public.account_transfers where id = $1", [id(11)]);
  const payload = await delta();
  assert.deepEqual(new Set(payload.deletedTransactionIds), new Set([
    `transfer:${id(11)}:in`, `transfer:${id(11)}:out`,
  ]));
  assert.ok(payload.transactions.every((row) => !row.id.includes(id(11))));
  const other = await delta(otherUser);
  assert.deepEqual(other.deletedTransactionIds, []);
});

test("private enrichment and tombstone storage are not publicly accessible", async () => {
  assert.equal((await db.query(
    "select has_function_privilege('anon', 'public.get_mobile_transfer_delta_v1(uuid,timestamptz,uuid,integer)', 'execute') as allowed",
  )).rows[0].allowed, false);
  assert.equal((await db.query(
    "select has_function_privilege('authenticated', 'public.enrich_wallet_transfer_time_items(jsonb)', 'execute') as allowed",
  )).rows[0].allowed, false);
  assert.equal((await db.query(
    "select has_table_privilege('authenticated', 'public.account_transfer_sync_tombstones', 'select') as allowed",
  )).rows[0].allowed, false);
});

test("existing updated-at trigger makes time-only edits visible to delta", async () => {
  await loadFunction("20260115_salt_edge_integration.sql", "update_updated_at_column");
  await db.exec(`create trigger account_transfers_updated_at
    before update on public.account_transfers
    for each row execute function public.update_updated_at_column()`);
  const stamp = (await db.query(`insert into public.account_transfers
    (id, from_account_id, to_account_id, amount_cents, currency, date, time, created_by_user_id)
    values ($1, $2, $3, 1000, 'USD', '2026-10-01', '09:30:00', $4)
    returning updated_at::text as value`, [id(14), id(31), id(32), user])).rows[0].value;
  await new Promise((resolve) => setTimeout(resolve, 5));
  await db.query("update public.account_transfers set time = '14:45:00' where id = $1", [id(14)]);
  const payload = await delta(user, stamp, id(14));
  assert.equal(payload.transactions.length, 2);
  assert.ok(payload.transactions.every((row) => row.transfer_time === "14:45:00"));
});

test("transfer tombstone trigger does not break auth-user cascading deletion", async () => {
  await db.query("insert into auth.users values ($1)", [id(3)]);
  await db.query(`insert into public.account_transfers
    (id, from_account_id, to_account_id, amount_cents, currency, date, created_by_user_id)
    values ($1, $2, $3, 1000, 'USD', '2026-10-01', $4)`, [id(15), id(33), id(34), id(3)]);
  await db.query("delete from auth.users where id = $1", [id(3)]);
  assert.equal((await db.query("select count(*)::integer as count from public.account_transfers where id = $1", [id(15)])).rows[0].count, 0);
  assert.equal((await db.query("select count(*)::integer as count from public.account_transfer_sync_tombstones where created_by_user_id = $1", [id(3)])).rows[0].count, 0);
});
