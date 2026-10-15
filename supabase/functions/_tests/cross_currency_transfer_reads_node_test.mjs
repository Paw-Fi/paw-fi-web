import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1), other = id(2), household = id(3);
const migration = (name) => readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
async function load(file, name) {
  const sql = await migration(file);
  const start = sql.toLowerCase().indexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1, name);
  const opening = sql.indexOf("$$", start), closing = sql.indexOf("$$", opening + 2);
  await db.exec(sql.slice(start, sql.indexOf(";", closing) + 1));
}
async function rpc(name, args = {}) {
  const keys = Object.keys(args);
  return (await db.query(`select public.${name}(${keys.map((key, i) => `${key} => $${i + 1}`).join(", ")}) as payload`,
    Object.values(args))).rows[0].payload;
}
const feed = (wallet, currencies, extra = {}, version = 6) => rpc(`get_user_transactions_page_v${version}`, {
  p_user_id: actor, p_account_id: wallet, p_currencies: currencies, ...extra,
});

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
    create table auth.users (id uuid primary key);
    create table public.households (id uuid primary key);
    create table public.household_members (household_id uuid, user_id uuid);
    create table public.user_contacts (id uuid, user_id uuid, phone_e164 text,
      verified boolean, preferred_currency text, preferred_timezone text,
      financial_month_start_day integer, created_at timestamptz, updated_at timestamptz);
    create table public.accounts (id uuid primary key, user_id uuid, household_id uuid,
      name text, icon text, color text, currency text, opening_balance_cents bigint default 0,
      created_at timestamptz default now(), is_default boolean default false,
      is_system boolean default false, is_archived boolean default false);
    create table public.merchants (id uuid primary key, domain text, logo_identifier text);
    create table public.daily_budgets (id uuid, contact_id uuid, date date, amount_cents bigint, currency text);
    create table public.expenses (
      id uuid primary key, contact_id uuid, user_id uuid, household_id uuid,
      date date, amount_cents bigint, currency text, category text,
      created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz,
      raw_text text, merchant text, merchant_id uuid, merchant_structured_name text, breakdown jsonb,
      receipt_image_url text, split_group_id uuid, account_id uuid, type text,
      privacy_scope text, is_recurring boolean default false, recurrence_rule jsonb, analytics_class text,
      analytics_is_final boolean default true, analytics_spending_multiplier smallint default 1,
      analytics_counts_toward_income boolean default false, provider_fields jsonb,
      provider text, provider_transaction_id text, bank_account_id uuid,
      parent_recurring_id uuid, scheduled_occurrence_date date,
      recurring_confirmed_at timestamptz, recurring_confirmation_source text,
      transfer_fee_transfer_id uuid
    );
  `);
  const original = await migration("20260331_accounts_feature.sql");
  const start = original.indexOf("create table if not exists public.account_transfers (");
  await db.exec(original.slice(start, original.indexOf("\n);", start) + 3));
  // Schema fixture is the agreed core-agent contract; no mutation/schema migration is modified here.
  await db.exec(`alter table public.account_transfers
    add column to_amount_cents bigint, add column to_currency text,
    add column exchange_rate numeric, add column fee_amount_cents bigint default 0,
    add column fee_expense_id uuid, add column transfer_contract_version integer default 1;`);
  await db.query("insert into auth.users values ($1), ($2)", [actor, other]);
  await db.query("insert into public.households values ($1)", [household]);
  await db.query("insert into public.household_members values ($1, $2)", [household, actor]);
  for (const [n, user, space, currency, opening] of [
    [11, actor, null, "USD", 20000], [12, actor, null, "EUR", 0],
    [13, other, null, "EUR", 0], [14, other, household, "USD", 20000],
    [15, other, household, "EUR", 0],
  ]) await db.query(`insert into public.accounts
      (id, user_id, household_id, name, currency, opening_balance_cents)
      values ($1, $2, $3, 'Wallet', $4, $5)`, [id(n), user, space, currency, opening]);
  for (const [n, user, space, from, to] of [
    [21, actor, null, 11, 12], [22, other, null, 11, 13], [23, other, household, 14, 15],
  ]) await db.query(`insert into public.account_transfers
      (id, from_account_id, to_account_id, amount_cents, currency, date,
       created_by_user_id, household_id, to_amount_cents, to_currency,
       exchange_rate, fee_amount_cents, fee_expense_id, transfer_contract_version)
      values ($1, $2, $3, 10000, 'USD', '2026-10-01', $4, $5, 9000, 'EUR', 0.9, 250, $6, 2)`,
    [id(n), id(from), id(to), user, space, id(n + 10)]);
  for (const [n, user, space, wallet, transfer, privacy] of [
    [31, actor, null, 11, 21, null], [33, other, household, 14, 23, 'balances_only'],
  ]) await db.query(`insert into public.expenses
      (id, user_id, household_id, account_id, transfer_fee_transfer_id,
       date, amount_cents, currency, type, category, privacy_scope)
      values ($1, $2, $3, $4, $5, '2026-10-01', 250, 'USD', 'expense', 'fees', $6)`,
    [id(n), user, space, id(wallet), id(transfer), privacy]);
  for (const name of ["get_user_transactions_page_v1", "get_user_transactions_summary_v1"])
    await load("20260709101424_optimize_pocket_details_transaction_feed_rpc.sql", name);
  await load("20260716230000_plaid_analytics_classification.sql", "get_user_transactions_page_v2");
  await load("20260815120000_fix_sync_job_enqueue_and_summary_analytics.sql", "get_user_transactions_summary_v2");
  await load("20260719151000_plaid_recurring_transaction_badges.sql", "get_user_transactions_page_v3");
  await load("20260722122000_surface_parent_recurring_id_in_mobile_feeds.sql", "get_user_transactions_page_v4");
  await load("20260726140000_recurring_occurrence_transaction_feed_v5.sql", "get_user_transactions_page_v5");
  await load("20260918120000_plaid_merchant_identity_enrichment.sql", "expense_merchant_logo_url");
  await load("20260918120000_plaid_merchant_identity_enrichment.sql", "enrich_merchant_identity_items");
  await load("20260916130005_include_merchant_identity_in_user_analytics.sql", "get_user_analytics");
  await load("20260918120000_plaid_merchant_identity_enrichment.sql", "get_user_analytics_v2");
  await load("20260719111359_home_mom_v2_classification_fields.sql", "get_home_mom_transactions_v2");
  await load("20260916130006_complete_merchant_identity_expense_reads.sql", "get_home_mom_transactions_v4");
  await load("20260918120000_plaid_merchant_identity_enrichment.sql", "get_home_mom_transactions_v5");
  await load("20260719104623_mobile_delta_v2_classification_fields.sql", "get_mobile_delta_v2");
  await load("20260719151000_plaid_recurring_transaction_badges.sql", "get_mobile_delta_v3");
  await load("20260722122000_surface_parent_recurring_id_in_mobile_feeds.sql", "get_mobile_delta_v4");
  await load("20260726140000_recurring_occurrence_transaction_feed_v5.sql", "get_mobile_delta_v5");
  await load("20260915130000_merchant_identity_resolution.sql", "get_mobile_delta_v6");
  for (const name of ["get_dashboard_recent_transactions_v1", "get_dashboard_calendar_transactions_v1"])
    await load("20260716230000_plaid_analytics_classification.sql", name);
  for (const name of ["get_dashboard_recent_transactions_v2", "get_dashboard_calendar_transactions_v2"])
    await load("20260915130000_merchant_identity_resolution.sql", name);
  await load("20260417201500_add_merchant_to_transactions_and_dashboard_rpcs.sql", "get_user_expense_by_id_v1");
  await load("20260916130003_enrich_remaining_transaction_reads.sql", "get_user_expense_by_id_v2");
  for (const name of ["get_wallets_month_snapshot_v1", "get_wallets_history_v1"])
    await load("20260526120000_currency_scope_wallet_snapshot_legacy_wallets.sql", name);
  // Execute the production wrapper hierarchy as well as the physical base
  // ledger. This transfer fixture deliberately contains no recurring templates.
  for (const name of ["make_clamped_calendar_date_v1", "build_projected_recurring_expense_id_v1",
    "project_recurring_occurrence_dates_v1", "get_projected_scoped_recurring_expenses_v1", "get_wallets_history_v2"])
    await load("20260408170000_add_recurring_aware_wallets_and_pockets_rpcs.sql", name);
  await load("20260526120000_currency_scope_wallet_snapshot_legacy_wallets.sql", "get_wallets_month_snapshot_v2");
  await load("20260713063357_add_wallets_month_snapshot_v3_excluding_transfers_from_totals.sql", "get_wallets_month_snapshot_v3");
  await db.exec("alter function public.get_wallets_month_snapshot_v3(uuid,uuid,text,date,boolean,integer) rename to get_wallets_month_snapshot_v3_legacy");
  for (const name of ["normalize_financial_month_start_day", "financial_cycle_start_for_month",
    "next_financial_cycle_start", "previous_financial_cycle_start"])
    await load("20260715120000_restore_financial_month_helpers.sql", name);
  await load("20261006170000_external_transfer_wallet_projection.sql", "get_wallets_month_snapshot_v3");
  await db.exec(await migration("20261001120000_account_transfer_optional_wall_time.sql"));
  await db.exec(await migration("20261001121000_account_transfer_time_read_sync.sql"));
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [actor]);
  if (!process.env.CROSS_CURRENCY_READ_BASELINE)
    await db.exec(await migration("20261015121000_cross_currency_transfer_reads.sql"));
});
after(() => db.close());

test("wallet feed filters incoming by target currency before pagination and search", async () => {
  for (const version of [1, 2, 6]) {
    const incoming = (await feed(id(12), ["EUR"], {}, version)).items;
    assert.equal(incoming.length, 1);
    assert.equal(incoming[0].amount_cents, 9000);
    assert.equal(incoming[0].currency, "EUR");
    assert.equal(incoming[0].id, `transfer:${id(21)}:in`);
    assert.equal((await feed(id(12), ["USD"], {}, version)).items.length, 0);
    assert.equal((await feed(id(12), ["EUR"], { p_search_query: "90", p_page_size: 1 }, version)).items.length, 1);
  }
  const outgoing = (await feed(id(11), ["USD"])).items;
  assert.equal(outgoing.find((row) => row.id.startsWith("transfer:")).amount_cents, 10000);
  assert.equal(outgoing.find((row) => row.id === id(31)).transfer_fee_transfer_id, id(21));
});

test("delta emits native paired principals with analytics zero, fee remains one ordinary expense", async () => {
  const payload = await rpc("get_mobile_transfer_delta_v1", { p_user_id: actor });
  const outgoing = payload.transactions.find((row) => row.id === `transfer:${id(21)}:out`);
  const incoming = payload.transactions.find((row) => row.id === `transfer:${id(21)}:in`);
  assert.equal(outgoing.amount_cents, 10000);
  assert.equal(incoming.amount_cents, 9000);
  assert.equal(incoming.currency, "EUR");
  assert.ok(payload.transactions.every((row) => row.analytics_spending_multiplier === 0 && !row.analytics_counts_toward_income));
  const analytics = await rpc("get_user_analytics_v2", { p_user_id: actor });
  assert.equal(analytics.expenses.length, 1);
  assert.equal(analytics.expenses[0].transfer_fee_transfer_id, id(21));
  const summary = await rpc("get_user_transactions_summary_v2", { p_user_id: actor, p_currencies: ["USD"] });
  assert.equal(summary.expense_total_cents, 250);
});

test("native snapshots and history credit received amount and debit principal plus fee exactly once", async () => {
  for (const [currency, expected] of [["EUR", 9000], ["USD", 9750]]) {
    for (const version of [1, 2, 3]) {
      const snapshot = await rpc(`get_wallets_month_snapshot_v${version}`, { p_user_id: actor,
        p_currency: currency, p_month_start: "2026-10-01" });
      assert.equal(snapshot.net_worth_cents, expected);
      assert.equal(snapshot.spent_total_cents, currency === "USD" ? 250 : 0);
    }
    for (const version of [1, 2]) {
      const history = await rpc(`get_wallets_history_v${version}`, { p_user_id: actor,
        p_currency: currency, p_current_month_start: "2026-10-01" });
      assert.equal(history.net_worth_series.at(-1).net_worth_cents, expected);
    }
  }
});

test("fee linkage survives every active expense delta, dashboard, detail and MoM row contract", async () => {
  const delta = await rpc("get_mobile_delta_v6", { p_user_id: actor });
  assert.equal(delta.transactions.find((row) => row.id === id(31)).transfer_fee_transfer_id, id(21));
  const detail = await rpc("get_user_expense_by_id_v2", { p_user_id: actor, p_expense_id: id(31) });
  assert.equal(detail.transfer_fee_transfer_id, id(21));
  for (const name of ["get_dashboard_recent_transactions_v2", "get_dashboard_calendar_transactions_v2"]) {
    const rows = await rpc(name, { p_user_id: actor, p_currency: "USD" });
    assert.equal(rows[0].transfer_fee_transfer_id, id(21));
    assert.deepEqual(await rpc(name, { p_user_id: actor, p_household_id: household }), []);
  }
  const mom = (await db.query("select * from public.get_home_mom_transactions_v5($1)", [actor])).rows;
  assert.equal(mom.find((row) => row.id === id(31)).transfer_fee_transfer_id, id(21));
});

test("scope and balances-only redaction survive enrichment", async () => {
  assert.equal((await feed(id(13), ["EUR"])).items.length, 0);
  const shared = await feed(id(15), ["EUR"], { p_household_id: household });
  assert.equal(shared.items[0].amount_cents, 9000);
  assert.equal((await feed(id(14), ["USD"], { p_household_id: household })).items.length, 1);
  const hidden = await rpc("enrich_merchant_identity_items", { p_items: [{ id: id(33), account_id: null }] });
  assert.equal(hidden[0].transfer_fee_transfer_id, null);
  await assert.rejects(rpc("get_mobile_transfer_delta_v1", { p_user_id: other }), (error) => error.code === "42501");
});

test("legacy target fallback and migration reapplication preserve native rows", async () => {
  await db.query(`insert into public.account_transfers
    (id, from_account_id, to_account_id, amount_cents, currency, date, created_by_user_id)
    values ($1, $2, $3, 700, 'USD', '2026-10-02', $4)`, [id(24), id(11), id(12), actor]);
  if (!process.env.CROSS_CURRENCY_READ_BASELINE)
    await db.exec(await migration("20261015121000_cross_currency_transfer_reads.sql"));
  const row = (await feed(id(12), ["USD"])).items.find((item) => item.id === `transfer:${id(24)}:in`);
  assert.equal(row.amount_cents, 700);
  assert.equal(row.currency, "USD");
  assert.equal((await db.query(`select has_function_privilege('authenticated',
    'public.enrich_merchant_identity_items(jsonb)', 'execute') as allowed`)).rows[0].allowed, false);
});
