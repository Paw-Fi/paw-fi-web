-- Disposable verification for the household rows consumed by the mobile app.
-- Run only against a non-production database with the current migrations applied.
-- Every fixture row is rolled back at the end of this file.

begin;

create extension if not exists pgtap;

select plan(31);

select has_function(
  'public',
  'households_create_transaction_with_split_v1',
  array[
    'uuid', 'jsonb', 'uuid', 'uuid', 'uuid', 'text', 'text', 'bigint',
    'text', 'jsonb', 'uuid', 'boolean'
  ],
  'the atomic parent-and-split writer used by household saves is available'
);

select has_function(
  'public',
  'households_commit_expense_split_write_v3',
  array[
    'uuid', 'uuid', 'uuid', 'uuid', 'uuid', 'text', 'text', 'bigint',
    'text', 'jsonb', 'jsonb', 'uuid', 'uuid'
  ],
  'the atomic split writer used by household expense saves is available'
);

select has_function(
  'public',
  'households_get_pairwise_settlement_balances_v2',
  array['uuid', 'text'],
  'the pairwise settlement reader used by the household screen is available'
);

create function pg_temp.expected_parent_snapshot(p_expense_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'household_id', expense.household_id,
    'currency', upper(expense.currency),
    'amount_cents', expense.amount_cents,
    'split_group_id', expense.split_group_id,
    'account_id', expense.account_id
  )
  from public.expenses expense
  where expense.id = p_expense_id;
$$;

do $$
declare
  v_creator_id uuid := gen_random_uuid();
  v_payer_id uuid := gen_random_uuid();
  v_third_member_id uuid := gen_random_uuid();
  v_household_id uuid := gen_random_uuid();
  v_secondary_household_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_secondary_account_id uuid;
  v_equal_expense_id uuid := gen_random_uuid();
  v_percentage_expense_id uuid := gen_random_uuid();
  v_shares_expense_id uuid := gen_random_uuid();
  v_equal_group_id uuid := gen_random_uuid();
  v_percentage_group_id uuid := gen_random_uuid();
  v_shares_group_id uuid := gen_random_uuid();
  v_atomic_expense_id uuid := gen_random_uuid();
  v_atomic_group_id uuid := gen_random_uuid();
  v_rejected_expense_id uuid := gen_random_uuid();
  v_rejected_group_id uuid := gen_random_uuid();
  v_atomic_income_id uuid := gen_random_uuid();
  v_atomic_income_group_id uuid := gen_random_uuid();
  v_recurring_income_id uuid := gen_random_uuid();
  v_recurring_income_group_id uuid := gen_random_uuid();
  v_previous_role text;
