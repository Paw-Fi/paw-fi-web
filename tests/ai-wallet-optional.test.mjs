import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("actual wallet migration permits unassigned expense/income and never creates a wallet", async () => {
  const database = new PGlite();
  const actor = "11111111-1111-4111-8111-111111111111";
  const posb = "22222222-2222-4222-8222-222222222222";
  try {
    await database.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid);
      create function auth.uid() returns uuid language sql as $$ select '${actor}'::uuid $$;
      create table public.households(id uuid, owner_id uuid);
      create table public.household_members(household_id uuid, user_id uuid);
      create table public.user_contacts(id uuid, user_id uuid);
      create table public.accounts(id uuid, user_id uuid, household_id uuid, currency text,
        is_default boolean, is_archived boolean, is_system boolean, linked_bank_account_id uuid);
      create table public.expenses(id serial, user_id uuid, contact_id uuid, household_id uuid,
        currency text, account_id uuid, type text);
      create function public.resolve_account_currency(uuid, uuid) returns text
        language sql as $$ select 'SGD'::text $$;
    `);
    await database.exec(await readFile(new URL(
      "../supabase/migrations/20260723130000_remove_automatic_spending_wallets.sql", import.meta.url,
    ), "utf8"));
    await database.exec(await readFile(new URL(
      "../supabase/migrations/20261002104000_preserve_archived_expense_wallet_bindings.sql", import.meta.url,
    ), "utf8"));
    await database.exec(`create trigger expense_wallet before insert or update on public.expenses
      for each row execute function public.ensure_expense_account_id();`);

    const resolve = async (currency, helper = "resolve_default_account") =>
      (await database.query(`select public.${helper}($1::uuid, null::uuid, $2::text) as id`, [actor, currency])).rows[0].id;
    assert.equal(await resolve("SGD"), null);
    assert.equal(await resolve("SGD", "ensure_spending_account_for_currency"), null);
    for (const type of ["expense", "income"]) {
      await database.query("insert into public.expenses(user_id,currency,type) values ($1,'SGD',$2)", [actor, type]);
    }
    assert.deepEqual((await database.query("select type, account_id from public.expenses order by id")).rows,
      [{ type: "expense", account_id: null }, { type: "income", account_id: null }]);
    assert.equal((await database.query("select count(*)::int as count from public.accounts")).rows[0].count, 0);

    await database.query("insert into public.accounts values ($1,$2,null,'SGD',true,false,false,null)", [posb, actor]);
    assert.equal(await resolve("SGD"), posb);
    assert.equal(await resolve("EUR"), null);
    assert.equal(await resolve("EUR", "ensure_spending_account_for_currency"), null);
    for (const type of ["expense", "income"]) {
      const saved = await database.query(
        "insert into public.expenses(user_id,currency,type,account_id) values ($1,'SGD',$2,null) returning account_id",
        [actor, type],
      );
      assert.equal(saved.rows[0].account_id, null);
    }
    await database.query("insert into public.expenses(user_id,currency,type,account_id) values ($1,'SGD','expense',$2)", [actor, posb]);
    await assert.rejects(
      database.query("insert into public.expenses(user_id,currency,type,account_id) values ($1,'EUR','expense',$2)", [actor, posb]),
      /does not match wallet currency/,
    );
    assert.equal((await database.query("select count(*)::int as count from public.accounts")).rows[0].count, 1);
  } finally {
    await database.close();
  }
});
