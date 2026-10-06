/// <reference lib="deno.ns" />
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const user = "00000000-0000-4000-8000-000000000001";
const otherUser = "00000000-0000-4000-8000-000000000002";
const household = "00000000-0000-4000-8000-000000000003";
const migrations = new URL("../../migrations/", import.meta.url);

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.role() returns text language sql as
      $$select coalesce(current_setting('test.role', true), 'service_role')$$;
    create function auth.uid() returns uuid language sql as
      $$select nullif(current_setting('test.actor', true), '')::uuid$$;
    create table public.user_contacts(id uuid, user_id uuid);
    create table public.household_members(household_id uuid, user_id uuid);
    create table public.bank_accounts(id uuid, type text);
    create table public.expenses(
      id uuid primary key default gen_random_uuid(), user_id uuid, contact_id uuid,
      household_id uuid, privacy_scope text default 'full', date date,
      deleted_at timestamptz, is_recurring boolean default false,
      type text, category text, amount_cents bigint, currency text,
      provider text, bank_account_id uuid, raw_provider_payload jsonb,
      provider_pending boolean, provider_pfc_primary text, provider_pfc_detailed text,
      provider_pfc_confidence text, provider_pfc_version text, provider_transaction_code text,
      analytics_class text, analytics_direction text, analytics_is_final boolean,
      analytics_spending_multiplier smallint, analytics_counts_toward_income boolean,
      classification_source text, classification_version integer
    );
    create table public.test_projected(recurring_id uuid, amount_cents bigint,
      date date, currency text, type text, category text);
    create function public.next_financial_cycle_start(date, integer) returns date
      language sql as $$select (date_trunc('month', $1) + interval '1 month')::date$$;
    create function public.previous_financial_cycle_start(date, integer) returns date
      language sql as $$select (date_trunc('month', $1) - interval '1 month')::date$$;
    create function public.get_projected_scoped_recurring_expenses_v1(uuid, text, uuid, text, date, date)
      returns setof public.test_projected language sql as $$
      select pr.* from public.test_projected pr join public.expenses template on template.id = pr.recurring_id
      where pr.date between $5 and $6 and ($4 is null or pr.currency = $4)
      and (($2 = 'personal' and template.household_id is null and template.user_id = $1)
        or ($2 = 'household' and template.household_id = $3))$$;
    create function public.get_wallets_month_snapshot_v3_legacy(uuid, uuid, text, date, boolean, integer)
      returns jsonb language sql as $$select '{"income_total_cents":999,"spent_total_cents":999,"net_worth_cents":12345,"wallet_balances":{"wallet":12345}}'::jsonb$$;
  `);
  const analytics = await Deno.readTextFile(
    new URL("20260716230000_plaid_analytics_classification.sql", migrations),
  );
  const start = analytics.indexOf(
    "create or replace function public.set_expense_analytics_classification_v1()",
  );
  const end = analytics.indexOf("\n$$;", start);
  await db.exec(analytics.slice(start, end + 4));
  await db.exec(
    `create trigger classify before insert or update on public.expenses
    for each row execute function public.set_expense_analytics_classification_v1()`,
  );
  // Apply the actual additive migration, including its privileges.
  await db.exec(
    await Deno.readTextFile(
      new URL(
        "20261006170000_external_transfer_wallet_projection.sql",
        migrations,
      ),
    ),
  );
  return db;
}

async function insert(db: PGlite, options: {
  type: "expense" | "income";
  amount: number;
  recurring?: boolean;
  owner?: string;
  space?: string;
  privacy?: string;
  currency?: string;
  analyticsClass?: "transfer_in" | "transfer_out";
}) {
  const result = await db.query<{ id: string; analytics_class: string }>(
    `
    insert into public.expenses(user_id, household_id, privacy_scope, date, type,
      category, amount_cents, currency, is_recurring, classification_source, analytics_class)
    values ($1, $2, $3, '2024-10-06', $4, 'transfers', $5, $6, $7, $8, $9)
    returning id, analytics_class`,
    [
      options.owner ?? user,
      options.space ?? null,
      options.privacy ?? "full",
      options.type,
      options.amount,
      options.currency ?? "THB",
      options.recurring ?? false,
      options.analyticsClass ? "user_override" : null,
      options.analyticsClass ?? null,
    ],
  );
  if (options.recurring) {
    await db.query(
      `insert into public.test_projected values ($1, $2, '2024-10-06', $3, $4, 'transfers')`,
      [
        result.rows[0].id,
        options.amount,
        options.currency ?? "THB",
        options.type,
      ],
    );
  }
  return result.rows[0];
}

async function snapshot(
  db: PGlite,
  space: string | null = null,
  currency = "THB",
) {
  return (await db.query<{ result: Record<string, unknown> }>(
    `
    select public.get_wallets_month_snapshot_v3($1, $2, $3, '2024-10-01', false, 1) as result`,
    [user, space, currency],
  )).rows[0].result;
}

Deno.test("external transfer save analytics and recurring projections count both directions without own-account effects", async () => {
  const db = await fixture();
  try {
    assertEquals(
      (await insert(db, { type: "expense", amount: 1000 })).analytics_class,
      "consumer_spend",
    );
    assertEquals(
      (await insert(db, { type: "income", amount: 600 })).analytics_class,
      "income",
    );
    await insert(db, { type: "expense", amount: 500, recurring: true });
    await insert(db, { type: "income", amount: 300, recurring: true });
    for (const recurring of [false, true]) {
      await insert(db, {
        type: "expense",
        amount: 9000,
        recurring,
        analyticsClass: "transfer_out",
      });
      await insert(db, {
        type: "income",
        amount: 9000,
        recurring,
        analyticsClass: "transfer_in",
      });
    }
    await insert(db, { type: "expense", amount: 70000, currency: "USD" });
    await insert(db, { type: "income", amount: 80000, owner: otherUser });
    const result = await snapshot(db);
    assertEquals(result.income_total_cents, 900);
    assertEquals(result.spent_total_cents, 1500);
    assertEquals(result.net_worth_cents, 12345);
    assertEquals(result.wallet_balances, { wallet: 12345 });
    assertEquals((await snapshot(db, null, "USD")).spent_total_cents, 70000);
  } finally {
    await db.close();
  }
});

Deno.test("external transfer wallet projections preserve household membership and row privacy", async () => {
  const db = await fixture();
  try {
    await db.exec(`set test.role = 'authenticated'; set test.actor = '${user}'`);
    await assertRejects(
      () => snapshot(db, household),
      Error,
      "Unauthorized household",
    );
    await db.query("insert into household_members values ($1, $2)", [
      household,
      user,
    ]);
    await insert(db, {
      type: "expense",
      amount: 1000,
      space: household,
      recurring: true,
    });
    await insert(db, {
      type: "income",
      amount: 600,
      space: household,
      owner: otherUser,
      privacy: "balances_only",
      recurring: true,
    });
    await insert(db, {
      type: "expense",
      amount: 70000,
      space: household,
      owner: otherUser,
      privacy: "private",
      recurring: true,
    });
    await insert(db, {
      type: "expense",
      amount: 80000,
      space: household,
      owner: otherUser,
      privacy: "private",
    });
    const result = await snapshot(db, household);
    assertEquals(result.spent_total_cents, 1000);
    assertEquals(result.income_total_cents, 600);
    await db.exec(`set test.actor = '${otherUser}'`);
    await assertRejects(
      () => snapshot(db),
      Error,
      "Unauthorized wallet snapshot",
    );
  } finally {
    await db.close();
  }
});
