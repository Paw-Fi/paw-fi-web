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

const ambiguityFix = "20261002103000_defer_ambiguous_bank_recurring_cycles.sql";

async function syncFixture() {
  const db = await fixture();
  await db.exec(await migration(fix));
  await db.exec(`create function public.apply_plaid_sync_batch_v2_legacy(
    p_user_id uuid, p_bank_connection_id uuid, p_expected_cursor_generation integer,
    p_next_cursor text, p_expense_inserts jsonb, p_expense_updates jsonb,
    p_removed_provider_transaction_ids text[], p_removed_bank_account_ids uuid[],
    p_processed_bank_account_ids uuid[], p_account_upserts jsonb,
    p_inactive_bank_account_ids uuid[], p_raw_transactions jsonb, p_sync_status jsonb,
    p_is_ready boolean, p_recurring_refresh_required boolean, p_lock_token uuid, p_audit_id uuid
  ) returns jsonb language plpgsql as $$ begin
    update public.bank_connections set cursor=p_next_cursor where id=p_bank_connection_id;
    return jsonb_build_object('inserted_records','[]'::jsonb);
  end; $$`);
  const original = await migration("20260930160000_reconcile_bank_recurring_occurrences.sql");
  const start = original.indexOf("create or replace function public.apply_plaid_sync_batch_v2(");
  await db.exec(original.slice(start, original.indexOf("$$;", start) + 3));
  await db.exec(await migration(ambiguityFix));
  await db.exec(`update expenses set recurrence_rule=
    '{"frequency":"monthly","anchor_date":"2024-09-08","projection_enabled":false}'
    where id='${series}'`);
  return db;
}

async function syncReconcile(db) {
  return db.query("select public.reconcile_bank_recurring_occurrences_for_sync_v1($1,null,null) as count", [user]);
}

test("bank cycle ambiguity: sync preserves the payment without inventing a scheduled cycle", async () => {
  const db = await syncFixture();
  try {
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 0 }]);
    assert.deepEqual((await db.query(`select amount_cents::int as cents,currency,date::text,parent_recurring_id,
      provider_fields->'recurring_reconciliation' as review from expenses where id=$1`, [imported])).rows,
      [{ cents: 11760, currency: "CAD", date: "2024-09-23", parent_recurring_id: null,
        review: { status: "needs_review", reason: "ambiguous_bank_cycle", recurring_id: series } }]);
    assert.deepEqual((await db.query("select count(*)::int as count from recurring_occurrences")).rows, [{ count: 0 }]);
    const before = (await db.query("select updated_at from expenses where id=$1", [imported])).rows;
    await syncReconcile(db);
    assert.deepEqual((await db.query("select updated_at from expenses where id=$1", [imported])).rows, before);
    await assert.rejects(reconcile(db), /OCCURRENCE_AMBIGUOUS_BANK_CYCLE/);
  } finally { await db.close(); }
});

test("bank cycle ambiguity: atomic sync commits its cursor and still reconciles unrelated payments", async () => {
  const db = await syncFixture();
  try {
    const other = idForCycleTest();
    await db.query(`insert into expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,date,amount_cents,currency,type)
      values ($1,$2,$3,$4,'plaid','pending-payment','2024-09-08',9000,'CAD','expense')`, [other,user,wallet,bank]);
    await db.query(`select public.apply_plaid_sync_batch_v2($1,$2,0,'after','[]','[]','{}','{}',$3,
      '[]','{}','[]','{}',true,true,$4,null)`, [user,connection,[bank],idForCycleTest()]);
    assert.deepEqual((await db.query("select cursor from bank_connections")).rows, [{ cursor: "after" }]);
    assert.deepEqual((await db.query("select actual_transaction_id,scheduled_occurrence_date::text from recurring_occurrences")).rows,
      [{ actual_transaction_id: other, scheduled_occurrence_date: "2024-09-08" }]);
    assert.deepEqual((await db.query("select count(*)::int as count,sum(amount_cents)::int as cents from expenses where not is_recurring and deleted_at is null")).rows,
      [{ count: 2, cents: 20760 }]);
  } finally { await db.close(); }
});

function idForCycleTest() { return "00000000-0000-4000-8000-000000000098"; }

