-- TEST ONLY: use a disposable database with the complete repository schema,
-- auth-user provisioning triggers and pgTAP available. No external fixtures.
-- From moneko-web, against an ALREADY provisioned, isolated test database:
-- PGOPTIONS='-c moneko.reset_disposable_test_opt_in=I_UNDERSTAND_THIS_MUST_BE_DISPOSABLE' \
--   pg_prove --dbname "$DISPOSABLE_TEST_DATABASE_URL" \
--   supabase/tests/financial_data_reset_regression_tests.sql
-- For SQL diagnostics: use psql -X -v ON_ERROR_STOP=1 -f with the same opt-in.
-- pg_prove (unlike plain psql) also exits nonzero for failed TAP assertions.
-- Never point either command at production/shared staging. Everything rolls back.
-- This tests the public synchronous entry point, which delegates to the existing
-- perform_user_financial_data_reset worker. Do not substitute an async job stub.
begin;

do $$
begin
  if lower(coalesce(current_setting('supabase.environment', true), ''))
      in ('prod', 'production')
    or coalesce(current_setting('moneko.reset_disposable_test_opt_in', true), '')
      <> 'I_UNDERSTAND_THIS_MUST_BE_DISPOSABLE' then
    raise exception 'Financial reset regression requires disposable-database opt-in';
  end if;
  -- Fail closed rather than queue real HTTP cleanup or alter production workers.
  if exists (select 1 from vault.decrypted_secrets where name in (
    'supabase_url', 'internal_service_secret', 'service_role_key'
  )) then
    raise exception 'Use a disposable database without cleanup dispatch secrets';
  end if;
end;
$$;

create extension if not exists pgtap;
select no_plan();

create temporary table reset_fixture as
select gen_random_uuid() as actor, gen_random_uuid() as neighbor,
  gen_random_uuid() as household, gen_random_uuid() as personal_wallet,
  gen_random_uuid() as shared_wallet, gen_random_uuid() as neighbor_wallet,
  gen_random_uuid() as recurring, gen_random_uuid() as split_group;
create temporary table reset_import_rows as
select n, gen_random_uuid() as id from generate_series(1, 6000) n;
create temporary table reset_snapshots (name text primary key, payload jsonb);

-- Same auth-user provisioning pattern as account_deletion_tests.sql. UUID email
-- suffixes permit repeat execution without relying on any pre-existing user.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select id, 'authenticated', 'authenticated',
  'reset-regression-' || id::text || '@example.test', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reset regression"}'::jsonb, now(), now()
from reset_fixture cross join lateral (values (actor), (neighbor)) users(id);

insert into public.households (id, name, owner_id, currency)
select household, 'Reset isolation fixture', neighbor, 'USD' from reset_fixture;
insert into public.household_members (household_id, user_id, role)
select household, actor, 'member' from reset_fixture;

insert into public.accounts (
  id, user_id, household_id, name, icon, color, currency,
  opening_balance_cents, is_default, is_system, is_archived
)
select personal_wallet, actor, null, 'Legacy Spending', 'wallet', '#6B7280',
  'USD', 12000, true, true, false from reset_fixture
union all
select shared_wallet, actor, household, 'Shared wallet', 'wallet', '#6B7280',
  'USD', 34000, false, false, false from reset_fixture
union all
select neighbor_wallet, neighbor, null, 'Neighbor wallet', 'wallet', '#6B7280',
  'USD', 56000, false, false, false from reset_fixture;

-- Persisted shape of save-transactions-batch: native currency, raw description,
-- stable import_request_key; the repository trigger computes import_semantic_key.
-- Include shared-space rows and soft-deleted history, not just a current page.
insert into public.expenses (
  id, user_id, household_id, account_id, date, amount_cents, currency,
  category, raw_text, type, is_recurring, import_request_key, deleted_at
)
select r.id, f.actor,
  case when n % 4 = 0 then f.household end,
  case when n % 4 = 0 then f.shared_wallet else f.personal_wallet end,
  date '2016-01-01' + ((n - 1) % 3653), 100 + n, 'USD', 'other',
  'Imported 食料品 / بقالة / café ' || n, 'expense', false,
  'reset-import:' || f.actor || ':' || n,
  case when n % 100 = 0 then now() end
