import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const source = await readFile(
  new URL(
    "../supabase/migrations/20260716143000_harden_settlement_cycles_and_breakdown.sql",
    import.meta.url,
  ),
  "utf8",
);
const ids = Object.fromEntries(
  [
    "actor",
    "source",
    "private",
    "shared",
    "expense",
    "group",
    "wallet",
    "targetWallet",
    "newGroup",
  ].map((key, index) => [
    key,
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  ]),
);

function productionFunction(name) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  const end = source.indexOf("\n$$;", start);
  assert.ok(start >= 0 && end > start, `production function ${name}`);
  return source.slice(start, end + 4);
}

async function fixture(t) {
  const db = new PGlite();
  t.after(() => db.close());
  // Actual writer/wrapper SQL with minimal relational fixtures, not production
  // triggers or a substitute implementation of the move operation.
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.jwt() returns jsonb language sql as $$ select '{"role":"service_role"}'::jsonb $$;
    create type split_type as enum ('equal','amount','percentage','shares');
    create table households(id uuid primary key, is_portfolio boolean default false);
    create table household_members(household_id uuid, user_id uuid);
    create function is_member_of_household(h uuid,u uuid) returns boolean language sql as $$
      select exists(select 1 from public.household_members where household_id=h and user_id=u) $$;
    create table user_contacts(id uuid, user_id uuid);
    create table accounts(id uuid primary key, household_id uuid, user_id uuid, currency text, is_archived boolean default false);
    create table expenses(id uuid primary key, user_id uuid, contact_id uuid, household_id uuid,
      split_group_id uuid, account_id uuid, currency text, amount_cents bigint, type text default 'expense',
      deleted_at timestamptz, updated_at timestamptz, merchant text, category text);
    create table expense_split_groups(id uuid primary key, expense_id uuid, household_id uuid,
      payer_user_id uuid, split_type split_type, currency text, total_amount_cents bigint,
      description text, updated_at timestamptz);
    create table expense_split_lines(split_group_id uuid references expense_split_groups on delete cascade,
      user_id uuid, amount_cents bigint, percentage numeric, shares integer, is_settled boolean default false,
      settled_at timestamptz, settled_by_user_id uuid, settlement_note text, updated_at timestamptz,
      unique(split_group_id,user_id));
    create table household_settlement_event_allocations_v2(split_group_id uuid, expense_id uuid);
    create table household_settlement_finalized_split_groups(split_group_id uuid primary key,
      completed_at timestamptz, validation_profile text, legacy_parent_household_mismatch boolean,
      legacy_parent_currency_mismatch boolean, legacy_parent_amount_mismatch boolean, legacy_rounding_delta_cents bigint);
    insert into households values ('${ids.source}',false),('${ids.private}',true),('${ids.shared}',false);
    insert into household_members select id,'${ids.actor}'::uuid from households;
    insert into accounts values ('${ids.wallet}','${ids.source}','${ids.actor}','MYR',false);
    insert into expenses values ('${ids.expense}','${ids.actor}',null,'${ids.source}',
      '${ids.group}','${ids.wallet}','MYR',412159,'expense',null,'2026-10-22T11:32:15Z','Airbnb','travel');
    insert into expense_split_groups(id,expense_id,household_id,payer_user_id,split_type,currency,total_amount_cents)
      values ('${ids.group}','${ids.expense}','${ids.source}','${ids.actor}','equal','MYR',412159);
    insert into expense_split_lines(split_group_id,user_id,amount_cents) values ('${ids.group}','${ids.actor}',412159);
    alter table expenses add column raw_text text, add column date date, add column created_at timestamptz,
      add column receipt_image_url text, add column is_recurring boolean, add column recurrence_rule jsonb,
      add column source text, add column user_overrides jsonb;
  `);
  for (const name of [
    "households_commit_expense_split_write_v3",
    "households_remove_expense_split_v3",
    "households_apply_expense_patch_v3",
    "households_remove_expense_split_with_patch_v3",
  ]) {
    await db.exec(productionFunction(name));
  }
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261024120000_fix_split_space_move_wallet_fallback.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  return db;
}

async function parent(db) {
  return (await db.query("select to_jsonb(e) as value from expenses e")).rows[0]
    .value;
}

async function removeSplit(db, target, account = null, expected = null) {
  await db.query(
    "select households_remove_expense_split_with_patch_v3($1,$2,$3,$4,'MYR',412159,$5,$6,$7)",
    [
      ids.actor,
      ids.expense,
      ids.group,
      target,
      account,
      expected ?? (await parent(db)),
      { merchant: "Airbnb", updated_at: "2026-10-24T12:00:00Z" },
    ],
  );
}

for (const target of [null, ids.private]) {
  test(`split expense moves to ${target === null ? "Personal" : "Private Space"} without a destination wallet`, async (t) => {
    const db = await fixture(t);
    await removeSplit(db, target);
    const saved = await parent(db);
    assert.equal(saved.household_id, target);
    assert.equal(saved.account_id, null);
    assert.equal(saved.split_group_id, null);
    assert.equal(saved.amount_cents, 412159);
    assert.equal(saved.currency, "MYR");
    assert.equal(saved.updated_at, "2026-10-24T12:00:00+00:00");
    assert.equal(
      (await db.query("select * from expense_split_groups")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from expense_split_lines")).rows.length,
      0,
    );
  });
}

test("split removal uses an explicitly selected destination wallet", async (t) => {
  const db = await fixture(t);
  await db.query("insert into accounts values ($1,$2,$3,'MYR',false)", [
    ids.targetWallet,
    ids.private,
    ids.actor,
  ]);
  await removeSplit(db, ids.private, ids.targetWallet);
  assert.equal((await parent(db)).account_id, ids.targetWallet);
});

for (const [label, setup, expected] of [
  [
    "settled line",
    "update expense_split_lines set is_settled=true",
    /with_settled_lines/,
  ],
  [
    "settlement allocation",
    `insert into household_settlement_event_allocations_v2 values ('${ids.group}','${ids.expense}')`,
    /with_payments/,
  ],
  [
    "unauthorized destination",
    `delete from household_members where household_id='${ids.private}'`,
    /not member of target/,
  ],
]) {
  test(`move still rejects ${label} atomically`, async (t) => {
    const db = await fixture(t);
    await db.exec(setup);
    const before = await parent(db);
    await assert.rejects(() => removeSplit(db, ids.private), expected);
    assert.deepEqual(await parent(db), before);
    assert.equal(
      (await db.query("select * from expense_split_groups")).rows.length,
      1,
    );
  });
}

test("move rejects a wallet from the source Space", async (t) => {
  const db = await fixture(t);
  const before = await parent(db);
  await assert.rejects(
    () => removeSplit(db, ids.private, ids.wallet),
    /outside household scope/,
  );
  assert.deepEqual(await parent(db), before);
});

async function commitSplit(
  db,
  {
    target = ids.shared,
    currency = "MYR",
    account = null,
    group = ids.newGroup,
  } = {},
) {
  const before = await parent(db);
  return db.query(
    "select households_commit_expense_split_write_v3($1,$2,$3,$4,$1,'equal',$5,412159,null,$6,$7,$8,$9)",
    [
      ids.actor,
      ids.expense,
      group,
      target,
      currency,
      [{ user_id: ids.actor, amount_cents: 412159 }],
      before,
      ids.group,
      account,
    ],
  );
}

test("split expense moves to another Shared Space without reusing the old wallet", async (t) => {
  const db = await fixture(t);
  await commitSplit(db);
  const saved = await parent(db);
  assert.equal(saved.household_id, ids.shared);
  assert.equal(saved.account_id, null);
  assert.equal(saved.split_group_id, ids.newGroup);
});

test("unchanged-scope split edits preserve the existing wallet when no target is supplied", async (t) => {
  const db = await fixture(t);
  await commitSplit(db, { target: ids.source, group: ids.group });
  assert.equal((await parent(db)).account_id, ids.wallet);
});

test("split currency changes do not retain an incompatible old wallet", async (t) => {
  const db = await fixture(t);
  await commitSplit(db, {
    target: ids.source,
    currency: "EUR",
    group: ids.group,
  });
  assert.equal((await parent(db)).account_id, null);
  assert.equal((await parent(db)).currency, "EUR");
});