const scopeReviewFix = "20261002113000_review_incompatible_recurring_bank_rows.sql";
const confirmedLinkFix = "20261003050000_preserve_confirmed_bank_series_links.sql";
async function scopeReviewFixture() {
  const db = await syncFixture();
  await db.exec(await migration(scopeReviewFix));
  await db.query("update expenses set date='2024-09-08' where id=$1", [imported]);
  return db;
}

for (const [name, change, reason, expectedType, expectedCurrency, expectedWallet, expectedCents, strictReason] of [
  ["liability payment direction", `update expenses set type='income' where id='${imported}'`, "transaction_direction_mismatch", "income", "CAD", wallet, 11760, "transaction_direction_mismatch"],
  ["foreign native currency", `update expenses set currency='USD',account_id=null where id='${imported}'`, "native_currency_mismatch", "expense", "USD", null, 11760, "native_currency_mismatch"],
  ["zero-value bank row", `update expenses set amount_cents=0 where id='${imported}'`, "zero_amount_bank_row", "expense", "CAD", wallet, 0, "non_positive_amount"],
]) {
  test(`recurring scope review: valid ${name} cannot abort the atomic bank batch`, async () => {
    const db = await scopeReviewFixture();
    try {
      await db.exec(change);
      await db.query(`select public.apply_plaid_sync_batch_v2($1,$2,0,'after','[]','[]','{}','{}',$3,
        '[]','{}','[]','{}',true,true,$4,null)`, [user,connection,[bank],idForCycleTest()]);
      assert.deepEqual((await db.query("select cursor from bank_connections")).rows, [{ cursor: "after" }]);
      assert.deepEqual((await db.query(`select amount_cents::int as cents,type,currency,account_id,parent_recurring_id,
        provider_fields->'recurring_reconciliation' as review from expenses where id=$1`, [imported])).rows,
        [{ cents: expectedCents, type: expectedType, currency: expectedCurrency, account_id: expectedWallet, parent_recurring_id: null,
          review: { status: "needs_review", reason, recurring_id: series } }]);
      assert.deepEqual((await db.query("select count(*)::int as count from recurring_occurrences")).rows, [{ count: 0 }]);
      await assert.rejects(reconcile(db), (error) => error.code === "P0001"
        && error.message === "OCCURRENCE_ACCOUNT_SCOPE_MISMATCH"
        && JSON.parse(error.detail).reconciliation_scope_reason === strictReason);
    } finally { await db.close(); }
  });
}

for (const [name, change, reason] of [
  ["bank owner or Space", `update bank_connections set user_id='${id(99)}'; update expenses set type='income' where id='${imported}'`, "bank_owner_or_space_mismatch"],
  ["privacy", `update bank_connections set household_id='${id(20)}'; update expenses set household_id='${id(20)}'; update expenses set privacy_scope='balances_only',type='income' where id='${imported}'`, "privacy_scope_mismatch"],
  ["disconnected wallet", `update expenses set bank_account_id=null,account_id=null,provider_fields=jsonb_build_object('bank_account_id','${bank}'),type='income' where id='${imported}'`, "disconnected_wallet_mismatch"],
  ["negative amount", `update expenses set amount_cents=-1 where id='${imported}'`, "non_positive_amount"],
  ["already linked direction", `update expenses set type='income',parent_recurring_id='${series}',scheduled_occurrence_date='2024-09-08' where id='${imported}'`, "transaction_direction_mismatch"],
]) {
  test(`recurring scope review: ${name} remains a diagnosed hard failure`, async () => {
    const db = await scopeReviewFixture();
    try {
      await db.exec(change);
      await assert.rejects(syncReconcile(db), (error) => error.code === "P0001"
        && error.message === "OCCURRENCE_ACCOUNT_SCOPE_MISMATCH"
        && JSON.parse(error.detail).reconciliation_scope_reason === reason);
      assert.deepEqual((await db.query("select provider_fields ? 'recurring_reconciliation' as has_review from expenses where id=$1", [imported])).rows,
        [{ has_review: false }]);
    } finally { await db.close(); }
  });
}

test("recurring scope review: corrected data resolves and clears its own review marker", async () => {
  const db = await scopeReviewFixture();
  try {
    await db.query("update expenses set type='income' where id=$1", [imported]);
    await syncReconcile(db);
    await db.query("update expenses set type='expense' where id=$1", [imported]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 1 }]);
    assert.deepEqual((await db.query("select provider_fields ? 'recurring_reconciliation' as has_review,parent_recurring_id from expenses where id=$1", [imported])).rows,
      [{ has_review: false, parent_recurring_id: series }]);
    await db.exec(await migration(scopeReviewFix));
  } finally { await db.close(); }
});

