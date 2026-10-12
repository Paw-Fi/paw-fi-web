import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const household = "99999999-9999-4999-8999-999999999999";
const [A, B, C, D] = [1, 2, 3, 4].map(n => `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${String(n).repeat(12)}`);
const source = await readFile(new URL("../supabase/migrations/20260716143000_harden_settlement_cycles_and_breakdown.sql", import.meta.url), "utf8");
const readMigration = await readFile(new URL("../supabase/migrations/20261012160000_complete_mobile_settlement_reads.sql", import.meta.url), "utf8");
function productionFunction(name) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  const end = source.indexOf("\n$$;", start);
  assert.ok(start >= 0 && end > start, `actual production function ${name}`);
  return source.slice(start, end + 4);
}

async function fixture(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table households(id uuid primary key, currency text);
    create table household_members(household_id uuid, user_id uuid, primary key(household_id,user_id));
    create function is_member_of_household(h uuid, u uuid) returns boolean
      language sql stable security definer set search_path='' as $$
      select exists(select 1 from public.household_members where household_id=h and user_id=u);
    $$;
    create table expenses(id uuid primary key default gen_random_uuid(), deleted_at timestamptz);
    create table expense_split_groups(id uuid primary key default gen_random_uuid(), household_id uuid,
      expense_id uuid, payer_user_id uuid, currency text, split_type text default 'amount',
      total_amount_cents bigint, created_at timestamptz default now(), is_recurring_template boolean default false);
    create table expense_split_lines(id uuid primary key default gen_random_uuid(), split_group_id uuid,
      user_id uuid, amount_cents bigint, is_settled boolean default false);
    create index on expense_split_groups(household_id);
    create index on expense_split_lines(split_group_id);
    create table household_settlement_finalized_split_groups(split_group_id uuid primary key);
    create table household_settlement_events(id uuid primary key default gen_random_uuid(), household_id uuid,
      actor_user_id uuid, payer_user_id uuid, participant_user_id uuid, currency text, amount_cents bigint,
      mode text, is_express_netting boolean, settlement_note text,
      pair_balance_before_cents bigint, pair_balance_after_cents bigint, cleared_pair_balance boolean,
      created_at timestamptz default clock_timestamp(), settlement_ledger_seq bigserial);
    create table notification_events(id uuid default gen_random_uuid(), household_id uuid,
      user_id uuid, event_type text, payload jsonb);
    insert into households values ('${household}', 'EUR');
    insert into auth.users values ('${A}'),('${B}'),('${C}'),('${D}');
    insert into household_members select '${household}'::uuid,id from auth.users;
    grant usage on schema public, auth to authenticated;
    grant select on household_members, expenses, expense_split_groups, expense_split_lines to authenticated;
  `);
  const tableStart = source.indexOf("create table if not exists public.household_settlement_requests_v2 (");
  await db.exec(source.slice(tableStart, source.indexOf("\n);", tableStart) + 4));
  await db.exec("revoke all on household_settlement_requests_v2 from public, anon, authenticated;");
  const balances = productionFunction("households_get_pairwise_settlement_balances_v2")
    .replaceAll("and expense.deleted_at is null", "and expense.deleted_at is null and split_group.is_recurring_template is false");
  await db.exec(balances);
  // Isolation boundary: the full cycle/hash builder and production event triggers
  // are not bootstrapped here. This fixture supplies a pair-scoped opaque token
  // from the actual SQL balances/source rows to exercise the actual V2 writer.
  await db.exec(`
    create function households_build_settlement_snapshot_v3(h uuid,a uuid,m uuid,c text)
    returns jsonb language sql set search_path=public as $$
      with ledger as (
        select jsonb_build_object(
          'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.id)
            from expense_split_lines l join expense_split_groups g on g.id=l.split_group_id
            where g.household_id=h and g.currency=c and
              ((g.payer_user_id=m and l.user_id=a) or (g.payer_user_id=a and l.user_id=m))), '[]'::jsonb),
          'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.id)
            from household_settlement_events e where e.household_id=h and e.currency=c and
              ((e.payer_user_id=m and e.participant_user_id=a) or (e.payer_user_id=a and e.participant_user_id=m))), '[]'::jsonb)
        ) as data
      ) select jsonb_build_object('net_cents', coalesce((select net_cents
        from households_get_pairwise_settlement_balances_v2(h,c) where other_user_id=m),0),
        'snapshot_token', 'v1:' || repeat(md5(ledger.data::text),2)) from ledger;
    $$;
  `);
  await db.exec(productionFunction("households_settle_amount_and_notify_v3_internal")
    .replaceAll("and expense.deleted_at is null", "and expense.deleted_at is null and split_group.is_recurring_template is false"));
  await db.exec(productionFunction("households_settle_amount_and_notify_v2"));
  await db.exec(readMigration);
  return db;
}
const scalar = async (db, sql, values = []) => (await db.query(sql, values)).rows[0].value;
const actor = (db, user) => db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
async function debt(db, payer, debtor, cents) {
  const expense = await scalar(db, "insert into expenses default values returning id as value");
  const group = await scalar(db, `insert into expense_split_groups(household_id,expense_id,payer_user_id,currency,total_amount_cents)
    values ($1,$2,$3,'EUR',$4) returning id as value`, [household, expense, payer, cents]);
  await db.query("insert into expense_split_lines(split_group_id,user_id,amount_cents) values($1,$2,$3)", [group, debtor, cents]);
  await db.query("insert into household_settlement_finalized_split_groups values($1)", [group]);
}
const snapshot = (db, user, member) => scalar(db,
  "select households_build_settlement_snapshot_v3($1,$2,$3,'EUR') as value", [household, user, member]);
async function settle(db, user, member, cents, id, token) {
  await actor(db, user);
  token ??= (await snapshot(db, user, member)).snapshot_token;
  return scalar(db, "select households_settle_amount_and_notify_v2($1,$2,'both',$3,'EUR',$4,$5,null) as value",
    [household, member, cents, token, id]);
}
async function net(db, user, member) {
  await actor(db, user);
  return Number(await scalar(db, "select coalesce((select net_cents from households_get_pairwise_settlement_balances_v2($1,'EUR') where other_user_id=$2),0) as value", [household, member]));
}

test("PG actual writer preserves independent four-member partial debts and immutable replay", async t => {
  const db = await fixture(t);
  await debt(db, B, A, 10000); await debt(db, C, D, 8000);
  const verify = async (ab, dc) => {
    assert.equal(await net(db,A,B),ab); assert.equal(await net(db,B,A),ab === 0 ? 0 : -ab);
    assert.equal(await net(db,D,C),dc); assert.equal(await net(db,C,D),dc === 0 ? 0 : -dc);
    for (const [u,v] of [[A,C],[A,D],[B,C],[B,D]]) assert.equal(await net(db,u,v),0);
  };
  await verify(10000,8000);
  await actor(db,A); const before = await snapshot(db,A,B);
  const first = await settle(db,A,B,4000,"AB-40",before.snapshot_token);
  assert.equal(first.applied_amount_cents,4000); await verify(6000,8000);
  await settle(db,D,C,8000,"DC-80"); await verify(6000,0);
  const replay = await settle(db,A,B,4000,"AB-40",before.snapshot_token);
  assert.equal(replay.replayed,true); assert.equal(replay.settlement_event_id,first.settlement_event_id);
  await verify(6000,0);
  await settle(db,A,B,3000,"AB-30-1"); await verify(3000,0);
  await settle(db,A,B,3000,"AB-30-2"); await verify(0,0);
  assert.equal(Number(await scalar(db,"select count(*) as value from household_settlement_events")),4);
  await actor(db,A);
  const events = await scalar(db,"select households_get_settlement_events_snapshot_v1($1) as value",[household]);
  assert.equal(events.event_count,3);
  assert.equal(events.events.reduce((s,e)=>s+e.amount_cents,0),10000);
  assert.equal(new Set(events.events.map(e=>e.client_mutation_id)).size,3);
  assert.ok(events.events.every(e=>e.participant_user_id===A && e.payer_user_id===B));
});

test("PG rejects stale snapshots, changed request identity, overpayment and nonmember access", async t => {
  const db = await fixture(t); await debt(db,B,A,10000); await actor(db,A);
  const old = await snapshot(db,A,B);
  await settle(db,A,B,4000,"first",old.snapshot_token);
  const conflict = await settle(db,A,B,3000,"stale",old.snapshot_token);
  assert.equal(conflict.status,"snapshot_conflict"); assert.equal(conflict.applied_amount_cents,0);
  await assert.rejects(()=>settle(db,A,B,3000,"first",old.snapshot_token),/settlement_idempotency_key_reused/);
  assert.equal((await settle(db,A,B,6001,"too-much")).status,"snapshot_conflict");
  assert.equal(await net(db,A,B),6000);
  await actor(db,"55555555-5555-4555-8555-555555555555");
  await assert.rejects(()=>scalar(db,"select households_get_settlement_events_snapshot_v1($1) as value",[household]),/Unauthorized/);
  await db.exec("set role authenticated;");
  await assert.rejects(()=>db.query("select * from household_settlement_requests_v2"),/permission denied/);
});

test("PG rolls back event, notification and receipt together after a statement failure", async t => {
  const db = await fixture(t); await debt(db,B,A,10000);
  await db.exec(`create function fail_notification() returns trigger language plpgsql as $$
    begin raise exception 'isolated notification failure'; end; $$;
    create trigger fail_notification before insert on notification_events for each row execute function fail_notification();`);
  await assert.rejects(()=>settle(db,A,B,4000,"rollback"),/isolated notification failure/);
  assert.equal(await net(db,A,B),10000);
  for (const table of ["household_settlement_events","notification_events","household_settlement_requests_v2"]) {
    assert.equal(Number(await scalar(db,`select count(*) as value from ${table}`)),0);
  }
});

test("PG incomplete groups fail closed and explicitly marked templates/deletes retain metadata", async t => {
  const db=await fixture(t); await debt(db,B,A,1000); await actor(db,A);
  const expense=await scalar(db,"insert into expenses default values returning id as value");
  const group=await scalar(db,"insert into expense_split_groups(household_id,expense_id,payer_user_id,currency,total_amount_cents) values($1,$2,$3,'EUR',2000) returning id as value",[household,expense,B]);
  await assert.rejects(()=>scalar(db,"select households_get_split_groups_snapshot_v1($1) as value",[household]),/incomplete_split_group/);
  await db.query("update expense_split_groups set is_recurring_template=true where id=$1",[group]);
  const snapshot=await scalar(db,"select households_get_split_groups_snapshot_v1($1) as value",[household]);
  assert.equal(snapshot.splits.find(row=>row.id===group).is_recurring_template,true);
  assert.equal(await net(db,A,B),1000);
  await db.query("update expenses set deleted_at=now() where id=$1",[expense]);
  const deleted=await scalar(db,"select households_get_split_groups_snapshot_v1($1) as value",[household]);
  assert.equal(deleted.splits.find(row=>row.id===group).expense_deleted,true);
});

for (const count of [100,1000,1001,2000,10000]) {
  test(`PG scalar snapshots retain ${count} groups/events and do not rewrite historical rows`, async t => {
    const db = await fixture(t);
    await db.query(`with added as (insert into expenses(id) select gen_random_uuid() from generate_series(1,$3) returning id)
      insert into expense_split_groups(household_id,expense_id,payer_user_id,currency,total_amount_cents)
      select $1,added.id,$2,'EUR',100 from added`,[household,B,count]);
    await db.query(`insert into expense_split_lines(split_group_id,user_id,amount_cents)
      select id,$1,100 from expense_split_groups`,[A]);
    await db.exec(`insert into household_settlement_finalized_split_groups select id from expense_split_groups`);
    await db.query(`insert into household_settlement_events(household_id,payer_user_id,participant_user_id,actor_user_id,currency,amount_cents)
      select $1,$2,$3,$3,'EUR',40 from generate_series(1,$4)`,[household,B,A,count]);
    await actor(db,A);
    const before = await scalar(db,"select md5(jsonb_agg(to_jsonb(e) order by id)::text) as value from household_settlement_events e");
    const groups = await scalar(db,"select households_get_split_groups_snapshot_v1($1) as value",[household]);
    const events = await scalar(db,"select households_get_settlement_events_snapshot_v1($1) as value",[household]);
    assert.equal(groups.split_count,count); assert.equal(groups.splits.length,count);
    assert.equal(events.event_count,count); assert.equal(events.events.length,count);
    assert.equal(await net(db,A,B),count*60);
    assert.equal(await scalar(db,"select md5(jsonb_agg(to_jsonb(e) order by id)::text) as value from household_settlement_events e"),before);
  });
}
