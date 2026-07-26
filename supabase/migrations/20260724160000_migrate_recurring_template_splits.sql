-- Reparent legacy recurring-template debt to imported actuals without changing
-- split, event, allocation, baseline, cutover, or ledger identities.
set lock_timeout = '10s';

do $$
declare
  v_household_id uuid;
  v_candidate record;
  v_template public.expenses%rowtype;
  v_group public.expense_split_groups%rowtype;
  v_finalized public.household_settlement_finalized_split_groups%rowtype;
  v_actual_id uuid;
  v_occurrence_id uuid;
  v_scheduled_date date;
  v_actual_payload jsonb;
  v_template_rule jsonb;
  v_template_group_id uuid;
begin
  -- Validate every candidate before any migration write.
  if exists (
    select 1
    from public.expenses template
    join public.expense_split_groups split_group
      on split_group.expense_id = template.id
    where template.is_recurring is true
      and template.deleted_at is null
      and split_group.is_recurring_template is false
      and (
        template.recurrence_rule is null
        or jsonb_typeof(template.recurrence_rule) <> 'object'
        or (
          template.recurrence_rule ? 'anchor_date'
          and coalesce(template.recurrence_rule ->> 'anchor_date', '')
            !~ '^\d{4}-\d{2}-\d{2}$'
        )
        or (
          template.recurrence_rule ? 'excluded_dates'
          and jsonb_typeof(template.recurrence_rule -> 'excluded_dates') <> 'array'
        )
        or not exists (
          select 1
          from public.household_settlement_finalized_split_groups finalized
          where finalized.split_group_id = split_group.id
        )
      )
  ) then
    raise exception
      'recurring template split migration blocked: unsafe recurrence rule or unfinalized split group';
  end if;

  for v_household_id in
    select split_group.household_id
    from public.expenses template
    join public.expense_split_groups split_group
      on split_group.expense_id = template.id
    where template.is_recurring is true
      and template.deleted_at is null
      and split_group.is_recurring_template is false
    group by split_group.household_id
    order by split_group.household_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  for v_candidate in
    select
      template.id as recurring_id,
      split_group.id as live_split_group_id,
      split_group.household_id,
      greatest(
        template.date,
        coalesce(nullif(template.recurrence_rule ->> 'anchor_date', '')::date, template.date)
      ) as scheduled_date
    from public.expenses template
    join public.expense_split_groups split_group
      on split_group.expense_id = template.id
    where template.is_recurring is true
      and template.deleted_at is null
      and split_group.is_recurring_template is false
    order by split_group.household_id, template.id
  loop
    v_actual_id := gen_random_uuid();
    v_occurrence_id := gen_random_uuid();
    v_scheduled_date := v_candidate.scheduled_date;

    select * into strict v_template
    from public.expenses
    where id = v_candidate.recurring_id
    for update;

    select * into strict v_group
    from public.expense_split_groups
    where id = v_candidate.live_split_group_id
    for update;

    select * into strict v_finalized
    from public.household_settlement_finalized_split_groups
    where split_group_id = v_candidate.live_split_group_id;

    v_actual_payload := (
      to_jsonb(v_template)
      - 'idempotency_key'
      - 'wallet_capture_idempotency_key'
      - 'wallet_capture_id'
    ) || jsonb_build_object(
      'id', v_actual_id,
      'date', v_scheduled_date,
      'is_recurring', false,
      'recurrence_rule', null,
      'parent_recurring_id', v_candidate.recurring_id,
      'split_group_id', null,
      'scheduled_occurrence_date', v_scheduled_date,
      'recurring_confirmed_at', clock_timestamp(),
      'recurring_confirmation_source', 'legacy_migration',
      'deleted_at', null,
      'deleted_reason', null
    );

    insert into public.expenses
    select (jsonb_populate_record(null::public.expenses, v_actual_payload)).*;

    -- Move the historical group first; otherwise the existing cleanup trigger
    -- can delete an unsettled group when the template is unlinked.
    perform set_config(
      'moneko.settlement_split_write_expense_id',
      v_candidate.recurring_id::text,
      true
    );
    update public.expense_split_groups
    set expense_id = v_actual_id
    where id = v_candidate.live_split_group_id;

    update public.household_settlement_event_allocations_v2
    set expense_id = v_actual_id
    where split_group_id = v_candidate.live_split_group_id;

    update public.household_settlement_cycle_baseline_lines
    set expense_id = v_actual_id
    where split_group_id = v_candidate.live_split_group_id;

    update public.household_settlement_legacy_cutover_lines_v3
    set expense_id = v_actual_id
    where split_group_id = v_candidate.live_split_group_id;

    select jsonb_set(
      v_template.recurrence_rule,
      '{excluded_dates}',
      (
        select jsonb_agg(value order by value)
        from (
          select jsonb_array_elements_text(
            coalesce(v_template.recurrence_rule -> 'excluded_dates', '[]'::jsonb)
          ) as value
          union
          select v_scheduled_date::text
        ) dates
      ),
      true
    ) into v_template_rule;

    update public.expenses
    set split_group_id = null,
        recurrence_rule = v_template_rule
    where id = v_candidate.recurring_id;

    perform set_config(
      'moneko.settlement_split_write_expense_id',
      v_actual_id::text,
      true
    );
    update public.expenses
    set split_group_id = v_candidate.live_split_group_id
    where id = v_actual_id;

    v_template_group_id := gen_random_uuid();
    insert into public.expense_split_groups (
      id, household_id, expense_id, payer_user_id, split_type, currency,
      total_amount_cents, description, is_recurring_template
    ) values (
      v_template_group_id, v_group.household_id, v_candidate.recurring_id,
      v_group.payer_user_id, v_group.split_type, v_group.currency,
      v_group.total_amount_cents, v_group.description, true
    );

    insert into public.expense_split_lines (
      id, split_group_id, user_id, amount_cents, percentage, shares,
      is_settled, settled_at, settled_by_user_id, settlement_note
    )
    select
      gen_random_uuid(), v_template_group_id, split_line.user_id,
      split_line.amount_cents, split_line.percentage, split_line.shares,
      false, null, null, null
    from public.expense_split_lines split_line
    where split_line.split_group_id = v_candidate.live_split_group_id;

    insert into public.recurring_occurrences (
      id, recurring_id, scheduled_occurrence_date, status,
      confirmation_source, actual_transaction_id, split_group_id, paid_date,
      amount_cents, currency, confirmed_at, confirmed_by_user_id
    ) values (
      v_occurrence_id, v_candidate.recurring_id, v_scheduled_date,
      'confirmed', 'legacy_migration', v_actual_id,
      v_candidate.live_split_group_id, v_scheduled_date,
      abs(v_template.amount_cents), upper(v_template.currency),
      clock_timestamp(), v_template.user_id
    );

    update public.expense_split_groups
    set recurring_occurrence_id = v_occurrence_id
    where id = v_candidate.live_split_group_id;

    -- The split-group move deliberately invalidates this marker. Restore the
    -- original marker rather than recomputing any settlement history.
    insert into public.household_settlement_finalized_split_groups (
      split_group_id, completed_at, validation_profile,
      legacy_parent_household_mismatch, legacy_parent_currency_mismatch,
      legacy_parent_amount_mismatch, legacy_rounding_delta_cents
    ) values (
      v_finalized.split_group_id, v_finalized.completed_at,
      v_finalized.validation_profile,
      v_finalized.legacy_parent_household_mismatch,
      v_finalized.legacy_parent_currency_mismatch,
      v_finalized.legacy_parent_amount_mismatch,
      v_finalized.legacy_rounding_delta_cents
    );
  end loop;

  if exists (
    select 1
    from public.expense_split_groups split_group
    join public.expenses template on template.id = split_group.expense_id
    where template.is_recurring is true
      and template.deleted_at is null
      and split_group.is_recurring_template is false
  ) then
    raise exception
      'recurring template split migration invariant failed: live debt remains on a template';
  end if;

  if exists (
    select 1
    from public.recurring_occurrences occurrence
    left join public.expenses actual
      on actual.id = occurrence.actual_transaction_id
    left join public.expense_split_groups split_group
      on split_group.id = occurrence.split_group_id
    where occurrence.confirmation_source = 'legacy_migration'
      and (
        actual.id is null
        or actual.is_recurring is true
        or actual.parent_recurring_id is distinct from occurrence.recurring_id
        or split_group.id is null
        or split_group.is_recurring_template
        or split_group.expense_id is distinct from actual.id
      )
  ) then
    raise exception
      'recurring template split migration invariant failed: imported occurrence linkage';
  end if;
end;
$$;