test("recurring scope review: an incompatible payment cannot become a competing manual adoption", async () => {
  const db = await scopeReviewFixture();
  try {
    const manualId = id(97);
    await db.query("update expenses set type='income' where id=$1", [imported]);
    await db.query(`insert into expenses(id,user_id,account_id,date,amount_cents,currency,type,parent_recurring_id,
      scheduled_occurrence_date,recurring_confirmed_at,recurring_confirmation_source)
      values ($1,$2,$3,'2024-09-08',9000,'CAD','expense',$4,'2024-09-08',now(),'user')`, [manualId,user,wallet,series]);
    await db.query(`insert into recurring_occurrences(recurring_id,scheduled_occurrence_date,status,confirmation_source,
      actual_transaction_id,paid_date,amount_cents,currency,confirmed_at,confirmed_by_user_id)
      values ($1,'2024-09-08','confirmed','user',$2,'2024-09-08',9000,'CAD',now(),$3)`, [series,manualId,user]);
    await db.query(`insert into expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,date,amount_cents,currency,type)
      values ($1,$2,$3,$4,'plaid','pending-payment','2024-09-08',9000,'CAD','expense')`, [id(98),user,wallet,bank]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 1 }]);
    assert.deepEqual((await db.query("select actual_transaction_id from recurring_occurrences")).rows, [{ actual_transaction_id: manualId }]);
    assert.deepEqual((await db.query("select count(*)::int as count,sum(amount_cents)::int as cents from expenses where not is_recurring and deleted_at is null")).rows,
      [{ count: 2, cents: 20760 }]);
  } finally { await db.close(); }
});

test("recurring scope review: competing template identities remain unlinked until disambiguated", async () => {
  const db = await scopeReviewFixture();
  try {
    const otherSeries = id(99);
    await db.query("update expenses set type='income' where id=$1", [imported]);
    await db.query(`insert into expenses select (jsonb_populate_record(null::expenses,
      to_jsonb(e) || jsonb_build_object('id',$1::text,'type','income'))).* from expenses e where id=$2`, [otherSeries,series]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 0 }]);
    assert.deepEqual((await db.query("select count(*)::int as count from recurring_occurrences")).rows, [{ count: 0 }]);
    assert.deepEqual((await db.query("select provider_fields #>> '{recurring_reconciliation,reason}' as reason from expenses where id=$1", [imported])).rows,
      [{ reason: "ambiguous_bank_series" }]);
    await assert.rejects(db.query("select reconcile_bank_recurring_occurrences_v1($1,$2,null)", [user,[otherSeries]]), /OCCURRENCE_AMBIGUOUS_BANK_SERIES/);
    await db.query("update expenses set deleted_at=now() where id=$1", [series]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 1 }]);
    assert.deepEqual((await db.query("select parent_recurring_id,provider_fields ? 'recurring_reconciliation' as has_review from expenses where id=$1", [imported])).rows,
      [{ parent_recurring_id: otherSeries, has_review: false }]);
  } finally { await db.close(); }
});

async function confirmedLinkFixture(otherSeries = id(99), applyFix = true) {
  const db = await scopeReviewFixture();
  await syncReconcile(db);
  await db.query(`insert into expenses select (jsonb_populate_record(null::expenses,
    to_jsonb(e) || jsonb_build_object('id',$1::text))).* from expenses e where id=$2`, [otherSeries,series]);
  if (applyFix) await db.exec(await migration(confirmedLinkFix));
  return db;
}

test("confirmed bank series: reproduces alias ambiguity against an already confirmed canonical payment", async () => {
  const db = await confirmedLinkFixture(id(99), false);
  try {
    await assert.rejects(syncReconcile(db), /OCCURRENCE_AMBIGUOUS_BANK_SERIES/);
    assert.deepEqual((await db.query("select parent_recurring_id from expenses where id=$1", [imported])).rows, [{ parent_recurring_id: series }]);
  } finally { await db.close(); }
});

