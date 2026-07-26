-- ISOLATED DATABASE ONLY.
--
-- Run this once against a disposable staging/test database before applying the
-- recurring-occurrence migrations. It deliberately creates legacy recurring
-- template debt and persists only test-support snapshots under
-- test_recurring_occurrence_migration. Do not run it against production.

begin;

create schema test_recurring_occurrence_migration;

create table test_recurring_occurrence_migration.snapshots (
  snapshot_key text primary key,
  payload jsonb not null
);

do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_member_id uuid := gen_random_uuid();
  v_household_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_full_expense_id uuid := gen_random_uuid();
  v_partial_expense_id uuid := gen_random_uuid();
  v_unsettled_expense_id uuid := gen_random_uuid();
  v_full_group_id uuid := gen_random_uuid();
  v_partial_group_id uuid := gen_random_uuid();
  v_unsettled_group_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      v_owner_id, 'authenticated', 'authenticated',
      'recurring-occurrence-owner@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    ),
    (
      v_member_id, 'authenticated', 'authenticated',
      'recurring-occurrence-member@example.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now()
    );

  insert into public.households (id, name, owner_id, currency)
  values (
    v_household_id,
    'Recurring occurrence migration fixture',
    v_owner_id,
    'USD'
  );

  insert into public.household_members (household_id, user_id, role)
  values (v_household_id, v_member_id, 'member');

  v_account_id := public.ensure_spending_account_for_currency(
    v_owner_id,
    v_household_id,
    'USD'
  );

  -- The dates deliberately order full, partial, then unsettled obligations so
  -- the existing authoritative settlement writer allocates in that order.
  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents, currency,
    category, raw_text, type, is_recurring, recurrence_rule
  ) values
    (
      v_full_expense_id, v_owner_id, v_household_id, v_account_id,
      current_date - 90, 3000, 'USD', 'other',
      'Legacy recurring fully settled', 'expense', true,
      jsonb_build_object('frequency', 'monthly', 'interval', 1,
        'anchor_date', (current_date - 90)::text)
    ),
    (
      v_partial_expense_id, v_owner_id, v_household_id, v_account_id,
      current_date - 60, 5000, 'USD', 'other',
      'Legacy recurring partially settled', 'expense', true,
      jsonb_build_object('frequency', 'monthly', 'interval', 1,
        'anchor_date', (current_date - 60)::text)
    ),
    (
      v_unsettled_expense_id, v_owner_id, v_household_id, v_account_id,
      current_date - 30, 7000, 'USD', 'other',
      'Legacy recurring unsettled', 'expense', true,
      jsonb_build_object('frequency', 'monthly', 'interval', 1,
        'anchor_date', (current_date - 30)::text)
    );

  insert into public.expense_split_groups (
    id, household_id, expense_id, payer_user_id, split_type, currency,
    total_amount_cents, description
  ) values
    (v_full_group_id, v_household_id, v_full_expense_id, v_owner_id,
      'amount', 'USD', 3000, 'Legacy recurring fully settled'),
    (v_partial_group_id, v_household_id, v_partial_expense_id, v_owner_id,
      'amount', 'USD', 5000, 'Legacy recurring partially settled'),
    (v_unsettled_group_id, v_household_id, v_unsettled_expense_id, v_owner_id,
      'amount', 'USD', 7000, 'Legacy recurring unsettled');

  insert into public.expense_split_lines (
    id, split_group_id, user_id, amount_cents, is_settled
  ) values
    (gen_random_uuid(), v_full_group_id, v_owner_id, 0, false),
    (gen_random_uuid(), v_full_group_id, v_member_id, 3000, false),
    (gen_random_uuid(), v_partial_group_id, v_owner_id, 0, false),
    (gen_random_uuid(), v_partial_group_id, v_member_id, 5000, false),
    (gen_random_uuid(), v_unsettled_group_id, v_owner_id, 0, false),
    (gen_random_uuid(), v_unsettled_group_id, v_member_id, 7000, false);

  -- Keep the denormalized parent link consistent with released split writers.
  perform set_config(
    'moneko.settlement_split_write_expense_id', v_full_expense_id::text, true
  );
  update public.expenses set split_group_id = v_full_group_id
  where id = v_full_expense_id;
  perform set_config(
    'moneko.settlement_split_write_expense_id', v_partial_expense_id::text, true
  );
  update public.expenses set split_group_id = v_partial_group_id
  where id = v_partial_expense_id;
  perform set_config(
    'moneko.settlement_split_write_expense_id',
    v_unsettled_expense_id::text,
    true
  );
  update public.expenses set split_group_id = v_unsettled_group_id
  where id = v_unsettled_expense_id;
  perform set_config('moneko.settlement_split_write_expense_id', '', true);

  -- Direct fixture inserts must publish the same durable completion marker as
  -- production split writers or settlement reads correctly fail closed.
  insert into public.household_settlement_finalized_split_groups (
    split_group_id,
    validation_profile
  ) values
    (v_full_group_id, 'strict_current'),
    (v_partial_group_id, 'strict_current'),
    (v_unsettled_group_id, 'strict_current');

  -- Existing production-compatible writer: settle the oldest group in full,
  -- then allocate only part of the next group. This produces real events and
  -- allocations instead of forging settled flags.
  perform set_config('request.jwt.claim.sub', v_member_id::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  if public.households_settle_amount_and_notify(
    v_household_id, v_owner_id, 'both', 3000, 'USD', 'Fixture full settlement'
  ) <> 1 then
    raise exception 'fixture_full_settlement_failed';
  end if;
  if public.households_settle_amount_and_notify(
    v_household_id, v_owner_id, 'both', 2000, 'USD', 'Fixture partial settlement'
  ) <> 1 then
    raise exception 'fixture_partial_settlement_failed';
  end if;

  if (
    select coalesce(sum(allocation.allocated_amount_cents), 0)
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.expense_id = v_full_expense_id
  ) <> 3000 then
    raise exception 'fixture_full_settlement_allocation_mismatch';
  end if;
  if (
    select coalesce(sum(allocation.allocated_amount_cents), 0)
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.expense_id = v_partial_expense_id
  ) <> 2000 then
    raise exception 'fixture_partial_settlement_allocation_mismatch';
  end if;
  if exists (
    select 1
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.expense_id = v_unsettled_expense_id
  ) then
    raise exception 'fixture_unsettled_group_has_allocation';
  end if;

  insert into test_recurring_occurrence_migration.snapshots (snapshot_key, payload)
  values (
    'fixture',
    jsonb_build_object(
      'household_id', v_household_id,
      'owner_id', v_owner_id,
      'member_id', v_member_id,
      'currency', 'USD',
      'group_ids', jsonb_build_array(
        v_full_group_id,
        v_partial_group_id,
        v_unsettled_group_id
      ),
      'template_ids', jsonb_build_array(
        v_full_expense_id,
        v_partial_expense_id,
        v_unsettled_expense_id
      ),
      'groups', jsonb_build_object(
        'full', v_full_group_id,
        'partial', v_partial_group_id,
        'unsettled', v_unsettled_group_id
      )
    )
  );
end;
$$;

insert into test_recurring_occurrence_migration.snapshots (snapshot_key, payload)
select
  'pairwise',
  coalesce(
    jsonb_agg(to_jsonb(balance) order by balance.other_user_id),
    '[]'::jsonb
  )
from public.households_get_pairwise_settlement_balances_v2(
  (
    select (payload ->> 'household_id')::uuid
    from test_recurring_occurrence_migration.snapshots
    where snapshot_key = 'fixture'
  ),
  'USD'
) balance;

insert into test_recurring_occurrence_migration.snapshots (snapshot_key, payload)
select
  'breakdown_totals',
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'direction', breakdown.direction,
        'total_amount_cents', breakdown.total_amount_cents,
        'remaining_amount_cents', breakdown.remaining_amount_cents
      )
      order by breakdown.direction, breakdown.total_amount_cents,
        breakdown.remaining_amount_cents
    ),
    '[]'::jsonb
  )
