-- TEST ONLY: this suite creates a trigger on public.expenses, inserts auth and
-- financial fixtures, and invokes write RPCs. Run only against an isolated,
-- disposable database containing the complete migration chain. Never run it
-- against production or a shared staging database.
begin;

do $$
begin
  if lower(coalesce(current_setting('supabase.environment', true), ''))
      in ('prod', 'production') then
    raise exception 'Plaid reconciliation pgTAP is forbidden in production';
  end if;
  if coalesce(
    current_setting('moneko.plaid_disposable_test_opt_in', true),
    ''
  ) <> 'I_UNDERSTAND_THIS_MUST_BE_DISPOSABLE' then
    raise exception using
      message = 'Plaid reconciliation pgTAP requires disposable-database opt-in',
      hint = 'Set moneko.plaid_disposable_test_opt_in only on an isolated disposable database';
  end if;
  raise warning 'TEST ONLY: Plaid reconciliation fixtures mutate data and roll back';
end;
$$;

create extension if not exists pgtap;

select plan(40);

do $$
begin
  perform set_config('moneko.plaid_transfer_update_counts', '{}', true);
  perform set_config('moneko.plaid_no_op_update_counts', '{}', true);
  perform set_config('moneko.plaid_transfer_tap_results', '[]', true);
end;
$$;

-- Capture TAP output without a table because the Supabase SQL execution
-- environment restricts temporary DDL and may isolate regular DDL visibility.
create or replace function pg_temp.capture_plaid_transfer_tap(p_result text)
returns text
language plpgsql
as $$
declare
  v_results jsonb;
begin
  v_results := coalesce(
    nullif(current_setting('moneko.plaid_transfer_tap_results', true), ''),
    '[]'
  )::jsonb;
  perform set_config(
    'moneko.plaid_transfer_tap_results',
    (v_results || jsonb_build_array(p_result))::text,
    true
  );
  return p_result;
end;
$$;

create or replace function pg_temp.count_plaid_transfer_updates()
returns trigger
language plpgsql
as $$
declare
  v_counts jsonb;
  v_expense_key text := new.id::text;
begin
  if new.classification_source = 'plaid_possible_transfer' then
    v_counts := coalesce(
      nullif(current_setting('moneko.plaid_transfer_update_counts', true), ''),
      '{}'
    )::jsonb;
    perform set_config(
      'moneko.plaid_transfer_update_counts',
      jsonb_set(
        v_counts,
        array[v_expense_key],
        to_jsonb(coalesce((v_counts ->> v_expense_key)::integer, 0) + 1),
        true
      )::text,
      true
    );
  end if;
  return new;
end;
$$;

create trigger test_count_plaid_transfer_updates
after update on public.expenses
for each row execute function pg_temp.count_plaid_transfer_updates();

create or replace function pg_temp.count_plaid_no_op_updates()
returns trigger
language plpgsql
as $$
declare
  v_counts jsonb;
  v_key text := tg_argv[0];
begin
  if v_key = 'inactive_account'
      and not (
        to_jsonb(old) ->> 'status' = 'inactive'
        and to_jsonb(new) ->> 'status' = 'inactive'
      ) then
    return new;
  end if;
  v_counts := coalesce(
    nullif(current_setting('moneko.plaid_no_op_update_counts', true), ''),
    '{}'
  )::jsonb;
  perform set_config(
    'moneko.plaid_no_op_update_counts',
    jsonb_set(
      v_counts,
      array[v_key],
      to_jsonb(coalesce((v_counts ->> v_key)::integer, 0) + 1),
      true
    )::text,
    true
  );
  return new;
end;
$$;

create trigger test_count_plaid_account_upsert_updates
after update of
  plaid_account_id, provider_account_id, provider_persistent_account_id,
  name, official_name, mask, currency, type, subtype,
  provider_balance_current_cents, provider_balance_available_cents,
  provider_balance_limit_cents, provider_balance_updated_at,
  raw_provider_payload
on public.bank_accounts
for each row execute function pg_temp.count_plaid_no_op_updates('account_upsert');

create trigger test_count_plaid_inactive_account_rewrites
after update of status on public.bank_accounts
for each row execute function pg_temp.count_plaid_no_op_updates('inactive_account');

create trigger test_count_plaid_raw_updates
after update on public.bank_transaction_raw
for each row execute function pg_temp.count_plaid_no_op_updates('raw_transaction');

