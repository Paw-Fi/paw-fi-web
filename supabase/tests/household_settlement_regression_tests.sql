begin;

create extension if not exists pgtap;

select plan(16);

select has_function(
  'public',
  'households_get_pairwise_settlement_balances_v2',
  array['uuid', 'text'],
  'pairwise settlement RPC keeps its production signature'
);

select has_function(
  'public',
  'households_get_settlement_breakdown_v2',
  array['uuid', 'uuid', 'text'],
  'settlement breakdown RPC keeps its production signature'
);

select has_function(
  'public',
  'households_settle_all_debts_and_notify',
  array['uuid', 'uuid', 'text', 'integer', 'integer', 'text', 'text'],
  'legacy settle-all RPC keeps its production signature'
);

select is(
  (
    select permissive
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Deleted transactions are hidden'
  ),
  'RESTRICTIVE',
  'deleted expense visibility is enforced by a restrictive policy'
);

select is(
  (
    select permissive
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_split_groups'
      and policyname = 'Split groups require an active expense'
  ),
  'RESTRICTIVE',
  'deleted parent filtering cannot be bypassed for split groups'
);

select is(
  (
    select permissive
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_split_lines'
      and policyname = 'Split lines require an active expense'
  ),
  'RESTRICTIVE',
  'deleted parent filtering cannot be bypassed for split lines'
);

do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_member_id uuid := gen_random_uuid();
  v_household_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_deleted_expense_id uuid := gen_random_uuid();
  v_provider_removed_expense_id uuid := gen_random_uuid();
  v_settled_expense_id uuid := gen_random_uuid();
  v_new_expense_id uuid := gen_random_uuid();
begin
  perform set_config('test.settlement_owner_id', v_owner_id::text, false);
  perform set_config('test.settlement_member_id', v_member_id::text, false);
  perform set_config('test.settlement_household_id', v_household_id::text, false);
  perform set_config('test.deleted_expense_id', v_deleted_expense_id::text, false);
  perform set_config('test.provider_removed_expense_id', v_provider_removed_expense_id::text, false);
  perform set_config('test.settled_expense_id', v_settled_expense_id::text, false);
  perform set_config('test.new_expense_id', v_new_expense_id::text, false);

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      v_owner_id, 'authenticated', 'authenticated',
      'settlement-owner@example.com', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    ),
    (
      v_member_id, 'authenticated', 'authenticated',
      'settlement-member@example.com', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    );

  insert into public.households (id, name, owner_id, currency)
  values (v_household_id, 'Settlement regression household', v_owner_id, 'USD');

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_member_id, 'member')
  on conflict (household_id, user_id) do update
  set role = excluded.role;

  select account.id
  into strict v_account_id
  from public.accounts account
  where account.household_id = v_household_id
    and account.is_system = true
    and account.is_archived = false
    and lower(trim(account.name)) = 'spending';

  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values
    (
      v_deleted_expense_id, v_owner_id, v_household_id, v_account_id,
      current_date - 120, 10000, 'USD', 'other', 'Deleted expense', 'expense'
    ),
    (
      v_provider_removed_expense_id, v_owner_id, v_household_id, v_account_id,
      current_date - 90, 7000, 'USD', 'other', 'Provider removed', 'expense'
    ),
    (
      v_settled_expense_id, v_owner_id, v_household_id, v_account_id,
      current_date - 30, 5000, 'USD', 'other', 'Settled expense', 'expense'
    );

  insert into public.expense_split_groups (
    id, household_id, expense_id, payer_user_id, split_type,
    currency, total_amount_cents, description
  ) values
    (gen_random_uuid(), v_household_id, v_deleted_expense_id, v_owner_id,
      'equal', 'USD', 10000, 'Deleted expense'),
    (gen_random_uuid(), v_household_id, v_provider_removed_expense_id, v_owner_id,
      'equal', 'USD', 7000, 'Provider removed'),
    (gen_random_uuid(), v_household_id, v_settled_expense_id, v_owner_id,
      'equal', 'USD', 5000, 'Settled expense');

  insert into public.expense_split_lines (
    split_group_id, user_id, amount_cents, is_settled
  )
  select split_group.id, v_member_id, split_group.total_amount_cents, false
  from public.expense_split_groups split_group
  where split_group.expense_id in (
    v_deleted_expense_id,
    v_provider_removed_expense_id,
    v_settled_expense_id
  );

  update public.expenses
  set deleted_at = now(), deleted_reason = 'user_deleted'
  where id = v_deleted_expense_id;

  update public.expenses
  set deleted_at = now(), deleted_reason = 'provider_removed'
  where id = v_provider_removed_expense_id;

  set constraints cleanup_soft_deleted_expense_splits immediate;