for (const otherSeries of [id(0), id(99)]) {
  test(`confirmed bank series: refresh and atomic sync honor the stored link regardless of template order ${otherSeries}`, async () => {
    const db = await confirmedLinkFixture(otherSeries);
    try {
      assert.deepEqual((await syncReconcile(db)).rows, [{ count: 0 }]);
      await db.query(`select public.apply_plaid_sync_batch_v2($1,$2,0,'after','[]','[]','{}','{}',$3,
        '[]','{}','[]','{}',true,true,$4,null)`, [user,connection,[bank],idForCycleTest()]);
      assert.deepEqual((await db.query("select cursor from bank_connections")).rows, [{ cursor: "after" }]);
      assert.deepEqual((await db.query("select recurring_id,actual_transaction_id from recurring_occurrences")).rows,
        [{ recurring_id: series, actual_transaction_id: imported }]);
      assert.deepEqual((await db.query("select count(*)::int as count,sum(amount_cents)::int as cents from expenses where not is_recurring and deleted_at is null")).rows,
        [{ count: 1, cents: 11760 }]);
      await assert.rejects(db.query("select reconcile_bank_recurring_occurrences_v1($1,$2,null)", [user,[otherSeries]]), /OCCURRENCE_AMBIGUOUS_BANK_SERIES/);
      await db.exec(await migration(confirmedLinkFix));
    } finally { await db.close(); }
  });
}

test("confirmed bank series: posting corrections update the original occurrence without retargeting", async () => {
  const db = await confirmedLinkFixture();
  try {
    await db.query("update expenses set amount_cents=12300,date='2024-09-09' where id=$1", [imported]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 1 }]);
    assert.deepEqual((await db.query("select recurring_id,actual_transaction_id,amount_cents::int as cents,paid_date::text,scheduled_occurrence_date::text from recurring_occurrences")).rows,
      [{ recurring_id: series, actual_transaction_id: imported, cents: 12300, paid_date: "2024-09-09", scheduled_occurrence_date: "2024-09-08" }]);
  } finally { await db.close(); }
});

test("confirmed bank series: aliases cannot resurrect or steal payments from a retired parent", async () => {
  const db = await confirmedLinkFixture();
  try {
    await db.query("update expenses set deleted_at=now(),deleted_reason='provider_recurring_retired' where id=$1", [series]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 0 }]);
    assert.deepEqual((await db.query("select parent_recurring_id from expenses where id=$1", [imported])).rows, [{ parent_recurring_id: series }]);
    assert.deepEqual((await db.query("select recurring_id,actual_transaction_id from recurring_occurrences")).rows,
      [{ recurring_id: series, actual_transaction_id: imported }]);
  } finally { await db.close(); }
});

for (const [name, change] of [
  ["missing occurrence", "delete from recurring_occurrences"],
  ["different occurrence date", "update recurring_occurrences set scheduled_occurrence_date='2024-09-09'"],
  ["foreign parent owner", `update expenses set user_id='${id(98)}' where id='${series}'`],
  ["foreign wallet owner", `update accounts set user_id='${id(98)}' where id='${wallet}'`],
  ["different parent bank identity", `update expenses set provider_fields=jsonb_set(provider_fields,'{bank_account_id}',to_jsonb('${id(98)}'::text)) where id='${series}'`],
]) {
  test(`confirmed bank series: ${name} remains a blocking diagnosed conflict`, async () => {
    const db = await confirmedLinkFixture();
    try {
      await db.exec(change);
      await assert.rejects(syncReconcile(db), (error) => error.message === "OCCURRENCE_AMBIGUOUS_BANK_SERIES"
        && JSON.parse(error.detail).recurring_reconciliation_reason === "unverified_existing_link");
      assert.deepEqual((await db.query("select parent_recurring_id from expenses where id=$1", [imported])).rows, [{ parent_recurring_id: series }]);
    } finally { await db.close(); }
  });
}

