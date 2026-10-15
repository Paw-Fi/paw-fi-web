import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { before, after, test } from "node:test";

const { PGlite } = await import(process.env.PGLITE_MODULE_PATH ?? "@electric-sql/pglite");
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1), stranger = id(2), space = id(10), portfolio = id(11);
const migration = (name) => readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
async function loadFunction(file, name) {
  const sql = await migration(file);
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1);
  await db.exec(sql.slice(start, sql.indexOf("$$;", sql.indexOf("as $$", start)) + 3));
}
const legacy = { fromAccountId: id(21), toAccountId: id(22), amountCents: 1000,
  currency: "USD", date: "2026-10-15", time: "09:30:00", note: "wallet move" };
const extended = { ...legacy, toAccountId: id(23), toAmountCents: 923,
  toCurrency: "EUR", exchangeRate: "0.9231", feeAmountCents: 25, transferContractVersion: 2 };
async function mutate(operation, body, user = actor) {
  return (await db.query("select public.mutate_wallet_transfer_v2($1,$2,$3::jsonb) as result",
    [user, operation, JSON.stringify(body)])).rows[0].result;
}
async function rejects(operation, body, code, user = actor) {
  await assert.rejects(mutate(operation, body, user), (error) => error.message === code);
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table public.households(id uuid primary key, is_portfolio boolean default false);
    create table public.household_members(household_id uuid, user_id uuid);
    create table public.user_contacts(id uuid primary key, user_id uuid);
    create table public.bank_accounts(id uuid primary key, type text);
    create type public.transaction_type as enum ('expense','income');
    create type public.privacy_scope as enum ('private','balances_only','full');
    create table public.accounts(id uuid primary key,user_id uuid references auth.users(id),
      household_id uuid references households(id),currency text not null,is_archived boolean default false);`);
  const original = await migration("20260331_accounts_feature.sql");
  const start = original.indexOf("create table if not exists public.account_transfers (");
  await db.exec(original.slice(start, original.indexOf("\n);", start) + 3));
  const expenseSql = await migration("20251007_whatsapp_budgeting.sql");
  const expenseStart = expenseSql.indexOf("create table if not exists public.expenses (");
  await db.exec(expenseSql.slice(expenseStart, expenseSql.indexOf("\n);", expenseStart) + 3));
  await db.exec(`alter table expenses add user_id uuid references auth.users(id),
    add household_id uuid references households(id), add account_id uuid references accounts(id),
    add type transaction_type not null default 'expense', add privacy_scope privacy_scope default 'full',
    add payer_user_id uuid, add split_group_id uuid, add deleted_at timestamptz,
    add is_recurring boolean default false, add parent_recurring_id uuid,
    add recurrence_rule jsonb, add provider text, add bank_account_id uuid,
    add raw_provider_payload jsonb, add provider_pending boolean not null default false,
    add provider_pfc_primary text, add provider_pfc_detailed text, add provider_pfc_confidence text,
    add provider_pfc_version text, add provider_transaction_code text,
    add analytics_class text not null default 'unknown', add analytics_direction text not null default 'none',
    add analytics_is_final boolean not null default false,
    add analytics_spending_multiplier smallint not null default 0,
    add analytics_counts_toward_income boolean not null default false,
    add classification_source text not null default 'manual', add classification_version integer not null default 2;
    create function public.resolve_account_currency(uuid,uuid) returns text language sql as $$select 'USD'::text$$;`);
  await loadFunction("20260723130000_remove_automatic_spending_wallets.sql", "ensure_expense_account_id");
  await db.exec(`create trigger expenses_account_id_defaults before insert or update of user_id,household_id,account_id,currency
    on expenses for each row execute function ensure_expense_account_id()`);
  await db.exec(await migration("20261002104000_preserve_archived_expense_wallet_bindings.sql"));
  await loadFunction("20260716230000_plaid_analytics_classification.sql", "classify_plaid_transaction_v1");
  await loadFunction("20260716230000_plaid_analytics_classification.sql", "set_expense_analytics_classification_v1");
  await db.exec(await migration("20260716233000_plaid_analytics_constraints.sql"));
  await db.exec(await migration("20260928120000_wallet_transfer_client_record_idempotency.sql"));
  await db.exec(await migration("20261001120000_account_transfer_optional_wall_time.sql"));
  await db.query("insert into auth.users values ($1),($2)", [actor, stranger]);
  await db.query("insert into households values ($1,false),($2,true)", [space, portfolio]);
  await db.query("insert into household_members values ($1,$3),($2,$3)", [space, portfolio, actor]);
  for (const [number, currency, household, owner] of [
    [21,"USD",null,actor], [22,"USD",null,actor], [23,"EUR",null,actor],
    [24,"EUR",null,stranger], [25,"EUR",null,actor],
    [31,"USD",space,actor], [32,"EUR",space,stranger],
    [33,"USD",portfolio,actor], [34,"EUR",portfolio,actor],
  ]) await db.query("insert into accounts values ($1,$2,$3,$4,$5)", [id(number),owner,household,currency,number === 25]);
  await db.query(`insert into account_transfers(id,from_account_id,to_account_id,amount_cents,currency,date,created_by_user_id)
    values ($1,$2,$3,1000,'USD','2026-10-01',$4)`, [id(90),id(21),id(22),actor]);
  await db.exec(await migration("20261015120000_cross_currency_wallet_transfers.sql"));
});
after(() => db.close());

test("legacy persisted rows fall back to original leg; old create/update preserve clocks", async () => {
  const existing = (await db.query("select get_wallet_transfer_record_v2($1) as row", [id(90)])).rows[0].row;
  assert.equal(existing.to_amount_cents, 1000);
  assert.equal(existing.to_currency, "USD");
  assert.equal(existing.fee_expense, null);
  const row = await mutate("create", legacy);
  assert.equal(row.exchange_rate, 1);
  const { time, ...withoutTime } = legacy;
  assert.equal((await mutate("update", { ...withoutTime, transferId: row.id })).time, time);
});

test("two authoritative legs plus ordinary source-currency fee and canonical JSON", async () => {
  const row = await mutate("create", extended);
  assert.equal(row.amount_cents, 1000);
  assert.equal(row.to_amount_cents, 923);
  assert.equal(row.exchange_rate, 0.9231);
  const fee = row.fee_expense;
  assert.equal(row.fee_expense_id, fee.id);
  assert.equal(fee.transfer_fee_transfer_id, row.id);
  assert.equal(fee.amount_cents, 25);
  assert.equal(fee.currency, "USD");
  assert.equal(fee.account_id, id(21));
  assert.equal(fee.category, "bank fees");
  assert.equal(fee.type, "expense");
  assert.equal(fee.analytics_spending_multiplier, 1);
  assert.equal(fee.analytics_counts_toward_income, false);
  assert.equal(fee.analytics_is_final, true);
  assert.equal(fee.split_group_id, null);
});

test("fee add/remove/re-add/edit retains identity and category/note; delete emits tombstone", async () => {
  const row = await mutate("create", { ...extended, feeAmountCents: 0 });
  assert.equal(row.fee_expense, null);
  const body = { ...extended, transferId: row.id };
  const added = await mutate("update", body);
  const feeId = added.fee_expense_id;
  await db.query("update expenses set category='other',raw_text='custom note' where id=$1", [feeId]);
  const removed = await mutate("update", { ...body, feeAmountCents: 0 });
  assert.equal(removed.fee_expense, null);
  const tombstone = (await db.query("select deleted_at,updated_at from expenses where id=$1", [feeId])).rows[0];
  assert.ok(tombstone.deleted_at);
  const restored = await mutate("update", { ...body, feeAmountCents: 40, amountCents: 2000, toAmountCents: 1846 });
  assert.equal(restored.fee_expense.id, feeId);
  assert.equal(restored.fee_expense.amount_cents, 40);
  assert.equal(restored.fee_expense.category, "other");
  assert.equal(restored.fee_expense.raw_text, "custom note");
  assert.equal(restored.fee_expense.deleted_at, null);
  const deleted = await mutate("delete", { transferId: row.id });
  assert.equal(deleted.id, row.id);
  assert.ok(deleted.fee_expense.deleted_at);
  assert.equal((await db.query("select count(*)::int as n from account_transfers where id=$1", [row.id])).rows[0].n, 0);
  const fee = (await db.query("select * from expenses where id=$1", [feeId])).rows[0];
  assert.ok(fee.deleted_at);
  assert.equal(fee.transfer_fee_transfer_id, row.id);
  assert.ok(new Date(fee.updated_at) >= new Date(tombstone.updated_at));
});

test("same-key concurrent submissions/retries return one parent and one stable fee; mismatch conflicts", async () => {
  const body = { ...extended, clientRecordId: "concurrent-retry" };
  const rows = await Promise.all(Array.from({ length: 8 }, () => mutate("create", body)));
  assert.equal(new Set(rows.map((row) => row.id)).size, 1);
  assert.equal(new Set(rows.map((row) => row.fee_expense_id)).size, 1);
  const parent = rows[0];
  assert.equal((await db.query("select count(*)::int as n from expenses where transfer_fee_transfer_id=$1", [parent.id])).rows[0].n, 1);
  await rejects("create", { ...body, feeAmountCents: 26 }, "IDEMPOTENCY_CONFLICT");
  await rejects("create", { ...body, toAmountCents: 924, exchangeRate: "0.924" }, "IDEMPOTENCY_CONFLICT");
  await mutate("update", { ...body, transferId: parent.id, feeAmountCents: 30 });
  assert.equal((await mutate("create", body)).fee_amount_cents, 30);
  await mutate("delete", { transferId: parent.id });
  await rejects("create", body, "NOT_FOUND");
});

test("old update cannot flatten an extended transfer", async () => {
  const row = await mutate("create", extended);
  await rejects("update", { ...legacy, transferId: row.id }, "TRANSFER_CLIENT_UPDATE_REQUIRED");
  assert.equal((await db.query("select fee_amount_cents::int as fee from account_transfers where id=$1", [row.id])).rows[0].fee, 25);
});

test("rate compatibility rounds target cents instead of enforcing a strict ratio", async () => {
  assert.equal((await mutate("create", { ...extended, amountCents: 1, toAmountCents: 1, exchangeRate: "0.5" })).to_amount_cents, 1);
  assert.equal((await mutate("create", { ...extended, amountCents: 100, toAmountCents: 57, exchangeRate: "0.565" })).to_amount_cents, 57);
  await rejects("create", { ...extended, toAmountCents: 999 }, "VALIDATION_ERROR");
  await rejects("create", { ...extended, toAccountId: id(22), toCurrency: "USD", toAmountCents: 999, exchangeRate: "0.999" }, "VALIDATION_ERROR");
  await rejects("create", { ...extended, exchangeRate: "NaN" }, "VALIDATION_ERROR");
  await rejects("create", { ...extended, amountCents: 1.5 }, "VALIDATION_ERROR");
});

test("SQL enforces actors, membership, active wallets, same Space, and each leg currency", async () => {
  await rejects("create", extended, "UNAUTHORIZED", stranger);
  for (const patch of [{ toAccountId: id(24) }, { toAccountId: id(25) },
    { toAccountId: id(32) }, { toCurrency: "USD" }, { fromAccountId: id(23) },
    { toAccountId: id(21) }]) {
    await assert.rejects(mutate("create", { ...extended, ...patch }));
  }
  const row = await mutate("create", extended);
  await rejects("delete", { transferId: row.id }, "UNAUTHORIZED", stranger);
  await rejects("update", { ...extended, transferId: row.id }, "UNAUTHORIZED", stranger);
  for (const [from, to, scope] of [[31,32,space], [33,34,portfolio]]) {
    const shared = await mutate("create", { ...extended, fromAccountId: id(from), toAccountId: id(to) });
    assert.equal(shared.household_id, scope);
    assert.equal(shared.fee_expense.household_id, scope);
    assert.equal(shared.fee_expense.split_group_id, null);
    await rejects("create", { ...extended, fromAccountId: id(from), toAccountId: id(to) }, "UNAUTHORIZED", stranger);
  }
  await db.query("delete from household_members where household_id=$1", [space]);
  const sharedRow = (await db.query("select id from account_transfers where household_id=$1 limit 1", [space])).rows[0];
  await rejects("delete", { transferId: sharedRow.id }, "UNAUTHORIZED");
  await db.query("insert into household_members values ($1,$2)", [space,actor]);
});

test("fee failure rolls back parent creation/update/delete and idempotency reservation", async () => {
  await db.exec(`create function reject_transfer_fee_test() returns trigger language plpgsql as $$
    begin if current_setting('test.reject_fee',true)='yes' then raise exception 'fixture_fee_failure'; end if; return new; end $$;
    create trigger zzzz_reject_transfer_fee_test before insert or update on expenses
      for each row execute function reject_transfer_fee_test();
    select set_config('test.reject_fee','yes',false);`);
  const body = { ...extended, clientRecordId: "rollback-retry" };
  await rejects("create", body, "fixture_fee_failure");
  assert.equal((await db.query("select count(*)::int as n from account_transfers where client_record_id='rollback-retry'")).rows[0].n, 0);
  await db.exec("select set_config('test.reject_fee','no',false)");
  const row = await mutate("create", body);
  await db.exec("select set_config('test.reject_fee','yes',false)");
  await rejects("update", { ...body, transferId: row.id, feeAmountCents: 50 }, "fixture_fee_failure");
  await rejects("delete", { transferId: row.id }, "fixture_fee_failure");
  await db.exec("select set_config('test.reject_fee','no',false)");
  assert.equal((await mutate("create", body)).fee_amount_cents, 25);
});

test("ordinary writes cannot change linked fee finances, delete it, detach it or introduce splits", async () => {
  const row = await mutate("create", extended);
  for (const patch of ["amount_cents=26", "currency='EUR'", `account_id='${id(22)}'`,
    "deleted_at=now()", "transfer_fee_transfer_id=null", `split_group_id='${id(99)}'`,
    "type='income'", "date='2026-10-16'", "is_recurring=true", "classification_source='user_override',analytics_class='transfer_out'"]) {
    await assert.rejects(db.query(`update expenses set ${patch} where id=$1`, [row.fee_expense_id]));
  }
  await assert.rejects(db.query("delete from expenses where id=$1", [row.fee_expense_id]));
  await db.query("update expenses set category='other',raw_text='allowed' where id=$1", [row.fee_expense_id]);
});

test("atomic administrative cleanup remains possible without leaving an active orphan fee", async () => {
  const row = await mutate("create", extended);
  await db.transaction(async (tx) => {
    await tx.query("update expenses set deleted_at=now(),updated_at=now() where id=$1", [row.fee_expense_id]);
    await tx.query("delete from account_transfers where id=$1", [row.id]);
  });
  const other = await mutate("create", extended);
  await assert.rejects(db.query("delete from account_transfers where id=$1", [other.id]));
  await db.transaction(async (tx) => {
    await tx.query("delete from account_transfers where id=$1", [other.id]);
    await tx.query("delete from expenses where id=$1", [other.fee_expense_id]);
  });
});

test("mutation/helper are service-only and arbitrary actors cannot be forged by authenticated SQL", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const signature of ["mutate_wallet_transfer_v2(uuid,text,jsonb)", "get_wallet_transfer_record_v2(uuid)"]) {
      assert.equal((await db.query("select has_function_privilege($1,$2,'execute') as allowed", [role,signature])).rows[0].allowed, false);
    }
  }
  await db.exec("set role authenticated");
  await rejects("create", extended, "permission denied for function mutate_wallet_transfer_v2");
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [stranger]);
  await rejects("create", extended, "UNAUTHORIZED");
  await db.exec("select set_config('request.jwt.claim.sub','',false)");
});