from reset_import_rows r cross join reset_fixture f;

insert into public.expenses (
  user_id, household_id, account_id, date, amount_cents, currency,
  category, raw_text, type, is_recurring, import_request_key
)
select neighbor, household, null, date '2016-01-01' + n, 987,
  'USD', 'other', 'Preserve neighbor ' || n, 'expense', false,
  'reset-import:' || neighbor || ':' || n
from reset_fixture cross join generate_series(1, 12) n;

-- Restrictive recurring foreign keys require ordered cleanup, not a blind
-- DELETE. Use the recurring fixture's series/actual/occurrence relationship.
insert into public.expenses (
  id, user_id, account_id, date, amount_cents, currency, category,
  type, is_recurring, recurrence_rule
)
select recurring, actor, personal_wallet, date '2016-01-01', 101, 'USD',
  'other', 'expense', true,
  '{"frequency":"monthly","interval":1,"anchor_date":"2016-01-01"}'::jsonb
from reset_fixture;
update public.expenses e set parent_recurring_id = f.recurring,
  scheduled_occurrence_date = date '2016-01-01',
  recurring_confirmed_at = now(), recurring_confirmation_source = 'user'
from reset_fixture f, reset_import_rows r where r.n = 1 and e.id = r.id;
insert into public.recurring_occurrences (
  recurring_id, scheduled_occurrence_date, status, actual_transaction_id,
  paid_date, amount_cents, currency, confirmed_at, confirmed_by_user_id,
  confirmation_source
)
select recurring, date '2016-01-01', 'confirmed', r.id, date '2016-01-01',
  101, 'USD', now(), actor, 'user'
from reset_fixture cross join reset_import_rows r where r.n = 1;

-- Same consistent split linkage/finalization as the recurring migration fixture.
insert into public.expense_split_groups (
  id, household_id, expense_id, payer_user_id, split_type, currency,
  total_amount_cents
)
select split_group, household, r.id, actor, 'amount', 'USD', 104
from reset_fixture cross join reset_import_rows r where r.n = 4;
insert into public.expense_split_lines (
  split_group_id, user_id, amount_cents, is_settled
)
select split_group, actor, 52, false from reset_fixture
union all select split_group, neighbor, 52, false from reset_fixture;
select set_config('moneko.settlement_split_write_expense_id',
  (select id::text from reset_import_rows where n = 4), true);
update public.expenses set split_group_id = f.split_group
from reset_fixture f, reset_import_rows r where r.n = 4 and expenses.id = r.id;
select set_config('moneko.settlement_split_write_expense_id', '', true);
insert into public.household_settlement_finalized_split_groups (
  split_group_id, validation_profile
)
select split_group, 'strict_current' from reset_fixture;

insert into public.user_category_preferences (
  user_id, transaction_type, match_key, category_name
)
select id, 'expense', 'fixture merchant', 'other'
from reset_fixture cross join lateral (values (actor), (neighbor)) users(id);
insert into public.idempotency_keys (user_id, key, result)
select id, 'reset-fixture:' || id, '{"success":true}'::jsonb
from reset_fixture cross join lateral (values (actor), (neighbor)) users(id);
-- A notification addressed to the neighbor but referencing a deleted expense
-- must also disappear; an unrelated notification for that neighbor must survive.
insert into public.notification_events (user_id, event_type, payload)
select neighbor, 'split_created', jsonb_build_object('expense_id', r.id)
from reset_fixture cross join reset_import_rows r where r.n = 4
union all
select neighbor, 'split_created', '{"fixture":"preserve"}'::jsonb
from reset_fixture;

