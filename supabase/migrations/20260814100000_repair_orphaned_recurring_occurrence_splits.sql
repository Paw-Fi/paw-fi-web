-- Repair the legacy recurring-template split migration which created a saved
-- template split group but did not link expenses.split_group_id back to it.
--
-- This is intentionally all-or-nothing.  It only repairs confirmed shared
-- recurring expenses when both the occurrence and its actual have no split
-- link, and only from one exact, structurally valid saved template group.
-- Existing occurrence groups, settlement history, and current household
-- defaults are never used or changed.

set lock_timeout = '10s';
set statement_timeout = '0';

lock table public.expenses in share row exclusive mode;
lock table public.recurring_occurrences in share row exclusive mode;
lock table public.expense_split_groups in share row exclusive mode;
lock table public.expense_split_lines in share row exclusive mode;
lock table public.household_settlement_finalized_split_groups
  in share row exclusive mode;
lock table public.household_settlement_event_allocations_v2
  in share row exclusive mode;

do $$
declare
  v_household_id uuid;
  v_template record;
  v_candidate record;
  v_actual_group_id uuid;
  v_repaired_group_ids uuid[] := '{}';
  v_target_template_ids uuid[] := '{}';
begin
  -- A confirmed ledger row without its canonical actual cannot be repaired
  -- safely: there is no amount, wallet, or transaction identity to preserve.
  -- A soft-deleted actual is deliberately different: it is no longer a live
  -- expense, so this repair leaves that historical ledger row untouched.
  if exists (
    select 1
    from public.recurring_occurrences occurrence
    join public.expenses template on template.id = occurrence.recurring_id
    left join public.expenses actual on actual.id = occurrence.actual_transaction_id
    where occurrence.status = 'confirmed'
      and template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and actual.id is null
  ) then
    raise exception
      'recurring occurrence split repair blocked: confirmed occurrence has no live actual transaction';
  end if;

  -- A half-linked occurrence is evidence of a different integrity problem.
  -- Do not guess which link should win.
  if exists (
    select 1
    from public.recurring_occurrences occurrence
    join public.expenses template on template.id = occurrence.recurring_id
    join public.expenses actual on actual.id = occurrence.actual_transaction_id
    where occurrence.status = 'confirmed'
      and template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and actual.deleted_at is null
      and (actual.split_group_id is distinct from occurrence.split_group_id)
  ) then
    raise exception
      'recurring occurrence split repair blocked: found a partial or mismatched occurrence split link';
  end if;

  -- Limit this data repair to templates that have an actual confirmed
  -- occurrence missing both links. Other old templates can have no saved
  -- split at all, or an unrelated malformed source, and are not evidence for
  -- reconstructing settlement debt.
  select coalesce(array_agg(distinct template.id), '{}'::uuid[])
  into v_target_template_ids
  from public.recurring_occurrences occurrence
  join public.expenses template on template.id = occurrence.recurring_id
  join public.expenses actual on actual.id = occurrence.actual_transaction_id
  where occurrence.status = 'confirmed'
    and template.is_recurring is true
    and template.deleted_at is null
    and template.household_id is not null
    and coalesce(template.type, 'expense') <> 'income'
    and actual.deleted_at is null
    and actual.split_group_id is null
    and occurrence.split_group_id is null;

  -- Every source that this migration may use must be unique and complete.
  if exists (
    select 1
    from public.expenses template
    where template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and template.id = any (v_target_template_ids)
      and exists (
        select 1
        from public.expense_split_groups source_group
        where source_group.expense_id = template.id
          and source_group.is_recurring_template is true
      )
      and (
        (select count(*)
         from public.expense_split_groups source_group
         where source_group.expense_id = template.id
           and source_group.is_recurring_template is true) <> 1
        or exists (
          select 1
          from public.expense_split_groups source_group
          where source_group.expense_id = template.id
            and source_group.is_recurring_template is true
            and (
              source_group.household_id is distinct from template.household_id
              or (
                template.split_group_id is not null
                and template.split_group_id is distinct from source_group.id
              )
              or upper(source_group.currency) <> upper(template.currency)
              or source_group.total_amount_cents <> abs(template.amount_cents)
              or source_group.recurring_occurrence_id is not null
              or not exists (
                select 1
                from public.household_members payer_membership
                where payer_membership.household_id = source_group.household_id
                  and payer_membership.user_id = source_group.payer_user_id
              )
              or not exists (
                select 1
                from public.expense_split_lines source_line
                where source_line.split_group_id = source_group.id
              )
              or exists (
                select 1
                from public.expense_split_lines source_line
                where source_line.split_group_id = source_group.id
                  and (source_line.amount_cents is null or source_line.amount_cents < 0)
              )
              or exists (
                select 1
                from public.expense_split_lines source_line
                where source_line.split_group_id = source_group.id
                  and not exists (
                    select 1
                    from public.household_members line_membership
                    where line_membership.household_id = source_group.household_id
                      and line_membership.user_id = source_line.user_id
                  )
              )
              or coalesce((
                select sum(source_line.amount_cents)
                from public.expense_split_lines source_line
                where source_line.split_group_id = source_group.id
              ), -1) <> source_group.total_amount_cents
            )
        )
      )
  ) then
    raise exception
      'recurring occurrence split repair blocked: saved template split source is ambiguous or invalid';
  end if;

  -- A missing actual split is repairable only when that exact saved source
  -- exists.  Never substitute a current household default or owner-only split.
  if exists (
    select 1
    from public.recurring_occurrences occurrence
    join public.expenses template on template.id = occurrence.recurring_id
    join public.expenses actual on actual.id = occurrence.actual_transaction_id
    where occurrence.status = 'confirmed'
      and template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and actual.deleted_at is null
      and actual.split_group_id is null
      and occurrence.split_group_id is null
      and not exists (
        select 1
        from public.expense_split_groups source_group
        where source_group.expense_id = template.id
          and source_group.is_recurring_template is true
      )
  ) then
    raise exception
      'recurring occurrence split repair blocked: a missing occurrence has no saved template split source';
  end if;

  -- Validate each missing actual before any pointer is written.  A settlement
  -- allocation without a split group must be investigated, not reconstructed.
  if exists (
    select 1
    from public.recurring_occurrences occurrence
    join public.expenses template on template.id = occurrence.recurring_id
    join public.expenses actual on actual.id = occurrence.actual_transaction_id
    where occurrence.status = 'confirmed'
      and template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and actual.deleted_at is null
      and actual.split_group_id is null
      and occurrence.split_group_id is null
      and (
        actual.is_recurring is true
        or actual.parent_recurring_id is distinct from template.id
        or actual.household_id is distinct from template.household_id
        or upper(actual.currency) <> upper(template.currency)
        or actual.amount_cents <= 0
        or occurrence.actual_transaction_id is null
        or occurrence.scheduled_occurrence_date is null
        or exists (
          select 1
          from public.household_settlement_event_allocations_v2 allocation
          where allocation.expense_id = actual.id
        )
      )
  ) then
    raise exception
      'recurring occurrence split repair blocked: missing occurrence parent or settlement state is invalid';
  end if;

  -- Serialize the few affected households after all structural checks pass.
  for v_household_id in
    select distinct template.household_id
    from public.expenses template
    where template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and template.id = any (v_target_template_ids)
      and exists (
        select 1
        from public.expense_split_groups source_group
        where source_group.expense_id = template.id
          and source_group.is_recurring_template is true
      )
    order by template.household_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  -- Restore the missing template pointer first.  This is the permanent repair
  -- for all future confirmations by existing mobile clients.
  for v_template in
    select template.id as template_id, source_group.id as source_group_id
    from public.expenses template
    join public.expense_split_groups source_group
      on source_group.expense_id = template.id
     and source_group.is_recurring_template is true
    where template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and template.split_group_id is null
      and template.id = any (v_target_template_ids)
    order by template.household_id, template.id
  loop
    perform set_config(
      'moneko.settlement_split_write_expense_id',
      v_template.template_id::text,
      true
    );
    update public.expenses
    set split_group_id = v_template.source_group_id,
        updated_at = clock_timestamp()
    where id = v_template.template_id
      and split_group_id is null;
  end loop;

  -- Materialize each absent occurrence from its saved source allocation.  The
  -- proportional calculation uses a stable UUID ordering for remainder cents.
  for v_candidate in
    select
      template.id as template_id,
      occurrence.id as occurrence_id,
      actual.id as actual_id,
      actual.amount_cents as actual_amount_cents,
      source_group.id as source_group_id,
      source_group.payer_user_id,
      source_group.split_type as source_split_type,
      source_group.currency,
      source_group.description,
      source_group.total_amount_cents as template_total_amount_cents
    from public.recurring_occurrences occurrence
    join public.expenses template on template.id = occurrence.recurring_id
    join public.expenses actual on actual.id = occurrence.actual_transaction_id
    join public.expense_split_groups source_group
      on source_group.expense_id = template.id
     and source_group.is_recurring_template is true
    where occurrence.status = 'confirmed'
      and template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and actual.deleted_at is null
      and actual.split_group_id is null
      and occurrence.split_group_id is null
    order by template.household_id, template.id, occurrence.scheduled_occurrence_date, occurrence.id
  loop
    v_actual_group_id := gen_random_uuid();

    insert into public.expense_split_groups (
      id, household_id, expense_id, payer_user_id, split_type, currency,
      total_amount_cents, description, is_recurring_template,
      recurring_occurrence_id
    )
    select
      v_actual_group_id, actual.household_id, actual.id,
      v_candidate.payer_user_id,
      case when v_candidate.source_split_type::text = 'equal'
        then 'equal'::public.split_type else 'amount'::public.split_type end,
      upper(actual.currency), actual.amount_cents, v_candidate.description,
      false, v_candidate.occurrence_id
    from public.expenses actual
    where actual.id = v_candidate.actual_id;

    insert into public.expense_split_lines (
      id, split_group_id, user_id, amount_cents, percentage, shares,
      is_settled, settled_at, settled_by_user_id, settlement_note
    )
    with base as (
      select
        source_line.user_id,
        floor(
          source_line.amount_cents::numeric
          * v_candidate.actual_amount_cents::numeric
          / v_candidate.template_total_amount_cents::numeric
        )::bigint as amount_cents
      from public.expense_split_lines source_line
      where source_line.split_group_id = v_candidate.source_group_id
    ), ranked as (
      select
        base.*,
        sum(base.amount_cents) over () as allocated_cents,
        row_number() over (order by base.user_id) as allocation_rank
      from base
    )
    select
      gen_random_uuid(), v_actual_group_id, ranked.user_id,
      ranked.amount_cents
        + case when ranked.allocation_rank <=
          v_candidate.actual_amount_cents - ranked.allocated_cents
          then 1 else 0 end,
      null, null, false, null, null, null
    from ranked;

    perform set_config(
      'moneko.settlement_split_write_expense_id',
      v_candidate.actual_id::text,
      true
    );
    update public.expenses
    set split_group_id = v_actual_group_id,
        updated_at = clock_timestamp()
    where id = v_candidate.actual_id
      and split_group_id is null;

    update public.recurring_occurrences
    set split_group_id = v_actual_group_id
    where id = v_candidate.occurrence_id
      and split_group_id is null;
    perform set_config('moneko.settlement_split_write_expense_id', '', true);

    insert into public.household_settlement_finalized_split_groups (
      split_group_id, completed_at, validation_profile
    ) values (
      v_actual_group_id, clock_timestamp(), 'strict_current'
    );
    v_repaired_group_ids := array_append(v_repaired_group_ids, v_actual_group_id);
  end loop;

  -- Prove the exact links and totals written above before this transaction can
  -- commit.  Any failure rolls the whole repair back.
  if exists (
    select 1
    from public.expenses template
    where template.is_recurring is true
      and template.deleted_at is null
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and template.split_group_id is null
      and template.id = any (v_target_template_ids)
      and exists (
        select 1
        from public.expense_split_groups source_group
        where source_group.expense_id = template.id
          and source_group.is_recurring_template is true
      )
  ) then
    raise exception
      'recurring occurrence split repair invariant failed: saved template source was not linked';
  end if;

  if exists (
    select 1
    from public.recurring_occurrences occurrence
    join public.expenses template on template.id = occurrence.recurring_id
    join public.expenses actual on actual.id = occurrence.actual_transaction_id
    where occurrence.status = 'confirmed'
      and template.is_recurring is true
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and actual.deleted_at is null
      and actual.split_group_id is null
      and occurrence.split_group_id is null
      and exists (
        select 1
        from public.expense_split_groups source_group
        where source_group.expense_id = template.id
          and source_group.is_recurring_template is true
      )
  ) then
    raise exception
      'recurring occurrence split repair invariant failed: a repairable occurrence remains unlinked';
  end if;

  if exists (
    select 1
    from public.recurring_occurrences occurrence
    join public.expenses template on template.id = occurrence.recurring_id
    join public.expenses actual on actual.id = occurrence.actual_transaction_id
    join public.expense_split_groups actual_group
      on actual_group.id = occurrence.split_group_id
    where occurrence.status = 'confirmed'
      and template.is_recurring is true
      and template.household_id is not null
      and coalesce(template.type, 'expense') <> 'income'
      and actual_group.id = any (v_repaired_group_ids)
      and (
        actual.split_group_id is distinct from occurrence.split_group_id
        or actual_group.expense_id is distinct from actual.id
        or actual_group.recurring_occurrence_id is distinct from occurrence.id
        or actual_group.is_recurring_template is true
        or actual_group.total_amount_cents <> actual.amount_cents
        or not exists (
          select 1
          from public.household_settlement_finalized_split_groups finalized
          where finalized.split_group_id = actual_group.id
        )
        or coalesce((
          select sum(actual_line.amount_cents)
          from public.expense_split_lines actual_line
          where actual_line.split_group_id = actual_group.id
        ), -1) <> actual.amount_cents
      )
  ) then
    raise exception
      'recurring occurrence split repair invariant failed: repaired occurrence linkage or allocation is invalid';
  end if;
end;
$$;
