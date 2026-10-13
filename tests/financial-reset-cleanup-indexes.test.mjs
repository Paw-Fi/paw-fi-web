import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../supabase/migrations/", import.meta.url);
const migration = await readFile(
  new URL(
    "20261013140000_index_financial_reset_plaid_dependencies.sql",
    migrations,
  ),
  "utf8",
);
const reset = await readFile(
  new URL("20260801180000_finalize_financial_data_reset.sql", migrations),
  "utf8",
);
const personal = "11111111-1111-4111-8111-111111111111";
const household = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";

// Only the three affected cleanup phases and their real PostgreSQL FK actions
// are bootstrapped. This does not invoke the full reset, HTTP, or production.
async function fixture(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create table bank_sync_jobs (
      id uuid primary key,
      bank_connection_id uuid not null,
      superseded_by_job_id uuid references bank_sync_jobs(id) on delete set null
    );
    create index on bank_sync_jobs(bank_connection_id);
    create table bank_sync_audit (
      id uuid primary key,
      bank_connection_id uuid not null
    );
    create index on bank_sync_audit(bank_connection_id);
    create table plaid_sync_events (
      id uuid primary key,
      bank_connection_id uuid not null,
      bank_sync_audit_id uuid references bank_sync_audit(id) on delete set null
    );
    create index on plaid_sync_events(bank_connection_id);
    insert into bank_sync_jobs
      select md5('job-' || i)::uuid,
        case when i <= 723 then '${personal}'::uuid
          when i <= 725 then '${household}'::uuid else '${other}'::uuid end,
        null
      from generate_series(1, 20000) i;
    update bank_sync_jobs set superseded_by_job_id = md5('job-1')::uuid
      where id = md5('job-724')::uuid;
    update bank_sync_jobs set superseded_by_job_id = md5('job-2')::uuid
      where id = md5('job-726')::uuid;
    update bank_sync_jobs set superseded_by_job_id = md5('job-800')::uuid
      where id = md5('job-727')::uuid;
    insert into bank_sync_audit
      select md5('audit-' || i)::uuid,
        case when i <= 723 then '${personal}'::uuid
          when i <= 725 then '${household}'::uuid else '${other}'::uuid end
      from generate_series(1, 3000) i;
    insert into plaid_sync_events
      select md5('event-' || i)::uuid,
        case when i <= 2169 then '${personal}'::uuid
          when i = 2170 then '${household}'::uuid else '${other}'::uuid end,
        md5('audit-' || case
          when i <= 2169 then (1 + (i - 1) % 723)::text
          when i = 2170 then '1' when i = 2171 then '2' else '1000' end)::uuid
      from generate_series(1, 12000) i;
    analyze bank_sync_jobs;
    analyze bank_sync_audit;
    analyze plaid_sync_events;
  `);
  return db;
}

const scalar = async (db, sql, params = []) =>
  (await db.query(sql, params)).rows[0].value;

async function lookupPlan(db, table, column, prefix) {
  const result = await db.query(
    `explain (format json) select 1 from public.${table}
     where $1::uuid = ${column}`,
    [await scalar(db, "select md5($1)::uuid as value", [`${prefix}-1`])],
  );
  return result.rows[0]["QUERY PLAN"][0].Plan;
}

function planNodes(plan) {
  return [plan, ...(plan.Plans ?? []).flatMap(planNodes)];
}

test("reset FK lookups use partial indexes with generic parameters", async (t) => {
  const db = await fixture(t);
  await db.exec("set plan_cache_mode = force_generic_plan");
  const lookups = [
    [
      "bank_sync_jobs",
      "superseded_by_job_id",
      "job",
      "bank_sync_jobs_superseded_by_job_idx",
    ],
    [
      "plaid_sync_events",
      "bank_sync_audit_id",
      "audit",
      "plaid_sync_events_bank_sync_audit_idx",
    ],
  ];
  for (const [table, column, prefix] of lookups) {
    const baseline = await lookupPlan(db, table, column, prefix);
    assert.ok(
      planNodes(baseline).some((node) => node["Node Type"] === "Seq Scan"),
    );
  }
  await db.exec(migration);
  for (const [table, column, prefix, index] of lookups) {
    const indexed = await lookupPlan(db, table, column, prefix);
    assert.ok(
      planNodes(indexed).some((node) => node["Index Name"] === index),
      `${table}.${column} must use its FK index`,
    );
    assert.ok(
      !planNodes(indexed).some((node) => node["Node Type"] === "Seq Scan"),
    );
  }
});

test("actual reset cleanup preserves surviving rows and SET NULL dependencies", async (t) => {
  const db = await fixture(t);
  await db.exec(migration);
  for (const [table, expected] of [
    ["plaid_sync_events", 2169],
    ["bank_sync_audit", 723],
    ["bank_sync_jobs", 723],
  ]) {
    const statement = reset.match(
      new RegExp(
        `delete from public\\.${table} \\w+\\s+where \\w+\\.bank_connection_id = any\\(v_plaid_connection_ids\\);`,
      ),
    );
    assert.ok(statement, `production reset DELETE for ${table}`);
    const result = await db.query(
      statement[0].replace("v_plaid_connection_ids", "$1::uuid[]"),
      [[personal]],
    );
    assert.equal(result.affectedRows, expected);
  }
  assert.equal(
    await scalar(db, "select count(*)::int as value from bank_sync_jobs"),
    19277,
  );
  assert.equal(
    await scalar(db, "select count(*)::int as value from bank_sync_audit"),
    2277,
  );
  assert.equal(
    await scalar(db, "select count(*)::int as value from plaid_sync_events"),
    9831,
  );
  for (const id of [724, 726]) {
    assert.equal(
      await scalar(
        db,
        "select superseded_by_job_id as value from bank_sync_jobs where id = md5($1)::uuid",
        [`job-${id}`],
      ),
      null,
    );
  }
  for (const id of [2170, 2171]) {
    assert.equal(
      await scalar(
        db,
        "select bank_sync_audit_id as value from plaid_sync_events where id = md5($1)::uuid",
        [`event-${id}`],
      ),
      null,
    );
  }
  assert.equal(
    await scalar(
      db,
      "select superseded_by_job_id = md5('job-800')::uuid as value from bank_sync_jobs where id = md5('job-727')::uuid",
    ),
    true,
  );
  assert.equal(
    await scalar(
      db,
      "select bank_sync_audit_id = md5('audit-1000')::uuid as value from plaid_sync_events where id = md5('event-2172')::uuid",
    ),
    true,
  );
  assert.equal(
    await scalar(
      db,
      "select count(*)::int as value from bank_sync_jobs where bank_connection_id = $1::uuid",
      [household],
    ),
    2,
  );
});

test("index migration is repeatable and leaves existing data and FK actions intact", async (t) => {
  const db = await fixture(t);
  const snapshot = async () => {
    const rows = [];
    for (const table of [
      "bank_sync_jobs",
      "bank_sync_audit",
      "plaid_sync_events",
    ]) {
      rows.push(
        await scalar(
          db,
          `select md5(string_agg(row_to_json(t)::text, '' order by id)) as value from ${table} t`,
        ),
      );
    }
    return rows;
  };
  const before = await snapshot();
  await db.exec(migration);
  await db.exec(migration);
  assert.deepEqual(await snapshot(), before);
  const foreignKeys = await db.query(
    "select confdeltype from pg_constraint where contype = 'f' order by conname",
  );
  assert.deepEqual(
    foreignKeys.rows.map((row) => row.confdeltype),
    ["n", "n"],
  );
  assert.equal(
    await scalar(
      db,
      `
    select count(*)::int as value from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where c.relname in ('bank_sync_jobs_superseded_by_job_idx', 'plaid_sync_events_bank_sync_audit_idx')
      and i.indisvalid and i.indisready and not i.indisunique
      and pg_get_expr(i.indpred, i.indrelid) in
        ('(superseded_by_job_id IS NOT NULL)', '(bank_sync_audit_id IS NOT NULL)')
  `,
    ),
    2,
  );
});