-- ROLLBACK must not hide an invalid fixture or deferred dependency violation.
set constraints all immediate;

-- Full-row snapshots catch unintended writes, not only lost row counts.
create function pg_temp.reset_survivors() returns jsonb language sql as $$
  select jsonb_build_object(
    'auth', (select jsonb_agg(to_jsonb(u) order by u.id) from auth.users u
      where u.id in (f.actor, f.neighbor)),
    'actor_profile', (select to_jsonb(u) - 'financial_data_reset_at' - 'updated_at'
      from public.users u where u.id = f.actor),
    'neighbor_profile', (select to_jsonb(u) from public.users u where u.id = f.neighbor),
    'wallets', (select jsonb_agg(to_jsonb(a) order by a.id) from public.accounts a
      where a.id in (f.shared_wallet, f.neighbor_wallet)),
    'household', (select to_jsonb(h) from public.households h where h.id = f.household),
    'members', (select jsonb_agg(to_jsonb(m) order by m.user_id)
      from public.household_members m where m.household_id = f.household),
    'expenses', (select jsonb_agg(to_jsonb(e) order by e.id) from public.expenses e
      where e.user_id = f.neighbor),
    'preferences', (select jsonb_agg(to_jsonb(p) order by p.id)
      from public.user_category_preferences p where p.user_id = f.neighbor),
    'idempotency', (select jsonb_agg(to_jsonb(k) order by k.id)
      from public.idempotency_keys k where k.user_id = f.neighbor),
    'notifications', (select jsonb_agg(to_jsonb(n) order by n.id)
      from public.notification_events n where n.user_id = f.neighbor
        and n.payload = '{"fixture":"preserve"}'::jsonb)
  ) from reset_fixture f;
$$;
insert into reset_snapshots values ('survivors', pg_temp.reset_survivors());

select is((select count(*) from public.expenses e join reset_import_rows r using (id)),
  6000::bigint, 'fixture contains 6000 persisted imported expenses');
select is((select count(distinct extract(year from e.date))
  from public.expenses e join reset_import_rows r using (id)),
  10::bigint, 'imported history spans ten calendar years');
select is((select count(*) from public.expenses e join reset_import_rows r using (id)
  where e.import_request_key is not null and e.import_semantic_key is not null),
  6000::bigint, 'real import identity columns are populated');
select is((select count(*) from public.users u join reset_fixture f on u.id = f.actor),
  1::bigint, 'auth provisioning created the app account being preserved');
select is((select count(*) from public.recurring_occurrences o
  join reset_fixture f on o.recurring_id = f.recurring),
  1::bigint, 'recurring dependent exists before reset');
select is((select count(*) from public.expense_split_lines l
  join reset_fixture f on l.split_group_id = f.split_group),
  2::bigint, 'both users have split dependencies before reset');

-- Exercise actual execute privileges, not just a superuser calling a definer.
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select is(public.reset_user_financial_data(),
  '{"success":false,"message":"Not authenticated"}'::jsonb,
  'missing auth identity is rejected without deleting data');
reset role;
select is((select count(*) from public.expenses e join reset_import_rows r using (id)),
  6000::bigint, 'unauthenticated reset leaves imported data intact');

create function pg_temp.check_financial_reset(p_attempt integer)
returns setof text language plpgsql as $$
declare
  f record;
  result jsonb := current_setting('test.reset_result')::jsonb;