begin
  perform set_config('test.household_verify_creator_id', v_creator_id::text, false);
  perform set_config('test.household_verify_payer_id', v_payer_id::text, false);
  perform set_config('test.household_verify_third_member_id', v_third_member_id::text, false);
  perform set_config('test.household_verify_household_id', v_household_id::text, false);
  perform set_config('test.household_verify_equal_group_id', v_equal_group_id::text, false);
  perform set_config('test.household_verify_percentage_group_id', v_percentage_group_id::text, false);
  perform set_config('test.household_verify_shares_group_id', v_shares_group_id::text, false);
  perform set_config('test.household_verify_atomic_expense_id', v_atomic_expense_id::text, false);
  perform set_config('test.household_verify_atomic_group_id', v_atomic_group_id::text, false);
  perform set_config('test.household_verify_rejected_expense_id', v_rejected_expense_id::text, false);
  perform set_config('test.household_verify_rejected_group_id', v_rejected_group_id::text, false);
  perform set_config('test.household_verify_atomic_income_id', v_atomic_income_id::text, false);
  perform set_config('test.household_verify_atomic_income_group_id', v_atomic_income_group_id::text, false);
  perform set_config('test.household_verify_recurring_income_id', v_recurring_income_id::text, false);
  perform set_config('test.household_verify_recurring_income_group_id', v_recurring_income_group_id::text, false);

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      v_creator_id, 'authenticated', 'authenticated',
      'household-verify-creator-' || v_creator_id::text || '@example.com',
      '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    ),
    (
      v_payer_id, 'authenticated', 'authenticated',
      'household-verify-payer-' || v_payer_id::text || '@example.com',
      '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    ),
    (
      v_third_member_id, 'authenticated', 'authenticated',
      'household-verify-third-' || v_third_member_id::text || '@example.com',
      '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    );

  insert into public.households (id, name, owner_id, currency)
  values
    (v_household_id, 'Disposable household split verification', v_creator_id, 'USD'),
    (v_secondary_household_id, 'Disposable income split verification', v_creator_id, 'USD');

  insert into public.household_members (household_id, user_id, role)
  values
    (v_household_id, v_creator_id, 'owner'),
    (v_household_id, v_payer_id, 'member'),
    (v_household_id, v_third_member_id, 'member'),
    (v_secondary_household_id, v_creator_id, 'owner'),
    (v_secondary_household_id, v_payer_id, 'member'),
    (v_secondary_household_id, v_third_member_id, 'member')
  on conflict (household_id, user_id) do update
  set role = excluded.role;

  v_account_id := public.ensure_spending_account_for_currency(
    v_creator_id,
    v_household_id,
    'USD'
  );
  v_secondary_account_id := public.ensure_spending_account_for_currency(
    v_creator_id,
    v_secondary_household_id,
    'USD'
  );

  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values
    (v_equal_expense_id, v_creator_id, v_household_id, v_account_id,
      current_date, 3000, 'USD', 'other', 'Equal split verification', 'expense'),
    (v_percentage_expense_id, v_creator_id, v_household_id, v_account_id,
      current_date, 10000, 'USD', 'other', 'Percentage split verification', 'expense'),
    (v_shares_expense_id, v_creator_id, v_household_id, v_account_id,
      current_date, 6000, 'USD', 'other', 'Shares split verification', 'expense');

  perform set_config('request.jwt.claim.sub', v_creator_id::text, false);
  v_previous_role := current_setting('request.jwt.claim.role', true);
  begin
    perform set_config('request.jwt.claim.role', 'service_role', false);

    perform public.households_commit_expense_split_write_v3(
      v_creator_id, v_equal_expense_id, v_equal_group_id, v_household_id,
      v_creator_id, 'equal', 'USD', 3000, 'Equal split verification',
      jsonb_build_array(
        jsonb_build_object('user_id', v_creator_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_payer_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_third_member_id, 'amount_cents', 1000)
      ),
      pg_temp.expected_parent_snapshot(v_equal_expense_id)
    );

    perform public.households_commit_expense_split_write_v3(
      v_creator_id, v_percentage_expense_id, v_percentage_group_id,
      v_household_id, v_payer_id, 'percentage', 'USD', 10000,
      'Percentage split verification',
      jsonb_build_array(
        jsonb_build_object('user_id', v_creator_id, 'amount_cents', 5000, 'percentage', 50),
        jsonb_build_object('user_id', v_payer_id, 'amount_cents', 3000, 'percentage', 30),
        jsonb_build_object('user_id', v_third_member_id, 'amount_cents', 2000, 'percentage', 20)
      ),
      pg_temp.expected_parent_snapshot(v_percentage_expense_id)
    );

    perform public.households_commit_expense_split_write_v3(
      v_creator_id, v_shares_expense_id, v_shares_group_id, v_household_id,
      v_creator_id, 'shares', 'USD', 6000, 'Shares split verification',
      jsonb_build_array(
        jsonb_build_object('user_id', v_creator_id, 'amount_cents', 1000, 'shares', 1),
        jsonb_build_object('user_id', v_payer_id, 'amount_cents', 2000, 'shares', 2),
        jsonb_build_object('user_id', v_third_member_id, 'amount_cents', 3000, 'shares', 3)
      ),
      pg_temp.expected_parent_snapshot(v_shares_expense_id)
    );

    perform public.households_create_transaction_with_split_v1(
      v_creator_id,
      jsonb_build_object(
        'id', v_atomic_expense_id,
        'user_id', v_creator_id,
        'household_id', v_household_id,
        'account_id', v_account_id,
        'date', current_date,
        'amount_cents', 3000,
        'currency', 'USD',
        'category', 'other',
        'raw_text', 'Atomic create verification',
        'type', 'expense'
      ),
      v_atomic_group_id, v_household_id, v_creator_id, 'equal', 'USD', 3000,
      'Atomic create verification',
      jsonb_build_array(
        jsonb_build_object('user_id', v_creator_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_payer_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_third_member_id, 'amount_cents', 1000)
      ),
      v_account_id,
      false
    );

    perform public.households_create_transaction_with_split_v1(
      v_creator_id,
      jsonb_build_object(
        'id', v_atomic_income_id, 'user_id', v_creator_id,
        'household_id', v_secondary_household_id,
        'account_id', v_secondary_account_id, 'date', current_date,
        'amount_cents', 3000, 'currency', 'USD', 'category', 'salary',
        'raw_text', 'Atomic income verification', 'type', 'income'
      ),
      v_atomic_income_group_id, v_secondary_household_id, v_creator_id,
      'equal', 'USD', 3000, 'Atomic income verification',
      jsonb_build_array(
        jsonb_build_object('user_id', v_creator_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_payer_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_third_member_id, 'amount_cents', 1000)
      ),
      v_secondary_account_id, false
    );

    perform public.households_create_transaction_with_split_v1(
      v_creator_id,
      jsonb_build_object(
        'id', v_recurring_income_id, 'user_id', v_creator_id,
        'household_id', v_secondary_household_id,
        'account_id', v_secondary_account_id, 'date', current_date,
        'amount_cents', 3000, 'currency', 'USD', 'category', 'salary',
        'raw_text', 'Recurring income template verification', 'type', 'income',
        'is_recurring', true,
        'recurrence_rule', jsonb_build_object('frequency', 'monthly')
      ),
      v_recurring_income_group_id, v_secondary_household_id, v_creator_id,
      'equal', 'USD', 3000, 'Recurring income template verification',
      jsonb_build_array(
        jsonb_build_object('user_id', v_creator_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_payer_id, 'amount_cents', 1000),
        jsonb_build_object('user_id', v_third_member_id, 'amount_cents', 1000)
      ),
      v_secondary_account_id, true
    );

    begin
      perform public.households_create_transaction_with_split_v1(
        v_creator_id,
        jsonb_build_object(
          'id', v_rejected_expense_id,
          'user_id', v_creator_id,
          'household_id', v_household_id,
          'account_id', v_account_id,
          'date', current_date,
          'amount_cents', 3000,
          'currency', 'USD',
          'category', 'other',
          'raw_text', 'Rejected atomic create verification',
          'type', 'expense'
        ),
        v_rejected_group_id, v_household_id, v_creator_id, 'amount', 'USD', 3000,
        'Rejected atomic create verification',
        jsonb_build_array(
          jsonb_build_object('user_id', v_creator_id, 'amount_cents', 1499),
          jsonb_build_object('user_id', v_payer_id, 'amount_cents', 1499)
        ),
        v_account_id,
        false
      );
      raise exception 'expected atomic create to reject incomplete allocation';
    exception when others then
      if sqlerrm = 'expected atomic create to reject incomplete allocation' then
        raise;
      end if;
    end;

    perform set_config('request.jwt.claim.role', coalesce(v_previous_role, ''), false);
  exception when others then
    perform set_config('request.jwt.claim.role', coalesce(v_previous_role, ''), false);
    raise;
  end;
end;
$$;

select ok(
  exists (
    select 1 from public.expenses
    where id = current_setting('test.household_verify_atomic_expense_id')::uuid
      and split_group_id = current_setting('test.household_verify_atomic_group_id')::uuid
  ),
  'atomic writer returns only a parent already linked to its split group'
);

select is(
  (select sum(amount_cents) from public.expense_split_lines
    where split_group_id = current_setting('test.household_verify_atomic_group_id')::uuid),
  3000::numeric,
  'atomic writer persists a complete split allocation with its parent'
);

select ok(
  (select privacy_scope::text = 'full'
      and owner_type::text = 'me'
      and attachments = '[]'::jsonb
      and acknowledged_by = '{}'::uuid[]
      and created_at is not null
      and updated_at is not null
      and analytics_class is not null
      and analytics_direction is not null
      and analytics_is_final is not null
      and analytics_spending_multiplier is not null
      and analytics_counts_toward_income is not null
      and exclude_from_analytics is false
    from public.expenses
    where id = current_setting('test.household_verify_atomic_expense_id')::uuid),
  'atomic creation preserves database defaults and analytics-required fields'
);

select ok(
  not exists (
    select 1 from public.expenses
    where id = current_setting('test.household_verify_rejected_expense_id')::uuid
  ),
  'rejected atomic split leaves no parent transaction behind'
);

select ok(
  not exists (
    select 1 from public.expense_split_groups
    where id = current_setting('test.household_verify_rejected_group_id')::uuid
  ),
  'rejected atomic split leaves no split group behind'
);

select ok(
  not exists (
    select 1 from public.expense_split_lines
    where split_group_id = current_setting('test.household_verify_rejected_group_id')::uuid
  ),
  'rejected atomic split leaves no split lines behind'
);

select ok(
  exists (
    select 1 from public.expenses
    where id = current_setting('test.household_verify_atomic_income_id')::uuid
      and type = 'income'
      and split_group_id =
        current_setting('test.household_verify_atomic_income_group_id')::uuid
  ),
  'atomic income creation links the income parent and live split'
);

select ok(
  exists (
    select 1 from public.expenses
    where id = current_setting('test.household_verify_recurring_income_id')::uuid
      and type = 'income'
      and is_recurring
      and split_group_id =
        current_setting('test.household_verify_recurring_income_group_id')::uuid
  ),
  'recurring income creation links the template parent and split'
);

select ok(
  not exists (
    select 1 from public.household_settlement_finalized_split_groups
    where split_group_id =
      current_setting('test.household_verify_recurring_income_group_id')::uuid
  ),
  'recurring template split is excluded from live settlement debt'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.households_create_transaction_with_split_v1(uuid,jsonb,uuid,uuid,uuid,text,text,bigint,text,jsonb,uuid,boolean)',
    'EXECUTE'
  ),
  'service role can execute the atomic creation RPC'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.households_create_transaction_with_split_v1(uuid,jsonb,uuid,uuid,uuid,text,text,bigint,text,jsonb,uuid,boolean)',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the service-only atomic creation RPC'
);

select is(
  (select split_type::text from public.expense_split_groups where id = current_setting('test.household_verify_equal_group_id')::uuid),
  'equal',
  'equal split retains its split type'
);

select is(
  (select count(*)::integer from public.expense_split_lines where split_group_id = current_setting('test.household_verify_equal_group_id')::uuid),
  3,
  'equal split stores one line for each household member'
);

select is(
  (select min(amount_cents) from public.expense_split_lines where split_group_id = current_setting('test.household_verify_equal_group_id')::uuid),
  1000::bigint,
  'equal split stores the expected per-member amount'
);

select is(
  (select sum(amount_cents) from public.expense_split_lines where split_group_id = current_setting('test.household_verify_equal_group_id')::uuid),
  3000::numeric,
  'equal split conserves the complete expense total in cents'
);

select ok(
  exists (
    select 1
    from public.household_settlement_finalized_split_groups
    where split_group_id = current_setting('test.household_verify_equal_group_id')::uuid
  ),
  'equal split is finalized before settlement readers can expose it'
);

select is(
  (select split_type::text from public.expense_split_groups where id = current_setting('test.household_verify_percentage_group_id')::uuid),
  'percentage',
  'percentage split retains its split type'
);

select is(
  (select sum(percentage) from public.expense_split_lines where split_group_id = current_setting('test.household_verify_percentage_group_id')::uuid),
  100::numeric,
  'percentage split stores a complete one-hundred-percent allocation'
);

select is(
  (select sum(amount_cents) from public.expense_split_lines where split_group_id = current_setting('test.household_verify_percentage_group_id')::uuid),
  10000::numeric,
  'percentage split stores the expected cent allocation'
);

select ok(
  (select expense.user_id from public.expenses expense where expense.id = (
    select expense_id from public.expense_split_groups where id = current_setting('test.household_verify_percentage_group_id')::uuid
  )) = current_setting('test.household_verify_creator_id')::uuid
  and (select payer_user_id from public.expense_split_groups where id = current_setting('test.household_verify_percentage_group_id')::uuid)
    = current_setting('test.household_verify_payer_id')::uuid,
  'transaction creator and selected payer are stored independently'
);

select is(
  (select split_type::text from public.expense_split_groups where id = current_setting('test.household_verify_shares_group_id')::uuid),
  'shares',
  'shares split retains its split type'
);

select is(
  (select sum(shares)::numeric from public.expense_split_lines where split_group_id = current_setting('test.household_verify_shares_group_id')::uuid),
  6::numeric,
  'shares split stores the expected share weights'
);

select is(
  (select sum(amount_cents) from public.expense_split_lines where split_group_id = current_setting('test.household_verify_shares_group_id')::uuid),
  6000::numeric,
  'shares split stores the expected $10/$20/$30 cent allocation'
);

select ok(
  not exists (
    select 1
    from public.expense_split_groups split_group
    join public.expenses expense on expense.id = split_group.expense_id
    where split_group.id in (
      current_setting('test.household_verify_equal_group_id')::uuid,
      current_setting('test.household_verify_percentage_group_id')::uuid,
      current_setting('test.household_verify_shares_group_id')::uuid
    )
      and expense.split_group_id is distinct from split_group.id
  ),
  'every verified split group is reciprocally linked to its transaction'
);

select is(
  (
    select net_cents
    from public.households_get_pairwise_settlement_balances_v2(
      current_setting('test.household_verify_household_id')::uuid,
      'USD'
    ) balance
    where other_user_id = current_setting('test.household_verify_payer_id')::uuid
  ),
  1000::bigint,
  'creator sees the expected net balance with the selected payer'
);

select is(
  (
    select net_cents
    from public.households_get_pairwise_settlement_balances_v2(
      current_setting('test.household_verify_household_id')::uuid,
      'USD'
    ) balance
    where other_user_id = current_setting('test.household_verify_third_member_id')::uuid
  ),
  -5000::bigint,
  'creator sees the expected net balance with the third member'
);

select set_config(
  'request.jwt.claim.sub',
  current_setting('test.household_verify_payer_id'),
  false
);
set local role authenticated;
select ok(
  exists (
    select 1 from public.expenses
    where id = current_setting('test.household_verify_atomic_expense_id')::uuid
  ),
  'a second household member can read a full-visibility atomic transaction'
);
reset role;

select set_config('request.jwt.claim.sub', gen_random_uuid()::text, false);
set local role authenticated;
select ok(
  not exists (
    select 1 from public.expenses
    where id = current_setting('test.household_verify_atomic_expense_id')::uuid
  ),
  'a non-member cannot read the household atomic transaction'
);
reset role;

select * from finish();

rollback;