create or replace function pg_temp.apply_empty_plaid_sync(
  p_user_id uuid,
  p_connection_id uuid,
  p_account_ids uuid[],
  p_lock_token uuid
) returns jsonb
language plpgsql
as $$
declare
  v_generation integer;
begin
  select coalesce(cursor_generation, 0)
  into v_generation
  from public.bank_connections
  where id = p_connection_id;

  return public.apply_plaid_sync_batch_v2(
    p_user_id,
    p_connection_id,
    v_generation,
    'test-cursor-' || (v_generation + 1)::text,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::text[],
    '{}'::uuid[],
    p_account_ids,
    '[]'::jsonb,
    '{}'::uuid[],
    '[]'::jsonb,
    '{}'::jsonb,
    true,
    false,
    p_lock_token,
    null
  );
end;
$$;

create or replace function pg_temp.apply_plaid_no_op_payload(
  p_user_id uuid,
  p_connection_id uuid,
  p_account_id uuid,
  p_inactive_account_id uuid,
  p_processed_account_ids uuid[],
  p_lock_token uuid
) returns jsonb
language plpgsql
as $$
declare
  v_generation integer;
  v_account_upserts jsonb;
begin
  select coalesce(connection.cursor_generation, 0)
  into v_generation
  from public.bank_connections connection
  where connection.id = p_connection_id;

  select jsonb_build_array(jsonb_build_object(
    'id', account.id,
    'user_id', account.user_id,
    'bank_connection_id', account.bank_connection_id,
    'provider', account.provider,
    'plaid_account_id', account.plaid_account_id,
    'provider_account_id', account.provider_account_id,
    'provider_persistent_account_id', account.provider_persistent_account_id,
    'name', account.name,
    'official_name', account.official_name,
    'mask', account.mask,
    'currency', account.currency,
    'type', account.type,
    'subtype', account.subtype,
    'status', account.status,
    'provider_balance_current_cents', account.provider_balance_current_cents,
    'provider_balance_available_cents', account.provider_balance_available_cents,
    'provider_balance_limit_cents', account.provider_balance_limit_cents,
    'provider_balance_updated_at', account.provider_balance_updated_at,
    'raw_provider_payload', account.raw_provider_payload
  ))
  into v_account_upserts
  from public.bank_accounts account
  where account.id = p_account_id;

  return public.apply_plaid_sync_batch_v2(
    p_user_id,
    p_connection_id,
    v_generation,
    'test-cursor-' || (v_generation + 1)::text,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::text[],
    '{}'::uuid[],
    p_processed_account_ids,
    v_account_upserts,
    array[p_inactive_account_id],
    jsonb_build_array(jsonb_build_object(
      'bank_connection_id', p_connection_id,
      'bank_account_id', p_account_id,
      'provider', 'plaid',
      'provider_transaction_id', 'phase-2-identical-raw',
      'payload', jsonb_build_object('stable', true)
    )),
    '{}'::jsonb,
    true,
    false,
    p_lock_token,
    null
  );
end;
$$;