from public.households_get_settlement_breakdown_v2(
  (
    select (payload ->> 'household_id')::uuid
    from test_recurring_occurrence_migration.snapshots
    where snapshot_key = 'fixture'
  ),
  (
    select (payload ->> 'owner_id')::uuid
    from test_recurring_occurrence_migration.snapshots
    where snapshot_key = 'fixture'
  ),
  'USD'
) breakdown;

insert into test_recurring_occurrence_migration.snapshots (snapshot_key, payload)
select
  'ledger_lineage',
  jsonb_build_object(
    'groups', (
      select jsonb_agg(jsonb_build_object('id', split_group.id)
        order by split_group.id)
      from public.expense_split_groups split_group
      where split_group.id in (
        select jsonb_array_elements_text(payload -> 'group_ids')::uuid
        from test_recurring_occurrence_migration.snapshots
        where snapshot_key = 'fixture'
      )
    ),
    'lines', (
      select jsonb_agg(jsonb_build_object(
        'id', split_line.id,
        'split_group_id', split_line.split_group_id,
        'is_settled', split_line.is_settled,
        'settled_at', split_line.settled_at,
        'settlement_ledger_seq', split_line.settlement_ledger_seq
      ) order by split_line.id)
      from public.expense_split_lines split_line
      where split_line.split_group_id in (
        select jsonb_array_elements_text(payload -> 'group_ids')::uuid
        from test_recurring_occurrence_migration.snapshots
        where snapshot_key = 'fixture'
      )
    ),
    'allocations', (
      select jsonb_agg(jsonb_build_object(
        'id', allocation.id,
        'settlement_event_id', allocation.settlement_event_id,
        'split_group_id', allocation.split_group_id,
        'split_line_id', allocation.split_line_id,
        'allocated_amount_cents', allocation.allocated_amount_cents,
        'allocation_order', allocation.allocation_order
      ) order by allocation.id)
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.split_group_id in (
        select jsonb_array_elements_text(payload -> 'group_ids')::uuid
        from test_recurring_occurrence_migration.snapshots
        where snapshot_key = 'fixture'
      )
    ),
    'events', (
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'settlement_ledger_seq', event.settlement_ledger_seq,
        'amount_cents', event.amount_cents,
        'cleared_pair_balance', event.cleared_pair_balance
      ) order by event.id)
      from public.household_settlement_events event
      where event.id in (
        select allocation.settlement_event_id
        from public.household_settlement_event_allocations_v2 allocation
        where allocation.split_group_id in (
          select jsonb_array_elements_text(payload -> 'group_ids')::uuid
          from test_recurring_occurrence_migration.snapshots
          where snapshot_key = 'fixture'
        )
      )
    )
  );

do $$
begin
  if not exists (
    select 1
    from public.households_get_settlement_breakdown_v2(
      (
        select (payload ->> 'household_id')::uuid
        from test_recurring_occurrence_migration.snapshots
        where snapshot_key = 'fixture'
      ),
      (
        select (payload ->> 'owner_id')::uuid
        from test_recurring_occurrence_migration.snapshots
        where snapshot_key = 'fixture'
      ),
      'USD'
    ) breakdown
    where breakdown.expense_id in (
      select jsonb_array_elements_text(payload -> 'template_ids')::uuid
      from test_recurring_occurrence_migration.snapshots
      where snapshot_key = 'fixture'
    )
  ) then
    raise exception 'fixture_does_not_reproduce_live_recurring_template_debt';
  end if;
end;
$$;

commit;

select snapshot_key, payload
from test_recurring_occurrence_migration.snapshots
order by snapshot_key;
