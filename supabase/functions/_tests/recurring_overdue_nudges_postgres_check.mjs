import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";

// PGLITE_MODULE may point to an existing installation; no production connection
// or package installation is used by this isolated PostgreSQL test harness.
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const migrations = new URL("../../migrations/", import.meta.url);
const owner = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";
const household = "33333333-3333-4333-8333-333333333333";
const series = "44444444-4444-4444-8444-444444444444";
let database;

async function functionSource(file, name) {
  const source = await readFile(new URL(file, migrations), "utf8");
  const start = source.indexOf(`create or replace function public.${name}(`);
  const end = source.indexOf("\n$$;", start);
  assert.ok(start >= 0 && end > start, `Production function ${name} exists`);
  return source.slice(start, end + 4);
}

async function scalar(sql, parameters = []) {
  return (await database.query(sql, parameters)).rows[0].value;
}

async function configure({
  frequency = "monthly", anchor = "2026-09-30", dueTime,
  timezone = "UTC", privacy = "full", householdId = null,
  extraRule = {},
} = {}) {
  await database.query(
    "update user_contacts set preferred_timezone = $1 where user_id = $2",
    [timezone, owner],
  );
  await database.query(
    `insert into expenses
      (id, user_id, household_id, privacy_scope, category, amount_cents,
       currency, type, is_recurring, recurrence_rule)
     values ($1, $2, $3, $4, 'housing', 1200, 'EUR', 'expense', true, $5)`,
    [series, owner, householdId, privacy, JSON.stringify({
      frequency, anchor_date: anchor,
      reminder: { enabled: false },
      ...(dueTime ? { due_time: dueTime } : {}), ...extraRule,
    })],
  );
}

const enqueue = (now) => scalar(
  "select enqueue_recurring_overdue_confirmation_nudges_v1($1::timestamptz) as value",
  [now],
);
const events = () => database.query(
  "select * from notification_events where event_type = 'recurring_reminder' order by created_at, id",
).then((result) => result.rows);

async function claimFixture({ phase = "overdue", stage = 1, recipient = owner } = {}) {
  // Place the recipient at local 12:20 regardless of the host wall clock.
  const utcMinutes = Number(await scalar(
    "select extract(hour from now() at time zone 'UTC') * 60 + extract(minute from now() at time zone 'UTC') as value",
  ));
  const minutes = 12 * 60 + 20 - utcMinutes;
  const magnitude = Math.abs(minutes);
  const timezone = `UTC${minutes < 0 ? "-" : "+"}${Math.floor(magnitude / 60)}:${String(magnitude % 60).padStart(2, "0")}`;
  const date = await scalar(
    "select (now() at time zone 'UTC' + make_interval(mins => $1))::date::text as value",
    [minutes],
  );
  await configure({ frequency: "daily", anchor: date, dueTime: "11:00:00", timezone });
  if (recipient !== owner) {
    await database.query("update user_contacts set preferred_timezone = $1 where user_id = $2", [timezone, recipient]);
  }
  const id = await scalar(
    `insert into notification_events(user_id, event_type, payload)
     values ($1, 'recurring_reminder', jsonb_build_object(
       'expense_id', $2::text, 'occurrence_date', $3::text,
       'phase', $4::text, 'stage', $5::int,
       'expires_at', now() + interval '12 hours')) returning id as value`,
    [recipient, series, date, phase, stage],
  );
  return { id, date };
}

