import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH ?? "@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const user = id(1), wallet = id(2), expense = id(3);
const migration = (name) => readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
const fix = "20261002104000_preserve_archived_expense_wallet_bindings.sql";

async function fixture(applyFix = true) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table accounts(id uuid primary key,user_id uuid,household_id uuid,currency text,is_archived boolean);
    create table expenses(id uuid primary key,user_id uuid,household_id uuid,contact_id uuid,
      account_id uuid references accounts(id),currency text,amount_cents bigint,provider_fields jsonb);
    create function public.resolve_account_currency(uuid,uuid) returns text language sql as $$select 'USD'::text$$;
    insert into accounts values ('${wallet}','${user}',null,'CAD',false);`);
  const original = await migration("20260723130000_remove_automatic_spending_wallets.sql");
  const start = original.indexOf("create or replace function public.ensure_expense_account_id()");
  await db.exec(original.slice(start, original.indexOf("$$;", start) + 3));
  await db.exec(`create trigger expenses_account_id_defaults
    before insert or update of user_id,household_id,account_id,currency on expenses
    for each row execute function public.ensure_expense_account_id();
    insert into expenses values ('${expense}','${user}',null,null,'${wallet}','CAD',1000,'{}');
    update accounts set is_archived=true where id='${wallet}';`);
  if (applyFix) await db.exec(await migration(fix));
  return db;
}

test("wallet validation: reproduces the sync failure when an unchanged historical wallet is archived", async () => {
  const db = await fixture(false);
  try {
    await assert.rejects(db.exec(`update expenses set account_id=account_id,currency=currency,amount_cents=1200 where id='${expense}'`),
      (error) => error.code === "23503" && error.message === "Expense account is not available");
  } finally { await db.close(); }
});

test("wallet validation: bank updates preserve an unchanged archived historical binding", async () => {
  const db = await fixture();
  try {
    await db.exec(`update expenses set account_id=account_id,user_id=user_id,household_id=household_id,
      currency=currency,amount_cents=1200,provider_fields='{"provider":"plaid"}' where id='${expense}'`);
    assert.deepEqual((await db.query("select account_id,currency,amount_cents::int as cents from expenses")).rows,
      [{ account_id: wallet, currency: "CAD", cents: 1200 }]);
    await db.exec(await migration(fix));
  } finally { await db.close(); }
});

for (const [name, sql] of [
  ["new archived-wallet binding", `insert into expenses(id,user_id,account_id,currency) values ('${id(4)}','${user}','${wallet}','CAD')`],
  ["changed owner", `update expenses set user_id='${id(99)}' where id='${expense}'`],
  ["changed Space", `update expenses set household_id='${id(99)}' where id='${expense}'`],
  ["changed currency", `update expenses set currency='USD' where id='${expense}'`],
  ["missing wallet", `update expenses set account_id='${id(99)}' where id='${expense}'`],
]) {
  test(`wallet validation: still rejects ${name}`, async () => {
    const db = await fixture();
    try {
      await assert.rejects(db.exec(sql), (error) => error.code === "23503");
      assert.deepEqual((await db.query("select account_id,currency,user_id,household_id from expenses")).rows,
        [{ account_id: wallet, currency: "CAD", user_id: user, household_id: null }]);
    } finally { await db.close(); }
  });
}