end;
$$;

select ok(
  not exists (
    select 1
    from public.expense_split_groups
    where expense_id = current_setting('test.deleted_expense_id')::uuid
  ),
  'user-deleted expense split groups are removed'
);

select ok(
  exists (
    select 1
    from public.expense_split_groups
    where expense_id = current_setting('test.provider_removed_expense_id')::uuid
  ),
  'provider-removed expense split groups remain restorable'
);

select set_config(
  'request.jwt.claim.sub',
  current_setting('test.settlement_member_id'),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select coalesce(sum(balance.net_cents), 0)::bigint
    from public.households_get_pairwise_settlement_balances_v2(
      current_setting('test.settlement_household_id')::uuid,
      'USD'
    ) balance
  ),
  5000::bigint,
  'pairwise balance excludes both permanent and temporary tombstones'
);

select is(
  public.households_settle_all_debts_and_notify(
    current_setting('test.settlement_household_id')::uuid,
    current_setting('test.settlement_owner_id')::uuid,
    'both',
    5000,
    0,
    'USD',
    'Monthly settlement'
  ),
  1,
  'settle-all records the authoritative outstanding amount'
);

select is(
  (
    select allocation.expense_id
    from public.household_settlement_event_allocations_v2 allocation
    join public.household_settlement_events settlement
      on settlement.id = allocation.settlement_event_id
    where settlement.household_id =
      current_setting('test.settlement_household_id')::uuid
    order by settlement.created_at desc, allocation.allocation_order asc
    limit 1
  ),
  current_setting('test.settled_expense_id')::uuid,
  'settlement allocation ignores deleted provider transactions'
);

select is(
  (
    select coalesce(sum(balance.net_cents), 0)::bigint
    from public.households_get_pairwise_settlement_balances_v2(
      current_setting('test.settlement_household_id')::uuid,
      'USD'
    ) balance
  ),
  0::bigint,
  'settlement immediately resets the actor pairwise balance'
);

select is(
  (
    select count(*)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_household_id')::uuid,
      current_setting('test.settlement_owner_id')::uuid,
      'USD'
    )
  ),
  0::bigint,
  'breakdown is empty immediately after a full settlement'
);

reset role;

do $$
declare
  v_new_expense_id uuid := current_setting('test.new_expense_id')::uuid;
  v_split_group_id uuid := gen_random_uuid();
begin
  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values (
    v_new_expense_id,
    current_setting('test.settlement_owner_id')::uuid,
    current_setting('test.settlement_household_id')::uuid,
    (
      select id
      from public.accounts
      where household_id = current_setting('test.settlement_household_id')::uuid
        and currency = 'USD'
      limit 1
    ),
    current_date,
    2500,
    'USD',
    'other',
    'Post-settlement expense',
    'expense'
  );

  insert into public.expense_split_groups (
    id, household_id, expense_id, payer_user_id, split_type,
    currency, total_amount_cents, description
  ) values (
    v_split_group_id,
    current_setting('test.settlement_household_id')::uuid,
    v_new_expense_id,
    current_setting('test.settlement_owner_id')::uuid,
    'equal',
    'USD',
    2500,
    'Post-settlement expense'
  );

  insert into public.expense_split_lines (
    split_group_id, user_id, amount_cents, is_settled
  ) values (
    v_split_group_id,
    current_setting('test.settlement_member_id')::uuid,
    2500,
    false
  );
end;
$$;

select is(
  (
    select coalesce(sum(balance.net_cents), 0)::bigint
    from public.households_get_pairwise_settlement_balances_v2(
      current_setting('test.settlement_household_id')::uuid,
      'USD'
    ) balance
  ),
  2500::bigint,
  'new post-settlement activity starts a fresh balance'
);

select results_eq(
  format(
    $query$
      select expense_id
      from public.households_get_settlement_breakdown_v2(%L::uuid, %L::uuid, 'USD')
      where expense_id is not null
      order by expense_id
    $query$,
    current_setting('test.settlement_household_id'),
    current_setting('test.settlement_owner_id')
  ),
  format(
    'select %L::uuid',
    current_setting('test.new_expense_id')
  ),
  'breakdown contains only post-settlement transactions'
);

select ok(
  not exists (
    select 1
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_household_id')::uuid,
      current_setting('test.settlement_owner_id')::uuid,
      'USD'
    ) breakdown
    where breakdown.expense_id in (
      current_setting('test.deleted_expense_id')::uuid,
      current_setting('test.settled_expense_id')::uuid
    )
  ),
  'deleted and previously settled transactions never reappear in breakdown'
);

select * from finish();
rollback;