before(async () => {
  database = new PGlite();
  await database.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create table households(id uuid primary key, is_portfolio boolean default false);
    create table user_contacts(id uuid primary key default gen_random_uuid(),
      user_id uuid, preferred_timezone text, created_at timestamptz default now(),
      updated_at timestamptz default now());
    create table household_members(household_id uuid, user_id uuid,
      primary key(household_id, user_id));
    create table expenses(id uuid primary key, user_id uuid, household_id uuid,
      privacy_scope text, category text, amount_cents bigint, currency text,
      type text, is_recurring boolean, recurrence_rule jsonb, deleted_at timestamptz);
    create table recurring_occurrences(id uuid primary key default gen_random_uuid(),
      recurring_id uuid, scheduled_occurrence_date date, status text);
    create table notification_events(id uuid primary key default gen_random_uuid(),
      household_id uuid, user_id uuid, event_type text, payload jsonb,
      is_sent boolean default false, sent_at timestamptz, created_at timestamptz default now(),
      processing_started_at timestamptz, delivery_error text);
    create schema cron;
    create table cron.jobs(name text primary key, schedule text, command text);
    create function cron.unschedule(text) returns boolean language sql as
      'delete from cron.jobs where name = $1 returning true';
    create function cron.schedule(text, text, text) returns bigint language sql as
      'insert into cron.jobs values ($1,$2,$3) returning 1::bigint';
  `);
  for (const [file, name] of [
    ["20260408170000_add_recurring_aware_wallets_and_pockets_rpcs.sql", "make_clamped_calendar_date_v1"],
    ["20260716150000_fix_recurring_reminder_occurrence_selection.sql", "calculate_next_occurrence_on_or_after"],
    ["20260726120000_recurring_occurrence_rpcs.sql", "recurring_occurrence_is_scheduled_v1"],
    ["20260716170000_restore_notification_fallback_processing.sql", "claim_notification_event"],
  ]) await database.exec(await functionSource(file, name));
  await database.exec("revoke execute on function claim_notification_event(uuid) from public, anon, authenticated");
  await database.exec(await readFile(new URL(
    "20261003130000_recurring_overdue_confirmation_nudges.sql", migrations,
  ), "utf8"));
});

after(async () => { await database?.close(); });
beforeEach(async () => {
  await database.exec(`
    truncate recurring_overdue_nudges_sent, notification_events,
      recurring_occurrences, expenses, household_members, households,
      user_contacts, auth.users cascade;
    set timezone = 'UTC';
  `);
  await database.query("insert into auth.users values ($1), ($2)", [owner, member]);
  await database.query("insert into user_contacts(user_id, preferred_timezone) values ($1, 'UTC'), ($2, 'UTC')", [owner, member]);
  await database.query("insert into households(id) values ($1)", [household]);
  await database.query("insert into household_members values ($1, $2), ($1, $3)", [household, owner, member]);
});

test("migration creates a service-only ledger and schedules its producer", async () => {
  assert.equal(await scalar("select relrowsecurity as value from pg_class where oid = 'recurring_overdue_nudges_sent'::regclass"), true);
  assert.equal(await scalar("select has_table_privilege('authenticated', 'recurring_overdue_nudges_sent', 'SELECT') as value"), false);
  assert.equal(await scalar("select has_function_privilege('authenticated', 'claim_notification_event(uuid)', 'EXECUTE') as value"), false);
  assert.equal(await scalar("select schedule as value from cron.jobs"), "*/10 * * * *");
});

test("monthly days 1/3 are idempotent and independent of reminder enablement", async () => {
  await configure();
  assert.equal(await enqueue("2026-10-01T08:59:59Z"), 0);
  assert.equal(await enqueue("2026-10-01T09:00:00Z"), 1);
  assert.equal(await enqueue("2026-10-01T09:10:00Z"), 0);
  assert.equal(await enqueue("2026-10-02T09:00:00Z"), 0);
  assert.equal(await enqueue("2026-10-03T09:00:00Z"), 1);
  assert.deepEqual((await events()).map((event) => event.payload.stage), [1, 3]);
  assert.equal((await events())[0].payload.occurrence_date, "2026-09-30");
});

test("daily hours 1/3 follow a saved time and recover a delayed cron", async () => {
  await configure({ frequency: "daily", anchor: "2026-10-03", dueTime: "14:30:00" });
  assert.equal(await enqueue("2026-10-03T15:29:59Z"), 0);
  assert.equal(await enqueue("2026-10-03T15:50:00Z"), 1);
  assert.equal(await enqueue("2026-10-03T17:30:00Z"), 1);
  assert.deepEqual((await events()).map((event) => event.payload.stage), [1, 3]);
});

test("legacy daily schedules fall back to 09:00", async () => {
  await configure({ frequency: "daily", anchor: "2026-10-03" });
  assert.equal(await enqueue("2026-10-03T09:59:59Z"), 0);
  assert.equal(await enqueue("2026-10-03T10:00:00Z"), 1);
  assert.equal(await enqueue("2026-10-03T12:00:00Z"), 1);
});

test("configured daily and weekly intervals exclude off-schedule dates", async () => {
  await configure({ frequency: "daily", anchor: "2026-10-01", extraRule: { interval: 3 } });
  assert.equal(await enqueue("2026-10-02T10:00:00Z"), 0);
  assert.equal(await enqueue("2026-10-04T10:00:00Z"), 1);
  await database.query("update expenses set recurrence_rule = $1 where id = $2", [JSON.stringify({ frequency: "weekly", anchor_date: "2026-09-30", interval: 2 }), series]);
  assert.equal(await enqueue("2026-10-08T09:00:00Z"), 0);
  assert.equal(await enqueue("2026-10-15T09:00:00Z"), 1);
});

test("late daily clocks retain yesterday's occurrence identity", async () => {
  await configure({ frequency: "daily", anchor: "2026-10-03", dueTime: "23:30:00" });
  assert.equal(await enqueue("2026-10-04T00:30:00Z"), 1);
  assert.equal(await enqueue("2026-10-04T02:30:00Z"), 1);
  assert.ok((await events()).every((event) => event.payload.occurrence_date === "2026-10-03"));
});

for (const frequency of ["weekly", "biweekly", "yearly"]) {
  test(`${frequency} occurrences use day offsets rather than daily hours`, async () => {
    await configure({ frequency, anchor: "2026-09-30" });
    assert.equal(await enqueue("2026-10-01T09:00:00Z"), 1);
    assert.equal(await enqueue("2026-10-03T09:00:00Z"), 1);
  });
}

test("monthly clamping and final end dates keep both post-due nudges", async () => {
  await configure({ anchor: "2026-01-31", extraRule: { end_date: "2026-02-28" } });
  assert.equal(await enqueue("2026-03-01T09:00:00Z"), 1);
  assert.equal(await enqueue("2026-03-03T09:00:00Z"), 1);
  assert.equal(await enqueue("2026-04-01T09:00:00Z"), 0);
  assert.equal((await events())[0].payload.occurrence_date, "2026-02-28");
});

test("yearly leap-day clamping keeps the scheduled February identity", async () => {
  await configure({ frequency: "yearly", anchor: "2024-02-29" });
  assert.equal(await enqueue("2025-03-01T09:00:00Z"), 1);
  assert.equal((await events())[0].payload.occurrence_date, "2025-02-28");
});

test("a passed stage window does not generate a historical backlog", async () => {
  await configure();
  assert.equal(await enqueue("2026-10-01T09:30:00Z"), 0);
  assert.equal(await enqueue("2026-10-10T09:00:00Z"), 0);
});

for (const status of ["confirmed", "skipped"]) {
  test(`${status} occurrences are suppressed before enqueue and delivery`, async () => {
    const { id, date } = await claimFixture();
    await database.query("insert into recurring_occurrences(recurring_id, scheduled_occurrence_date, status) values ($1,$2,$3)", [series, date, status]);
    assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
    assert.equal(await enqueue(`${date}T12:00:00Z`), 0);
    assert.equal((await events())[0].is_sent, true);
  });
}

test("excluded and soft-deleted series do not enqueue nudges", async () => {
  await configure({ extraRule: { excluded_dates: ["2026-09-30"] } });
  assert.equal(await enqueue("2026-10-01T09:00:00Z"), 0);
  await database.query("update expenses set recurrence_rule = recurrence_rule - 'excluded_dates', deleted_at = now() where id = $1", [series]);
  assert.equal(await enqueue("2026-10-01T09:00:00Z"), 0);
});

test("recipient IANA timezone controls generation and DST gap normalization", async () => {
  await configure({ timezone: "America/New_York" });
  assert.equal(await enqueue("2026-10-01T12:59:59Z"), 0);
  assert.equal(await enqueue("2026-10-01T13:00:00Z"), 1);
  await database.query("update expenses set recurrence_rule = $1 where id = $2", [JSON.stringify({ frequency: "daily", anchor_date: "2026-03-08", due_time: "01:30:00" }), series]);
  assert.equal(await enqueue("2026-03-08T07:30:00Z"), 1);
  assert.equal((await events()).find((event) => event.payload.occurrence_date === "2026-03-08").payload.stage, 1);
});

test("DST repeated clocks use one deterministic instant per overdue stage", async () => {
  await configure({ frequency: "daily", anchor: "2026-11-01", dueTime: "00:30:00", timezone: "America/New_York" });
  assert.equal(await enqueue("2026-11-01T05:30:00Z"), 0);
  assert.equal(await enqueue("2026-11-01T06:30:00Z"), 1);
  assert.equal(await enqueue("2026-11-01T06:40:00Z"), 0);
  assert.equal(await enqueue("2026-11-01T08:30:00Z"), 1);
  assert.deepEqual((await events()).map((event) => event.payload.stage), [1, 3]);
});

test("fixed offsets ignore session timezone and reject invalid minute offsets", async () => {
  await configure({ timezone: "UTC+05:30" });
  await database.exec("set timezone = 'America/Los_Angeles'");
  assert.equal(await enqueue("2026-10-01T03:30:00Z"), 1);
  assert.equal(await scalar("select recurring_recipient_wall_now_v1($1, '2026-10-01T03:30:00Z')::text as value", [owner]), "2026-10-01 09:00:00");
  await database.query("update user_contacts set preferred_timezone = 'UTC+05:99' where user_id = $1", [owner]);
  assert.equal(await scalar("select recurring_recipient_wall_now_v1($1, '2026-10-01T03:30:00Z')::text as value", [owner]), "2026-10-01 03:30:00");
});

test("explicit fourteen-hour offsets round-trip and schedule at local 09:00", async () => {
  await configure({ timezone: "UTC+14:00" });
  assert.equal(await enqueue("2026-09-30T19:00:00Z"), 1);
  assert.equal(await scalar("select recurring_recipient_wall_now_v1($1, '2026-09-30T19:00:00Z')::text as value", [owner]), "2026-10-01 09:00:00");
  assert.equal(await scalar("select to_char(recurring_wall_timestamp_to_utc_v1('2026-10-01 09:00:00', $1) at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as value", [owner]), "2026-09-30 19:00:00");
  await database.query("update user_contacts set preferred_timezone = 'UTC-14:00' where user_id = $1", [owner]);
  assert.equal(await scalar("select recurring_recipient_wall_now_v1($1, '2026-10-01T23:00:00Z')::text as value", [owner]), "2026-10-01 09:00:00");
  assert.equal(await scalar("select to_char(recurring_wall_timestamp_to_utc_v1('2026-10-01 09:00:00', $1) at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as value", [owner]), "2026-10-01 23:00:00");
});

test("shared recipients have separate occurrence/stage delivery identities", async () => {
  await configure({ householdId: household });
  assert.equal(await enqueue("2026-10-01T09:00:00Z"), 2);
  assert.deepEqual(new Set((await events()).map((event) => event.user_id)), new Set([owner, member]));
});

test("private recurring activity only nudges its owner", async () => {
  await configure({ householdId: household, privacy: "private" });
  assert.equal(await enqueue("2026-10-01T09:00:00Z"), 1);
  assert.equal((await events())[0].user_id, owner);
});

test("private portfolio rows remain owner-only even with full row privacy", async () => {
  await database.query("update households set is_portfolio = true where id = $1", [household]);
  await configure({ householdId: household });
  assert.equal(await enqueue("2026-10-01T09:00:00Z"), 1);
  assert.equal((await events())[0].user_id, owner);
});

test("a queued portfolio event cannot be claimed by another member", async () => {
  const { id } = await claimFixture({ recipient: member });
  await database.query("update households set is_portfolio = true where id = $1", [household]);
  await database.query("update expenses set household_id = $1 where id = $2", [household, series]);
  await database.query("update notification_events set household_id = $1 where id = $2", [household, id]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  assert.equal((await events())[0].is_sent, true);
  assert.equal((await events())[0].delivery_error, "Recurring occurrence is no longer eligible for delivery");
});

test("an eligible claim succeeds once and retains the active lease", async () => {
  const { id } = await claimFixture();
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), true);
  const firstLease = (await events())[0].processing_started_at;
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  assert.deepEqual((await events())[0].processing_started_at, firstLease);
});

test("edited due clocks and expired events cannot deliver stale nudges", async () => {
  const { id } = await claimFixture();
  await database.query("update expenses set recurrence_rule = jsonb_set(recurrence_rule, '{due_time}', '\"22:00:00\"') where id = $1", [series]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  await database.query("update notification_events set payload = jsonb_set(payload, '{expires_at}', to_jsonb(now() - interval '1 minute')) where id = $1", [id]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  assert.equal((await events())[0].is_sent, true);
  assert.equal((await events())[0].delivery_error, "Recurring confirmation nudge expired before delivery");
});

test("authorized shared members can claim their own notification", async () => {
  const { id } = await claimFixture({ recipient: member });
  await database.query("update expenses set household_id = $1 where id = $2", [household, series]);
  await database.query("update notification_events set household_id = $1 where id = $2", [household, id]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), true);
});

test("removed members and changed privacy suppress queued household deliveries", async () => {
  const { id } = await claimFixture({ recipient: member });
  await database.query("update expenses set household_id = $1 where id = $2", [household, series]);
  await database.query("update notification_events set household_id = $1 where id = $2", [household, id]);
  await database.query("delete from household_members where household_id = $1 and user_id = $2", [household, member]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  assert.equal((await events())[0].delivery_error, "Recurring occurrence is no longer eligible for delivery");
  await database.query("insert into household_members values ($1,$2)", [household, member]);
  await database.query("update expenses set privacy_scope = 'private' where id = $1", [series]);
  await database.query("update notification_events set is_sent = false, sent_at = null, delivery_error = null where id = $1", [id]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  assert.equal((await events())[0].delivery_error, "Recurring occurrence is no longer eligible for delivery");
});

test("a recurrence edit invalidates queued occurrence dates", async () => {
  const { id, date } = await claimFixture();
  await database.query("update expenses set recurrence_rule = jsonb_set(recurrence_rule, '{anchor_date}', to_jsonb(($1::date + 1)::text)) where id = $2", [date, series]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  assert.equal((await events())[0].delivery_error, "Recurring occurrence is no longer eligible for delivery");
});

test("quiet-hour deferred stage 1 collapses into stage 3", async () => {
  const { id, date } = await claimFixture();
  await database.query("update expenses set recurrence_rule = jsonb_set(recurrence_rule, '{due_time}', '\"09:00:00\"') where id = $1", [series]);
  const third = await scalar("insert into notification_events(user_id, event_type, payload) select user_id, event_type, jsonb_set(payload, '{stage}', '3') from notification_events where id = $1 returning id as value", [id]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
  assert.equal(await scalar("select claim_notification_event($1) as value", [third]), true);
  assert.equal((await events()).find((event) => event.id === id).is_sent, true);
  assert.equal((await events()).find((event) => event.id === third).payload.occurrence_date, date);
});

test("upcoming reminders disabled after enqueue are suppressed", async () => {
  const { id } = await claimFixture({ phase: "upcoming" });
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
});

test("non-recurring notifications keep their original claim contract", async () => {
  const id = await scalar("insert into notification_events(user_id, event_type, payload) values ($1, 'expense_added', '{}') returning id as value", [owner]);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), true);
  assert.equal(await scalar("select claim_notification_event($1) as value", [id]), false);
});