test("confirmed bank series: another series's retired payment is not a competing manual payment", async () => {
  const db = await confirmedLinkFixture();
  try {
    const activeSeries = id(99), manualId = id(97), incomingId = id(98);
    await db.query("update expenses set deleted_at=now(),deleted_reason='provider_recurring_retired' where id=$1", [series]);
    await db.query(`insert into expenses(id,user_id,account_id,date,amount_cents,currency,type,parent_recurring_id,
      scheduled_occurrence_date,recurring_confirmed_at,recurring_confirmation_source)
      values ($1,$2,$3,'2024-09-08',9000,'CAD','expense',$4,'2024-09-08',now(),'user')`, [manualId,user,wallet,activeSeries]);
    await db.query(`insert into recurring_occurrences(recurring_id,scheduled_occurrence_date,status,confirmation_source,
      actual_transaction_id,paid_date,amount_cents,currency,confirmed_at,confirmed_by_user_id)
      values ($1,'2024-09-08','confirmed','user',$2,'2024-09-08',9000,'CAD',now(),$3)`, [activeSeries,manualId,user]);
    await db.query(`insert into expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,date,amount_cents,currency,type)
      values ($1,$2,$3,$4,'plaid','pending-payment','2024-09-08',9000,'CAD','expense')`, [incomingId,user,wallet,bank]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 1 }]);
    assert.deepEqual((await db.query("select recurring_id,actual_transaction_id from recurring_occurrences order by recurring_id")).rows,
      [{ recurring_id: series, actual_transaction_id: imported }, { recurring_id: activeSeries, actual_transaction_id: manualId }]);
    assert.deepEqual((await db.query("select count(*)::int as count,sum(amount_cents)::int as cents from expenses where not is_recurring and deleted_at is null")).rows,
      [{ count: 2, cents: 20760 }]);
    assert.deepEqual((await db.query("select has_function_privilege('authenticated','public.is_confirmed_bank_recurring_link_v1(uuid)','EXECUTE') as can_execute")).rows,
      [{ can_execute: false }]);
  } finally { await db.close(); }
});

test("bank cycle ambiguity: a corrected provider date resolves and clears the durable review marker", async () => {
  const db = await syncFixture();
  try {
    await syncReconcile(db);
    await db.query("update expenses set date='2024-09-22' where id=$1", [imported]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 1 }]);
    assert.deepEqual((await db.query("select parent_recurring_id,provider_fields ? 'recurring_reconciliation' as has_review from expenses where id=$1", [imported])).rows,
      [{ parent_recurring_id: series, has_review: false }]);
    await db.exec(await migration(ambiguityFix));
  } finally { await db.close(); }
});

test("bank cycle ambiguity: sync-only deferral never suppresses account-scope failures", async () => {
  const db = await syncFixture();
  try {
    await db.query("update bank_connections set user_id=$1", [idForCycleTest()]);
    await assert.rejects(syncReconcile(db), /OCCURRENCE_ACCOUNT_SCOPE_MISMATCH/);
    assert.deepEqual((await db.query("select provider_fields ? 'recurring_reconciliation' as has_review from expenses where id=$1", [imported])).rows, [{ has_review: false }]);
  } finally { await db.close(); }
});

test("bank cycle ambiguity: another tied payment cannot block adoption of an unambiguous manual occurrence", async () => {
  const db = await syncFixture();
  try {
    const manualId = "00000000-0000-4000-8000-000000000097";
    await db.query(`insert into expenses(id,user_id,account_id,date,amount_cents,currency,type,parent_recurring_id,
      scheduled_occurrence_date,recurring_confirmed_at,recurring_confirmation_source)
      values ($1,$2,$3,'2024-09-08',9000,'CAD','expense',$4,'2024-09-08',now(),'user')`, [manualId,user,wallet,series]);
    await db.query(`insert into recurring_occurrences(recurring_id,scheduled_occurrence_date,status,confirmation_source,
      actual_transaction_id,paid_date,amount_cents,currency,confirmed_at,confirmed_by_user_id)
      values ($1,'2024-09-08','confirmed','user',$2,'2024-09-08',9000,'CAD',now(),$3)`, [series,manualId,user]);
    await db.query(`insert into expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,date,amount_cents,currency,type)
      values ($1,$2,$3,$4,'plaid','pending-payment','2024-09-08',9000,'CAD','expense')`, [idForCycleTest(),user,wallet,bank]);
    assert.deepEqual((await syncReconcile(db)).rows, [{ count: 1 }]);
    assert.deepEqual((await db.query("select actual_transaction_id from recurring_occurrences")).rows, [{ actual_transaction_id: manualId }]);
    assert.deepEqual((await db.query("select count(*)::int as count,sum(amount_cents)::int as cents from expenses where not is_recurring and deleted_at is null")).rows,
      [{ count: 2, cents: 20760 }]);
  } finally { await db.close(); }
});
