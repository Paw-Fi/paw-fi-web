/// <reference lib="deno.ns" />
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBankExpenseMutationPlan } from "../shared/bank-expense-projection.ts";
import type { ExistingExpenseProjectionRow } from "../shared/bank-expense-projection.ts";
import { mapPlaidTransactionToExpense } from "../shared/plaid-client.ts";
import type { PlaidTransaction } from "../shared/plaid-client.ts";

const user = "00000000-0000-4000-8000-000000000001";
const wallet = "00000000-0000-4000-8000-000000000002";
const bank = "00000000-0000-4000-8000-000000000003";
const series = "00000000-0000-4000-8000-000000000004";
const imported = "00000000-0000-4000-8000-000000000005";
const actual = "00000000-0000-4000-8000-000000000006";
const connection = "00000000-0000-4000-8000-000000000007";
const migrationUrl = new URL(
  "../../migrations/20260930160000_reconcile_bank_recurring_occurrences.sql",
  import.meta.url,
);

async function fixture(realWriter = false) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create type public.transaction_type as enum ('expense', 'income');
    create table public.user_contacts(user_id uuid, preferred_timezone text, updated_at timestamptz);
    create function auth.jwt() returns jsonb language sql as
      $$select jsonb_build_object('role', coalesce(current_setting('test.role', true), 'service_role'))$$;
    create table public.accounts(id uuid primary key, user_id uuid, household_id uuid,
      currency text, is_archived boolean default false);
    create table public.bank_accounts(id uuid primary key, user_id uuid,
      bank_connection_id uuid, type text);
    create table public.bank_connections(id uuid primary key, user_id uuid, household_id uuid, cursor text);
    create table public.expenses(
      id uuid primary key default gen_random_uuid(), user_id uuid, household_id uuid, privacy_scope text default 'full',
      account_id uuid, bank_account_id uuid references public.bank_accounts(id) on delete set null, provider text, provider_transaction_id text,
      provider_pending_transaction_id text, provider_posted_from_pending_transaction_id text,
      date date, amount_cents bigint, currency text, type public.transaction_type, merchant text, raw_text text,
      category text, is_recurring boolean default false, recurrence_rule jsonb,
      provider_fields jsonb default '{}', raw_provider_payload jsonb,
      user_overrides jsonb default '{}', idempotency_key text,
      parent_recurring_id uuid references public.expenses(id) on delete restrict, scheduled_occurrence_date date,
      recurring_confirmed_at timestamptz, recurring_confirmation_source text,
      provider_pending boolean default false, analytics_is_final boolean default true,
      analytics_class text default 'consumer_spend', analytics_direction text default 'out',
      analytics_spending_multiplier smallint default 1, analytics_counts_toward_income boolean default false,
      classification_source text default 'manual', classification_version integer default 2,
      provider_pfc_primary text, provider_pfc_detailed text, provider_pfc_confidence text,
      provider_pfc_version text, provider_transaction_code text,
      split_group_id uuid, deleted_at timestamptz, deleted_reason text,
      created_at timestamptz default now(), updated_at timestamptz default now()
    );
    create unique index provider_identity on public.expenses(user_id, provider, bank_account_id, provider_transaction_id)
      where provider is not null and bank_account_id is not null and provider_transaction_id is not null;
    create unique index cycle_actual on public.expenses(parent_recurring_id, scheduled_occurrence_date)
      where parent_recurring_id is not null and scheduled_occurrence_date is not null
        and is_recurring is false and deleted_at is null;
    create table public.recurring_occurrences(
      id uuid primary key default gen_random_uuid(), recurring_id uuid references public.expenses(id) on delete restrict,
      scheduled_occurrence_date date, status text, confirmation_source text,
      actual_transaction_id uuid references public.expenses(id) on delete set null,
      paid_date date, amount_cents bigint, currency text,
      confirmed_at timestamptz, confirmed_by_user_id uuid, split_group_id uuid,
      updated_at timestamptz default now(), unique(recurring_id, scheduled_occurrence_date),
      check (status in ('pending', 'confirmed', 'skipped')),
      check (confirmation_source is null or confirmation_source in ('user', 'legacy_migration', 'system')),
      check (amount_cents is null or amount_cents > 0),
      check (currency is null or currency ~ '^[A-Z]{3}$'),
      check (status <> 'skipped' or actual_transaction_id is null),
      check (status <> 'confirmed' or (actual_transaction_id is not null and paid_date is not null
        and amount_cents is not null and currency is not null and confirmed_at is not null))
    );
    create unique index occurrence_actual on public.recurring_occurrences(actual_transaction_id)
      where actual_transaction_id is not null;
    create table public.recurring_transaction_reminders_sent(expense_id uuid, occurrence_date date);
    create table public.notification_events(event_type text, is_sent boolean, payload jsonb);
    insert into public.accounts values ('${wallet}', '${user}', null, 'CAD', false);
    insert into public.bank_accounts(id,user_id,bank_connection_id,type) values ('${bank}', '${user}', '${connection}', 'credit');
    insert into public.bank_connections values ('${connection}', '${user}', null, 'before');
    insert into public.expenses(id,user_id,account_id,date,amount_cents,currency,type,merchant,is_recurring,recurrence_rule,provider_fields)
    values ('${series}', '${user}', '${wallet}', '2024-09-24', 11760, 'CAD', 'expense', 'Telus Pre-auth', true,
      '{"frequency":"monthly","anchor_date":"2024-09-24","projection_enabled":false}',
      '{"source":"plaid_recurring_template","bank_account_id":"${bank}","transaction_ids":["bank-payment","pending-payment"],"template_identity":"stream-1"}');
  `);
  const schedule = await Deno.readTextFile(
    new URL(
      "../../migrations/20260716150000_fix_recurring_reminder_occurrence_selection.sql",
      import.meta.url,
    ),
  );
  await db.exec(schedule.slice(0, schedule.indexOf("$$;") + 3));
  await db.exec(
    await Deno.readTextFile(
      new URL(
        "../../migrations/20260726120000_recurring_occurrence_rpcs.sql",
        import.meta.url,
      ),
    ),
  );
  await db.exec(
    await Deno.readTextFile(
      new URL(
        "../../migrations/20260726150000_allow_recurring_confirmation_from_reminder.sql",
        import.meta.url,
      ),
    ),
  );
  await db.exec(
    await Deno.readTextFile(
      new URL(
        "../../migrations/20260923120000_allow_next_recurring_occurrence_preconfirmation.sql",
        import.meta.url,
      ),
    ),
  );
  const nextOccurrence = await Deno.readTextFile(
    new URL(
      "../../migrations/20260923140000_allow_all_recurring_occurrence_confirmation.sql",
      import.meta.url,
    ),
  );
  await db.exec(nextOccurrence.slice(0, nextOccurrence.indexOf("$$;") + 3));
  const classification = await Deno.readTextFile(
    new URL(
      "../../migrations/20260716230000_plaid_analytics_classification.sql",
      import.meta.url,
    ),
  );
  for (const name of [
    "classify_plaid_transaction_v1",
    "set_expense_analytics_classification_v1",
  ]) {
    const start = classification.indexOf(
      `create or replace function public.${name}`,
    );
    const end = classification.indexOf("$$;", start);
    await db.exec(classification.slice(start, end + 3));
  }
  await db.exec(
    `create trigger set_expense_analytics_classification_v1 before insert or update of
    provider, bank_account_id, raw_provider_payload, amount_cents, type, classification_source,
    analytics_class, analytics_direction, analytics_is_final, analytics_spending_multiplier,
    analytics_counts_toward_income on expenses for each row
    execute function public.set_expense_analytics_classification_v1()`,
  );
  // Model only the existing cursor writer here; the reconciliation wrapper and
  // confirmation/classification functions above are verbatim production SQL.
  await db.exec(`create function public.apply_plaid_sync_batch_v2_legacy(
    p_user_id uuid, p_bank_connection_id uuid, p_expected_cursor_generation integer,
    p_next_cursor text, p_expense_inserts jsonb, p_expense_updates jsonb,
    p_removed_provider_transaction_ids text[], p_removed_bank_account_ids uuid[],
    p_processed_bank_account_ids uuid[], p_account_upserts jsonb,
    p_inactive_bank_account_ids uuid[], p_raw_transactions jsonb, p_sync_status jsonb,
    p_is_ready boolean, p_recurring_refresh_required boolean, p_lock_token uuid, p_audit_id uuid
  ) returns jsonb language plpgsql as $$
  declare v_row jsonb; v_records jsonb := '[]';
  begin
    if p_is_ready then
      for v_row in select value from jsonb_array_elements(p_expense_inserts) loop
        insert into public.expenses select (jsonb_populate_record(null::public.expenses, v_row)).*;
        v_records := v_records || jsonb_build_array(v_row);
      end loop;
      update public.bank_connections set cursor=p_next_cursor where id=p_bank_connection_id and user_id=p_user_id;
    end if;
    return jsonb_build_object('inserted_records', v_records);
  end; $$`);
  if (realWriter) {
    await db.exec(`
      alter table accounts add column linked_bank_account_id uuid;
      update accounts set linked_bank_account_id='${bank}' where id='${wallet}';
      create table household_members(household_id uuid, user_id uuid);
      alter table expenses add column source text, add column contact_id uuid,
        add column normalized_amount_cents bigint, add column base_currency text,
        add column fx_rate numeric, add column classification_review_state text,
        add column classification_review_reason text, add column provider_deleted_at timestamptz,
        add column sync_version integer, add column provider_sync_cursor_generation integer;
      alter table bank_accounts add column provider text default 'plaid', add column last_synced_at timestamptz;
      update bank_accounts set bank_connection_id='${connection}';
      alter table bank_connections add column provider text default 'plaid',
        add column removed_at timestamptz, add column cursor_generation integer default 0,
        add column plaid_cursor text, add column last_successful_sync_at timestamptz,
        add column last_synced_at timestamptz, add column status text default 'active',
        add column item_status text default 'active', add column item_health_state text,
        add column needs_resync boolean, add column relink_state text,
        add column error_code text, add column error_message text;
      create table bank_sync_locks(bank_connection_id uuid, lock_token uuid, locked_until timestamptz);
      insert into bank_sync_locks values ('${connection}', '${actual}', now()+interval '1 hour');
      create table bank_sync_audit(id uuid, bank_connection_id uuid, synced_accounts integer,
        inserted_transactions integer, updated_transactions integer, status text,
        finished_at timestamptz, error_message text);
      create table plaid_sync_events(bank_connection_id uuid, bank_sync_audit_id uuid,
        event_type text, payload jsonb);
    `);
    const writer = await Deno.readTextFile(
      new URL(
        "../../migrations/20260723120000_eliminate_plaid_sync_no_op_writes.sql",
        import.meta.url,
      ),
    );
    const start = writer.indexOf(
      "create or replace function public.apply_plaid_sync_batch_v1(",
    );
    await db.exec(writer.slice(start, writer.indexOf("$$;", start) + 3));
    // Account/raw staging is outside this test. The actual expense writer, its
    // lease/cursor fencing and reconciliation wrapper execute verbatim SQL.
    await db.exec(
      `create or replace function public.apply_plaid_sync_batch_v2_legacy(
      p_user_id uuid, p_bank_connection_id uuid, p_expected_cursor_generation integer,
      p_next_cursor text, p_expense_inserts jsonb, p_expense_updates jsonb,
      p_removed_provider_transaction_ids text[], p_removed_bank_account_ids uuid[],
      p_processed_bank_account_ids uuid[], p_account_upserts jsonb,
      p_inactive_bank_account_ids uuid[], p_raw_transactions jsonb, p_sync_status jsonb,
      p_is_ready boolean, p_recurring_refresh_required boolean, p_lock_token uuid, p_audit_id uuid
    ) returns jsonb language plpgsql as $$ begin
      return public.apply_plaid_sync_batch_v1(p_user_id,p_bank_connection_id,
        p_expected_cursor_generation,p_next_cursor,p_expense_inserts,p_expense_updates,
        p_removed_provider_transaction_ids,p_removed_bank_account_ids,
        p_processed_bank_account_ids,p_lock_token,p_audit_id);
    end; $$`,
    );
  }
  await db.exec(await Deno.readTextFile(migrationUrl));
  await db.exec(
    await Deno.readTextFile(
      new URL(
        "../../migrations/20260930170000_guard_distinct_recurring_bank_payments.sql",
        import.meta.url,
      ),
    ),
  );
  await db.exec(
    await Deno.readTextFile(
      new URL(
        "../../migrations/20261002090000_fix_bank_recurring_connection_scope.sql",
        import.meta.url,
      ),
    ),
  );
  for (const name of [
    "20261002103000_defer_ambiguous_bank_recurring_cycles.sql",
    "20261002113000_review_incompatible_recurring_bank_rows.sql",
  ]) {
    await db.exec(
      await Deno.readTextFile(
        new URL(`../../migrations/${name}`, import.meta.url),
      ),
    );
  }
  return db;
}

async function manual(db: PGlite) {
  return db.query(`select public.confirm_recurring_occurrence_v1(
    '${user}', '${series}', '2024-09-24', '2024-09-24', 11760,
    '${wallet}', 'Telus Pre-auth', 'Phone Bill', null, null, false, '${actual}', 'manual-1') as result`);
}

async function importPayment(db: PGlite, pending = false) {
  await db.exec(
    `insert into public.expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,
    date,amount_cents,currency,type,provider_pending,analytics_is_final,raw_provider_payload)
    values ('${imported}', '${user}', '${wallet}', '${bank}', 'plaid', '${
      pending ? "pending-payment" : "bank-payment"
    }',
      '2024-09-23', 11760, 'CAD', 'expense', ${pending}, ${!pending},
      '{"transaction_id":"${
        pending ? "pending-payment" : "bank-payment"
      }","pending":${pending},"amount":117.60,"personal_finance_category":{"primary":"GENERAL_SERVICES","confidence_level":"VERY_HIGH"}}');`,
  );
}