begin
  select * into strict f from reset_fixture;
  return next ok(result @> '{"success":true,"storage_cleanup_queued":true,"main_page_artifacts_cleared":true}'::jsonb,
    format('attempt %s: public synchronous reset succeeds: %s', p_attempt, result));
  return next is((result ->> 'removed_wallets')::integer,
    case when p_attempt = 1 then 1 else 0 end,
    format('attempt %s: removes only remaining personal wallets', p_attempt));
  return next ok(result ? 'primary_wallet_id' and result -> 'primary_wallet_id' = 'null'::jsonb,
    format('attempt %s: no replacement Spending wallet is created', p_attempt));
  return next is((select count(*) from public.expenses where user_id = f.actor),
    0::bigint, format('attempt %s: all years, shared and deleted expenses removed', p_attempt));
  return next is((select count(*) from public.accounts
    where user_id = f.actor and household_id is null), 0::bigint,
    format('attempt %s: legacy system wallet is removed too', p_attempt));
  return next is((select count(*) from public.recurring_occurrences where recurring_id = f.recurring),
    0::bigint, format('attempt %s: restrictive recurring dependencies removed', p_attempt));
  return next is((select count(*) from public.expense_split_groups where id = f.split_group),
    0::bigint, format('attempt %s: dependent split group removed', p_attempt));
  return next is((select count(*) from public.expense_split_lines where split_group_id = f.split_group),
    0::bigint, format('attempt %s: dependent split lines removed for both users', p_attempt));
  return next is((select count(*) from public.household_settlement_finalized_split_groups
    where split_group_id = f.split_group), 0::bigint,
    format('attempt %s: split finalization dependency removed', p_attempt));
  return next is((select count(*) from public.notification_events
    where payload ->> 'expense_id' in (select id::text from reset_import_rows)),
    0::bigint, format('attempt %s: expense-linked notifications removed across recipients', p_attempt));
  return next is((select count(*) from public.user_category_preferences where user_id = f.actor),
    0::bigint, format('attempt %s: category preference artifacts removed', p_attempt));
  return next is((select count(*) from public.idempotency_keys where user_id = f.actor),
    0::bigint, format('attempt %s: actor idempotency artifacts removed', p_attempt));
  return next is(pg_temp.reset_survivors(),
    (select payload from reset_snapshots where name = 'survivors'),
    format('attempt %s: login/profile, neighbor records and shared wallet unchanged', p_attempt));
  return next ok(exists (select 1 from public.users where id = f.actor
    and financial_data_reset_at is not null
    and financial_data_reset_at = (result ->> 'financial_data_reset_at')::timestamptz),
    format('attempt %s: reset marker persisted and returned', p_attempt));
  return next is((select count(*) from public.financial_storage_cleanup_jobs
    where user_id = f.actor and status = 'pending' and removed_object_count = 0
      and last_error is null and completed_at is null), 1::bigint,
    format('attempt %s: exactly one pending Storage cleanup job, not completed deletion', p_attempt));
  return next is((select count(*) from public.financial_storage_cleanup_jobs where user_id = f.neighbor),
    0::bigint, format('attempt %s: no cleanup scheduled for neighbor', p_attempt));
  return next is(current_setting('moneko.deleting_user_ids'), f.neighbor::text,
    format('attempt %s: deletion-guard context restored exactly', p_attempt));
end;
$$;

select set_config('request.jwt.claim.sub', actor::text, true),
  set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true),
  set_config('moneko.deleting_user_ids', neighbor::text, true)
from reset_fixture;
set local role authenticated;
select set_config('test.reset_result', public.reset_user_financial_data()::text, true);
reset role;
set constraints all immediate;
select * from pg_temp.check_financial_reset(1);
insert into reset_snapshots
values ('first_reset', current_setting('test.reset_result')::jsonb);

-- Immediate same-user retry is a real second invocation on the emptied account.
set local role authenticated;
select set_config('test.reset_result', public.reset_user_financial_data()::text, true);
reset role;
set constraints all immediate;
select * from pg_temp.check_financial_reset(2);
select ok((select financial_data_reset_at >=
  (select (payload ->> 'financial_data_reset_at')::timestamptz
    from reset_snapshots where name = 'first_reset')
  from public.users u join reset_fixture f on u.id = f.actor),
  'safe retry never moves the reset marker backwards');

select * from finish();
rollback;
