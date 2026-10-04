// Isolated PostgreSQL execution. No connection to a deployed database.
// Run with Deno's cached @electric-sql/pglite 0.3.14 runtime.
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";

const actor = "00000000-0000-0000-0000-000000000001";
const member = "00000000-0000-0000-0000-000000000002";
const space = "00000000-0000-0000-0000-000000000003";
const lineage = "00000000-0000-0000-0000-000000000004";
const migrations = new URL("../migrations/", import.meta.url);

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function fixture() {
  const db = new PGlite();
  // Auth and household infrastructure are fixtures; the relevant Pocket DDL,
  // deletion function and both new migrations are executed from repository SQL.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.household_members (household_id uuid, user_id uuid);
    create function public.is_member_of_household(p_id uuid) returns boolean
      language sql stable as $$ select exists(select 1 from public.household_members
        where household_id = p_id and user_id = auth.uid()) $$;
    create table public.shared_budgets (
      id uuid primary key default gen_random_uuid(), household_id uuid not null,
      user_id uuid, budget_type text not null, currency text, period text,
      constraint unique_household_currency_period unique(household_id, currency, period));
    insert into auth.users values ('${actor}'), ('${member}');
    insert into public.household_members values ('${space}', '${actor}'), ('${space}', '${member}');
    select set_config('request.jwt.claim.sub', '${actor}', false);
  `);
  const initial = await Deno.readTextFile(
    new URL("20251009_envelopes.sql", migrations),
  );
  await db.exec(initial.slice(0, initial.indexOf("-- Row Level Security:")));
  await db.exec(`alter table public.budget_envelopes
    add column budget_amount_cents bigint not null default 0,
    add column logo_url text,
    add column rollover_group_id uuid not null default gen_random_uuid(),
    add column rollover_enabled boolean not null default false,
    add column rollover_negative boolean not null default false,
    add column rollover_cap_cents bigint,
    add column opening_rollover_cents bigint not null default 0;
    create function public.get_pockets_month_v3(uuid,text,date,uuid,text,boolean,boolean)
    returns jsonb language sql stable as $$ select jsonb_build_object('selected_currency', $5) $$;
  `);
  // Named argument names must match the production read contract.
  await db.exec(
    `drop function public.get_pockets_month_v3(uuid,text,date,uuid,text,boolean,boolean);
    create function public.get_pockets_month_v3(p_user_id uuid,p_scope text,p_budget_month date,
      p_household_id uuid,p_currency text,p_include_projected_recurring boolean,p_allow_currency_fallback boolean)
    returns jsonb language sql stable as $$ select jsonb_build_object('selected_currency', p_currency) $$;`,
  );
  const deletion = await Deno.readTextFile(
    new URL("20260708093000_pocket_delete_cleanup.sql", migrations),
  );
  const start = deletion.indexOf(
    "create or replace function public.delete_pocket_envelope_with_allocations(",
  );
  await db.exec(deletion.slice(start, deletion.indexOf("$$;", start) + 3));
  for (
    const file of [
      "20261004120000_scope_shared_budget_uniqueness.sql",
      "20261004143000_pocket_month_revision_rpc.sql",
    ]
  ) {
    await db.exec(await Deno.readTextFile(new URL(file, migrations)));
  }
  return db;
}

async function save(
  db: PGlite,
  id: string,
  revision: number,
  snapshot: object,
  scope = "personal",
  household: string | null = null,
  month = "2026-10-05",
) {
  const result = await db.query<{ result: Record<string, unknown> }>(
    `select public.save_pockets_month_v1(auth.uid(),$1,$2::uuid,$3::date,'USD',$4::bigint,$5,$6::jsonb) result`,
    [scope, household, month, revision, id, JSON.stringify(snapshot)],
  );
  return result.rows[0].result;
}
const pocket = (id: string, amount = 10000, group?: string) => ({
  id,
  name: "Groceries",
  currency: "USD",
  budgetAmountCents: amount,
  categories: ["groceries"],
  ...(group ? { rolloverGroupId: group, rolloverEnabled: true } : {}),
});
const plan = (pockets: object[], total = 10000) => ({
  totalBudgetCents: total,
  pockets,
});

Deno.test("Pocket CAS: create defaults, lineage, retry and atomic stale rejection", async () => {
  const db = await fixture();
  try {
    const snapshot = plan([pocket("optimistic-new")]);
    const first = await save(db, "first", 0, snapshot);
    assert(
      first.success === true && first.revision === 1,
      "create advances exactly once",
    );
    const canonical =
      (first.canonicalPocketIds as Record<string, string>)["optimistic-new"];
    const group = (await db.query<{ rollover_group_id: string }>(
      "select rollover_group_id from budget_envelopes",
    )).rows[0].rollover_group_id;
    assert(group, "new Pocket receives its non-null default lineage");
    assert(
      (await save(db, "first", 0, snapshot)).revision === 1,
      "retry returns original receipt",
    );
    assert(
      (await save(db, "stale", 0, plan([pocket(canonical, 20000)], 20000)))
        .code === "REVISION_CONFLICT",
      "stale plan rejected",
    );
    assert(
      (await db.query<{ amount_cents: number }>(
        "select amount_cents from envelope_allocations",
      )).rows[0].amount_cents === 10000,
      "stale allocation never written",
    );
    await save(
      db,
      "copy",
      0,
      plan([pocket("optimistic-copy", 10000, lineage)]),
      "personal",
      null,
      "2026-11-05",
    );
    assert(
      (await db.query<{ count: number }>(
        "select count(*)::int count from budget_envelopes where rollover_group_id=$1",
        [lineage],
      )).rows[0].count === 1,
      "copy retains source lineage",
    );
    await save(
      db,
      "upsert",
      1,
      plan([pocket("optimistic-retry-name")]),
      "personal",
      null,
      "2026-11-05",
    );
    assert(
      (await db.query<{ count: number }>(
        "select count(*)::int count from budget_envelopes where rollover_group_id=$1",
        [lineage],
      )).rows[0].count === 1,
      "upsert without lineage preserves existing lineage",
    );
    let rejected = false;
    try {
      await save(
        db,
        "invalid",
        1,
        plan([pocket(canonical, 20000), {
          ...pocket("optimistic-bad"),
          currency: "EUR",
        }], 30000),
      );
    } catch {
      rejected = true;
    }
    assert(rejected, "foreign-currency snapshot is rejected");
    assert(
      (await db.query<{ revision: number }>(
        "select revision from pocket_month_revisions where period_month='2026-10-01'",
      )).rows[0].revision === 1,
      "failed transaction rolls back revision",
    );
    assert(
      (await db.query<{ total_budget_cents: number }>(
        "select total_budget_cents from budgets where period_month='2026-10-01'",
      )).rows[0].total_budget_cents === 10000,
      "failed transaction rolls back budget",
    );
  } finally {
    await db.close();
  }
});

Deno.test("Pocket household member updates creator plan without duplicate budget or owner rewrite", async () => {
  const db = await fixture();
  try {
    const first = await save(
      db,
      "owner",
      0,
      plan([pocket("optimistic-shared")]),
      "household",
      space,
    );
    const canonical =
      (first.canonicalPocketIds as Record<string, string>)["optimistic-shared"];
    await db.exec(
      `select set_config('request.jwt.claim.sub', '${member}', false)`,
    );
    const changed = await save(
      db,
      "member",
      1,
      plan([pocket(canonical, 12000)], 12000),
      "household",
      space,
    );
    assert(
      changed.success === true && changed.budgetId === first.budgetId,
      "member updates the existing budget",
    );
    assert(
      (await db.query<{ user_id: string }>(
        "select user_id from budget_envelopes",
      )).rows[0].user_id === actor,
      "envelope creator preserved",
    );
    assert(
      (await db.query<{ count: number }>(
        "select count(*)::int count from budgets",
      )).rows[0].count === 1,
      "one shared budget",
    );
    const afterDelete = await save(
      db,
      "member-delete",
      2,
      { ...plan([], 12000), deletedPocketIds: [canonical] },
      "household",
      space,
    );
    assert(
      afterDelete.success === true,
      "member can use the production allocation-aware delete RPC",
    );
    assert(
      (await db.query<{ count: number }>(
        "select count(*)::int count from budget_envelopes",
      )).rows[0].count === 0,
      "delete committed",
    );
  } finally {
    await db.close();
  }
});

Deno.test("Legacy direct Pocket writes invalidate CAS revisions, including non-anchor allocations", async () => {
  const db = await fixture();
  try {
    const first = await save(
      db,
      "initial",
      0,
      plan([pocket("optimistic-legacy")]),
    );
    const canonical =
      (first.canonicalPocketIds as Record<string, string>)["optimistic-legacy"];
    for (
      const [index, sql] of [
        "update budgets set total_budget_cents=15000",
        "update budget_envelopes set name='Food'",
        "update envelope_allocations set amount_cents=15000",
        `insert into envelope_category_links(envelope_id,category) values ('${canonical}','dining')`,
      ].entries()
    ) {
      const before = (await db.query<{ revision: number }>(
        "select revision from pocket_month_revisions",
      )).rows[0].revision;
      await db.exec(sql);
      const after = (await db.query<{ revision: number }>(
        "select revision from pocket_month_revisions",
      )).rows[0].revision;
      assert(after > before, `legacy writer ${index} advances revision`);
      assert(
        (await save(db, `stale-${index}`, before, plan([pocket(canonical)])))
          .code === "REVISION_CONFLICT",
        "old snapshot cannot erase legacy write",
      );
    }
    await db.exec(
      `insert into envelope_allocations(envelope_id,period_month,amount_cents) values ('${canonical}','2026-12-01',5000)`,
    );
    const before = (await db.query<{ revision: number }>(
      "select revision from pocket_month_revisions where period_month='2026-12-01'",
    )).rows[0].revision;
    await db.exec("update budget_envelopes set rollover_enabled=true");
    const after = (await db.query<{ revision: number }>(
      "select revision from pocket_month_revisions where period_month='2026-12-01'",
    )).rows[0].revision;
    assert(after > before, "metadata invalidates every allocated month");
    const unchanged = (await db.query<{ revision: number }>(
      "select revision from pocket_month_revisions where period_month='2026-10-01'",
    )).rows[0].revision;
    await db.exec(`insert into envelope_category_links(envelope_id,category)
      values ('${canonical}','dining') on conflict(envelope_id,category)
      do update set updated_at=now()`);
    assert(
      (await db.query<{ revision: number }>(
        "select revision from pocket_month_revisions where period_month='2026-10-01'",
      )).rows[0].revision === unchanged,
      "an additive retry does not create a false conflict",
    );
    await db.exec("delete from budgets");
    assert(
      (await db.query<{ revision: number }>(
        "select revision from pocket_month_revisions where period_month='2026-12-01'",
      )).rows[0].revision > after,
      "budget deletion invalidates non-anchor allocation months",
    );
  } finally {
    await db.close();
  }
});

Deno.test("Shared-budget household and personal identities coexist and remain independently unique", async () => {
  const db = await fixture();
  try {
    await db.exec(
      `insert into shared_budgets(household_id,user_id,budget_type,currency,period) values
      ('${space}',null,'household','USD','monthly'),
      ('${space}','${actor}','personal','USD','monthly'),
      ('${space}','${member}','personal','USD','monthly');`,
    );
    for (const owner of [null, actor]) {
      let rejected = false;
      try {
        await db.query(
          "insert into shared_budgets(household_id,user_id,budget_type,currency,period) values($1,$2,$3,'USD','monthly')",
          [space, owner, owner ? "personal" : "household"],
        );
      } catch {
        rejected = true;
      }
      assert(rejected, "duplicate within one identity rejected");
    }
  } finally {
    await db.close();
  }
});
