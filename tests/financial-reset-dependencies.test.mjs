import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const read = name => readFile(new URL(name, migrations), 'utf8');
const core = await read('20260801130000_perform_user_financial_data_reset.sql');
const settlement = await read('20260716143000_harden_settlement_cycles_and_breakdown.sql');
const wallets = await read('20260723130000_remove_automatic_spending_wallets.sql');
const occurrences = await read('20260724150000_recurring_occurrence_foundation.sql');
const associations = await read('20261002110000_associate_recurring_series.sql');
const fix = await read('20261120090000_fix_financial_reset_dependencies.sql');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const H = '33333333-3333-4333-8333-333333333333';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function productionFunction(source, name) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  const end = source.indexOf('\n$$;', start);
  assert.ok(start >= 0 && end > start, name);
  return source.slice(start, end + 4);
}
const scalar = async (db, sql, params = []) => (await db.query(sql, params)).rows[0].value;

// Entire production core, with isolated infrastructure and trimmed unrelated
// columns. Dependency actions and installed production guards remain active.
async function fixture(t, corrected = true) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
    create schema vault; create table vault.decrypted_secrets(name text, decrypted_secret text);
    create table bank_connections(id uuid primary key, user_id uuid, household_id uuid, provider text,
      removed_at timestamptz, status text, item_status text, item_health_state text, relink_state text,
      access_token_encrypted text, plaid_access_token_encrypted text, next_manual_refresh_eligible_at timestamptz,
      error_code text, error_message text, updated_at timestamptz);
    create table bank_accounts(id uuid primary key, bank_connection_id uuid references bank_connections(id));
    create table bank_connection_tokens(bank_connection_id uuid, token_type text, token_encrypted text);
    create table plaid_offboarding_jobs(user_id uuid, connection_id uuid, access_token_encrypted text,
      plaid_access_token_encrypted text, reason text, status text default 'pending', updated_at timestamptz);
    create unique index on plaid_offboarding_jobs(connection_id,reason)
      where connection_id is not null and status in ('pending','processing');
    create table bank_transaction_raw(bank_connection_id uuid, bank_account_id uuid references bank_accounts(id) on delete set null);
    create table bank_webhook_events(bank_connection_id uuid);
    create table bank_sync_jobs(bank_connection_id uuid, status text, processed_at timestamptz,
      processing_started_at timestamptz, updated_at timestamptz, payload jsonb);
    create table accounts(id uuid primary key, user_id uuid, household_id uuid, currency text default 'EUR',
      is_system boolean default false, is_default boolean default false, is_archived boolean default false,
      linked_bank_account_id uuid references bank_accounts(id) on delete set null);
    create table expenses(id uuid primary key, user_id uuid, household_id uuid, deleted_at timestamptz,
      parent_recurring_id uuid references expenses(id) on delete restrict,
      scheduled_occurrence_date date, recurring_confirmed_at timestamptz, recurring_confirmation_source text,
      updated_at timestamptz, account_id uuid references accounts(id) on delete set null,
      bank_account_id uuid references bank_accounts(id) on delete set null,
      amount_cents bigint default 100, currency text default 'EUR', type text default 'expense',
      is_recurring boolean default false);
    create table expense_split_groups(id uuid primary key, household_id uuid,
      expense_id uuid unique references expenses(id) on delete cascade,
      payer_user_id uuid, split_type text, currency text, total_amount_cents bigint);
    alter table expenses add split_group_id uuid references expense_split_groups(id) on delete set null;
    create table expense_split_lines(id uuid primary key,
      split_group_id uuid references expense_split_groups(id) on delete cascade,
      user_id uuid, amount_cents bigint, is_settled boolean);
    create table household_settlement_finalized_split_groups(
      split_group_id uuid primary key references expense_split_groups(id) on delete cascade);
    create table household_settlement_events(id uuid primary key, amount_cents bigint);
    create table household_settlement_event_allocations_v2(id uuid primary key,
      settlement_event_id uuid references household_settlement_events(id),
      expense_id uuid references expenses(id) on delete set null,
      split_group_id uuid references expense_split_groups(id) on delete set null,
      split_line_id uuid references expense_split_lines(id) on delete set null,
      allocated_amount_cents bigint);
    create table notification_capture_classifications(id uuid primary key,
      expense_id uuid references expenses(id) on delete set null);
    create table wallet_capture_events(id uuid primary key,
      duplicate_of_expense_id uuid references expenses(id) on delete set null);
    create table recurring_series_associations(replacement_recurring_id uuid primary key references expenses(id) on delete cascade,
      canonical_recurring_id uuid not null references expenses(id) on delete cascade);
    create table ai_scenario_history(user_id uuid); create table financial_health_profiles(user_id uuid);
    create table user_contacts(id uuid, user_id uuid); create table daily_budgets(contact_id uuid);
    create table budgets(user_id uuid);
    create table account_transfers(created_by_user_id uuid, from_account_id uuid references accounts(id),
      to_account_id uuid references accounts(id));
  `);
  await db.exec(`alter table expense_split_lines add percentage numeric, add shares integer,
    add settlement_ledger_seq bigint, add cycle_boundary_event_id uuid;`);
  // Actual occurrence shape CHECKs and both cyclic FK links.
  await db.exec(occurrences.slice(occurrences.indexOf('create table public.recurring_occurrences ('),
    occurrences.indexOf('\nalter table public.expenses\n'))
    .replace(' references auth.users(id) on delete set null', ''));
  await db.exec(`alter table recurring_occurrences add was_skipped_before_confirmation boolean default false,
    add idempotency_key text, add request_fingerprint text;`);
  for (const [source, name] of [[wallets, 'prevent_system_account_mutation'],
    [settlement, 'households_guard_split_group_write_v3'],
    [settlement, 'households_prepare_split_line_cycle_v3'],
    [settlement, 'households_guard_expense_split_parent_v3'],
    [associations, 'protect_associated_recurring_series']]) {
    await db.exec(productionFunction(source, name));
  }
  await db.exec(`
    create trigger system_wallet before update or delete on accounts for each row execute function prevent_system_account_mutation();
    create trigger group_guard before delete or update on expense_split_groups for each row execute function households_guard_split_group_write_v3();
    create trigger line_guard before delete on expense_split_lines for each row execute function households_prepare_split_line_cycle_v3();
    create trigger parent_guard before update of split_group_id on expenses for each row execute function households_guard_expense_split_parent_v3();
    create trigger association_guard before update on expenses for each row when(old.is_recurring is true)
      execute function protect_associated_recurring_series();
  `);
  await db.exec(core);
  if (corrected) await db.exec(fix);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [A]);
  return db;
}

async function bankWallet(db) {
  await db.exec(`insert into bank_connections(id,user_id,provider) values('${id(1)}','${A}','plaid');
    insert into bank_accounts values('${id(2)}','${id(1)}');
    insert into accounts(id,user_id,is_system,linked_bank_account_id) values('${id(3)}','${A}',true,'${id(2)}');`);
}

for (const jobsFirst of [false, true]) test(`job executes the production wrapper and core over seven years of imported history (jobs first: ${jobsFirst})`, async t => {
  const db = await fixture(t, !jobsFirst);
  await bankWallet(db);
  await db.exec(`
    create schema cron; create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
    create table auth.users(id uuid primary key); insert into auth.users values ('${A}'), ('${B}');
    create table public.users(id uuid primary key, financial_data_reset_at timestamptz);
    insert into public.users(id) select id from auth.users;
    alter table expenses add date date, add import_request_key text;
    insert into expenses(id,user_id,date,import_request_key)
      select gen_random_uuid(), '${A}', date '2017-01-01' + (n % 2556), 'csv:' || n from generate_series(1,6000) n;
    insert into expenses(id,user_id) values ('${id(9000)}','${B}');
    create table notification_events(payload jsonb);
    insert into notification_events select jsonb_build_object('expense_id', id) from expenses;
    create table user_category_preferences(user_id uuid); create table idempotency_keys(user_id uuid);
    alter table wallet_capture_events add user_id uuid; alter table notification_capture_classifications add user_id uuid;
    alter table bank_connections add provider_item_id text, add plaid_cursor text, add last_synced_at timestamptz, add metadata jsonb;
    alter table bank_webhook_events add provider text, add provider_item_id text;
    create table plaid_link_update_sessions(user_id uuid); create table plaid_sync_events(bank_connection_id uuid);
    create table bank_sync_audit(bank_connection_id uuid); create table bank_sync_locks(bank_connection_id uuid);
  `);
  await db.exec(await read('20260801180000_finalize_financial_data_reset.sql'));
  await db.exec(await read('20261001130000_extend_financial_data_reset_timeout.sql'));
  await db.exec(await read('20261120100000_financial_reset_jobs.sql'));
  await db.exec(fix);
  await db.exec(fix);
  await db.query('select request_financial_data_reset($1,$2)', [id(77), A]);
  await db.exec('select process_financial_data_reset_job()');
  const job = (await db.query('select status, failure_detail from financial_reset_jobs')).rows[0];
  assert.equal(job.status, 'completed', job.failure_detail);
  assert.deepEqual((await db.query('select user_id,id from expenses')).rows, [{user_id:B, id:id(9000)}]);
  assert.equal(await scalar(db, "select payload->>'expense_id' as value from notification_events"), id(9000));
  assert.equal(await scalar(db, 'select count(*)::int as value from notification_events'), 1);
  assert.equal(await scalar(db, 'select user_id as value from financial_storage_cleanup_jobs'), A);
  assert.equal(await scalar(db, 'select id as value from public.users where financial_data_reset_at is not null'), A);
});
test('original reset reproduces system-wallet SET NULL immutability failure atomically', async t => {
  const db = await fixture(t, false); await bankWallet(db);
  const result = await scalar(db, 'select perform_user_financial_data_reset() as value');
  assert.equal(result.success, false);
  assert.match(result.message, /System account scope cannot be modified/);
  assert.equal(await scalar(db, 'select count(*)::int as value from bank_accounts'), 1);
  assert.equal(await scalar(db, 'select count(*)::int as value from plaid_offboarding_jobs'), 0);
});
test('corrected reset deletes bank-linked system wallet without relaxing its guard', async t => {
  const db = await fixture(t); await bankWallet(db);
  await assert.rejects(db.exec('update accounts set linked_bank_account_id=null'), /System account scope cannot be modified/);
  const result = await scalar(db, 'select perform_user_financial_data_reset() as value');
  assert.equal(result.success, true, result.message);
  for (const table of ['accounts','bank_accounts']) assert.equal(await scalar(db, `select count(*)::int as value from ${table}`), 0);
  assert.equal(await scalar(db, 'select count(*)::int as value from plaid_offboarding_jobs'), 1);
});
test('finalized paid household split cascades preserve payment audit and other-member data', async t => {
  // This already works before the correction: do not weaken finalized guards.
  const db = await fixture(t, false);
  await db.exec(`insert into expenses(id,user_id,household_id) values('${id(10)}','${A}','${H}'),('${id(11)}','${B}','${H}');
    insert into expense_split_groups values('${id(12)}','${H}','${id(10)}','${A}','amount','EUR',100);
    select set_config('moneko.settlement_split_write_expense_id','${id(10)}',false);
    update expenses set split_group_id='${id(12)}' where id='${id(10)}';
    select set_config('moneko.settlement_split_write_expense_id','',false);
    insert into expense_split_lines(id,split_group_id,user_id,amount_cents,is_settled) values('${id(13)}','${id(12)}','${B}',100,true);
    insert into household_settlement_finalized_split_groups values('${id(12)}');
    insert into household_settlement_events values('${id(14)}',100);
    insert into household_settlement_event_allocations_v2 values('${id(15)}','${id(14)}','${id(10)}','${id(12)}','${id(13)}',100);`);
  await assert.rejects(db.exec('delete from expense_split_groups'), /requires_atomic_write/);
  await assert.rejects(db.exec('delete from expense_split_lines'), /require_atomic_write/);
  const result = await scalar(db, 'select perform_user_financial_data_reset() as value');
  assert.equal(result.success, true, result.message);
  assert.deepEqual((await db.query('select expense_id,split_group_id,split_line_id,allocated_amount_cents from household_settlement_event_allocations_v2')).rows,
    [{expense_id:null, split_group_id:null, split_line_id:null, allocated_amount_cents:100}]);
  assert.equal(await scalar(db, 'select count(*)::int as value from household_settlement_events'), 1);
  assert.equal(await scalar(db, 'select user_id as value from expenses'), B);
});

for (const corrected of [false, true]) {
  test(`recurring cleanup preserves foreign actuals/series and confirmed shape (corrected=${corrected})`, async t => {
    const db = await fixture(t, corrected);
    await db.exec(`
      insert into expenses(id,user_id,is_recurring) values
        ('${id(20)}','${A}',true),('${id(21)}','${B}',true),('${id(24)}','${A}',true);
      insert into expenses(id,user_id,parent_recurring_id,scheduled_occurrence_date,deleted_at)
        values('${id(22)}','${B}','${id(20)}','2026-11-01',null),
          ('${id(23)}','${A}','${id(21)}','2026-11-01',now());
      insert into recurring_series_associations values('${id(24)}','${id(20)}');
      insert into recurring_occurrences(recurring_id,scheduled_occurrence_date,status,
        actual_transaction_id,paid_date,amount_cents,currency,confirmed_at,was_skipped_before_confirmation)
        values('${id(20)}','2026-11-01','confirmed','${id(22)}','2026-11-02',100,'EUR',now(),false),
          ('${id(21)}','2026-11-01','confirmed','${id(23)}','2026-11-02',100,'EUR',now(),true);
    `);
    const result = await scalar(db, 'select perform_user_financial_data_reset() as value');
    assert.equal(result.success, true, result.message);
    assert.equal(await scalar(db, 'select count(*)::int as value from expenses where user_id=$1', [A]), 0);
    assert.equal(await scalar(db, 'select count(*)::int as value from expenses where user_id=$1', [B]), 2);
    assert.equal(await scalar(db, 'select parent_recurring_id as value from expenses where id=$1', [id(22)]), null);
    assert.deepEqual((await db.query('select recurring_id,status,confirmation_source,actual_transaction_id,paid_date,amount_cents from recurring_occurrences')).rows,
      [{recurring_id:id(21),status:'skipped',confirmation_source:'user',actual_transaction_id:null,paid_date:null,amount_cents:null}]);
    assert.equal(await scalar(db, 'select count(*)::int as value from recurring_series_associations'), 0);
  });
}

test('dependency reorder keeps personal Plaid/wallet scope and rollback atomicity', async t => {
  const db = await fixture(t); await bankWallet(db);
  await db.exec(`insert into bank_connections(id,user_id,household_id,provider) values
    ('${id(30)}','${A}','${H}','plaid'),('${id(31)}','${B}',null,'plaid'),('${id(32)}','${A}',null,'tink');
    insert into bank_accounts values('${id(33)}','${id(30)}'),('${id(34)}','${id(31)}'),('${id(35)}','${id(32)}');
    insert into accounts(id,user_id,household_id,linked_bank_account_id) values
      ('${id(36)}','${A}','${H}','${id(33)}'),('${id(37)}','${B}',null,'${id(34)}');
    create function fail_bank_delete() returns trigger language plpgsql as $$
      begin raise exception 'injected bank deletion failure'; end $$;
    create trigger fail_bank_delete before delete on bank_accounts for each row execute function fail_bank_delete();`);
  const failed = await scalar(db, 'select perform_user_financial_data_reset() as value');
  assert.equal(failed.success, false);
  assert.match(failed.message, /injected bank deletion failure/);
  assert.equal(await scalar(db, 'select count(*)::int as value from accounts'), 3);
  assert.equal(await scalar(db, 'select count(*)::int as value from plaid_offboarding_jobs'), 0);
  await db.exec('drop trigger fail_bank_delete on bank_accounts');
  assert.equal((await scalar(db, 'select perform_user_financial_data_reset() as value')).success, true);
  assert.equal(await scalar(db, 'select count(*)::int as value from bank_accounts'), 3);
  assert.equal(await scalar(db, 'select count(*)::int as value from accounts'), 2);
  assert.equal(await scalar(db, 'select count(*)::int as value from bank_connections where removed_at is not null'), 1);
});

const probes = [
  ['notification_capture_classifications','expense_id','notification_capture_classifications_expense_id_idx'],
  ['wallet_capture_events','duplicate_of_expense_id','wallet_capture_events_duplicate_of_expense_id_idx'],
  ['household_settlement_event_allocations_v2','expense_id','settlement_allocations_expense_id_idx'],
  ['household_settlement_event_allocations_v2','split_group_id','settlement_allocations_split_group_id_idx'],
  ['recurring_series_associations','canonical_recurring_id','recurring_series_associations_canonical_recurring_id_idx'],
];
function planNodes(plan) { return [plan, ...(plan.Plans ?? []).flatMap(planNodes)]; }
async function probePlan(db, table, column, value) {
  await db.exec(`prepare fk_probe(uuid) as select 1 from public.${table} where $1=${column}`);
  const plan = (await db.query(`explain (format json) execute fk_probe('${value}')`)).rows[0]['QUERY PLAN'][0].Plan;
  await db.exec('deallocate fk_probe');
  return planNodes(plan);
}
test('five FK paths change from sequential scans to generic index probes; cascade semantics survive', async t => {
  const db = await fixture(t, false);
  await db.exec(`
    insert into expenses(id,user_id) select md5('expense-'||i)::uuid,'${B}' from generate_series(1,12000) i;
    insert into expenses(id,user_id) select md5('replacement-'||i)::uuid,'${B}' from generate_series(1,12000) i;
    insert into expense_split_groups(id,expense_id) select md5('group-'||i)::uuid,md5('expense-'||i)::uuid from generate_series(1,12000) i;
    insert into notification_capture_classifications select md5('notice-'||i)::uuid,md5('expense-'||i)::uuid from generate_series(1,12000) i;
    alter table wallet_capture_events add status text default 'duplicate';
    create index duplicate_source on wallet_capture_events(duplicate_of_expense_id) where status='duplicate';
    insert into wallet_capture_events(id,duplicate_of_expense_id) select md5('capture-'||i)::uuid,md5('expense-'||i)::uuid from generate_series(1,12000) i;
    insert into household_settlement_event_allocations_v2(id,expense_id,split_group_id,allocated_amount_cents)
      select md5('allocation-'||i)::uuid,md5('expense-'||i)::uuid,md5('group-'||i)::uuid,100 from generate_series(1,12000) i;
    insert into recurring_series_associations select md5('replacement-'||i)::uuid,md5('expense-'||i)::uuid from generate_series(1,12000) i;
    analyze; set plan_cache_mode=force_generic_plan;
  `);
  const expense = await scalar(db, "select md5('expense-1')::uuid as value");
  const group = await scalar(db, "select md5('group-1')::uuid as value");
  for (const [table,column] of probes) {
    const nodes = await probePlan(db,table,column,column==='split_group_id' ? group : expense);
    assert.ok(nodes.some(node => node['Node Type']==='Seq Scan' && node['Relation Name']===table), `${table}.${column} originally unindexed`);
  }
  await db.exec(fix);
  await db.exec(fix);
  for (const [table,column,index] of probes) {
    const nodes = await probePlan(db,table,column,column==='split_group_id' ? group : expense);
    assert.ok(nodes.some(node => node['Index Name']===index), `${table}.${column} uses ${index}`);
    assert.ok(!nodes.some(node => node['Node Type']==='Seq Scan' && node['Relation Name']===table));
  }
  await db.query('delete from expenses where id=$1', [expense]);
  assert.equal(await scalar(db, 'select count(*)::int as value from recurring_series_associations'), 11999);
  assert.equal(await scalar(db, 'select count(*)::int as value from notification_capture_classifications where expense_id is null'), 1);
  assert.equal(await scalar(db, 'select count(*)::int as value from wallet_capture_events where duplicate_of_expense_id is null'), 1);
  assert.equal(await scalar(db, 'select count(*)::int as value from household_settlement_event_allocations_v2 where expense_id is null and split_group_id is null and allocated_amount_cents=100'), 1);
});

test('migration preserves core security/config, fails closed on drift and denies anonymous reset', async t => {
  const db = await fixture(t, false);
  await db.exec("alter function perform_user_financial_data_reset() set statement_timeout='30s'");
  const catalog = () => scalar(db, `select jsonb_build_object('acl',proacl,'config',proconfig,'definer',prosecdef) as value
    from pg_proc where oid='public.perform_user_financial_data_reset()'::regprocedure`);
  const before = await catalog();
  await db.exec(fix);
  assert.deepEqual(await catalog(), before);
  await db.exec("select set_config('request.jwt.claim.sub','',false)");
  assert.equal((await scalar(db, 'select perform_user_financial_data_reset() as value')).success, false);
  await db.exec(`create or replace function perform_user_financial_data_reset() returns jsonb language plpgsql as $$ begin return '{}'::jsonb; end $$`);
  await assert.rejects(db.exec(fix), /Unexpected financial reset dependency boundaries/);
});
