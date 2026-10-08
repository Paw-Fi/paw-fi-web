/// <reference lib="deno.ns" />

// Cached embedded PostgreSQL only; no deployed database or package installation.
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const migrations = new URL("../../migrations/", import.meta.url);
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const merchantId = "33333333-3333-4333-8333-333333333333";
const series = "44444444-4444-4444-8444-444444444444";
const account = "55555555-5555-4555-8555-555555555555";
const blocked = { merchant_auto_resolution_blocked: true };

async function functionSource(file: string, name: string) {
  const source = await Deno.readTextFile(new URL(file, migrations));
  const start = source.indexOf(`create or replace function public.${name}(`);
  const end = source.indexOf("\n$$;", start);
  if (start < 0 || end < start) {
    throw new Error(`Missing production function ${name}`);
  }
  return source.slice(start, end + 4);
}

async function fixture() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql as $$ select '{"role":"service_role"}'::jsonb $$;
      create table expenses(id uuid primary key default gen_random_uuid(), user_id uuid,
        merchant text, merchant_id uuid, merchant_structured_name text, raw_text text, category text,
        user_overrides jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now(),
        deleted_at timestamptz, deleted_reason text, bank_account_id uuid, is_recurring boolean default false,
        parent_recurring_id uuid, recurrence_rule jsonb, household_id uuid, privacy_scope text,
        amount_cents bigint default 100, currency text default 'EUR', type text default 'expense', date date default current_date,
        account_id uuid, split_group_id uuid, scheduled_occurrence_date date, recurring_confirmed_at timestamptz,
        recurring_confirmation_source text, idempotency_key text, wallet_capture_idempotency_key text, wallet_capture_id uuid,
        provider text, provider_transaction_id text, provider_pending_transaction_id text,
        provider_posted_from_pending_transaction_id text, provider_pending boolean, provider_fields jsonb default '{}', raw_provider_payload jsonb);
      create table accounts(id uuid primary key, user_id uuid, household_id uuid, currency text, is_archived boolean);
      create table recurring_occurrences(id uuid primary key default gen_random_uuid(), recurring_id uuid,
        scheduled_occurrence_date date, status text, confirmation_source text, actual_transaction_id uuid,
        paid_date date, amount_cents bigint, currency text, confirmed_at timestamptz, confirmed_by_user_id uuid,
        idempotency_key text, request_fingerprint text, split_group_id uuid, unique(recurring_id, scheduled_occurrence_date));
      create table recurring_transaction_reminders_sent(expense_id uuid, occurrence_date date);
      create table notification_events(event_type text, is_sent boolean, payload jsonb);
      create function is_member_of_household(uuid, uuid) returns boolean language sql as $$ select false $$;
    `);
    const baseline = await Deno.readTextFile(
      new URL("20260915130000_merchant_identity_resolution.sql", migrations),
    );
    for (const table of [
      "merchants",
      "merchant_user_overrides",
      "merchant_resolution_jobs",
    ]) {
      const start = baseline.indexOf(
        `create table if not exists public.${table} (`,
      );
      await db.exec(baseline.slice(start, baseline.indexOf("\n);", start) + 3));
    }
    for (const name of [
      "merchant_resolution_descriptor_key",
      "expense_merchant_resolution_descriptor_key",
      "expense_merchant_evidence_context_key",
      "enqueue_merchant_resolution_for_expense",
      "claim_merchant_resolution_jobs",
      "apply_merchant_user_evidence",
    ]) {
      await db.exec(
        await functionSource(
          "20260915130000_merchant_identity_resolution.sql",
          name,
        ),
      );
    }
    await db.exec(
      await functionSource(
        "20260916120000_preserve_explicit_merchant_identity.sql",
        "clear_stale_merchant_identity",
      ),
    );
    await db.exec(
      await functionSource(
        "20260917100000_propagate_recurring_merchant_identity.sql",
        "align_recurring_occurrence_merchant_evidence",
      ),
    );
    await db.exec(
      await functionSource(
        "20260917100000_propagate_recurring_merchant_identity.sql",
        "propagate_recurring_merchant_identity",
      ),
    );
    await db.exec(`
      create trigger merchant_identity_align_recurring_occurrence before insert or update on expenses
        for each row execute function align_recurring_occurrence_merchant_evidence();
      create trigger merchant_identity_clear_on_evidence_change before update of merchant, raw_text, merchant_structured_name, bank_account_id on expenses
        for each row execute function clear_stale_merchant_identity();
      create trigger merchant_identity_propagate_recurring after update of merchant_id, merchant_structured_name on expenses
        for each row execute function propagate_recurring_merchant_identity();
      create trigger merchant_resolution_jobs_enqueue_trigger after insert or update of merchant, raw_text, merchant_structured_name,
        merchant_id, bank_account_id, deleted_at, raw_provider_payload, provider_fields on expenses
        for each row execute function enqueue_merchant_resolution_for_expense();
    `);
    for (const [file, name] of [
      [
        "20260408170000_add_recurring_aware_wallets_and_pockets_rpcs.sql",
        "make_clamped_calendar_date_v1",
      ],
      [
        "20260716150000_fix_recurring_reminder_occurrence_selection.sql",
        "calculate_next_occurrence_on_or_after",
      ],
      [
        "20260726120000_recurring_occurrence_rpcs.sql",
        "recurring_occurrence_is_scheduled_v1",
      ],
      [
        "20260726120000_recurring_occurrence_rpcs.sql",
        "confirm_recurring_occurrence_v1",
      ],
    ]) {
      await db.exec(await functionSource(file, name));
    }
    // Execute the production confirmation patch that clears bank provenance/overrides.
    const confirmationPatch = await Deno.readTextFile(
      new URL(
        "20260930160000_reconcile_bank_recurring_occurrences.sql",
        migrations,
      ),
    );
    const anchor = confirmationPatch.indexOf("v_guard text :=");
    const start = confirmationPatch.lastIndexOf("do $$", anchor);
    await db.exec(
      confirmationPatch.slice(
        start,
        confirmationPatch.indexOf("\n$$;", anchor) + 4,
      ),
    );
    await db.exec(`
      create type transaction_type as enum ('expense','income');
      create type transaction_owner as enum ('me','partner','household');
      create type privacy_scope as enum ('private','balances_only','full');
      alter table expenses add column contact_id uuid, add column breakdown jsonb,
        add column receipt_image_url text, add column import_request_key text,
        add column import_semantic_key text, add column owner_type transaction_owner default 'me',
        add column attachments jsonb, add column source text, add column fx_rate numeric,
        add column base_currency text;
      create function households_commit_expense_split_write_v3(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,uuid)
        returns void language sql as $$ update public.expenses set split_group_id=$3 where id=$2 $$;
      create function households_commit_recurring_template_split_v1(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,jsonb)
        returns void language sql as $$ update public.expenses set split_group_id=$3 where id=$2 $$;
    `);
    await db.exec(
      await functionSource(
        "20260804110000_atomic_household_transaction_split_create.sql",
        "households_create_transaction_with_split_v1",
      ),
    );
    await db.exec(
      await Deno.readTextFile(
        new URL(
          "20261007130000_ai_merchant_auto_resolution_block.sql",
          migrations,
        ),
      ),
    );
    await db.query("insert into auth.users values ($1), ($2)", [owner, other]);
    await db.query("insert into accounts values ($1,$2,null,'EUR',false)", [
      account,
      owner,
    ]);
    await db.query(
      `insert into merchants(id,canonical_name,normalized_name,confidence,resolution_source)
      values ($1,'Canonical','canonical',1,'manual')`,
      [merchantId],
    );
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

async function insert(
  db: PGlite,
  overrides: object = {},
  parent: string | null = null,
  user = owner,
  id = crypto.randomUUID(),
) {
  await db.query(
    `insert into expenses(id,user_id,merchant,merchant_structured_name,user_overrides,parent_recurring_id)
    values ($1,$2,'山田','山田',$3,$4)`,
    [id, user, JSON.stringify(overrides), parent],
  );
  return id;
}
async function row(db: PGlite, id: string) {
  return (
    await db.query<Record<string, any>>("select * from expenses where id=$1", [
      id,
    ])
  ).rows[0];
}
async function template(db: PGlite) {
  await insert(
    db,
    { ...blocked, category: "template-only" },
    null,
    owner,
    series,
  );
  await db.query(
    `update expenses set is_recurring=true, recurrence_rule=jsonb_build_object('frequency','daily','anchor_date',current_date::text) where id=$1`,
    [series],
  );
}
async function claim(db: PGlite, id: string) {
  return (
    await db.query<Record<string, any>>(
      "select * from claim_merchant_resolution_jobs(25,null) where transaction_id=$1",
      [id],
    )
  ).rows[0];
}
async function complete(
  db: PGlite,
  job: Record<string, any>,
  token = job.claim_token,
) {
  return (
    await db.query<{ count: number }>(
      "select complete_merchant_resolution_job($1,$2,$3,'resolved',$4,null) as count",
      [job.id, token, job.descriptor_key, merchantId],
    )
  ).rows[0].count;
}
function postgresTest(name: string, run: (db: PGlite) => Promise<void>) {
  Deno.test(name, async () => {
    const db = await fixture();
    try {
      await run(db);
    } finally {
      await db.close();
    }
  });
}

postgresTest(
  "PG future household create: split and abstention commit together without changing existing rows",
  async (db) => {
    const existingId = await insert(db);
    const existing = await row(db, existingId);
    for (const type of ["expense", "income"]) {
      const id = crypto.randomUUID();
      const householdId = crypto.randomUUID();
      const splitGroupId = crypto.randomUUID();
      const payload = {
        id,
        user_id: owner,
        household_id: householdId,
        amount_cents: 1250,
        currency: "JPY",
        type,
        category: "other",
        date: "2026-10-07",
        merchant: "原文の相手",
        raw_text: "Original notes",
        merchant_id: merchantId,
        merchant_structured_name: "Wrong",
        user_overrides: { ...blocked, category: "kept" },
      };
      const result = await db.query<{
        result: { expense: Record<string, any> };
      }>(
        "select households_create_transaction_with_split_v1($1,$2,$3,$4,$1,'equal','JPY',1250,'Original notes',$5,null,false) as result",
        [
          owner,
          JSON.stringify(payload),
          splitGroupId,
          householdId,
          JSON.stringify([{ userId: owner, amountCents: 1250 }]),
        ],
      );
      const saved = result.rows[0].result.expense;
      assertEquals(saved.merchant, payload.merchant);
      assertEquals(saved.raw_text, payload.raw_text);
      assertEquals(saved.amount_cents, payload.amount_cents);
      assertEquals(saved.currency, payload.currency);
      assertEquals(saved.type, type);
      assertEquals(saved.split_group_id, splitGroupId);
      assertEquals(saved.user_overrides, payload.user_overrides);
      assertEquals(saved.merchant_id, null);
      assertEquals(saved.merchant_structured_name, null);
      assertEquals(
        (
          await db.query(
            "select * from merchant_resolution_jobs where transaction_id=$1",
            [id],
          )
        ).rows.length,
        0,
      );
    }
    assertEquals(await row(db, existingId), existing);
  },
);

postgresTest(
  "PG merchant block: inserted identity and jobs remain null, raw and unrelated overrides survive",
  async (db) => {
    const id = crypto.randomUUID();
    await db.query(
      `insert into expenses(id,user_id,merchant,merchant_id,merchant_structured_name,user_overrides)
       values ($1,$2,'山田',$3,'Canonical',$4)`,
      [
        id,
        owner,
        merchantId,
        JSON.stringify({
          ...blocked,
          category: "personal",
          nested: { amount: true },
        }),
      ],
    );
    await db.query(
      "update expenses set amount_cents=200,category='food',raw_text='note' where id=$1",
      [id],
    );
    const saved = await row(db, id);
    assertEquals(saved.merchant, "山田");
    assertEquals(saved.merchant_id, null);
    assertEquals(saved.merchant_structured_name, null);
    assertEquals(saved.user_overrides.merchant_auto_resolution_blocked, true);
    assertEquals(saved.user_overrides.category, "personal");
    assertEquals(saved.user_overrides.nested, { amount: true });
    assertEquals(
      (
        await db.query(
          "select * from merchant_resolution_jobs where transaction_id=$1",
          [id],
        )
      ).rows.length,
      0,
    );
  },
);

postgresTest(
  "PG merchant block: manual raw and ID corrections clear only the blocker",
  async (db) => {
    for (const correction of [
      "merchant='ร้านค้า'",
      `merchant_id='${merchantId}'`,
    ]) {
      const id = await insert(db, { ...blocked, category: "keep" });
      await db.query(`update expenses set ${correction} where id=$1`, [id]);
      const saved = await row(db, id);
      assertEquals(saved.user_overrides, { category: "keep" });
      assertEquals(
        correction.startsWith("merchant_id")
          ? saved.merchant_id
          : saved.merchant,
        correction.startsWith("merchant_id") ? merchantId : "ร้านค้า",
      );
    }
  },
);

postgresTest(
  "PG merchant block: direct owner selection succeeds and other actors cannot mutate it",
  async (db) => {
    const id = await insert(db, { ...blocked, amount_cents: 123 });
    await assertRejects(
      () =>
        db.query("select apply_merchant_user_evidence($1,$2,'map',$3,false)", [
          id,
          other,
          merchantId,
        ]),
      Error,
      "Transaction owner mismatch",
    );
    assertEquals(
      (await row(db, id)).user_overrides.merchant_auto_resolution_blocked,
      true,
    );
    await db.query(
      "select apply_merchant_user_evidence($1,$2,'map',$3,false)",
      [id, owner, merchantId],
    );
    assertEquals((await row(db, id)).merchant_id, merchantId);
    assertEquals((await row(db, id)).user_overrides, { amount_cents: 123 });
  },
);

postgresTest(
  "PG merchant block: stale token and deleted claims cannot assign identity or revoke blocking",
  async (db) => {
    const id = await insert(db);
    const job = await claim(db, id);
    assertEquals(await complete(db, job, crypto.randomUUID()), 0);
    await db.query("update expenses set user_overrides=$2 where id=$1", [
      id,
      JSON.stringify(blocked),
    ]);
    assertEquals(await complete(db, job), 0);
    assertEquals((await row(db, id)).user_overrides, blocked);
    assertEquals((await row(db, id)).merchant_id, null);
    // Re-created jobs after a deliberate correction must not accept the prior job ID/token.
    await db.query("update expenses set merchant='新しい店' where id=$1", [id]);
    assertEquals(await complete(db, job), 0);
    const current = await claim(db, id);
    assertEquals(current.id === job.id, false);
    assertEquals(await complete(db, current), 1);
    assertEquals((await row(db, id)).merchant_id, merchantId);
  },
);

postgresTest(
  "PG merchant block: backfill skips blockers before its limit and claims reject blocked rows",
  async (db) => {
    const id = await insert(db, blocked);
    const eligible = await insert(db, {}, null, other);
    await db.exec("delete from merchant_resolution_jobs");
    assertEquals(
      (
        await db.query<{ count: number }>(
          "select enqueue_merchant_resolution_backfill_batch(1) as count",
        )
      ).rows[0].count,
      1,
    );
    assertEquals(
      (
        await db.query<{ transaction_id: string }>(
          "select transaction_id from merchant_resolution_jobs",
        )
      ).rows,
      [{ transaction_id: eligible }],
    );
    const attempted = await db.query(
      "insert into merchant_resolution_jobs(transaction_id,descriptor_key,evidence_context_key) values ($1,'山田','merchant_text') returning id",
      [id],
    );
    assertEquals(attempted.rows.length, 0);
    assertEquals(
      (await db.query("select * from claim_merchant_resolution_jobs(25,null)"))
        .rows.length,
      1,
    );
  },
);

postgresTest(
  "PG merchant block: legacy stale jobs cannot be claimed and completion checks blocker under the expense lock",
  async (db) => {
    const id = await insert(db);
    const job = await claim(db, id);
    await db.query("update expenses set user_overrides=$2 where id=$1", [
      id,
      JSON.stringify(blocked),
    ]);
    // Simulate a job left by a pre-safeguard writer. Only this isolated fixture bypasses the trigger.
    await db.exec(
      "alter table merchant_resolution_jobs disable trigger merchant_resolution_jobs_reject_blocked",
    );
    await db.query(
      `insert into merchant_resolution_jobs(id,transaction_id,descriptor_key,evidence_context_key,status,claim_token,processing_started_at)
      values ($1,$2,$3,'merchant_text','processing',$4,now()-interval '11 minutes')`,
      [job.id, id, job.descriptor_key, job.claim_token],
    );
    await db.exec(
      "alter table merchant_resolution_jobs enable trigger merchant_resolution_jobs_reject_blocked",
    );
    assertEquals(
      (await db.query("select * from claim_merchant_resolution_jobs(25,null)"))
        .rows.length,
      0,
    );
    assertEquals(await complete(db, job), 0);
    assertEquals((await row(db, id)).user_overrides, blocked);
    assertEquals(
      (
        await db.query("select * from merchant_resolution_jobs where id=$1", [
          job.id,
        ])
      ).rows.length,
      0,
    );
  },
);

postgresTest(
  "PG merchant block: stale blocked jobs cannot consume the claim batch limit",
  async (db) => {
    const staleIds: string[] = [];
    for (let i = 0; i < 25; i++) staleIds.push(await insert(db, blocked));
    await db.exec(
      "alter table merchant_resolution_jobs disable trigger merchant_resolution_jobs_reject_blocked",
    );
    await db.query(
      `insert into merchant_resolution_jobs(transaction_id,descriptor_key,evidence_context_key,created_at)
      select id,'山田','merchant_text','2000-01-01'::timestamptz from expenses where id=any($1::uuid[])`,
      [staleIds],
    );
    await db.exec(
      "alter table merchant_resolution_jobs enable trigger merchant_resolution_jobs_reject_blocked",
    );
    const eligible = await insert(db, {}, null, other);
    const claimed = await db.query<{ transaction_id: string }>(
      "select transaction_id from claim_merchant_resolution_jobs(1,null)",
    );
    assertEquals(claimed.rows, [{ transaction_id: eligible }]);
  },
);

postgresTest(
  "PG recurring merchant block: alignment inherits only blocker plus provenance, not template overrides",
  async (db) => {
    await template(db);
    const id = await insert(db, { amount_cents: 42 }, series);
    const saved = await row(db, id);
    assertEquals(saved.user_overrides, {
      amount_cents: 42,
      ...blocked,
      merchant_auto_resolution_blocked_inherited_from: series,
    });
    assertEquals(saved.merchant_id, null);
    assertEquals(saved.merchant_structured_name, null);
    assertEquals(saved.merchant, "山田");
    await db.query(
      'update expenses set amount_cents=123,user_overrides=\'{"category":"updated"}\' where id=$1',
      [id],
    );
    assertEquals((await row(db, id)).user_overrides, {
      category: "updated",
      ...blocked,
      merchant_auto_resolution_blocked_inherited_from: series,
    });
    const wrongOwner = await insert(db, {}, series, other);
    assertEquals((await row(db, wrongOwner)).user_overrides, {});
  },
);

postgresTest(
  "PG recurring merchant block: production confirmation reset still inherits blocker and has no job",
  async (db) => {
    await template(db);
    const result = (
      await db.query<{ result: any }>(
        `select confirm_recurring_occurrence_v1($1,$2,current_date,current_date,100,$3,null,'note') as result`,
        [owner, series, account],
      )
    ).rows[0].result;
    assertEquals(result.transaction.user_overrides, {
      ...blocked,
      merchant_auto_resolution_blocked_inherited_from: series,
    });
    assertEquals(result.transaction.merchant_structured_name, null);
    assertEquals(
      (
        await db.query(
          "select * from merchant_resolution_jobs where transaction_id=$1",
          [result.transaction.id],
        )
      ).rows.length,
      0,
    );
  },
);

postgresTest(
  "PG recurring merchant block: template correction removes inherited markers only and preserves occurrence overrides",
  async (db) => {
    await template(db);
    const inherited = await insert(db, { amount_cents: 42 }, series);
    const independent = await insert(
      db,
      { ...blocked, category: "own" },
      series,
    );
    const explicit = await insert(db, { merchant: "own", ...blocked }, series);
    await db.query(
      "update expenses set merchant='ร้านค้า',merchant_id=$2,merchant_structured_name='Canonical' where id=$1",
      [series, merchantId],
    );
    const saved = await row(db, inherited);
    assertEquals(saved.user_overrides, { amount_cents: 42 });
    assertEquals(saved.merchant, "ร้านค้า");
    assertEquals(saved.merchant_id, merchantId);
    assertEquals((await row(db, independent)).user_overrides, {
      ...blocked,
      category: "own",
    });
    assertEquals((await row(db, explicit)).user_overrides, {
      merchant: "own",
      ...blocked,
    });
  },
);

postgresTest(
  "PG recurring merchant block: manual occurrence correction survives alignment and later template edits",
  async (db) => {
    for (const correction of [
      "merchant='ร้านค้า'",
      `merchant_id='${merchantId}'`,
    ]) {
      await template(db);
      const id = await insert(db, { category: "own" }, series);
      await db.query(`update expenses set ${correction} where id=$1`, [id]);
      let saved = await row(db, id);
      assertEquals(
        saved.user_overrides.merchant_auto_resolution_blocked,
        undefined,
      );
      assertEquals(
        saved.user_overrides.merchant_auto_resolution_blocked_inherited_from,
        undefined,
      );
      assertEquals(saved.user_overrides.category, "own");
      assertEquals(
        correction.startsWith("merchant_id")
          ? saved.merchant_id
          : saved.merchant,
        correction.startsWith("merchant_id") ? merchantId : "ร้านค้า",
      );
      await db.query(
        "update expenses set merchant='template correction',merchant_structured_name='template correction' where id=$1",
        [series],
      );
      saved = await row(db, id);
      assertEquals(
        correction.startsWith("merchant_id")
          ? saved.merchant_id
          : saved.merchant,
        correction.startsWith("merchant_id") ? merchantId : "ร้านค้า",
      );
      await db.exec("truncate expenses,merchant_resolution_jobs cascade");
    }
  },
);

postgresTest(
  "PG recurring merchant block: new template blocking cancels occurrence claims without touching explicit or other-owner rows",
  async (db) => {
    await insert(db, {}, null, owner, series);
    await db.query("update expenses set is_recurring=true where id=$1", [
      series,
    ]);
    const inherited = await insert(db, { amount_cents: 42 }, series);
    const explicit = await insert(db, { merchant: "own" }, series);
    const wrongOwner = await insert(db, {}, series, other);
    const otherBefore = await row(db, wrongOwner);
    const job = await claim(db, inherited);
    await db.query("update expenses set user_overrides=$2 where id=$1", [
      series,
      JSON.stringify(blocked),
    ]);
    assertEquals((await row(db, inherited)).user_overrides, {
      amount_cents: 42,
      ...blocked,
      merchant_auto_resolution_blocked_inherited_from: series,
    });
    assertEquals(await complete(db, job), 0);
    assertEquals((await row(db, explicit)).user_overrides, { merchant: "own" });
    assertEquals(await row(db, wrongOwner), otherBefore);
  },
);

postgresTest(
  "PG recurring merchant block: raw-only and ID-only template corrections remove inherited provenance",
  async (db) => {
    for (const correction of [
      "merchant='new template'",
      `merchant_id='${merchantId}'`,
    ]) {
      await template(db);
      const id = await insert(db, { category: "keep" }, series);
      await db.query(`update expenses set ${correction} where id=$1`, [series]);
      const saved = await row(db, id);
      assertEquals(saved.user_overrides, { category: "keep" });
      assertEquals(
        correction.startsWith("merchant_id")
          ? saved.merchant_id
          : saved.merchant,
        correction.startsWith("merchant_id") ? merchantId : "new template",
      );
      await db.exec("truncate expenses,merchant_resolution_jobs cascade");
    }
  },
);

postgresTest(
  "PG merchant block: serialized overlapping block/completion preserves both operation orders",
  async (db) => {
    for (const blockFirst of [true, false]) {
      const id = await insert(db);
      const job = await claim(db, id);
      const blockWrite = () =>
        db.query("update expenses set user_overrides=$2 where id=$1", [
          id,
          JSON.stringify(blocked),
        ]);
      const operations = blockFirst
        ? [blockWrite(), complete(db, job)]
        : [complete(db, job), blockWrite()];
      await Promise.all(operations);
      const saved = await row(db, id);
      assertEquals(saved.user_overrides, blocked);
      assertEquals(saved.merchant_id, null);
      assertEquals(saved.merchant_structured_name, null);
    }
  },
);