do $$
declare
  v_user uuid := '10000000-0000-0000-0000-000000000001';
  v_other_user uuid := '10000000-0000-0000-0000-000000000002';
  v_household uuid := '20000000-0000-0000-0000-000000000001';
  v_other_household uuid := '20000000-0000-0000-0000-000000000002';
  v_household_connection uuid := '30000000-0000-0000-0000-000000000001';
  v_personal_connection uuid := '30000000-0000-0000-0000-000000000002';
  v_household_account_a uuid := '40000000-0000-0000-0000-000000000001';
  v_household_account_b uuid := '40000000-0000-0000-0000-000000000002';
  v_household_account_outside uuid := '40000000-0000-0000-0000-000000000003';
  v_personal_account_a uuid := '40000000-0000-0000-0000-000000000004';
  v_personal_account_b uuid := '40000000-0000-0000-0000-000000000005';
  v_household_lock uuid := '50000000-0000-0000-0000-000000000001';
  v_personal_lock uuid := '50000000-0000-0000-0000-000000000002';
  v_result jsonb;
  v_legacy_ids uuid[];
  v_optimized_ids uuid[];
  v_scope_outcomes jsonb := '{}'::jsonb;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      v_user, 'authenticated', 'authenticated',
      'plaid-transfer-primary@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    ),
    (
      v_other_user, 'authenticated', 'authenticated',
      'plaid-transfer-other@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    );

  insert into public.households (id, name, owner_id, currency, created_at)
  values
    (v_household, 'Plaid transfer test household', v_user, 'USD', now()),
    (
      v_other_household,
      'Other Plaid transfer household',
      v_other_user,
      'USD',
      now()
    );

  -- household_add_owner_member creates both owner memberships when the
  -- household rows are inserted; inserting them again violates
  -- unique_household_member.
  insert into public.bank_connections (
    id, user_id, provider, plaid_item_id, provider_item_id,
    plaid_access_token_encrypted, access_token_encrypted, household_id,
    status, item_status, cursor_generation
  ) values
    (
      v_household_connection, v_user, 'plaid', 'item-household-test',
      'item-household-test', 'test-token', 'test-token', v_household,
      'active', 'active', 0
    ),
    (
      v_personal_connection, v_user, 'plaid', 'item-personal-test',
      'item-personal-test', 'test-token', 'test-token', null,
      'active', 'active', 0
    );

  insert into public.bank_accounts (
    id, user_id, bank_connection_id, provider, plaid_account_id,
    provider_account_id, name, currency, status
  ) values
    (
      v_household_account_a, v_user, v_household_connection, 'plaid',
      'household-a', 'household-a', 'Household A', 'USD', 'active'
    ),
    (
      v_household_account_b, v_user, v_household_connection, 'plaid',
      'household-b', 'household-b', 'Household B', 'USD', 'active'
    ),
    (
      v_household_account_outside, v_user, v_household_connection, 'plaid',
      'household-outside', 'household-outside', 'Household outside', 'USD', 'active'
    ),
    (
      v_personal_account_a, v_user, v_personal_connection, 'plaid',
      'personal-a', 'personal-a', 'Personal A', 'USD', 'active'
    ),
    (
      v_personal_account_b, v_user, v_personal_connection, 'plaid',
      'personal-b', 'personal-b', 'Personal B', 'USD', 'active'
    );

  update public.bank_accounts
  set status = 'inactive'
  where id = v_household_account_outside;

  insert into public.bank_sync_locks (
    bank_connection_id, locked_until, locked_by, lock_token, heartbeat_at
  ) values
    (v_household_connection, now() + interval '1 hour', 'pgtap', v_household_lock, now()),
    (v_personal_connection, now() + interval '1 hour', 'pgtap', v_personal_lock, now());

  -- Amounts isolate scenarios so unrelated fixtures cannot form pairs.
  insert into public.expenses (
    id, user_id, bank_account_id, provider, provider_transaction_id,
    amount_cents, currency, date, type, household_id, analytics_class,
    analytics_direction, analytics_is_final, analytics_spending_multiplier,
    analytics_counts_toward_income, classification_source,
    classification_review_state
  ) values
    -- Same day and one/two/three-day positive cases.
    ('60000000-0000-0000-0000-000000000001', v_user, v_household_account_a, 'plaid', 'same-a', 10000, 'usd', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000002', v_user, v_household_account_b, 'plaid', 'same-b', -10000, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000003', v_user, v_household_account_a, 'plaid', 'day1-a', 10100, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000004', v_user, v_household_account_b, 'plaid', 'day1-b', -10100, 'USD', date '2026-07-02', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000005', v_user, v_household_account_a, 'plaid', 'day2-a', 10200, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000006', v_user, v_household_account_b, 'plaid', 'day2-b', -10200, 'USD', date '2026-07-03', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000007', v_user, v_household_account_a, 'plaid', 'day3-a', 10300, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000008', v_user, v_household_account_b, 'plaid', 'day3-b', -10300, 'USD', date '2026-07-04', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    -- Negative scope and predicate cases.
    ('60000000-0000-0000-0000-000000000009', v_user, v_household_account_a, 'plaid', 'day4-a', 10400, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000010', v_user, v_household_account_b, 'plaid', 'day4-b', -10400, 'USD', date '2026-07-05', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000011', v_user, v_household_account_a, 'plaid', 'currency-a', 10500, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000012', v_user, v_household_account_b, 'plaid', 'currency-b', -10500, 'EUR', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000013', v_user, v_household_account_a, 'plaid', 'same-account-a', 10600, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000014', v_user, v_household_account_a, 'plaid', 'same-account-b', -10600, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000015', v_user, v_household_account_a, 'plaid', 'different-user-a', 10700, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000016', v_other_user, v_household_account_b, 'plaid', 'different-user-b', -10700, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000017', v_user, v_household_account_a, 'plaid', 'different-household-a', 10800, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000018', v_user, v_household_account_b, 'plaid', 'different-household-b', -10800, 'USD', date '2026-07-01', 'income', v_other_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000019', v_user, v_household_account_a, 'plaid', 'deleted-a', 10900, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000020', v_user, v_household_account_b, 'plaid', 'deleted-b', -10900, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000021', v_user, v_household_account_a, 'plaid', 'nonfinal-a', 11000, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', false, 0, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000022', v_user, v_household_account_b, 'plaid', 'nonfinal-b', -11000, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000023', v_user, v_household_account_a, 'plaid', 'outside-a', 11100, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000024', v_user, v_household_account_outside, 'plaid', 'outside-b', -11100, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    -- Override behavior.
    ('60000000-0000-0000-0000-000000000025', v_user, v_household_account_a, 'plaid', 'override-one-a', 11200, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'user_override', 'user_override'),
    ('60000000-0000-0000-0000-000000000026', v_user, v_household_account_b, 'plaid', 'override-one-b', -11200, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000027', v_user, v_household_account_a, 'plaid', 'override-both-a', 11300, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'user_override', 'user_override'),
    ('60000000-0000-0000-0000-000000000028', v_user, v_household_account_b, 'plaid', 'override-both-b', -11300, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'user_override', 'user_override'),
    -- Multiple pairs: both expense rows match both income rows.
    ('60000000-0000-0000-0000-000000000029', v_user, v_household_account_a, 'plaid', 'multiple-a', 11400, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000030', v_user, v_household_account_a, 'plaid', 'multiple-b', 11400, 'USD', date '2026-07-02', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000031', v_user, v_household_account_b, 'plaid', 'multiple-c', -11400, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000032', v_user, v_household_account_b, 'plaid', 'multiple-d', -11400, 'USD', date '2026-07-02', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    -- Later-sync reset fixture.
    ('60000000-0000-0000-0000-000000000033', v_user, v_household_account_a, 'plaid', 'reset-a', 11500, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000034', v_user, v_household_account_b, 'plaid', 'reset-b', -11500, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    -- NULL household behavior on the personal connection.
    ('60000000-0000-0000-0000-000000000035', v_user, v_personal_account_a, 'plaid', 'null-both-a', 11600, 'USD', date '2026-07-01', 'expense', null, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000036', v_user, v_personal_account_b, 'plaid', 'null-both-b', -11600, 'USD', date '2026-07-01', 'income', null, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000037', v_user, v_personal_account_a, 'plaid', 'null-one-a', 11700, 'USD', date '2026-07-01', 'expense', null, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000038', v_user, v_personal_account_b, 'plaid', 'null-one-b', -11700, 'USD', date '2026-07-01', 'income', v_household, 'income', 'in', true, 0, true, 'plaid_pfc_v2', 'not_required'),
    -- Same transaction types must not match.
    ('60000000-0000-0000-0000-000000000039', v_user, v_household_account_a, 'plaid', 'same-type-a', 11800, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required'),
    ('60000000-0000-0000-0000-000000000040', v_user, v_household_account_b, 'plaid', 'same-type-b', -11800, 'USD', date '2026-07-01', 'expense', v_household, 'consumer_spend', 'out', true, 1, false, 'plaid_pfc_v2', 'not_required');

  -- Production-shaped amplification fixture: 20 rows on each account share one
  -- normalized currency/amount bucket, producing 400 possible pairs but only
  -- 40 final target IDs.
  insert into public.expenses (
    id, user_id, bank_account_id, provider, provider_transaction_id,
    amount_cents, currency, date, type, household_id, analytics_class,
    analytics_direction, analytics_is_final, analytics_spending_multiplier,
    analytics_counts_toward_income, classification_source,
    classification_review_state
  )
  select
    ('70000000-0000-0000-0000-' || lpad(series::text, 12, '0'))::uuid,
    v_user,
    case when series <= 20 then v_household_account_a else v_household_account_b end,
    'plaid',
    'amplification-' || series::text,
    case when series <= 20 then 11900 else -11900 end,
    'USD',
    date '2026-07-01' + ((series - 1) % 4),
    case when series <= 20 then 'expense'::public.transaction_type else 'income'::public.transaction_type end,
    v_household,
    case when series <= 20 then 'consumer_spend' else 'income' end,
    case when series <= 20 then 'out' else 'in' end,
    true,
    case when series <= 20 then 1 else 0 end,
    series > 20,
    'plaid_pfc_v2',
    'not_required'
  from generate_series(1, 40) series;

  -- The analytics trigger derives provider_pending from raw_provider_payload
  -- and derives finality from that pending value. Supply the authoritative
  -- Plaid payload so both fixtures remain genuinely non-final.
  update public.expenses
  set raw_provider_payload = '{"pending": true}'::jsonb
  where id in (
    '60000000-0000-0000-0000-000000000021',
    '60000000-0000-0000-0000-000000000022'
  );

  update public.expenses
  set deleted_at = now(), deleted_reason = 'provider_removed'
  where id = '60000000-0000-0000-0000-000000000020';

  -- Directly compare exact legacy and optimized target ID sets before either
  -- reconciliation query mutates classification state. This fixture includes
  -- user overrides, duplicate pairs, and a high-amplification equality bucket.
  with legacy_candidates as (
    select e.id
    from public.expenses e
    join public.expenses m
      on m.user_id = e.user_id
      and m.provider = 'plaid'
      and m.deleted_at is null
      and m.analytics_is_final
      and m.bank_account_id is distinct from e.bank_account_id
      and m.bank_account_id = any(array[v_household_account_a, v_household_account_b])
      and m.household_id is not distinct from v_household
      and upper(coalesce(m.currency, '')) = upper(coalesce(e.currency, ''))
      and abs(m.amount_cents) = abs(e.amount_cents)
      and m.type is distinct from e.type
      and abs(m.date - e.date) <= 3
    where e.user_id = v_user
      and e.provider = 'plaid'
      and e.deleted_at is null
      and e.analytics_is_final
      and e.bank_account_id = any(array[v_household_account_a, v_household_account_b])
      and e.household_id is not distinct from v_household
      and e.classification_source <> 'user_override'
    union
    select m.id
    from public.expenses e
    join public.expenses m
      on m.user_id = e.user_id
      and m.provider = 'plaid'
      and m.deleted_at is null
      and m.analytics_is_final
      and m.bank_account_id is distinct from e.bank_account_id
      and m.bank_account_id = any(array[v_household_account_a, v_household_account_b])
      and m.household_id is not distinct from v_household
      and upper(coalesce(m.currency, '')) = upper(coalesce(e.currency, ''))
      and abs(m.amount_cents) = abs(e.amount_cents)
      and m.type is distinct from e.type
      and abs(m.date - e.date) <= 3
    where e.user_id = v_user
      and e.provider = 'plaid'
      and e.deleted_at is null
      and e.analytics_is_final
      and e.bank_account_id = any(array[v_household_account_a, v_household_account_b])
      and e.household_id is not distinct from v_household
      and m.classification_source <> 'user_override'
  ), optimized_candidate_expenses as materialized (
    select
      e.id,
      e.bank_account_id,
      upper(coalesce(e.currency, '')) as normalized_currency,
      abs(e.amount_cents) as absolute_amount_cents,
      e.date,
      e.type,
      e.classification_source
    from public.expenses e
    where e.user_id = v_user
      and e.provider = 'plaid'
      and e.deleted_at is null
      and e.analytics_is_final
      and e.bank_account_id = any(array[v_household_account_a, v_household_account_b])
      and e.household_id is not distinct from v_household
  ), optimized_matching_pairs as (
    select
      left_candidate.id as left_id,
      left_candidate.classification_source as left_classification_source,
      right_candidate.id as right_id,
      right_candidate.classification_source as right_classification_source
    from optimized_candidate_expenses left_candidate
    join optimized_candidate_expenses right_candidate
      on left_candidate.id < right_candidate.id
      and left_candidate.bank_account_id is distinct from right_candidate.bank_account_id
      and left_candidate.normalized_currency = right_candidate.normalized_currency
      and left_candidate.absolute_amount_cents = right_candidate.absolute_amount_cents
      and left_candidate.type is distinct from right_candidate.type
      and abs(left_candidate.date - right_candidate.date) <= 3
  ), optimized_candidates as (
    select distinct candidate_side.id
    from optimized_matching_pairs pair
    cross join lateral (
      values
        (pair.left_id, pair.left_classification_source),
        (pair.right_id, pair.right_classification_source)
    ) as candidate_side(id, classification_source)
    where candidate_side.classification_source <> 'user_override'
  )
  select
    (select array_agg(id order by id) from legacy_candidates),
    (select array_agg(id order by id) from optimized_candidates)
  into v_legacy_ids, v_optimized_ids;

  perform set_config(
    'moneko.plaid_transfer_candidate_parity',
    jsonb_build_object(
      'legacy_ids', coalesce(to_jsonb(v_legacy_ids), '[]'::jsonb),
      'optimized_ids', coalesce(to_jsonb(v_optimized_ids), '[]'::jsonb)
    )::text,
    true
  );

  v_result := pg_temp.apply_empty_plaid_sync(
    v_user, v_household_connection, '{}'::uuid[], v_household_lock
  );
  v_scope_outcomes := v_scope_outcomes || jsonb_build_object(
    'empty', v_result || jsonb_build_object(
      'possible_count', (select count(*) from public.expenses
        where user_id = v_user
          and classification_source = 'plaid_possible_transfer')
    )
  );

  v_result := pg_temp.apply_empty_plaid_sync(
    v_user,
    v_household_connection,
    array[v_household_account_a],
    v_household_lock
  );
  v_scope_outcomes := v_scope_outcomes || jsonb_build_object(
    'one_account', v_result || jsonb_build_object(
      'possible_count', (select count(*) from public.expenses
        where user_id = v_user
          and classification_source = 'plaid_possible_transfer')
    )
  );

  v_result := pg_temp.apply_empty_plaid_sync(
    v_user,
    v_household_connection,
    array[
      v_household_account_a, v_household_account_b,
      v_household_account_a, v_household_account_b
    ],
    v_household_lock
  );
  v_scope_outcomes := v_scope_outcomes || jsonb_build_object(
    'duplicates', v_result
  );

  perform pg_temp.apply_empty_plaid_sync(
    v_user,
    v_personal_connection,
    array[v_personal_account_a, v_personal_account_b],
    v_personal_lock
  );

  perform set_config(
    'moneko.plaid_transfer_scope_outcomes',
    v_scope_outcomes::text,
    true
  );
end;
$$;

select pg_temp.capture_plaid_transfer_tap(is(
  current_setting('moneko.plaid_transfer_candidate_parity')::jsonb
    -> 'legacy_ids',
  current_setting('moneko.plaid_transfer_candidate_parity')::jsonb
    -> 'optimized_ids',
  'legacy and optimized queries select identical sorted target UUID arrays'
));

select pg_temp.capture_plaid_transfer_tap(is(
  (current_setting('moneko.plaid_transfer_scope_outcomes')::jsonb
    -> 'empty' ->> 'possible_count')::bigint,
  0::bigint,
  'empty processed account IDs produce no transfer candidates'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (current_setting('moneko.plaid_transfer_scope_outcomes')::jsonb
    -> 'one_account' ->> 'possible_count')::bigint,
  0::bigint,
  'a processed scope containing only one account cannot reconcile a transfer'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (current_setting('moneko.plaid_transfer_scope_outcomes')::jsonb
    -> 'duplicates' ->> 'accounts_processed')::integer,
  4,
  'duplicated processed account IDs remain accepted by the current API'
));
select pg_temp.capture_plaid_transfer_tap(ok(
  (current_setting('moneko.plaid_transfer_scope_outcomes')::jsonb
    -> 'duplicates') ?& array[
      'inserted', 'updated', 'removed', 'accounts_processed',
      'inserted_records', 'cursor_generation', 'is_ready',
      'recurring_refresh_required'
    ],
  'v2 response JSON shape remains present through the authorized wrapper path'
));

select pg_temp.capture_plaid_transfer_tap(is(
  (select array_agg(id order by id) from public.expenses
   where id between '60000000-0000-0000-0000-000000000001' and '60000000-0000-0000-0000-000000000002'
     and classification_source = 'plaid_possible_transfer'),
  array['60000000-0000-0000-0000-000000000001'::uuid, '60000000-0000-0000-0000-000000000002'::uuid],
  'same amount/currency, opposing type, different accounts, and same date match'
));

select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004') and classification_source = 'plaid_possible_transfer'), 2::bigint, 'one-day offset matches'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000006') and classification_source = 'plaid_possible_transfer'), 2::bigint, 'two-day offset matches'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000008') and classification_source = 'plaid_possible_transfer'), 2::bigint, 'three-day offset matches'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000010') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'four-day offset does not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000012') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'different currencies do not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000013', '60000000-0000-0000-0000-000000000014') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'same bank account does not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000039', '60000000-0000-0000-0000-000000000040') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'different accounts with the same transaction type do not match'));
select pg_temp.capture_plaid_transfer_tap(ok(
  null::public.transaction_type is distinct from 'expense'::public.transaction_type,
  'NULL type versus non-NULL type preserves legacy IS DISTINCT FROM matching'
));
select pg_temp.capture_plaid_transfer_tap(ok(
  not (null::public.transaction_type is distinct from null::public.transaction_type),
  'two NULL transaction types preserve legacy non-matching behavior'
));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000015', '60000000-0000-0000-0000-000000000016') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'different users do not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000017', '60000000-0000-0000-0000-000000000018') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'different households do not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000035', '60000000-0000-0000-0000-000000000036') and classification_source = 'plaid_possible_transfer'), 2::bigint, 'two NULL household IDs preserve matching behavior'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000037', '60000000-0000-0000-0000-000000000038') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'one NULL and one non-NULL household do not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000019', '60000000-0000-0000-0000-000000000020') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'deleted transactions do not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000021', '60000000-0000-0000-0000-000000000022') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'non-final analytics rows do not match'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000023', '60000000-0000-0000-0000-000000000024') and classification_source = 'plaid_possible_transfer'), 0::bigint, 'accounts outside processed account IDs do not match'));
select pg_temp.capture_plaid_transfer_tap(is((select classification_source from public.expenses where id = '60000000-0000-0000-0000-000000000025'), 'user_override', 'the overridden side remains unchanged'));
select pg_temp.capture_plaid_transfer_tap(is((select classification_source from public.expenses where id = '60000000-0000-0000-0000-000000000026'), 'plaid_possible_transfer', 'the non-overridden side of a pair changes'));
select pg_temp.capture_plaid_transfer_tap(is((select count(*) from public.expenses where id in ('60000000-0000-0000-0000-000000000027', '60000000-0000-0000-0000-000000000028') and classification_source = 'user_override'), 2::bigint, 'both overridden sides remain unchanged'));
select pg_temp.capture_plaid_transfer_tap(is(
  (select array_agg(id order by id) from public.expenses where id in (
    '60000000-0000-0000-0000-000000000029', '60000000-0000-0000-0000-000000000030',
    '60000000-0000-0000-0000-000000000031', '60000000-0000-0000-0000-000000000032'
  ) and classification_source = 'plaid_possible_transfer'),
  array[
    '60000000-0000-0000-0000-000000000029'::uuid, '60000000-0000-0000-0000-000000000030'::uuid,
    '60000000-0000-0000-0000-000000000031'::uuid, '60000000-0000-0000-0000-000000000032'::uuid
  ],
  'multiple possible matches preserve the current final updated ID set'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (select max(value::integer)
   from jsonb_each_text(current_setting(
     'moneko.plaid_transfer_update_counts'
   )::jsonb)
   where key::uuid in (
     '60000000-0000-0000-0000-000000000029',
     '60000000-0000-0000-0000-000000000030',
     '60000000-0000-0000-0000-000000000031',
     '60000000-0000-0000-0000-000000000032'
   )),
  1,
  'each target ID is updated once even with multiple candidate pairs'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (select count(*) from public.expenses
   where id::text like '70000000-0000-0000-0000-%'
     and classification_source = 'plaid_possible_transfer'),
  40::bigint,
  'high-amplification amount/currency bucket produces the exact final target set'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (select max(value::integer)
   from jsonb_each_text(current_setting(
     'moneko.plaid_transfer_update_counts'
   )::jsonb)
   where key like '70000000-0000-0000-0000-%'),
  1,
  'high-amplification candidates are each updated only once'
));
select pg_temp.capture_plaid_transfer_tap(lives_ok(
  $$select pg_temp.apply_empty_plaid_sync(
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    array[
      '40000000-0000-0000-0000-000000000001'::uuid,
      '40000000-0000-0000-0000-000000000002'::uuid
    ],
    '50000000-0000-0000-0000-000000000001'
  )$$,
  'a repeated equivalent sync completes without changing the public contract'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (select max(value::integer)
   from jsonb_each_text(current_setting(
     'moneko.plaid_transfer_update_counts'
   )::jsonb)),
  1,
  'a repeated equivalent sync does not rewrite stable transfer classifications'
));
select pg_temp.capture_plaid_transfer_tap(lives_ok(
  $$select pg_temp.apply_plaid_no_op_payload(
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    array[
      '40000000-0000-0000-0000-000000000001'::uuid,
      '40000000-0000-0000-0000-000000000002'::uuid
    ],
    '50000000-0000-0000-0000-000000000001'
  )$$,
  'an initial equivalent account payload and raw insert complete normally'
));
select pg_temp.capture_plaid_transfer_tap(lives_ok(
  $$select pg_temp.apply_plaid_no_op_payload(
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    array[
      '40000000-0000-0000-0000-000000000001'::uuid,
      '40000000-0000-0000-0000-000000000002'::uuid
    ],
    '50000000-0000-0000-0000-000000000001'
  )$$,
  'a repeated identical account and raw payload completes normally'
));
select pg_temp.capture_plaid_transfer_tap(is(
  jsonb_build_array(
    coalesce((current_setting('moneko.plaid_no_op_update_counts')::jsonb
      ->> 'account_upsert')::integer, 0),
    coalesce((current_setting('moneko.plaid_no_op_update_counts')::jsonb
      ->> 'inactive_account')::integer, 0),
    coalesce((current_setting('moneko.plaid_no_op_update_counts')::jsonb
      ->> 'raw_transaction')::integer, 0)
  ),
  '[0, 0, 0]'::jsonb,
  'identical account, inactive status, and raw payload writes are skipped'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (select jsonb_build_array(analytics_class, analytics_direction, analytics_spending_multiplier, analytics_counts_toward_income, classification_source, classification_review_state, classification_review_reason) from public.expenses where id = '60000000-0000-0000-0000-000000000001'),
  '["unknown", "none", 0, false, "plaid_possible_transfer", "needs_review", "possible_transfer_match"]'::jsonb,
  'all transfer classification values remain unchanged'
));