Deno.test(
  "bank recurring: new manual actual has fresh sync timestamps and no bank payment aliases",
  async () => {
    const db = await fixture();
    try {
      await db.exec(
        `update expenses set created_at='2000-01-01', updated_at='2000-01-01',
      provider_pending_transaction_id='stale-pending',
      provider_posted_from_pending_transaction_id='stale-posted' where id='${series}'`,
      );
      await manual(db);
      const result = await db.query(
        `select created_at > '2000-01-01'::timestamptz as fresh_created,
      updated_at > '2000-01-01'::timestamptz as fresh_updated,
      provider_pending_transaction_id, provider_posted_from_pending_transaction_id
      from expenses where id='${actual}'`,
      );
      assertEquals(result.rows, [
        {
          fresh_created: true,
          fresh_updated: true,
          provider_pending_transaction_id: null,
          provider_posted_from_pending_transaction_id: null,
        },
      ]);
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: next future manual confirmation stays idempotent under current guards",
  async () => {
    const db = await fixture();
    try {
      await db.exec(`update expenses set date=current_date+10,
      recurrence_rule=jsonb_build_object('frequency','monthly','anchor_date',(current_date+10)::text,
      'projection_enabled',false) where id='${series}'`);
      for (let i = 0; i < 2; i++) {
        await db.query(
          `select public.confirm_recurring_occurrence_v1('${user}', '${series}',
        current_date+10, current_date+10, 11760, '${wallet}', 'Telus Pre-auth', '',
        null, null, false, '${actual}', 'future-confirmation')`,
        );
      }
      assertEquals(
        (
          await db.query(
            `select count(*)::int as count from expenses where not is_recurring`,
          )
        ).rows,
        [{ count: 1 }],
      );
      assertEquals(
        (
          await db.query(
            `select count(*)::int as count from recurring_occurrences where status='confirmed'`,
          )
        ).rows,
        [{ count: 1 }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: disconnected imported history is reused by manual confirmation",
  async () => {
    const db = await fixture();
    try {
      await importPayment(db);
      await db.exec(`update expenses set bank_account_id = null,
      provider_fields = jsonb_build_object('bank_account_id', '${bank}')
      where id = '${imported}'; delete from bank_accounts where id = '${bank}'`);
      await manual(db);
      await manual(db);
      // Missing bank metadata must not invent a spending classification.
      await assertOnePayment(db, imported, 0);
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: normalized semi-monthly cadence reconciles without blocking sync",
  async () => {
    const db = await fixture();
    try {
      await db.exec(`update expenses set recurrence_rule =
      '{"frequency":"semi_monthly","anchor_date":"2024-09-24","projection_enabled":false}'
      where id = '${series}'`);
      await importPayment(db);
      await reconcile(db);
      await assertOnePayment(db, imported);
      assertEquals(
        (
          await db.query(`select public.bank_recurring_cycle_date_v1(
      '{"frequency":"semi_monthly","anchor_date":"2024-09-24"}', '2024-10-10')::text as cycle`)
        ).rows,
        [{ cycle: "2024-10-09" }],
      );
    } finally {
      await db.close();
    }
  },
);

async function reconcile(db: PGlite) {
  return db.query(
    `select public.reconcile_bank_recurring_occurrences_v1('${user}', array['${series}']::uuid[], null)`,
  );
}

async function assertOnePayment(
  db: PGlite,
  expectedId?: string,
  expectedSpent = 11760,
) {
  const rows = await db.query<{
    actual_transaction_id: string;
    paid_date: string;
    scheduled_occurrence_date: string;
  }>(
    "select actual_transaction_id, paid_date::text, scheduled_occurrence_date::text from recurring_occurrences where status='confirmed'",
  );
  assertEquals(rows.rows.length, 1);
  assertEquals(rows.rows[0].scheduled_occurrence_date, "2024-09-24");
  assertEquals(rows.rows[0].paid_date, "2024-09-23");
  if (expectedId) assertEquals(rows.rows[0].actual_transaction_id, expectedId);
  const totals = await db.query(
    "select count(*)::int as count, sum(amount_cents)::int as cents, sum(amount_cents*analytics_spending_multiplier)::int as spent from expenses where not is_recurring and deleted_at is null and analytics_is_final",
  );
  assertEquals(totals.rows, [{ count: 1, cents: 11760, spent: expectedSpent }]);
}

Deno.test(
  "bank recurring: manual confirmation then same-account import preserves one actual and effect",
  async () => {
    let db = await fixture();
    try {
      await manual(db);
      await importPayment(db);
      await reconcile(db);
      await reconcile(db);
      await assertOnePayment(db, actual);
      await manual(db); // Lost-response replay still resolves to the same actual.
      const persisted = await db.dumpDataDir("none");
      await db.close();
      db = new PGlite({ loadDataDir: persisted });
      await reconcile(db);
      await assertOnePayment(db, actual);
      assertEquals(
        (
          await db.query(
            "select provider_fields->>'source' as source from expenses where is_recurring",
          )
        ).rows,
        [{ source: "plaid_recurring_template" }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: import first and repeated manual confirmation reuse the imported actual",
  async () => {
    const db = await fixture();
    try {
      await importPayment(db);
      await manual(db);
      await reconcile(db);
      await assertOnePayment(db, imported);
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: pending payment counts once and posting retains cycle identity",
  async () => {
    const db = await fixture();
    try {
      await importPayment(db, true);
      await reconcile(db);
      await assertOnePayment(db, imported);
      await db.exec(`update expenses set provider_transaction_id='bank-payment',
      provider_posted_from_pending_transaction_id='pending-payment', provider_pending=false,
      date='2024-09-25', raw_provider_payload='{"pending":false,"amount":117.60}' where id='${imported}'`);
      await reconcile(db);
      const rows = await db.query(
        "select paid_date::text, scheduled_occurrence_date::text, actual_transaction_id from recurring_occurrences",
      );
      assertEquals(rows.rows, [
        {
          paid_date: "2024-09-25",
          scheduled_occurrence_date: "2024-09-24",
          actual_transaction_id: imported,
        },
      ]);
    } finally {
      await db.close();
    }
  },
);

for (const manuallyConfirmed of [false, true]) {
  Deno.test(
    `bank recurring: real planner/writer pending-posted and webhook replay manual=${manuallyConfirmed}`,
    async () => {
      const db = await fixture(true);
      try {
        if (manuallyConfirmed) await manual(db);
        const pending: PlaidTransaction = {
          transaction_id: "pending-payment",
          account_id: "provider-account",
          name: "Telus Pre-auth",
          amount: 117.6,
          iso_currency_code: "CAD",
          date: "2024-09-23",
          pending: true,
          personal_finance_category: {
            primary: "GENERAL_SERVICES",
            detailed: "GENERAL_SERVICES_OTHER_GENERAL_SERVICES",
            confidence_level: "VERY_HIGH",
          },
        };
        async function apply(
          transaction: PlaidTransaction,
          removePending = false,
        ) {
          const existing = await db.query<ExistingExpenseProjectionRow>(
            "select * from expenses where provider='plaid' and bank_account_id=$1 and deleted_at is null",
            [bank],
          );
          const generation = (
            await db.query<{ cursor_generation: number }>(
              "select cursor_generation from bank_connections where id=$1",
              [connection],
            )
          ).rows[0].cursor_generation;
          const record = {
            ...mapPlaidTransactionToExpense({
              userId: user,
              bankAccountId: bank,
              defaultCurrency: "CAD",
              accountType: "credit",
              transaction,
            }),
            account_id: wallet,
          };
          const plan = buildBankExpenseMutationPlan({
            records: [record],
            transactions: [transaction],
            existingRows: existing.rows,
            providerPendingTransactionIds: new Map(
              transaction.pending_transaction_id
                ? [
                    [
                      transaction.transaction_id,
                      transaction.pending_transaction_id,
                    ],
                  ]
                : [],
            ),
            cursorGeneration: generation,
          });
          await db.query(
            `select apply_plaid_sync_batch_v2($1,$2,$3,'after',$4,$5,$6,$7,$7,
          '[]','{}','[]','{}',true,true,$8,null)`,
            [
              user,
              connection,
              generation,
              JSON.stringify(plan.inserts),
              JSON.stringify(plan.updates),
              removePending ? [pending.transaction_id] : [],
              [bank],
              actual,
            ],
          );
          return plan;
        }
        await apply(pending);
        const canonical = (
          await db.query<{ actual_transaction_id: string }>(
            "select actual_transaction_id from recurring_occurrences",
          )
        ).rows[0].actual_transaction_id;
        if (manuallyConfirmed) assertEquals(canonical, actual);
        await assertOnePayment(db, canonical);
        const posted = {
          ...pending,
          transaction_id: "bank-payment",
          pending_transaction_id: pending.transaction_id,
          pending: false,
          date: "2024-09-25",
          amount: 118.6,
        };
        const plan = await apply(posted, true);
        assertEquals(plan.inserts.length, 0);
        assertEquals(plan.updates[0].id, canonical);
        await apply(posted, true); // A fresh webhook replay uses the same canonical row.
        const rows = await db.query(
          `select actual_transaction_id, paid_date::text,
        scheduled_occurrence_date::text, amount_cents::int from recurring_occurrences`,
        );
        assertEquals(rows.rows, [
          {
            actual_transaction_id: canonical,
            paid_date: "2024-09-25",
            scheduled_occurrence_date: "2024-09-24",
            amount_cents: 11860,
          },
        ]);
        assertEquals(
          (
            await db.query(`select count(*)::int as count,
        sum(amount_cents)::int as cents from expenses where not is_recurring and deleted_at is null`)
          ).rows,
          [{ count: 1, cents: 11860 }],
        );
        await assertRejects(
          () =>
            db.query(
              `select apply_plaid_sync_batch_v2($1,$2,0,'stale',
        '[]','[]','{}','{}',$3,'[]','{}','[]','{}',true,true,$4,null)`,
              [user, connection, [bank], actual],
            ),
          Error,
          "cursor generation changed",
        );
      } finally {
        await db.close();
      }
    },
  );
}

Deno.test(
  "bank recurring: wrong scope, competing payments and split conflicts fail atomically",
  async () => {
    const db = await fixture();
    try {
      await db.exec("set test.role='authenticated'");
      await assertRejects(
        () => reconcile(db),
        Error,
        "OCCURRENCE_UNAUTHORIZED",
      );
      await db.exec("set test.role='service_role'");
      await manual(db);
      await importPayment(db);
      await db.exec(
        `update expenses set split_group_id=gen_random_uuid() where id='${imported}'`,
      );
      await assertRejects(
        () => reconcile(db),
        Error,
        "OCCURRENCE_RECONCILIATION_CONFLICT",
      );
      assertEquals(
        (
          await db.query(
            "select actual_transaction_id from recurring_occurrences",
          )
        ).rows,
        [{ actual_transaction_id: actual }],
      );
    } finally {
      await db.close();
    }
  },
);

async function syncBatch(db: PGlite, protectedImport = false, ready = true) {
  const row = {
    id: imported,
    user_id: user,
    account_id: wallet,
    bank_account_id: bank,
    provider: "plaid",
    provider_transaction_id: "bank-payment",
    date: "2024-09-23",
    amount_cents: 11760,
    currency: "CAD",
    type: "expense",
    is_recurring: false,
    provider_fields: {},
    user_overrides: {},
    split_group_id: protectedImport ? actual : null,
    raw_provider_payload: {
      transaction_id: "bank-payment",
      pending: false,
      amount: 117.6,
      personal_finance_category: { primary: "GENERAL_SERVICES" },
    },
  };
  return db.query<{
    result: {
      inserted_records: Array<{ id: string; parent_recurring_id: string }>;
    };
  }>(
    `select public.apply_plaid_sync_batch_v2($1,$2,0,'after',$3,'[]','{}','{}',$4,'[]','{}','[]','{}',$5,true,null,null) as result`,
    [user, connection, JSON.stringify([row]), [bank], ready],
  );
}

Deno.test(
  "bank recurring: atomic cursor batch returns the stable canonical preview",
  async () => {
    const db = await fixture();
    try {
      await manual(db);
      const result = await syncBatch(db);
      assertEquals(result.rows[0].result.inserted_records[0].id, actual);
      assertEquals(
        result.rows[0].result.inserted_records[0].parent_recurring_id,
        series,
      );
      await assertOnePayment(db, actual);
      assertEquals(
        (await db.query("select cursor from bank_connections")).rows,
        [{ cursor: "after" }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: reconciliation failure rolls back imports and cursor together",
  async () => {
    const db = await fixture();
    try {
      await manual(db);
      await assertRejects(
        () => syncBatch(db, true),
        Error,
        "OCCURRENCE_RECONCILIATION_CONFLICT",
      );
      assertEquals(
        (
          await db.query(
            "select count(*)::int as count from expenses where id=$1",
            [imported],
          )
        ).rows,
        [{ count: 0 }],
      );
      assertEquals(
        (await db.query("select cursor from bank_connections")).rows,
        [{ cursor: "before" }],
      );
      await syncBatch(db); // Retry remains safe because the failed batch did not advance.
      await assertOnePayment(db, actual);
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: not-ready batches and unrelated pending rows remain unconfirmed",
  async () => {
    const db = await fixture();
    try {
      await syncBatch(db, false, false);
      assertEquals(
        (
          await db.query(
            "select count(*)::int as count from recurring_occurrences",
          )
        ).rows,
        [{ count: 0 }],
      );
      await importPayment(db, true);
      await db.exec(
        `update expenses set provider_transaction_id='unrelated', provider_fields='{}' where id='${imported}'`,
      );
      await reconcile(db);
      assertEquals(
        (
          await db.query(
            "select analytics_is_final, provider_pending from expenses where id=$1",
            [imported],
          )
        ).rows,
        [{ analytics_is_final: false, provider_pending: true }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: schedule mapping preserves historical cycles and rejects ties",
  async () => {
    const db = await fixture();
    try {
      for (const [anchor, paid, expected] of [
        ["2026-09-24", "2026-09-23", "2026-09-24"],
        ["2026-09-24", "2026-08-25", "2026-08-24"],
        ["2026-01-31", "2026-02-27", "2026-02-28"],
      ]) {
        const result = await db.query(
          "select bank_recurring_cycle_date_v1($1::jsonb,$2::date)::text as cycle",
          [JSON.stringify({ frequency: "monthly", anchor_date: anchor }), paid],
        );
        assertEquals(result.rows, [{ cycle: expected }]);
      }
      await assertRejects(
        () =>
          db.query(
            "select bank_recurring_cycle_date_v1($1::jsonb,'2026-09-16')",
            [
              JSON.stringify({
                frequency: "monthly",
                anchor_date: "2026-09-01",
              }),
            ],
          ),
        Error,
        "OCCURRENCE_AMBIGUOUS_BANK_CYCLE",
      );
      await manual(db);
      await importPayment(db);
      await db.exec(
        `insert into expenses select (jsonb_populate_record(null::expenses,
      (select to_jsonb(e) from expenses e where id='${imported}') ||
      '{"id":"00000000-0000-4000-8000-000000000008","provider_transaction_id":"pending-payment"}')).*`,
      );
      await assertRejects(
        () => reconcile(db),
        Error,
        "OCCURRENCE_RECONCILIATION_CONFLICT",
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: changed identities never auto-merge without explicit continuity",
  async () => {
    let db = await fixture();
    try {
      await db.exec(`delete from bank_accounts where id='${bank}'`);
      await manual(db);
      const persisted = await db.dumpDataDir("none");
      await db.close();
      db = new PGlite({ loadDataDir: persisted });
      await manual(db); // An interrupted/lost response must reuse the saved actual.
      assertEquals(
        (
          await db.query(`select actual_transaction_id from recurring_occurrences
        where recurring_id='${series}' and status='confirmed'`)
        ).rows,
        [{ actual_transaction_id: actual }],
      );
      const reconnectedBank = "00000000-0000-4000-8000-000000000013";
      const reconnectedSeries = "00000000-0000-4000-8000-000000000014";
      await db.exec(`
      insert into bank_accounts(id,user_id,bank_connection_id,type) values ('${reconnectedBank}','${user}','${connection}','credit');
      insert into expenses select (jsonb_populate_record(null::expenses,
        to_jsonb(e) || jsonb_build_object('id','${reconnectedSeries}',
        'provider_fields',jsonb_build_object('source','plaid_recurring_template',
        'bank_account_id','${reconnectedBank}','template_identity','new-stream',
        'transaction_ids',jsonb_build_array('new-payment'))))).*
      from expenses e where id='${series}';
      insert into expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,
        date,amount_cents,currency,type,merchant,raw_provider_payload)
      values ('${imported}','${user}','${wallet}','${reconnectedBank}','plaid','new-payment',
        '2024-09-23',11760,'CAD','expense','Telus Pre-auth',
        '{"pending":false,"amount":117.60,"personal_finance_category":{"primary":"GENERAL_SERVICES","confidence_level":"VERY_HIGH"}}');
      select public.reconcile_bank_recurring_occurrences_v1('${user}',null,null);
    `);
      assertEquals(
        (
          await db.query(`select count(*)::int as active_actuals,
      sum(amount_cents)::int as financial_effect_cents from expenses
      where not is_recurring and deleted_at is null`)
        ).rows,
        [{ active_actuals: 2, financial_effect_cents: 23520 }],
      );
    } finally {
      await db.close();
    }
  },
);

const replacementSeries = "00000000-0000-4000-8000-000000000014";
const replacementBank = "00000000-0000-4000-8000-000000000013";
const associationMigrationUrl = new URL(
  "../../migrations/20261002110000_associate_recurring_series.sql",
  import.meta.url,
);

async function associationFixture() {
  const db = await fixture();
  await db.exec(`
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${user}');
    create table households(id uuid primary key);
    create table household_members(household_id uuid, user_id uuid, role text);
    alter table bank_accounts add column provider text default 'plaid',
      add column currency text default 'CAD', add column status text default 'active';
    alter table bank_connections add column provider text default 'plaid',
      add column status text default 'active', add column item_status text default 'active',
      add column removed_at timestamptz;
    alter table accounts add column linked_bank_account_id uuid;
    delete from bank_accounts where id='${bank}';
    update expenses set idempotency_key='old-stream' where id='${series}';
  `);
  await manual(db);
  await db.exec(`
    insert into bank_accounts(id,user_id,bank_connection_id,type)
      values ('${replacementBank}','${user}','${connection}','credit');
    update accounts set linked_bank_account_id='${replacementBank}' where id='${wallet}';
    insert into expenses select (jsonb_populate_record(null::expenses, to_jsonb(e) || jsonb_build_object(
      'id','${replacementSeries}', 'idempotency_key','new-stream',
      'provider_fields',jsonb_build_object('source','plaid_recurring_template','provider','plaid',
        'bank_account_id','${replacementBank}','template_identity','new-stream',
        'transaction_ids',jsonb_build_array('new-payment'))))).*
      from expenses e where id='${series}';
    insert into expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,
      date,amount_cents,currency,type,merchant,raw_provider_payload)
      values ('${imported}','${user}','${wallet}','${replacementBank}','plaid','new-payment',
        '2024-09-23',11760,'CAD','expense','Telus Pre-auth',
        '{"transaction_id":"new-payment","pending":false,"amount":117.60,"personal_finance_category":{"primary":"GENERAL_SERVICES","confidence_level":"VERY_HIGH"}}');
    select reconcile_bank_recurring_occurrences_v1('${user}',array['${replacementSeries}']::uuid[],null);
  `);
  await db.exec(await Deno.readTextFile(associationMigrationUrl));
  return db;
}

async function associate(
  db: PGlite,
  payments: unknown = [
    { importedTransactionId: imported, canonicalTransactionId: actual },
  ],
  actor = user,
) {
  return db.query<{ result: Record<string, unknown> }>(
    "select associate_recurring_series($1,$2,$3,$4::jsonb) as result",
    [actor, series, replacementSeries, JSON.stringify(payments)],
  );
}

Deno.test(
  "associate recurring series: explicit continuity preserves manual IDs and survives retry/restart",
  async () => {
    let db = await associationFixture();
    try {
      assertEquals((await associate(db)).rows[0].result.duplicate, false);
      await assertOnePayment(db, actual);
      assertEquals((await associate(db)).rows[0].result.duplicate, true);
      assertEquals(
        (
          await db.query(
            `select idempotency_key from expenses where id='${series}'`,
          )
        ).rows,
        [{ idempotency_key: "new-stream" }],
      );
      assertEquals(
        (
          await db.query(
            `select deleted_reason from expenses where id='${replacementSeries}'`,
          )
        ).rows,
        [{ deleted_reason: "recurring_series_associated" }],
      );
      const persisted = await db.dumpDataDir("none");
      await db.close();
      db = new PGlite({ loadDataDir: persisted });
      await associate(db);
      await reconcile(db);
      await assertOnePayment(db, actual);
      assertEquals(
        (
          await db.query(
            `select confirmation_source,confirmed_by_user_id from recurring_occurrences where recurring_id='${series}'`,
          )
        ).rows,
        [{ confirmation_source: "user", confirmed_by_user_id: user }],
      );
    } finally {
      await db.close();
    }
  },
);

for (const [name, patch, actor, payments, error] of [
  [
    "unauthorized actor",
    "",
    "00000000-0000-4000-8000-000000000099",
    null,
    "ASSOCIATION_UNAUTHORIZED",
  ],
  [
    "different native currency",
    `update expenses set currency='USD' where id='${replacementSeries}'`,
    user,
    null,
    "ASSOCIATION_SCOPE_MISMATCH",
  ],
  [
    "different wallet",
    `update expenses set account_id=null where id='${replacementSeries}'`,
    user,
    null,
    "ASSOCIATION_WALLET_MISMATCH",
  ],
  [
    "missing explicit payment mapping",
    "",
    user,
    [],
    "ASSOCIATION_PAYMENT_REVIEW_REQUIRED",
  ],
  [
    "protected import split",
    `update expenses set split_group_id='${series}' where id='${imported}'`,
    user,
    null,
    "ASSOCIATION_PAYMENT_CONFLICT",
  ],
] as const) {
  Deno.test(
    `associate recurring series: ${name} rolls back the whole association`,
    async () => {
      const db = await associationFixture();
      try {
        if (patch) await db.exec(patch);
        await assertRejects(
          () =>
            payments == null
              ? associate(db, undefined, actor)
              : associate(db, payments, actor),
          Error,
          error,
        );
        assertEquals(
          (
            await db.query(
              "select count(*)::int as count from recurring_series_associations",
            )
          ).rows,
          [{ count: 0 }],
        );
        assertEquals(
          (
            await db.query(
              `select provider,deleted_at from expenses where id='${actual}'`,
            )
          ).rows,
          [{ provider: null, deleted_at: null }],
        );
        assertEquals(
          (
            await db.query(
              `select deleted_at from expenses where id='${imported}'`,
            )
          ).rows,
          [{ deleted_at: null }],
        );
      } finally {
        await db.close();
      }
    },
  );
}

Deno.test(
  "associate recurring series: a changed retry payload cannot overwrite a completed association",
  async () => {
    const db = await associationFixture();
    try {
      await associate(db);
      await assertRejects(
        () => associate(db, []),
        Error,
        "ASSOCIATION_RETRY_CONFLICT",
      );
      await assertOnePayment(db, actual);
      await assertRejects(
        () =>
          db.exec(
            `update expenses set deleted_at=null,deleted_reason=null where id='${replacementSeries}'`,
          ),
        Error,
        "ASSOCIATION_REPLACEMENT_RETIRED",
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "associate recurring series: explicit manual financial overrides and canonical user fields survive",
  async () => {
    const db = await associationFixture();
    try {
      await db.exec(`update expenses set user_overrides='{"amount_cents":11760,"date":"2024-09-24"}',
      merchant='My confirmed merchant' where id='${actual}';
      update expenses set amount_cents=13000 where id='${imported}'`);
      await associate(db);
      assertEquals(
        (
          await db.query(`select amount_cents::int as cents,date::text,merchant,recurring_confirmation_source
      from expenses where id='${actual}'`)
        ).rows,
        [
          {
            cents: 11760,
            date: "2024-09-24",
            merchant: "My confirmed merchant",
            recurring_confirmation_source: "user",
          },
        ],
      );
      assertEquals(
        (
          await db.query(`select actual_transaction_id,amount_cents::int as cents,paid_date::text
      from recurring_occurrences where recurring_id='${series}'`)
        ).rows,
        [
          {
            actual_transaction_id: actual,
            cents: 11760,
            paid_date: "2024-09-24",
          },
        ],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "associate recurring series: late reconciliation failure rolls back keys, tombstones and adoption",
  async () => {
    const db = await associationFixture();
    try {
      await db.exec(`update expenses set provider_fields=jsonb_set(provider_fields,'{transaction_ids}',
      '["new-payment","conflicting-income"]') where id='${replacementSeries}';
      insert into expenses(id,user_id,account_id,bank_account_id,provider,provider_transaction_id,date,amount_cents,currency,type)
      values ('00000000-0000-4000-8000-000000000096','${user}','${wallet}','${replacementBank}',
        'plaid','conflicting-income','2024-09-24',100,'CAD','income')`);
      await assertRejects(
        () => associate(db),
        Error,
        "OCCURRENCE_ACCOUNT_SCOPE_MISMATCH",
      );
      assertEquals(
        (
          await db.query(
            "select count(*)::int as count from recurring_series_associations",
          )
        ).rows,
        [{ count: 0 }],
      );
      assertEquals(
        (
          await db.query(
            `select provider,deleted_at from expenses where id='${actual}'`,
          )
        ).rows,
        [{ provider: null, deleted_at: null }],
      );
      assertEquals(
        (
          await db.query(
            `select deleted_at,idempotency_key from expenses where id='${replacementSeries}'`,
          )
        ).rows,
        [{ deleted_at: null, idempotency_key: "new-stream" }],
      );
      assertEquals(
        (
          await db.query(
            `select deleted_at,provider_transaction_id from expenses where id='${imported}'`,
          )
        ).rows,
        [{ deleted_at: null, provider_transaction_id: "new-payment" }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "associate recurring series: shared admin access is current and its audit does not block actor deletion",
  async () => {
    const db = await associationFixture();
    const actorId = "00000000-0000-4000-8000-000000000095";
    const householdId = "00000000-0000-4000-8000-000000000094";
    try {
      await db.exec(`insert into auth.users values ('${actorId}');
      insert into households values ('${householdId}');
      insert into household_members values ('${householdId}','${actorId}','member');
      update expenses set household_id='${householdId}';
      update accounts set household_id='${householdId}';
      update bank_connections set household_id='${householdId}'`);
      await assertRejects(
        () => associate(db, undefined, actorId),
        Error,
        "ASSOCIATION_UNAUTHORIZED",
      );
      await db.exec(
        `update household_members set role='admin' where user_id='${actorId}'`,
      );
      await associate(db, undefined, actorId);
      await assertOnePayment(db, actual);
      await db.exec(`delete from auth.users where id='${actorId}'`);
      assertEquals(
        (
          await db.query(
            "select actor_user_id from recurring_series_associations",
          )
        ).rows,
        [{ actor_user_id: null }],
      );
      assertEquals(
        (
          await db.query(`select has_function_privilege('authenticated',
      'public.associate_recurring_series(uuid,uuid,uuid,jsonb)','EXECUTE') as can_execute,
      has_table_privilege('authenticated','public.recurring_series_associations','SELECT') as can_read`)
        ).rows,
        [{ can_execute: false, can_read: false }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "associate recurring series: the explicit contract is independent of the bank provider",
  async () => {
    const db = await associationFixture();
    try {
      await db.exec(`update expenses set provider_fields=provider_fields ||
      '{"source":"bank_recurring_template","provider":"test_provider"}' where is_recurring;
      update expenses set provider='test_provider' where id='${imported}';
      update bank_accounts set provider='test_provider';
      update bank_connections set provider='test_provider'`);
      await associate(db);
      assertEquals(
        (
          await db.query(
            `select provider,parent_recurring_id from expenses where id='${actual}'`,
          )
        ).rows,
        [{ provider: "test_provider", parent_recurring_id: series }],
      );
      assertEquals(
        (
          await db.query(
            `select count(*)::int as count from expenses where not is_recurring and deleted_at is null`,
          )
        ).rows,
        [{ count: 1 }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "associate recurring series: overlapping submissions produce one durable association",
  async () => {
    const db = await associationFixture();
    try {
      const results = await Promise.all([associate(db), associate(db)]);
      assertEquals(
        results.map((result) => result.rows[0].result.duplicate),
        [false, true],
      );
      assertEquals(
        (
          await db.query(
            "select count(*)::int as count from recurring_series_associations",
          )
        ).rows,
        [{ count: 1 }],
      );
      await assertOnePayment(db, actual);
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "associate recurring series: explicit IDs work without label or cadence similarity",
  async () => {
    const db = await associationFixture();
    try {
      await db.exec(`update expenses set merchant='銀行の新しい表記',raw_text='ชำระเงิน',
      recurrence_rule='{"frequency":"weekly","anchor_date":"2024-09-24"}' where id='${replacementSeries}'`);
      await associate(db);
      await assertOnePayment(db, actual);
      assertEquals(
        (
          await db.query(
            `select recurrence_rule->>'frequency' as frequency from expenses where id='${series}'`,
          )
        ).rows,
        [{ frequency: "monthly" }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring scope: real credit-payment writer commits native direction without income or spending inflation",
  async () => {
    const db = await fixture(true);
    try {
      const transaction: PlaidTransaction = {
        transaction_id: "bank-payment",
        account_id: "provider-account",
        name: "Structured bank payment",
        amount: -117.6,
        iso_currency_code: "CAD",
        date: "2024-09-23",
        pending: false,
        personal_finance_category: {
          primary: "TRANSFER_IN",
          detailed: "TRANSFER_IN_ACCOUNT_TRANSFER",
          confidence_level: "VERY_HIGH",
        },
      };
      const record = {
        ...mapPlaidTransactionToExpense({
          userId: user,
          bankAccountId: bank,
          defaultCurrency: "CAD",
          accountType: "credit",
          transaction,
        }),
        account_id: wallet,
      };
      assertEquals(record.type, "income");
      const plan = buildBankExpenseMutationPlan({
        records: [record],
        transactions: [transaction],
        existingRows: [],
        providerPendingTransactionIds: new Map(),
        cursorGeneration: 0,
      });
      await db.query(
        `select apply_plaid_sync_batch_v2($1,$2,0,'after',$3,'[]','{}','{}',$4,
      '[]','{}','[]','{}',true,true,$5,null)`,
        [
          user,
          connection,
          JSON.stringify(plan.inserts.map((row) => ({ ...row, id: imported }))),
          [bank],
          actual,
        ],
      );
      assertEquals(
        (
          await db.query(`select type,amount_cents::int as cents,currency,
      analytics_counts_toward_income,analytics_spending_multiplier,parent_recurring_id,
      provider_fields #>> '{recurring_reconciliation,reason}' as reason from expenses where id='${imported}'`)
        ).rows,
        [
          {
            type: "income",
            cents: 11760,
            currency: "CAD",
            analytics_counts_toward_income: false,
            analytics_spending_multiplier: 0,
            parent_recurring_id: null,
            reason: "transaction_direction_mismatch",
          },
        ],
      );
      assertEquals(
        (
          await db.query(
            "select cursor,cursor_generation from bank_connections",
          )
        ).rows,
        [{ cursor: "after", cursor_generation: 1 }],
      );
      assertEquals(
        (
          await db.query(
            "select count(*)::int as count from recurring_occurrences",
          )
        ).rows,
        [{ count: 0 }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: a second genuine stream payment is not merged into the confirmed cycle",
  async () => {
    const db = await fixture();
    try {
      await importPayment(db);
      await reconcile(db);
      const second = "00000000-0000-4000-8000-000000000015";
      await db.exec(`
      update expenses set provider_fields = jsonb_set(provider_fields, '{transaction_ids}',
        '["bank-payment", "second-genuine-payment"]') where id='${series}';
      insert into expenses select (jsonb_populate_record(null::expenses, to_jsonb(e) ||
        jsonb_build_object('id','${second}', 'provider_transaction_id','second-genuine-payment',
          'raw_provider_payload',jsonb_set(e.raw_provider_payload,'{transaction_id}','"second-genuine-payment"'),
          'parent_recurring_id',null, 'scheduled_occurrence_date',null,
          'recurring_confirmed_at',null, 'recurring_confirmation_source',null))).*
      from expenses e where id='${imported}';
    `);
      await reconcile(db);
      await reconcile(db);
      assertEquals(
        (
          await db.query(`select count(*)::int as active_actuals,
      sum(amount_cents)::int as financial_effect_cents,
      sum(amount_cents*analytics_spending_multiplier)::int as spent_cents from expenses
      where not is_recurring and deleted_at is null`)
        ).rows,
        [
          {
            active_actuals: 2,
            financial_effect_cents: 23520,
            spent_cents: 23520,
          },
        ],
      );
      assertEquals(
        (
          await db.query(`select actual_transaction_id from recurring_occurrences
      where recurring_id='${series}' and status='confirmed'`)
        ).rows,
        [{ actual_transaction_id: imported }],
      );
      assertEquals(
        (
          await db.query(
            `select parent_recurring_id from expenses where id='${second}'`,
          )
        ).rows,
        [{ parent_recurring_id: null }],
      );
    } finally {
      await db.close();
    }
  },
);

Deno.test(
  "bank recurring: an import cannot silently move a manual payment to another wallet",
  async () => {
    const db = await fixture();
    try {
      await manual(db);
      const otherWallet = "00000000-0000-4000-8000-000000000016";
      await db.exec(
        `insert into accounts values ('${otherWallet}', '${user}', null, 'CAD', false);
      update expenses set account_id='${otherWallet}' where id='${actual}'`,
      );
      await importPayment(db);
      await assertRejects(
        () => reconcile(db),
        Error,
        "OCCURRENCE_RECONCILIATION_CONFLICT",
      );
      assertEquals(
        (
          await db.query(
            `select account_id, provider from expenses where id='${actual}'`,
          )
        ).rows,
        [{ account_id: otherWallet, provider: null }],
      );
      assertEquals(
        (
          await db.query(
            `select deleted_at from expenses where id='${imported}'`,
          )
        ).rows,
        [{ deleted_at: null }],
      );
    } finally {
      await db.close();
    }
  },
);
