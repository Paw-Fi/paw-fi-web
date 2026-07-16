-- Read-only production preflight for
-- 20260716143000_harden_settlement_cycles_and_breakdown.sql.
--
-- Run this against production before applying the migration.  The query uses
-- only schema that existed before the July 16 migration and performs no
-- writes.  Release gates:
--   * every unrecoverable_structure_counts row is zero;
--   * audited_cad_boundary has occurrence_count = 1;
--   * every unlinked_parent row is either safe_unique_relink,
--     safe_detached_personal_cleanup, safe_empty_unlinked_cleanup, or
--     investigated;
--   * every structural_problem_detail row is classified as a safe cleanup,
--     bounded legacy rounding, preserved legacy parent drift, or investigated;
--   * predicted_cutover carryovers are reviewed for plausibility.
--
-- When a gate fails, the forensic detail rows below intentionally expose the
-- exact stored facts and per-predicate checks needed to prepare a narrow,
-- evidence-based repair.  This script never changes production data.

begin transaction read only;

with
line_rollups as (
  select
    split_line.split_group_id,
    count(*)::bigint as line_count,
    count(distinct split_line.user_id)::bigint as distinct_user_count,
    bool_and(split_line.amount_cents is not null) as amounts_are_nonnull,
    bool_and(coalesce(split_line.amount_cents, -1) >= 0)
      as amounts_are_nonnegative,
    sum(split_line.amount_cents)::bigint as line_total_cents
  from public.expense_split_lines split_line
  group by split_line.split_group_id
),
line_details as (
  select
    split_line.split_group_id,
    count(*) filter (where split_line.is_settled is true)::bigint
      as settled_line_count,
    jsonb_agg(
      jsonb_build_object(
        'split_line_id', split_line.id,
        'user_id', split_line.user_id,
        'amount_cents', split_line.amount_cents,
        'percentage', split_line.percentage,
        'shares', split_line.shares,
        'is_settled', split_line.is_settled,
        'created_at', split_line.created_at
      )
      order by split_line.user_id, split_line.id
    ) as lines
  from public.expense_split_lines split_line
  group by split_line.split_group_id
),
group_allocation_rollups as (
  select
    allocation.split_group_id,
    count(*)::bigint as allocation_count,
    count(distinct allocation.settlement_event_id)::bigint as event_count,
    coalesce(sum(allocation.allocated_amount_cents), 0)::bigint
      as allocated_cents
  from public.household_settlement_event_allocations_v2 allocation
  group by allocation.split_group_id
),
expense_allocation_rollups as (
  select
    allocation.expense_id,
    count(*)::bigint as allocation_count,
    count(distinct allocation.settlement_event_id)::bigint as event_count,
    coalesce(sum(allocation.allocated_amount_cents), 0)::bigint
      as allocated_cents
  from public.household_settlement_event_allocations_v2 allocation
  group by allocation.expense_id
),
safely_discardable_detached_groups as (
  select
    expense.id as expense_id,
    split_group.id as split_group_id
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.expense_id = expense.id
  where expense.deleted_at is null
    and expense.split_group_id is null
    and expense.household_id is null
    and split_group.household_id is not null
    and not exists (
      select 1
      from public.expense_split_lines split_line
      where split_line.split_group_id = split_group.id
        and split_line.is_settled is true
    )
    and not exists (
      select 1
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.split_group_id = split_group.id
        or allocation.expense_id = expense.id
    )
),
safely_discardable_empty_unlinked_groups as (
  select
    expense.id as expense_id,
    split_group.id as split_group_id
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.expense_id = expense.id
  where expense.deleted_at is null
    and expense.split_group_id is null
    and not exists (
      select 1
      from public.expense_split_lines split_line
      where split_line.split_group_id = split_group.id
    )
    and not exists (
      select 1
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.split_group_id = split_group.id
        or allocation.expense_id = expense.id
    )
),
safely_discardable_groups as (
  select detached.expense_id, detached.split_group_id
  from safely_discardable_detached_groups detached
  union
  select empty_group.expense_id, empty_group.split_group_id
  from safely_discardable_empty_unlinked_groups empty_group
),
safely_repairable_group_totals as (
  select
    expense.id as expense_id,
    split_group.id as split_group_id,
    abs(expense.amount_cents)::bigint as repaired_total_amount_cents
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.expense_id = expense.id
  join line_rollups line_state
    on line_state.split_group_id = split_group.id
  where expense.deleted_at is null
    and expense.split_group_id = split_group.id
    and expense.household_id is not distinct from split_group.household_id
    and upper(expense.currency) = upper(split_group.currency)
    and abs(expense.amount_cents) is distinct from
      split_group.total_amount_cents
    and line_state.line_count > 0
    and line_state.line_count = line_state.distinct_user_count
    and line_state.amounts_are_nonnull
    and line_state.amounts_are_nonnegative
    and line_state.line_total_cents = abs(expense.amount_cents)
    and exists (
      select 1
      from public.expense_split_lines payer_line
      where payer_line.split_group_id = split_group.id
        and payer_line.user_id = split_group.payer_user_id
    )
    and not exists (
      select 1
      from public.expense_split_lines settled_line
      where settled_line.split_group_id = split_group.id
        and settled_line.is_settled is true
    )
    and not exists (
      select 1
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.split_group_id = split_group.id
        or allocation.expense_id = expense.id
    )
),
effective_group_totals as (
  select
    split_group.id as split_group_id,
    coalesce(
      repair.repaired_total_amount_cents,
      split_group.total_amount_cents
    )::bigint as total_amount_cents
  from public.expense_split_groups split_group
  left join safely_repairable_group_totals repair
    on repair.split_group_id = split_group.id
),
structurally_valid_unlinked_candidates as (
  select
    expense.id as expense_id,
    split_group.id as split_group_id
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.expense_id = expense.id
  join line_rollups line_state
    on line_state.split_group_id = split_group.id
  join effective_group_totals effective_total
    on effective_total.split_group_id = split_group.id
  where expense.deleted_at is null
    and expense.split_group_id is null
    and expense.household_id is not distinct from split_group.household_id
    and upper(expense.currency) = upper(split_group.currency)
    and abs(expense.amount_cents) = effective_total.total_amount_cents
    and line_state.line_count > 0
    and line_state.line_count = line_state.distinct_user_count
    and line_state.amounts_are_nonnull
    and line_state.amounts_are_nonnegative
    and abs(
      line_state.line_total_cents - effective_total.total_amount_cents
    ) <= greatest(line_state.line_count - 1, 0)
    and exists (
      select 1
      from public.expense_split_lines payer_line
      where payer_line.split_group_id = split_group.id
        and payer_line.user_id = split_group.payer_user_id
    )
),
unlinked_parents as (
  select
    expense.id as expense_id,
    expense.household_id,
    count(split_group.id)::bigint as total_group_count,
    count(candidate.split_group_id)::bigint as valid_candidate_count,
    coalesce(
      array_agg(split_group.id order by split_group.id)
        filter (where split_group.id is not null),
      array[]::uuid[]
    ) as all_group_ids,
    coalesce(
      array_agg(candidate.split_group_id order by candidate.split_group_id)
        filter (where candidate.split_group_id is not null),
      array[]::uuid[]
    ) as valid_candidate_ids
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.expense_id = expense.id
  left join structurally_valid_unlinked_candidates candidate
    on candidate.expense_id = expense.id
    and candidate.split_group_id = split_group.id
  where expense.deleted_at is null
    and expense.split_group_id is null
  group by expense.id, expense.household_id
),
group_diagnostics as (
  select
    expense.id as expense_id,
    expense.user_id as expense_user_id,
    expense.household_id as expense_household_id,
    expense.split_group_id as parent_split_group_id,
    upper(expense.currency) as expense_currency,
    expense.amount_cents as expense_amount_cents,
    expense.type::text as expense_type,
    expense.date as expense_date,
    expense.created_at as expense_created_at,
    expense.raw_text as expense_raw_text,
    split_group.id as split_group_id,
    split_group.household_id as group_household_id,
    split_group.payer_user_id,
    upper(split_group.currency) as group_currency,
    split_group.total_amount_cents as group_total_amount_cents,
    effective_total.total_amount_cents as effective_group_total_amount_cents,
    repair.split_group_id is not null as safe_group_total_metadata_repair,
    split_group.split_type::text as split_type,
    split_group.created_at as group_created_at,
    coalesce(line_state.line_count, 0)::bigint as line_count,
    coalesce(line_state.distinct_user_count, 0)::bigint
      as distinct_user_count,
    coalesce(line_state.amounts_are_nonnull, false)
      as amounts_are_nonnull,
    coalesce(line_state.amounts_are_nonnegative, false)
      as amounts_are_nonnegative,
    line_state.line_total_cents,
    greatest(coalesce(line_state.line_count, 0) - 1, 0)::bigint
      as legacy_rounding_tolerance_cents,
    coalesce(line_detail.settled_line_count, 0)::bigint
      as settled_line_count,
    coalesce(line_detail.lines, '[]'::jsonb) as lines,
    exists (
      select 1
      from public.expense_split_lines payer_line
      where payer_line.split_group_id = split_group.id
        and payer_line.user_id = split_group.payer_user_id
    ) as has_payer_line,
    coalesce(group_allocations.allocation_count, 0)::bigint
      as group_allocation_count,
    coalesce(group_allocations.event_count, 0)::bigint
      as group_allocation_event_count,
    coalesce(group_allocations.allocated_cents, 0)::bigint
      as group_allocated_cents,
    coalesce(expense_allocations.allocation_count, 0)::bigint
      as expense_allocation_count,
    coalesce(expense_allocations.event_count, 0)::bigint
      as expense_allocation_event_count,
    coalesce(expense_allocations.allocated_cents, 0)::bigint
      as expense_allocated_cents
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.expense_id = expense.id
  join effective_group_totals effective_total
    on effective_total.split_group_id = split_group.id
  left join safely_repairable_group_totals repair
    on repair.split_group_id = split_group.id
  left join line_rollups line_state
    on line_state.split_group_id = split_group.id
  left join line_details line_detail
    on line_detail.split_group_id = split_group.id
  left join group_allocation_rollups group_allocations
    on group_allocations.split_group_id = split_group.id
  left join expense_allocation_rollups expense_allocations
    on expense_allocations.expense_id = expense.id
  where expense.deleted_at is null
),
structural_problem_groups as (
  select
    diagnostic.*,
    case
      when exists (
        select 1
        from safely_discardable_empty_unlinked_groups empty_group
        where empty_group.expense_id = diagnostic.expense_id
          and empty_group.split_group_id = diagnostic.split_group_id
      )
        then 'empty_unlinked_group_cleanup'
      when exists (
        select 1
        from safely_discardable_groups discardable
        where discardable.expense_id = diagnostic.expense_id
          and discardable.split_group_id = diagnostic.split_group_id
      )
        then 'detached_personal_orphan_candidate'
      when diagnostic.parent_split_group_id is null
        and exists (
          select 1
          from structurally_valid_unlinked_candidates candidate
          where candidate.expense_id = diagnostic.expense_id
            and candidate.split_group_id = diagnostic.split_group_id
        )
        and (
          select count(*)
          from structurally_valid_unlinked_candidates candidate
          where candidate.expense_id = diagnostic.expense_id
        ) = 1
        then 'safe_unique_relink_candidate'
      when diagnostic.safe_group_total_metadata_repair
        then 'safe_group_total_metadata_repair'
      when diagnostic.parent_split_group_id = diagnostic.split_group_id
        and diagnostic.line_count > 0
        and diagnostic.line_count = diagnostic.distinct_user_count
        and diagnostic.amounts_are_nonnull
        and diagnostic.amounts_are_nonnegative
        and abs(
          diagnostic.line_total_cents
            - diagnostic.effective_group_total_amount_cents
        ) <= diagnostic.legacy_rounding_tolerance_cents
        and diagnostic.has_payer_line
        and (
          diagnostic.expense_household_id is distinct from
            diagnostic.group_household_id
          or diagnostic.expense_currency is distinct from
            diagnostic.group_currency
          or abs(diagnostic.expense_amount_cents) is distinct from
            diagnostic.effective_group_total_amount_cents
        )
        then 'legacy_parent_drift_preserve_split_ledger'
      when diagnostic.parent_split_group_id = diagnostic.split_group_id
        and diagnostic.line_count > 0
        and diagnostic.line_count = diagnostic.distinct_user_count
        and diagnostic.amounts_are_nonnull
        and diagnostic.amounts_are_nonnegative
        and abs(
          diagnostic.line_total_cents
            - diagnostic.effective_group_total_amount_cents
        ) <= diagnostic.legacy_rounding_tolerance_cents
        and diagnostic.has_payer_line
        then 'bounded_legacy_rounding'
      else 'requires_investigation'
    end as forensic_classification
  from group_diagnostics diagnostic
  where diagnostic.parent_split_group_id is distinct from
        diagnostic.split_group_id
    or diagnostic.expense_household_id is distinct from
        diagnostic.group_household_id
    or diagnostic.expense_currency is distinct from diagnostic.group_currency
    or abs(diagnostic.expense_amount_cents) is distinct from
        diagnostic.effective_group_total_amount_cents
    or diagnostic.line_count = 0
    or diagnostic.line_count <> diagnostic.distinct_user_count
    or not diagnostic.amounts_are_nonnull
    or not diagnostic.amounts_are_nonnegative
    or diagnostic.line_total_cents is distinct from
        diagnostic.effective_group_total_amount_cents
    or not diagnostic.has_payer_line
    or diagnostic.safe_group_total_metadata_repair
),
safe_relinks as (
  select
    unlinked.expense_id,
    unlinked.valid_candidate_ids[1] as split_group_id
  from unlinked_parents unlinked
  where unlinked.valid_candidate_count = 1
),
effective_expenses as (
  select
    expense.*,
    case
      when expense.split_group_id is null then repair.split_group_id
      else expense.split_group_id
    end as effective_split_group_id
  from public.expenses expense
  left join safe_relinks repair
    on repair.expense_id = expense.id
  where expense.deleted_at is null
),
finalizable_groups as (
  select
    split_group.id,
    split_group.expense_id,
    split_group.household_id,
    split_group.payer_user_id,
    upper(split_group.currency) as currency,
    effective_total.total_amount_cents
  from public.expense_split_groups split_group
  join effective_expenses expense
    on expense.id = split_group.expense_id
    and expense.effective_split_group_id = split_group.id
  join effective_group_totals effective_total
    on effective_total.split_group_id = split_group.id
  join line_rollups line_state
    on line_state.split_group_id = split_group.id
  where line_state.line_count > 0
    and line_state.line_count = line_state.distinct_user_count
    and line_state.amounts_are_nonnull
    and line_state.amounts_are_nonnegative
    and abs(
      line_state.line_total_cents - effective_total.total_amount_cents
    ) <= greatest(line_state.line_count - 1, 0)
    and exists (
      select 1
      from public.expense_split_lines payer_line
      where payer_line.split_group_id = split_group.id
        and payer_line.user_id = split_group.payer_user_id
    )
    and not exists (
      select 1
      from safely_discardable_groups discardable
      where discardable.split_group_id = split_group.id
    )
),
historical_participant_sets as (
  select
    split_line.split_group_id,
    array_agg(split_line.user_id order by split_line.user_id) as user_ids
  from public.expense_split_lines split_line
  group by split_line.split_group_id
),
current_member_sets as (
  select
    membership.household_id,
    array_agg(membership.user_id order by membership.user_id) as user_ids
  from public.household_members membership
  group by membership.household_id
),
membership_drift_groups as (
  select
    split_group.id as split_group_id,
    split_group.expense_id,
    split_group.household_id,
    split_group.payer_user_id,
    historical.user_ids as historical_participant_ids,
    coalesce(current_members.user_ids, array[]::uuid[])
      as current_member_ids
  from finalizable_groups split_group
  join historical_participant_sets historical
    on historical.split_group_id = split_group.id
  left join current_member_sets current_members
    on current_members.household_id = split_group.household_id
  where historical.user_ids is distinct from
    coalesce(current_members.user_ids, array[]::uuid[])
),
unrecoverable_counts as (
  select
    'ambiguous_unlinked_parents'::text as category,
    count(*)::bigint as occurrence_count
  from unlinked_parents unlinked
  where unlinked.valid_candidate_count <> 1
    and unlinked.total_group_count > 1
    and exists (
      select 1
      from unnest(unlinked.all_group_ids) group_id
      where not exists (
        select 1
        from safely_discardable_groups discardable
        where discardable.split_group_id = group_id
      )
    )

  union all

  select
    'unrelinked_parents',
    count(*)::bigint
  from unlinked_parents unlinked
  where unlinked.valid_candidate_count <> 1
    and exists (
      select 1
      from unnest(unlinked.all_group_ids) group_id
      where not exists (
        select 1
        from safely_discardable_groups discardable
        where discardable.split_group_id = group_id
      )
    )

  union all

  select
    'missing_parent_groups',
    count(*)::bigint
  from effective_expenses expense
  left join public.expense_split_groups split_group
    on split_group.id = expense.effective_split_group_id
  where expense.effective_split_group_id is not null
    and split_group.id is null

  union all

  select
    'parent_group_mismatches',
    count(*)::bigint
  from effective_expenses expense
  join public.expense_split_groups split_group
    on split_group.id = expense.effective_split_group_id
  where split_group.expense_id is distinct from expense.id

  union all

  select
    'nonreciprocal_links',
    count(*)::bigint
  from public.expense_split_groups split_group
  join effective_expenses expense
    on expense.id = split_group.expense_id
  where expense.effective_split_group_id is distinct from split_group.id
    and not exists (
      select 1
      from safely_discardable_groups discardable
      where discardable.split_group_id = split_group.id
    )

  union all

  select
    'scope_or_amount_mismatches',
    count(*)::bigint
  from public.expense_split_groups split_group
  join effective_expenses expense
    on expense.id = split_group.expense_id
  join effective_group_totals effective_total
    on effective_total.split_group_id = split_group.id
  where (
      expense.household_id is distinct from split_group.household_id
      or upper(expense.currency) is distinct from upper(split_group.currency)
      or abs(expense.amount_cents) is distinct from
        effective_total.total_amount_cents
    )
    and not exists (
      select 1
      from safely_discardable_groups discardable
      where discardable.split_group_id = split_group.id
    )
    and not exists (
      select 1
      from finalizable_groups finalizable
      where finalizable.id = split_group.id
    )

  union all

  select
    'invalid_line_sets',
    count(*)::bigint
  from public.expense_split_groups split_group
  join effective_expenses expense
    on expense.id = split_group.expense_id
  left join line_rollups line_state
    on line_state.split_group_id = split_group.id
  join effective_group_totals effective_total
    on effective_total.split_group_id = split_group.id
  where (
      coalesce(line_state.line_count, 0) = 0
      or line_state.line_count <> line_state.distinct_user_count
      or not coalesce(line_state.amounts_are_nonnull, false)
      or not coalesce(line_state.amounts_are_nonnegative, false)
      or abs(
        line_state.line_total_cents - effective_total.total_amount_cents
      ) > greatest(coalesce(line_state.line_count, 0) - 1, 0)
    )
    and not exists (
      select 1
      from safely_discardable_groups discardable
      where discardable.split_group_id = split_group.id
    )

  union all

  select
    'missing_payer_lines',
    count(*)::bigint
  from public.expense_split_groups split_group
  join effective_expenses expense
    on expense.id = split_group.expense_id
  where not exists (
    select 1
    from public.expense_split_lines payer_line
    where payer_line.split_group_id = split_group.id
      and payer_line.user_id = split_group.payer_user_id
  )
    and not exists (
      select 1
      from safely_discardable_groups discardable
      where discardable.split_group_id = split_group.id
    )
),
audited_matches as (
  select event.id
  from public.household_settlement_events event
  where event.id = '99bc3df9-8398-40e4-ac71-d308522ea412'::uuid
    and event.household_id =
      'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
    and event.actor_user_id =
      '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
    and event.payer_user_id =
      '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
    and event.participant_user_id =
      '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
    and upper(event.currency) = 'CAD'
    and event.amount_cents = 10000
    and event.mode = 'both'
    and event.created_at =
      '2026-07-16 00:53:13.425699+00'::timestamptz
    and exists (
      select 1
      from public.household_settlement_event_allocation_status_v2 status
      where status.settlement_event_id = event.id
        and status.allocated_total_cents = 10000
    )
    and (
      select coalesce(sum(allocation.allocated_amount_cents), 0)
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.settlement_event_id = event.id
    ) = 10000
),
audited_event_facts as (
  select
    event.id,
    event.household_id,
    event.actor_user_id,
    event.payer_user_id,
    event.participant_user_id,
    event.currency,
    event.amount_cents,
    event.mode,
    event.is_express_netting,
    event.settlement_note,
    event.created_at,
    status.allocated_total_cents as status_allocated_total_cents,
    status.allocation_source as status_allocation_source,
    status.processed_at as status_processed_at,
    coalesce(allocation_state.allocation_count, 0)::bigint
      as allocation_count,
    coalesce(allocation_state.allocated_cents, 0)::bigint
      as allocated_cents
  from public.household_settlement_events event
  left join public.household_settlement_event_allocation_status_v2 status
    on status.settlement_event_id = event.id
  left join lateral (
    select
      count(*)::bigint as allocation_count,
      coalesce(sum(allocation.allocated_amount_cents), 0)::bigint
        as allocated_cents
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.settlement_event_id = event.id
  ) allocation_state on true
  where event.id = '99bc3df9-8398-40e4-ac71-d308522ea412'::uuid
    or (
      event.household_id =
        'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
      and upper(event.currency) = 'CAD'
      and (
        (
          event.payer_user_id =
            '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
          and event.participant_user_id =
            '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
        )
        or (
          event.payer_user_id =
            '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
          and event.participant_user_id =
            '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
        )
      )
    )
    or (
      event.created_at >=
        '2026-07-15 00:53:13.425699+00'::timestamptz
      and event.created_at <
        '2026-07-17 00:53:13.425699+00'::timestamptz
      and (
        event.household_id =
          'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
        or event.actor_user_id =
          '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
        or event.payer_user_id =
          '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
        or event.participant_user_id =
          '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
      )
    )
),
audited_post_boundary_rows as (
  select
    expense.id as expense_id,
    split_group.id as split_group_id,
    split_line.id as split_line_id,
    split_group.payer_user_id,
    split_line.user_id as participant_user_id,
    upper(split_group.currency) as currency,
    split_line.amount_cents,
    split_line.is_settled,
    expense.date as expense_date,
    expense.raw_text,
    expense.created_at as expense_created_at,
    split_line.created_at as split_line_created_at
  from public.expense_split_groups split_group
  join public.expense_split_lines split_line
    on split_line.split_group_id = split_group.id
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  where split_group.household_id =
      'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
    and upper(split_group.currency) = 'CAD'
    and split_group.payer_user_id <> split_line.user_id
    and (
      (
        split_group.payer_user_id =
          '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
        and split_line.user_id =
          '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
      )
      or (
        split_group.payer_user_id =
          '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
        and split_line.user_id =
          '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
      )
    )
    and split_line.created_at >
      '2026-07-16 00:53:13.425699+00'::timestamptz
),
legacy_activity as (
  select
    'line'::text as kind,
    split_line.id,
    coalesce(split_line.created_at, '-infinity'::timestamptz)
      as occurred_at,
    0 as kind_order
  from public.expense_split_lines split_line

  union all

  select
    'event',
    event.id,
    coalesce(event.created_at, '-infinity'::timestamptz),
    1
  from public.household_settlement_events event
),
sequenced_activity as (
  select
    activity.kind,
    activity.id,
    row_number() over (
      order by activity.occurred_at, activity.kind_order, activity.id
    )::bigint as legacy_ordinal
  from legacy_activity activity
),
sequenced_events as (
  select
    event.*,
    sequence.legacy_ordinal,
    case
      when event.payer_user_id::text < event.participant_user_id::text
        then event.payer_user_id
      else event.participant_user_id
    end as user_a_id,
    case
      when event.payer_user_id::text < event.participant_user_id::text
        then event.participant_user_id
      else event.payer_user_id
    end as user_b_id
  from public.household_settlement_events event
  join sequenced_activity sequence
    on sequence.kind = 'event'
    and sequence.id = event.id
),
latest_ambiguous as (
  select distinct on (
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency)
  )
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency) as currency,
    event.id as ambiguous_event_id,
    event.legacy_ordinal as ambiguous_event_ordinal
  from sequenced_events event
  where not exists (
    select 1
    from audited_matches audited
    where audited.id = event.id
  )
  order by
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency),
    event.legacy_ordinal desc,
    event.id desc
),
latest_full as (
  select distinct on (
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency)
  )
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency) as currency,
    event.id as full_event_id,
    event.legacy_ordinal as full_event_ordinal
  from sequenced_events event
  join audited_matches audited
    on audited.id = event.id
  order by
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency),
    event.legacy_ordinal desc,
    event.id desc
),
pair_line_deltas as (
  select
    split_group.household_id,
    case
      when split_group.payer_user_id::text < split_line.user_id::text
        then split_group.payer_user_id
      else split_line.user_id
    end as user_a_id,
    case
      when split_group.payer_user_id::text < split_line.user_id::text
        then split_line.user_id
      else split_group.payer_user_id
    end as user_b_id,
    upper(split_group.currency) as currency,
    case
      when split_group.payer_user_id::text > split_line.user_id::text
        then abs(split_line.amount_cents)
      else -abs(split_line.amount_cents)
    end::bigint as signed_cents,
    abs(split_line.amount_cents)::bigint as absolute_cents,
    split_line.created_at as occurred_at
  from finalizable_groups split_group
  join public.expense_split_lines split_line
    on split_line.split_group_id = split_group.id
  where split_line.is_settled is false
    and split_line.amount_cents is not null
    and split_group.payer_user_id <> split_line.user_id
),
pair_event_deltas as (
  select
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency) as currency,
    case
      when event.payer_user_id = event.user_a_id
        then abs(event.amount_cents)
      else -abs(event.amount_cents)
    end::bigint as signed_cents,
    abs(event.amount_cents)::bigint as absolute_cents,
    event.created_at as occurred_at
  from sequenced_events event
),
pair_carryovers as (
  select
    delta.household_id,
    delta.user_a_id,
    delta.user_b_id,
    delta.currency,
    sum(delta.signed_cents)::bigint as carryover_net_user_a_cents,
    coalesce(sum(delta.signed_cents) filter (where delta.kind = 'line'), 0)
      ::bigint as active_line_net_user_a_cents,
    coalesce(sum(delta.signed_cents) filter (where delta.kind = 'event'), 0)
      ::bigint as settlement_event_net_user_a_cents,
    count(*) filter (where delta.kind = 'line')::bigint
      as active_pair_line_count,
    count(*) filter (where delta.kind = 'event')::bigint
      as settlement_event_count,
    max(delta.absolute_cents) filter (where delta.kind = 'line')::bigint
      as maximum_active_line_cents,
    round(avg(delta.absolute_cents) filter (where delta.kind = 'line'), 2)
      as average_active_line_cents,
    min(delta.occurred_at) filter (where delta.kind = 'line')
      as earliest_active_line_created_at,
    max(delta.occurred_at) filter (where delta.kind = 'line')
      as latest_active_line_created_at
  from (
    select
      line_delta.*,
      'line'::text as kind
    from pair_line_deltas line_delta
    union all
    select
      event_delta.*,
      'event'::text as kind
    from pair_event_deltas event_delta
  ) delta
  group by
    delta.household_id,
    delta.user_a_id,
    delta.user_b_id,
    delta.currency
),
predicted_cutovers as (
  select
    ambiguous.household_id,
    ambiguous.user_a_id,
    ambiguous.user_b_id,
    ambiguous.currency,
    ambiguous.ambiguous_event_id,
    ambiguous.ambiguous_event_ordinal,
    full_event.full_event_id,
    full_event.full_event_ordinal,
    coalesce(carryover.carryover_net_user_a_cents, 0)::bigint
      as carryover_net_user_a_cents,
    coalesce(carryover.active_line_net_user_a_cents, 0)::bigint
      as active_line_net_user_a_cents,
    coalesce(carryover.settlement_event_net_user_a_cents, 0)::bigint
      as settlement_event_net_user_a_cents,
    coalesce(carryover.active_pair_line_count, 0)::bigint
      as active_pair_line_count,
    coalesce(carryover.settlement_event_count, 0)::bigint
      as settlement_event_count,
    carryover.maximum_active_line_cents,
    carryover.average_active_line_cents,
    carryover.earliest_active_line_created_at,
    carryover.latest_active_line_created_at
  from latest_ambiguous ambiguous
  left join latest_full full_event
    on full_event.household_id = ambiguous.household_id
    and full_event.user_a_id = ambiguous.user_a_id
    and full_event.user_b_id = ambiguous.user_b_id
    and full_event.currency = ambiguous.currency
  left join pair_carryovers carryover
    on carryover.household_id = ambiguous.household_id
    and carryover.user_a_id = ambiguous.user_a_id
    and carryover.user_b_id = ambiguous.user_b_id
    and carryover.currency = ambiguous.currency
  where full_event.full_event_ordinal is null
    or ambiguous.ambiguous_event_ordinal > full_event.full_event_ordinal
),
report as (
  select
    'membership_drift_summary'::text as report_section,
    'structurally_valid_and_safe_to_finalize'::text as category,
    null::uuid as household_id,
    null::text as entity_id,
    count(*)::bigint as occurrence_count,
    jsonb_build_object(
      'meaning',
      'Historical participants differ from current household membership; no rewrite is required.'
    ) as details
  from membership_drift_groups

  union all

  select
    'membership_drift_detail',
    'structurally_valid_and_safe_to_finalize',
    drift.household_id,
    drift.split_group_id::text,
    1::bigint,
    jsonb_build_object(
      'expense_id', drift.expense_id,
      'payer_user_id', drift.payer_user_id,
      'historical_participant_ids', drift.historical_participant_ids,
      'current_member_ids', drift.current_member_ids
    )
  from membership_drift_groups drift

  union all

  select
    'unlinked_parent_detail',
    case
      when not exists (
        select 1
        from unnest(unlinked.all_group_ids) group_id
        where not exists (
          select 1
          from safely_discardable_empty_unlinked_groups empty_group
          where empty_group.split_group_id = group_id
        )
      ) then 'safe_empty_unlinked_cleanup'
      when not exists (
        select 1
        from unnest(unlinked.all_group_ids) group_id
        where not exists (
          select 1
          from safely_discardable_detached_groups discardable
          where discardable.split_group_id = group_id
        )
      ) then 'safe_detached_personal_cleanup'
      when unlinked.valid_candidate_count = 1 then 'safe_unique_relink'
      when unlinked.valid_candidate_count > 1
        then 'ambiguous_multiple_valid_groups'
      else 'unrecoverable_no_valid_group'
    end,
    unlinked.household_id,
    unlinked.expense_id::text,
    1::bigint,
    jsonb_build_object(
      'total_group_count', unlinked.total_group_count,
      'valid_candidate_count', unlinked.valid_candidate_count,
      'all_group_ids', unlinked.all_group_ids,
      'valid_candidate_ids', unlinked.valid_candidate_ids
    )
  from unlinked_parents unlinked

  union all

  select
    'structural_compatibility_summary',
    problem.forensic_classification,
    null::uuid,
    null::text,
    count(*)::bigint,
    jsonb_build_object(
      'release_gate_passed',
        problem.forensic_classification <> 'requires_investigation',
      'meaning', case problem.forensic_classification
        when 'bounded_legacy_rounding'
          then 'Native participant amounts are preserved within the historical per-line rounding bound.'
        when 'legacy_parent_drift_preserve_split_ledger'
          then 'The split group remains the frozen settlement ledger while the parent remains the current transaction record.'
        when 'safe_group_total_metadata_repair'
          then 'Parent and line total agree; only the stale group total is repaired.'
        when 'safe_unique_relink_candidate'
          then 'Exactly one complete reciprocal group can be relinked.'
        when 'detached_personal_orphan_candidate'
          then 'The unreachable personal-scope orphan has no settlement audit and can be deleted.'
        when 'empty_unlinked_group_cleanup'
          then 'The interrupted group has no lines or settlement audit and can be deleted.'
        else 'Manual investigation is required before deployment.'
      end
    )
  from structural_problem_groups problem
  group by problem.forensic_classification

  union all

  select
    'structural_problem_detail',
    problem.forensic_classification,
    problem.group_household_id,
    problem.split_group_id::text,
    1::bigint,
    jsonb_build_object(
      'expense_id', problem.expense_id,
      'expense_user_id', problem.expense_user_id,
      'expense_household_id', problem.expense_household_id,
      'parent_split_group_id', problem.parent_split_group_id,
      'expense_currency', problem.expense_currency,
      'expense_amount_cents', problem.expense_amount_cents,
      'expense_type', problem.expense_type,
      'expense_date', problem.expense_date,
      'expense_created_at', problem.expense_created_at,
      'expense_raw_text', problem.expense_raw_text,
      'group_household_id', problem.group_household_id,
      'payer_user_id', problem.payer_user_id,
      'group_currency', problem.group_currency,
      'group_total_amount_cents', problem.group_total_amount_cents,
      'effective_group_total_amount_cents',
        problem.effective_group_total_amount_cents,
      'safe_group_total_metadata_repair',
        problem.safe_group_total_metadata_repair,
      'split_type', problem.split_type,
      'group_created_at', problem.group_created_at,
      'line_count', problem.line_count,
      'distinct_user_count', problem.distinct_user_count,
      'amounts_are_nonnull', problem.amounts_are_nonnull,
      'amounts_are_nonnegative', problem.amounts_are_nonnegative,
      'line_total_cents', problem.line_total_cents,
      'legacy_rounding_tolerance_cents',
        problem.legacy_rounding_tolerance_cents,
      'settled_line_count', problem.settled_line_count,
      'has_payer_line', problem.has_payer_line,
      'group_allocation_count', problem.group_allocation_count,
      'group_allocation_event_count',
        problem.group_allocation_event_count,
      'group_allocated_cents', problem.group_allocated_cents,
      'expense_allocation_count', problem.expense_allocation_count,
      'expense_allocation_event_count',
        problem.expense_allocation_event_count,
      'expense_allocated_cents', problem.expense_allocated_cents,
      'lines', problem.lines
    )
  from structural_problem_groups problem

  union all

  select
    'unrecoverable_structure_counts',
    errors.category,
    null::uuid,
    null::text,
    errors.occurrence_count,
    jsonb_build_object(
      'release_gate_passed', errors.occurrence_count = 0
    )
  from unrecoverable_counts errors

  union all

  select
    'predicted_cutover',
    'ambiguous_event_newer_than_proven_full',
    cutover.household_id,
    concat(
      cutover.user_a_id,
      ':',
      cutover.user_b_id,
      ':',
      cutover.currency
    ),
    1::bigint,
    jsonb_build_object(
      'user_a_id', cutover.user_a_id,
      'user_b_id', cutover.user_b_id,
      'currency', cutover.currency,
      'carryover_net_user_a_cents', cutover.carryover_net_user_a_cents,
      'active_line_net_user_a_cents',
        cutover.active_line_net_user_a_cents,
      'settlement_event_net_user_a_cents',
        cutover.settlement_event_net_user_a_cents,
      'active_pair_line_count', cutover.active_pair_line_count,
      'settlement_event_count', cutover.settlement_event_count,
      'maximum_active_line_cents', cutover.maximum_active_line_cents,
      'average_active_line_cents', cutover.average_active_line_cents,
      'earliest_active_line_created_at',
        cutover.earliest_active_line_created_at,
      'latest_active_line_created_at',
        cutover.latest_active_line_created_at,
      'latest_ambiguous_event_id', cutover.ambiguous_event_id,
      'latest_ambiguous_legacy_ordinal', cutover.ambiguous_event_ordinal,
      'latest_preceding_full_event_id', cutover.full_event_id,
      'latest_preceding_full_legacy_ordinal', cutover.full_event_ordinal
    )
  from predicted_cutovers cutover

  union all

  select
    'predicted_cutover_summary',
    'pair_currency_cutover_count',
    null::uuid,
    null::text,
    count(*)::bigint,
    jsonb_build_object(
      'meaning',
      'Each detail row becomes one pair/currency legacy cutover.'
    )
  from predicted_cutovers

  union all

  select
    'audited_cad_boundary_forensics',
    'scope_presence',
    'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid,
    '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40:9ca915ec-95b0-4b6e-ae67-68bf2600a245',
    1::bigint,
    jsonb_build_object(
      'household_exists', exists (
        select 1
        from public.households household
        where household.id =
          'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
      ),
      'reported_user_exists', exists (
        select 1
        from auth.users app_user
        where app_user.id =
          '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
      ),
      'partner_user_exists', exists (
        select 1
        from auth.users app_user
        where app_user.id =
          '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
      ),
      'reported_user_is_member', exists (
        select 1
        from public.household_members membership
        where membership.household_id =
          'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
          and membership.user_id =
            '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
      ),
      'partner_user_is_member', exists (
        select 1
        from public.household_members membership
        where membership.household_id =
          'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
          and membership.user_id =
            '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
      ),
      'global_settlement_event_count', (
        select count(*)::bigint
        from public.household_settlement_events event
      ),
      'household_settlement_event_count', (
        select count(*)::bigint
        from public.household_settlement_events event
        where event.household_id =
          'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
      )
    )

  union all

  select
    'audited_cad_boundary_forensics',
    'candidate_count',
    'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid,
    '99bc3df9-8398-40e4-ac71-d308522ea412',
    count(*)::bigint,
    jsonb_build_object(
      'exact_event_id_present', coalesce(bool_or(
        facts.id = '99bc3df9-8398-40e4-ac71-d308522ea412'::uuid
      ), false),
      'search_scope',
        'Exact id anywhere, every CAD pair event, and nearby events for the household or reported user'
    )
  from audited_event_facts facts

  union all

  select
    'audited_cad_boundary_forensics',
    case
      when facts.id = '99bc3df9-8398-40e4-ac71-d308522ea412'::uuid
        then 'exact_event_id'
      when facts.household_id =
          'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
        and upper(facts.currency) = 'CAD'
        and (
          (
            facts.payer_user_id =
              '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
            and facts.participant_user_id =
              '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
          )
          or (
            facts.payer_user_id =
              '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
            and facts.participant_user_id =
              '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
          )
        ) then 'audited_pair_cad_event'
      else 'nearby_event_candidate'
    end,
    facts.household_id,
    facts.id::text,
    1::bigint,
    jsonb_build_object(
      'actor_user_id', facts.actor_user_id,
      'payer_user_id', facts.payer_user_id,
      'participant_user_id', facts.participant_user_id,
      'currency', facts.currency,
      'amount_cents', facts.amount_cents,
      'mode', facts.mode,
      'is_express_netting', facts.is_express_netting,
      'settlement_note', facts.settlement_note,
      'created_at', facts.created_at,
      'status_allocated_total_cents', facts.status_allocated_total_cents,
      'status_allocation_source', facts.status_allocation_source,
      'status_processed_at', facts.status_processed_at,
      'allocation_count', facts.allocation_count,
      'allocated_cents', facts.allocated_cents,
      'matches_expected_household', facts.household_id =
        'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid,
      'matches_expected_currency', upper(facts.currency) = 'CAD',
      'matches_expected_actor', facts.actor_user_id =
        '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid,
      'matches_expected_payer', facts.payer_user_id =
        '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid,
      'matches_expected_participant', facts.participant_user_id =
        '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid,
      'matches_expected_amount', facts.amount_cents = 10000,
      'matches_expected_mode', facts.mode = 'both',
      'matches_expected_created_at', facts.created_at =
        '2026-07-16 00:53:13.425699+00'::timestamptz,
      'matches_expected_status_total',
        facts.status_allocated_total_cents = 10000,
      'matches_expected_allocation_total', facts.allocated_cents = 10000
    )
  from audited_event_facts facts

  union all

  select
    'audited_cad_post_boundary_rows',
    case
      when row_fact.payer_user_id =
        '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
        then 'you_owe'
      else 'they_owe_you'
    end,
    'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid,
    row_fact.expense_id::text,
    1::bigint,
    jsonb_build_object(
      'split_group_id', row_fact.split_group_id,
      'split_line_id', row_fact.split_line_id,
      'payer_user_id', row_fact.payer_user_id,
      'participant_user_id', row_fact.participant_user_id,
      'currency', row_fact.currency,
      'amount_cents', row_fact.amount_cents,
      'is_settled', row_fact.is_settled,
      'expense_date', row_fact.expense_date,
      'raw_text', row_fact.raw_text,
      'expense_created_at', row_fact.expense_created_at,
      'split_line_created_at', row_fact.split_line_created_at
    )
  from audited_post_boundary_rows row_fact

  union all

  select
    'audited_cad_boundary',
    'exact_production_match_count',
    'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid,
    '99bc3df9-8398-40e4-ac71-d308522ea412',
    count(*)::bigint,
    jsonb_build_object(
      'expected_count', 1,
      'release_gate_passed', count(*) = 1
    )
  from audited_matches
)
select
  report.report_section,
  report.category,
  report.household_id,
  report.entity_id,
  report.occurrence_count,
  report.details
from report
order by
  report.report_section,
  report.category,
  report.household_id nulls first,
  report.entity_id nulls first;

rollback;