update public.expenses
set deleted_at = now(), deleted_reason = 'provider_removed'
where id = '60000000-0000-0000-0000-000000000034';

select pg_temp.capture_plaid_transfer_tap(lives_ok(
  $$select pg_temp.apply_empty_plaid_sync(
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    array[
      '40000000-0000-0000-0000-000000000001'::uuid,
      '40000000-0000-0000-0000-000000000002'::uuid
    ],
    '50000000-0000-0000-0000-000000000001'
  )$$,
  'a later sync can reset a no-longer-matched classification'
));
select pg_temp.capture_plaid_transfer_tap(is(
  (select jsonb_build_array(analytics_class, analytics_direction, analytics_spending_multiplier, analytics_counts_toward_income, classification_source, classification_review_state, classification_review_reason) from public.expenses where id = '60000000-0000-0000-0000-000000000033'),
  '["unknown", "out", 0, false, "plaid_pfc_v2", "needs_review", "unknown_provider_intent"]'::jsonb,
  'existing possible-transfer rows are reset and reclassified identically on a later sync'
));

select pg_temp.capture_plaid_transfer_tap(ok(
  not exists (
    select 1
    from pg_proc function_row
    cross join lateral aclexplode(coalesce(
      function_row.proacl,
      acldefault('f', function_row.proowner)
    )) privilege
    where function_row.oid =
      'public.apply_plaid_sync_batch_v1(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],uuid,uuid)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.apply_plaid_sync_batch_v1(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],uuid,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.apply_plaid_sync_batch_v1(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],uuid,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.apply_plaid_sync_batch_v1(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],uuid,uuid)',
    'EXECUTE'
  ),
  'v1 execution remains revoked from all direct caller roles'
));
select pg_temp.capture_plaid_transfer_tap(ok(
  has_function_privilege(
    'service_role',
    'public.apply_plaid_sync_batch_v2(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],jsonb,uuid[],jsonb,jsonb,boolean,boolean,uuid,uuid)',
    'EXECUTE'
  ),
  'v2 remains callable by the authorized service worker role'
));
select pg_temp.capture_plaid_transfer_tap(ok(
  not has_function_privilege(
    'anon',
    'public.apply_plaid_sync_batch_v2(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],jsonb,uuid[],jsonb,jsonb,boolean,boolean,uuid,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.apply_plaid_sync_batch_v2(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],jsonb,uuid[],jsonb,jsonb,boolean,boolean,uuid,uuid)',
    'EXECUTE'
  ),
  'v2 remains unavailable to direct anon and authenticated callers'
));

with tap_results as (
  select ordinality::bigint as assertion_number, result
  from jsonb_array_elements_text(
    current_setting('moneko.plaid_transfer_tap_results')::jsonb
  ) with ordinality as captured(result, ordinality)
), finish_output as (
  select finish as result from finish()
)
select assertion_number, result from tap_results
union all
select 2147483647::bigint as assertion_number, result from finish_output
order by assertion_number;

rollback;
