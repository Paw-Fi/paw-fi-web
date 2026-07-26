-- ISOLATED DATABASE ONLY.
--
-- Run this after applying the new recurring-occurrence migrations to the same
-- disposable database used by recurring_occurrence_migration_preflight_fixture.sql.
-- It is read-only apart from the enclosing pgTAP transaction.

begin;

create extension if not exists pgtap;

select set_config(
  'request.jwt.claim.sub',
  (
    select payload ->> 'member_id'
    from test_recurring_occurrence_migration.snapshots
    where snapshot_key = 'fixture'
  ),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select plan(9);

select has_table(
  'public',
  'recurring_occurrences',
  'the recurring occurrence ledger exists after the migration'
);

select has_column(
  'public',
  'expenses',
  'scheduled_occurrence_date',
  'actual transactions retain scheduled occurrence identity'
);

select has_column(
  'public',
  'expense_split_groups',
  'is_recurring_template',
  'split groups distinguish future templates from live occurrence debt'
);

select is(
  (
    select coalesce(
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
    ) balance
  ),
  (
    select payload
    from test_recurring_occurrence_migration.snapshots
    where snapshot_key = 'pairwise'
  ),
  'pairwise balances are identical before and after recurring split migration'
);

select is(
  (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'direction', breakdown.direction,
          'total_amount_cents', breakdown.total_amount_cents,
          'remaining_amount_cents', breakdown.remaining_amount_cents
        ) order by breakdown.direction, breakdown.total_amount_cents,
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
    ) breakdown
  ),
  (
    select payload
    from test_recurring_occurrence_migration.snapshots
    where snapshot_key = 'breakdown_totals'
  ),
  'settlement breakdown totals are identical before and after migration'
);

select is(
  (
    select jsonb_build_object(
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
    )
  ),
  (
    select payload
    from test_recurring_occurrence_migration.snapshots
    where snapshot_key = 'ledger_lineage'
  ),
  'split-line, allocation, event, and ledger IDs remain traceable'
);

select is(
  (
    select count(*)::integer
    from public.recurring_occurrences occurrence
    where occurrence.recurring_id in (
      select jsonb_array_elements_text(payload -> 'template_ids')::uuid
      from test_recurring_occurrence_migration.snapshots
      where snapshot_key = 'fixture'
    )
      and occurrence.confirmation_source = 'legacy_migration'
      and occurrence.status = 'confirmed'
  ),
  3,
  'each legacy live recurring split group has one imported confirmed occurrence'
);

select is(
  (
    select count(*)::integer
    from public.expense_split_groups split_group
    join public.expenses actual on actual.id = split_group.expense_id
    join public.recurring_occurrences occurrence
      on occurrence.split_group_id = split_group.id
      and occurrence.actual_transaction_id = actual.id
      and occurrence.recurring_id = actual.parent_recurring_id
    where split_group.id in (
      select jsonb_array_elements_text(payload -> 'group_ids')::uuid
      from test_recurring_occurrence_migration.snapshots
      where snapshot_key = 'fixture'
    )
      and not split_group.is_recurring_template
      and not actual.is_recurring
      and actual.parent_recurring_id in (
        select jsonb_array_elements_text(payload -> 'template_ids')::uuid
        from test_recurring_occurrence_migration.snapshots
        where snapshot_key = 'fixture'
      )
      and occurrence.confirmation_source = 'legacy_migration'
  ),
  3,
  'each original live debt group is reparented to its imported actual'
);

select is(
  (
    select count(distinct template.id)::integer
    from public.expenses template
    join public.expense_split_groups split_group
      on split_group.expense_id = template.id
      and split_group.is_recurring_template
    where template.id in (
      select jsonb_array_elements_text(payload -> 'template_ids')::uuid
      from test_recurring_occurrence_migration.snapshots
      where snapshot_key = 'fixture'
    )
      and template.is_recurring
  ),
  3,
  'each recurring template retains a future split configuration group'
);

select * from finish();

rollback;
