create or replace function public.get_pocket_rollover_breakdown_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_rollover_group_id uuid,
  p_period_month date
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_components jsonb := '[]'::jsonb;
  v_selected_components jsonb := null;
  v_adjustments jsonb := '[]'::jsonb;
  v_monthly_rows jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_month record;
  v_component record;
  v_next_components jsonb;
  v_previous_month date := null;
  v_expected_month date;
  v_incoming_rollover_cents bigint;
  v_opening_rollover_cents bigint;
  v_remaining_spend bigint;
  v_base_spent bigint;
  v_base_remaining bigint;
  v_component_amount bigint;
  v_consumed bigint;
  v_offset bigint;
  v_carry_to_next_cents bigint;
  v_negative_dropped_cents bigint;
  v_cap_applied_cents bigint;
  v_excess bigint;
  v_visible_total_cents bigint;
  v_selected_incoming_cents bigint := 0;
  v_current_envelope jsonb := '{}'::jsonb;
begin
  if p_rollover_group_id is null or p_period_month is null then
    return jsonb_build_object(
      'period_month', p_period_month,
      'currency', v_currency,
      'total_incoming_rollover_cents', 0,
      'opening_rollover_cents', 0,
      'contributions', '[]'::jsonb,
      'monthly_history', '[]'::jsonb,
      'adjustments', '[]'::jsonb,
      'warnings', '[]'::jsonb,
      'next_month_preview', jsonb_build_object('carry_cents', 0)
    );
  end if;

  select coalesce(to_jsonb(row), '{}'::jsonb)
  into v_current_envelope
  from (
    select distinct on (b.period_month)
      e.id,
      e.name,
      e.rollover_group_id,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents,
      coalesce(a.amount_cents, e.budget_amount_cents, 0)::bigint as base_budget_cents
    from public.budgets b
    join public.budget_envelopes e on e.budget_id = b.id
    left join public.envelope_allocations a
      on a.envelope_id = e.id
     and a.period_month = b.period_month
    where b.period_month = p_period_month
      and upper(b.currency) = v_currency
      and upper(e.currency) = v_currency
      and e.rollover_group_id = p_rollover_group_id
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by b.period_month desc, e.updated_at desc nulls last, e.created_at desc nulls last
  ) row;

  for v_month in
    with envelope_months as (
      select distinct on (b.period_month)
        b.period_month,
        e.id as envelope_id,
        e.name,
        coalesce(a.amount_cents, e.budget_amount_cents, 0)::bigint as base_budget_cents,
        coalesce(e.rollover_enabled, false) as rollover_enabled,
        coalesce(e.rollover_negative, false) as rollover_negative,
        e.rollover_cap_cents,
        coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents
      from public.budgets b
      join public.budget_envelopes e on e.budget_id = b.id
      left join public.envelope_allocations a
        on a.envelope_id = e.id
       and a.period_month = b.period_month
      where b.period_month <= p_period_month
        and upper(b.currency) = v_currency
        and upper(e.currency) = v_currency
        and e.rollover_group_id = p_rollover_group_id
        and (
          (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
          or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
          or (v_scope = 'household' and b.household_id = p_household_id)
        )
      order by b.period_month asc, e.updated_at desc nulls last, e.created_at desc nulls last
    ),
    spent_by_month as (
      select
        em.envelope_id,
        coalesce(sum(ex.amount_cents), 0)::bigint as spent_cents
      from envelope_months em
      left join public.envelope_category_links l
        on l.envelope_id = em.envelope_id
      left join public.expenses ex
        on lower(trim(coalesce(ex.category, ''))) = lower(trim(l.category))
       and lower(coalesce(ex.type::text, 'expense')) <> 'income'
       and upper(coalesce(ex.currency, '')) = v_currency
       and ex.deleted_at is null
       and ex.date >= em.period_month
       and ex.date < (em.period_month + interval '1 month')::date
       and (
         (v_scope = 'household' and ex.household_id = p_household_id)
         or (v_scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
         or (v_scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
       )
      group by em.envelope_id
    )
    select
      em.*,
      coalesce(sbm.spent_cents, 0)::bigint as spent_cents
    from envelope_months em
    left join spent_by_month sbm on sbm.envelope_id = em.envelope_id
    order by em.period_month asc
  loop
    if v_previous_month is not null then
      v_expected_month := (v_previous_month + interval '1 month')::date;
      if v_expected_month <> v_month.period_month then
        v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
          'code', 'missing_month_gap',
          'message', 'Missing rollover month between ' || v_previous_month || ' and ' || v_month.period_month,
          'from_period_month', v_previous_month,
          'to_period_month', v_month.period_month
        ));
      end if;
    end if;
    v_previous_month := v_month.period_month;

    select coalesce(sum((value ->> 'amount_cents')::bigint), 0)::bigint
    into v_incoming_rollover_cents
    from jsonb_array_elements(v_components) value;

    if v_month.rollover_enabled = false then
      if v_incoming_rollover_cents <> 0 then
        v_adjustments := v_adjustments || jsonb_build_array(jsonb_build_object(
          'source_type', 'reset',
          'source_period_month', v_month.period_month,
          'label', to_char(v_month.period_month, 'Mon') || ' rollover reset',
          'amount_cents', -v_incoming_rollover_cents,
          'remaining_cents_after_adjustment', 0,
          'is_carried', false,
          'reason', 'Rollover was disabled for this month.'
        ));
      end if;
      v_components := '[]'::jsonb;
      v_monthly_rows := v_monthly_rows || jsonb_build_array(jsonb_build_object(
        'period_month', v_month.period_month,
        'base_budget_cents', greatest(v_month.base_budget_cents, 0),
        'incoming_rollover_cents', 0,
        'opening_rollover_cents', 0,
        'available_budget_cents', greatest(v_month.base_budget_cents, 0),
        'spent_cents', greatest(v_month.spent_cents, 0),
        'remaining_cents', greatest(v_month.base_budget_cents, 0) - greatest(v_month.spent_cents, 0),
        'carry_to_next_cents', 0,
        'rollover_enabled', false,
        'rollover_negative', v_month.rollover_negative,
        'rollover_cap_cents', v_month.rollover_cap_cents,
        'cap_applied_cents', 0,
        'negative_dropped_cents', 0
      ));
      continue;
    end if;

    v_opening_rollover_cents := coalesce(v_month.opening_rollover_cents, 0);
    if v_opening_rollover_cents <> 0 then
      v_components := v_components || jsonb_build_array(jsonb_build_object(
        'source_type', 'opening',
        'source_period_month', v_month.period_month,
        'label', 'Opening balance',
        'amount_cents', v_opening_rollover_cents,
        'remaining_cents_after_adjustment', v_incoming_rollover_cents + v_opening_rollover_cents,
        'is_carried', true,
        'reason', 'Manual opening rollover for this envelope month.'
      ));
    end if;

    if v_month.period_month = p_period_month then
      v_selected_components := v_components;
      v_selected_incoming_cents := v_incoming_rollover_cents;
    end if;

    -- Spending depletes old carried components first (FIFO), then this month''s base budget.
    v_remaining_spend := greatest(v_month.spent_cents, 0);
    v_next_components := '[]'::jsonb;
    for v_component in select value from jsonb_array_elements(v_components) value loop
      v_component_amount := (v_component.value ->> 'amount_cents')::bigint;
      if v_remaining_spend > 0 and v_component_amount > 0 then
        v_consumed := least(v_component_amount, v_remaining_spend);
        v_component_amount := v_component_amount - v_consumed;
        v_remaining_spend := v_remaining_spend - v_consumed;
      end if;
      if v_component_amount <> 0 then
        v_next_components := v_next_components || jsonb_build_array(
          v_component.value || jsonb_build_object('amount_cents', v_component_amount)
        );
      end if;
    end loop;
    v_components := v_next_components;

    v_base_spent := least(greatest(v_month.base_budget_cents, 0), v_remaining_spend);
    v_remaining_spend := v_remaining_spend - v_base_spent;
    v_base_remaining := greatest(v_month.base_budget_cents, 0) - v_base_spent;

    -- Any unused base first pays down carried deficits before becoming new carryover.
    v_next_components := '[]'::jsonb;
    for v_component in select value from jsonb_array_elements(v_components) value loop
      v_component_amount := (v_component.value ->> 'amount_cents')::bigint;
      if v_base_remaining > 0 and v_component_amount < 0 then
        v_offset := least(-v_component_amount, v_base_remaining);
        v_component_amount := v_component_amount + v_offset;
        v_base_remaining := v_base_remaining - v_offset;
      end if;
      if v_component_amount <> 0 then
        v_next_components := v_next_components || jsonb_build_array(
          v_component.value || jsonb_build_object('amount_cents', v_component_amount)
        );
      end if;
    end loop;
    v_components := v_next_components;

    if v_remaining_spend > 0 then
      v_components := v_components || jsonb_build_array(jsonb_build_object(
        'source_type', 'month_deficit',
        'source_period_month', v_month.period_month,
        'label', to_char(v_month.period_month, 'Mon') || ' overspend',
        'amount_cents', -v_remaining_spend,
        'remaining_cents_after_adjustment', 0,
        'is_carried', true,
        'reason', 'Overspending exceeded available rollover and base budget.'
      ));
    elsif v_base_remaining > 0 then
      v_components := v_components || jsonb_build_array(jsonb_build_object(
        'source_type', 'month_surplus',
        'source_period_month', v_month.period_month,
        'label', to_char(v_month.period_month, 'Mon') || ' leftover',
        'amount_cents', v_base_remaining,
        'remaining_cents_after_adjustment', 0,
        'is_carried', true,
        'reason', 'Unused base budget carried forward.'
      ));
    end if;

    select coalesce(sum((value ->> 'amount_cents')::bigint), 0)::bigint
    into v_carry_to_next_cents
    from jsonb_array_elements(v_components) value;

    v_negative_dropped_cents := 0;
    if v_month.rollover_negative = false and v_carry_to_next_cents < 0 then
      v_negative_dropped_cents := -v_carry_to_next_cents;
      v_components := '[]'::jsonb;
      v_carry_to_next_cents := 0;
      v_adjustments := v_adjustments || jsonb_build_array(jsonb_build_object(
        'source_type', 'negative_dropped',
        'source_period_month', v_month.period_month,
        'label', to_char(v_month.period_month, 'Mon') || ' overspend not carried',
        'amount_cents', -v_negative_dropped_cents,
        'remaining_cents_after_adjustment', 0,
        'is_carried', false,
        'reason', 'Overspending is not carried into the next month.'
      ));
    end if;

    v_cap_applied_cents := 0;
    if v_month.rollover_cap_cents is not null and v_carry_to_next_cents > v_month.rollover_cap_cents then
      v_excess := v_carry_to_next_cents - v_month.rollover_cap_cents;
      v_cap_applied_cents := v_excess;
      v_next_components := '[]'::jsonb;
      for v_component in
        select value, ordinality
        from jsonb_array_elements(v_components) with ordinality
        order by ordinality desc
      loop
        v_component_amount := (v_component.value ->> 'amount_cents')::bigint;
        if v_excess > 0 and v_component_amount > 0 then
          v_consumed := least(v_component_amount, v_excess);
          v_component_amount := v_component_amount - v_consumed;
          v_excess := v_excess - v_consumed;
        end if;
        if v_component_amount <> 0 then
          v_next_components := jsonb_build_array(
            v_component.value || jsonb_build_object('amount_cents', v_component_amount)
          ) || v_next_components;
        end if;
      end loop;
      v_components := v_next_components;
      v_carry_to_next_cents := v_month.rollover_cap_cents;
      v_adjustments := v_adjustments || jsonb_build_array(jsonb_build_object(
        'source_type', 'cap_adjustment',
        'source_period_month', v_month.period_month,
        'label', to_char(v_month.period_month, 'Mon') || ' cap adjustment',
        'amount_cents', -v_cap_applied_cents,
        'remaining_cents_after_adjustment', v_carry_to_next_cents,
        'is_carried', false,
        'reason', 'Rollover cap trimmed the newest positive carryover first.'
      ));
    end if;

    v_monthly_rows := v_monthly_rows || jsonb_build_array(jsonb_build_object(
      'period_month', v_month.period_month,
      'base_budget_cents', greatest(v_month.base_budget_cents, 0),
      'incoming_rollover_cents', v_incoming_rollover_cents,
      'opening_rollover_cents', v_opening_rollover_cents,
      'available_budget_cents', greatest(v_month.base_budget_cents, 0) + v_incoming_rollover_cents + v_opening_rollover_cents,
      'spent_cents', greatest(v_month.spent_cents, 0),
      'remaining_cents', greatest(v_month.base_budget_cents, 0) + v_incoming_rollover_cents + v_opening_rollover_cents - greatest(v_month.spent_cents, 0),
      'carry_to_next_cents', v_carry_to_next_cents,
      'rollover_enabled', true,
      'rollover_negative', v_month.rollover_negative,
      'rollover_cap_cents', v_month.rollover_cap_cents,
      'cap_applied_cents', v_cap_applied_cents,
      'negative_dropped_cents', v_negative_dropped_cents
    ));
  end loop;

  if v_selected_components is null then
    v_selected_components := v_components;
  end if;

  select coalesce(sum((value ->> 'amount_cents')::bigint), 0)::bigint
  into v_visible_total_cents
  from jsonb_array_elements(v_selected_components) value;

  return jsonb_build_object(
    'period_month', p_period_month,
    'currency', v_currency,
    'scope', v_scope,
    'rollover_group_id', p_rollover_group_id,
    'envelope', v_current_envelope,
    'total_incoming_rollover_cents', v_selected_incoming_cents,
    'opening_rollover_cents', coalesce((v_current_envelope ->> 'opening_rollover_cents')::bigint, 0),
    'current_rollover_total_cents', v_visible_total_cents,
    'contributions', coalesce((
      select jsonb_agg(
        value || jsonb_build_object('remaining_cents_after_adjustment', v_visible_total_cents)
        order by ordinality
      )
      from jsonb_array_elements(v_selected_components) with ordinality
    ), '[]'::jsonb),
    'adjustments', v_adjustments,
    'monthly_history', v_monthly_rows,
    'warnings', v_warnings,
    'next_month_preview', coalesce((
      select jsonb_build_object(
        'period_month', (p_period_month + interval '1 month')::date,
        'raw_carry_cents', (value ->> 'remaining_cents')::bigint,
        'carry_cents', (value ->> 'carry_to_next_cents')::bigint,
        'cap_applied_cents', (value ->> 'cap_applied_cents')::bigint,
        'negative_dropped_cents', (value ->> 'negative_dropped_cents')::bigint,
        'rollover_negative', (value ->> 'rollover_negative')::boolean,
        'rollover_cap_cents', nullif(value ->> 'rollover_cap_cents', '')::bigint
      )
      from jsonb_array_elements(v_monthly_rows) value
      where (value ->> 'period_month')::date = p_period_month
      limit 1
    ), jsonb_build_object('period_month', (p_period_month + interval '1 month')::date, 'carry_cents', 0))
  );
end;
$$;

comment on function public.get_pocket_rollover_breakdown_v1(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date
) is
  'Returns a dynamic full-lineage rollover contribution ledger for one pocket month. Carry components are derived from source budgets, envelopes, allocations, links, and expenses; no monthly balance snapshots are used.';

revoke execute on function public.get_pocket_rollover_breakdown_v1(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date
) from PUBLIC, anon;
grant execute on function public.get_pocket_rollover_breakdown_v1(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date
) to authenticated, service_role;
