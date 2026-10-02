import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const { PGlite } = await import(process.env.PGLITE_MODULE_PATH ?? "@electric-sql/pglite");
const id = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const user = id(1);
const wallet = id(2);
const bank = id(3);
const series = id(4);
const imported = id(5);
const connection = id(7);
const fix = "20261002090000_fix_bank_recurring_connection_scope.sql";

async function migration(name) {
  return readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
}

async function fixture() {
  const db = new PGlite();
  // Reuse the occurrence integration schema, with the production bank-account
  // columns: Space belongs to the connection, not the bank account.
  const integration = await readFile(new URL("./bank_recurring_occurrence_integration_test.ts", import.meta.url), "utf8");
  const schema = integration.slice(integration.indexOf("await db.exec(`") + "await db.exec(`".length,
    integration.indexOf("`);", integration.indexOf("await db.exec(`")));
  const values = { user, wallet, bank, series, imported, connection };
  await db.exec(schema.replace(/\$\{(\w+)\}/g, (_, key) => {
    assert.ok(key in values, `Unknown fixture parameter: ${key}`);
    return values[key];
  }));
  const sql = await migration("20260930160000_reconcile_bank_recurring_occurrences.sql");
  await db.exec(sql.slice(0, sql.indexOf("-- Preserve the deployed confirmation")));
  await db.exec(await migration("20260930170000_guard_distinct_recurring_bank_payments.sql"));
  await db.exec(`insert into public.expenses(id,user_id,account_id,bank_account_id,provider,
    provider_transaction_id,date,amount_cents,currency,type)
    values ('${imported}','${user}','${wallet}','${bank}','plaid','bank-payment',
      '2024-09-23',11760,'CAD','expense')`);
  return db;
}

async function reconcile(db) {
  return db.query("select public.reconcile_bank_recurring_occurrences_v1($1, null, null) as count", [user]);
}

test("bank recurring scope: reproduces 42703 against the production schema", async () => {
  const db = await fixture();
  try {
    await assert.rejects(reconcile(db), (error) => error.code === "42703" && error.message.includes("b.household_id"));
  } finally {
    await db.close();
  }
});

for (const scope of [null, id(20)]) {
  test(`bank recurring scope: reconciles and replays matching ${scope ? "household" : "personal"} connection`, async () => {
    const db = await fixture();
    try {
      await db.query("update bank_connections set household_id=$1", [scope]);
      await db.query("update expenses set household_id=$1", [scope]);
      await db.query("update accounts set household_id=$1", [scope]);
      await db.exec(await migration(fix));
      await db.exec(await migration(fix)); // Deployment retries are harmless.
      assert.deepEqual((await reconcile(db)).rows, [{ count: 1 }]);
      assert.deepEqual((await reconcile(db)).rows, [{ count: 0 }]);
      assert.deepEqual((await db.query("select actual_transaction_id from recurring_occurrences")).rows,
        [{ actual_transaction_id: imported }]);
      const definition = (await db.query("select pg_get_functiondef('public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure) as body")).rows[0].body;
      assert.ok(definition.includes("OCCURRENCE_RECONCILIATION_CONFLICT"));
      assert.ok(definition.includes("or v_actual.account_id is distinct from v_bank.account_id"));
      assert.ok(!definition.includes("b.household_id"));
    } finally {
      await db.close();
    }
  });
}

for (const [name, change] of [
  ["different household", `update bank_connections set household_id='${id(20)}'`],
  ["personal connection for household payment", `update expenses set household_id='${id(20)}'`],
  ["different bank-account owner", `update bank_accounts set user_id='${id(99)}'`],
  ["different connection owner", `update bank_connections set user_id='${id(99)}'`],
  ["missing connection", "update bank_accounts set bank_connection_id=null"],
]) {
  test(`bank recurring scope: rejects ${name} without linking a payment`, async () => {
    const db = await fixture();
    try {
      await db.exec(await migration(fix));
      await db.exec(change);
      await assert.rejects(reconcile(db), /OCCURRENCE_ACCOUNT_SCOPE_MISMATCH/);
      assert.deepEqual((await db.query("select count(*)::int as count from recurring_occurrences")).rows, [{ count: 0 }]);
      assert.deepEqual((await db.query("select parent_recurring_id from expenses where id=$1", [imported])).rows,
        [{ parent_recurring_id: null }]);
    } finally {
      await db.close();
    }
  });
}
