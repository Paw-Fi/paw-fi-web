create index if not exists idx_budget_envelopes_rollover_lineage_all
  on public.budget_envelopes(rollover_group_id, (upper(currency)), budget_id);

create or replace function public.calculate_pocket_rollover_carry_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_envelope_name text,
  p_rollover_group_id uuid,
  p_period_month date
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_name text := lower(trim(coalesce(p_envelope_name, '')));
  v_group_id uuid := p_rollover_group_id;
  v_prev_month date := (p_period_month - interval '1 month')::date;
  v_carry bigint := 0;
  v_base bigint;
  v_spent bigint;
  v_enabled boolean;
  v_negative boolean;
  v_cap bigint;
  v_opening bigint;
  v_env_id uuid;
  v_match record;
  v_is_service_role boolean :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
begin
  if not v_is_service_role then
    if auth.uid() is null or auth.uid() <> p_user_id then
      raise exception 'Unauthorized pocket rollover access'
        using errcode = '42501';
    end if;

    if v_scope <> 'personal' and (
      p_household_id is null or not exists (
        select 1
        from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
      )
    ) then
      raise exception 'Unauthorized household pocket rollover access'
        using errcode = '42501';
    end if;
  end if;

  if (v_group_id is null and v_name = '') or p_period_month is null then
    return 0;
  end if;

  for v_match in
    select distinct on (b.period_month)
      b.period_month,
      e.id as envelope_id,
      coalesce(a.amount_cents, e.budget_amount_cents, 0)::bigint as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents
    from public.budgets b
    join public.budget_envelopes e on e.budget_id = b.id
    left join public.envelope_allocations a
      on a.envelope_id = e.id
     and a.period_month = b.period_month
    where b.period_month <= v_prev_month
      and upper(b.currency) = v_currency
      and (
        (v_group_id is not null and e.rollover_group_id = v_group_id)
        or (v_group_id is null and lower(trim(e.name)) = v_name)
      )
      and upper(e.currency) = v_currency
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by b.period_month asc, e.updated_at desc nulls last, e.created_at desc nulls last, e.id desc
  loop
    v_env_id := v_match.envelope_id;
    v_base := v_match.base_cents;
    v_enabled := v_match.rollover_enabled;
    v_negative := v_match.rollover_negative;
    v_cap := v_match.rollover_cap_cents;
    v_opening := v_match.opening_rollover_cents;

    if v_env_id is null or v_enabled = false then
      v_carry := 0;
    else
      with linked_categories as (
        select distinct lower(trim(coalesce(l.category, ''))) as category
        from public.envelope_category_links l
        where l.envelope_id = v_env_id
          and lower(trim(coalesce(l.category, ''))) <> ''
      ),
      actual_spend as (
        select coalesce(sum(ex.amount_cents), 0)::bigint as amount_cents
        from public.expenses ex
        join linked_categories lc
          on lower(trim(coalesce(ex.category, ''))) = lc.category
        where coalesce(ex.is_recurring, false) = false
          and lower(coalesce(ex.type::text, 'expense')) <> 'income'
          and upper(coalesce(ex.currency, '')) = v_currency
          and ex.deleted_at is null
          and ex.date >= v_match.period_month
          and ex.date < (v_match.period_month + interval '1 month')::date
          and (
            (v_scope = 'household' and ex.household_id = p_household_id)
            or (v_scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
            or (v_scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
          )
      ),
      projected_spend as (
        select coalesce(sum(p.amount_cents), 0)::bigint as amount_cents
        from public.get_projected_scoped_recurring_expenses_v1(
          p_user_id => p_user_id,
          p_scope => v_scope,
          p_household_id => p_household_id,
          p_currency => v_currency,
          p_range_start => v_match.period_month,
          p_range_end => (v_match.period_month + interval '1 month - 1 day')::date
        ) p
        join linked_categories lc
          on lower(trim(coalesce(p.category, ''))) = lc.category
        where lower(coalesce(p.type, 'expense')) <> 'income'
      )
      select coalesce((select amount_cents from actual_spend), 0) +
        coalesce((select amount_cents from projected_spend), 0)
      into v_spent;

      v_carry := coalesce(v_base, 0) + coalesce(v_carry, 0) +
        coalesce(v_opening, 0) - coalesce(v_spent, 0);

      if v_carry < 0 and v_negative = false then
        v_carry := 0;
      elsif v_cap is not null and v_carry > v_cap then
        v_carry := v_cap;
      end if;
    end if;

    v_env_id := null;
    v_base := 0;
    v_spent := 0;
    v_enabled := false;
    v_negative := false;
    v_cap := null;
    v_opening := 0;
  end loop;

  return coalesce(v_carry, 0);
end;
$$;

create or replace function public.get_pocket_rollover_history_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_rollover_group_id uuid,
  p_period_month date,
  p_limit_months integer default 12
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_limit integer := greatest(1, least(coalesce(p_limit_months, 12), 36));
  v_rows jsonb;
  v_is_service_role boolean :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
begin
  if not v_is_service_role then
    if auth.uid() is null or auth.uid() <> p_user_id then
      raise exception 'Unauthorized pocket rollover access'
        using errcode = '42501';
    end if;

    if v_scope <> 'personal' and (
      p_household_id is null or not exists (
        select 1
        from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
      )
    ) then
      raise exception 'Unauthorized household pocket rollover access'
        using errcode = '42501';
    end if;
  end if;

  if p_rollover_group_id is null or p_period_month is null then
    return '[]'::jsonb;
  end if;

  with envelope_months as (
    select distinct on (b.period_month)
      b.period_month,
      e.id as envelope_id,
      e.name,
      coalesce(a.amount_cents, e.budget_amount_cents, 0)::bigint as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents,
      e.rollover_group_id
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
    order by b.period_month desc, e.updated_at desc nulls last, e.created_at desc nulls last, e.id desc
    limit v_limit
  ),
  linked_categories as (
    select distinct
      em.envelope_id,
      lower(trim(coalesce(l.category, ''))) as category
    from envelope_months em
    join public.envelope_category_links l
      on l.envelope_id = em.envelope_id
    where lower(trim(coalesce(l.category, ''))) <> ''
  ),
  monthly_spend_rows as (
    select
      em.envelope_id,
      ex.amount_cents
    from envelope_months em
    join linked_categories lc
      on lc.envelope_id = em.envelope_id
    join public.expenses ex
      on lower(trim(coalesce(ex.category, ''))) = lc.category
     and coalesce(ex.is_recurring, false) = false
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
    union all
    select
      em.envelope_id,
      p.amount_cents
    from envelope_months em
    join linked_categories lc
      on lc.envelope_id = em.envelope_id
    join lateral public.get_projected_scoped_recurring_expenses_v1(
      p_user_id => p_user_id,
      p_scope => v_scope,
      p_household_id => p_household_id,
      p_currency => v_currency,
      p_range_start => em.period_month,
      p_range_end => (em.period_month + interval '1 month - 1 day')::date
    ) p on true
    where lower(trim(coalesce(p.category, ''))) = lc.category
      and lower(coalesce(p.type, 'expense')) <> 'income'
  ),
  spent_by_month as (
    select
      msr.envelope_id,
      coalesce(sum(msr.amount_cents), 0)::bigint as spent_cents
    from monthly_spend_rows msr
    group by msr.envelope_id
  ),
  calculated as (
    select
      em.*,
      coalesce(sbm.spent_cents, 0)::bigint as spent_cents,
      case
        when em.rollover_enabled then public.calculate_pocket_rollover_carry_v1(
          p_user_id => p_user_id,
          p_scope => p_scope,
          p_household_id => p_household_id,
          p_currency => v_currency,
          p_envelope_name => em.name,
          p_rollover_group_id => em.rollover_group_id,
          p_period_month => em.period_month
        )
        else 0
      end::bigint as incoming_rollover_cents
    from envelope_months em
    left join spent_by_month sbm on sbm.envelope_id = em.envelope_id
  ),
  enriched as (
    select
      c.*,
      case
        when c.rollover_enabled then c.base_cents + c.incoming_rollover_cents + c.opening_rollover_cents - c.spent_cents
        else c.base_cents - c.spent_cents
      end::bigint as raw_remaining_cents
    from calculated c
  ),
  final_rows as (
    select
      e.*,
      case
        when e.rollover_enabled = false then 0
        when e.raw_remaining_cents < 0 and e.rollover_negative = false then 0
        when e.rollover_cap_cents is not null and e.raw_remaining_cents > e.rollover_cap_cents then e.rollover_cap_cents
        else e.raw_remaining_cents
      end::bigint as carry_to_next_cents,
      case
        when e.rollover_enabled
          and e.rollover_cap_cents is not null
          and e.raw_remaining_cents > e.rollover_cap_cents
          then e.raw_remaining_cents - e.rollover_cap_cents
        else 0
      end::bigint as cap_applied_cents,
      case
        when e.rollover_enabled
          and e.raw_remaining_cents < 0
          and e.rollover_negative = false
          then -e.raw_remaining_cents
        else 0
      end::bigint as negative_dropped_cents
    from enriched e
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'period_month', c.period_month,
        'name', c.name,
        'base_budget_cents', c.base_cents,
        'rollover_from_previous_cents',
          case when c.rollover_enabled then c.incoming_rollover_cents else 0 end,
        'opening_rollover_cents', c.opening_rollover_cents,
        'available_budget_cents',
          case
            when c.rollover_enabled then c.base_cents + c.incoming_rollover_cents + c.opening_rollover_cents
            else c.base_cents
          end,
        'spent_cents', c.spent_cents,
        'remaining_cents', c.raw_remaining_cents,
        'carry_to_next_cents', c.carry_to_next_cents,
        'rollover_enabled', c.rollover_enabled,
        'rollover_negative', c.rollover_negative,
        'rollover_cap_cents', c.rollover_cap_cents,
        'cap_applied_cents', c.cap_applied_cents,
        'negative_dropped_cents', c.negative_dropped_cents
      )
      order by c.period_month asc
    ),
    '[]'::jsonb
  )
  into v_rows
  from final_rows c;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

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
  v_is_service_role boolean :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
begin
  if not v_is_service_role then
    if auth.uid() is null or auth.uid() <> p_user_id then
      raise exception 'Unauthorized pocket rollover access'
        using errcode = '42501';
    end if;

    if v_scope <> 'personal' and (
      p_household_id is null or not exists (
        select 1
        from public.household_members hm
        where hm.household_id = p_household_id
          and hm.user_id = p_user_id
      )
    ) then
      raise exception 'Unauthorized household pocket rollover access'
        using errcode = '42501';
    end if;
  end if;

  if p_rollover_group_id is null or p_period_month is null then
    return jsonb_build_object(
      'period_month', p_period_month,
      'currency', v_currency,
      'total_incoming_rollover_cents', 0,
      'opening_rollover_cents', 0,
      'current_rollover_total_cents', 0,
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
    order by b.period_month desc, e.updated_at desc nulls last, e.created_at desc nulls last, e.id desc
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
      order by b.period_month asc, e.updated_at desc nulls last, e.created_at desc nulls last, e.id desc
    ),
    linked_categories as (
      select distinct
        em.envelope_id,
        lower(trim(coalesce(l.category, ''))) as category
      from envelope_months em
      join public.envelope_category_links l
        on l.envelope_id = em.envelope_id
      where lower(trim(coalesce(l.category, ''))) <> ''
    ),
    monthly_spend_rows as (
      select
        em.envelope_id,
        ex.amount_cents
      from envelope_months em
      join linked_categories lc
        on lc.envelope_id = em.envelope_id
      join public.expenses ex
        on lower(trim(coalesce(ex.category, ''))) = lc.category
       and coalesce(ex.is_recurring, false) = false
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
      union all
      select
        em.envelope_id,
        p.amount_cents
      from envelope_months em
      join linked_categories lc
        on lc.envelope_id = em.envelope_id
      join lateral public.get_projected_scoped_recurring_expenses_v1(
        p_user_id => p_user_id,
        p_scope => v_scope,
        p_household_id => p_household_id,
        p_currency => v_currency,
        p_range_start => em.period_month,
        p_range_end => (em.period_month + interval '1 month - 1 day')::date
      ) p on true
      where lower(trim(coalesce(p.category, ''))) = lc.category
        and lower(coalesce(p.type, 'expense')) <> 'income'
    ),
    spent_by_month as (
      select
        msr.envelope_id,
        coalesce(sum(msr.amount_cents), 0)::bigint as spent_cents
      from monthly_spend_rows msr
      group by msr.envelope_id
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
          'code', 'missing_month_carried_through',
          'message', 'Rollover was carried through missing month(s) between ' || v_previous_month || ' and ' || v_month.period_month,
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

revoke execute on function public.calculate_pocket_rollover_carry_v1(
  uuid,
  text,
  uuid,
  text,
  text,
  uuid,
  date
) from PUBLIC, anon;
grant execute on function public.calculate_pocket_rollover_carry_v1(
  uuid,
  text,
  uuid,
  text,
  text,
  uuid,
  date
) to authenticated, service_role;

revoke execute on function public.get_pocket_rollover_history_v1(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date,
  integer
) from PUBLIC, anon;
grant execute on function public.get_pocket_rollover_history_v1(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date,
  integer
) to authenticated, service_role;

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

comment on function public.calculate_pocket_rollover_carry_v1(
  uuid,
  text,
  uuid,
  text,
  text,
  uuid,
  date
) is
  'Returns rollover carry into a pocket month using actual non-recurring expenses plus projected recurring expenses. Missing months carry through unchanged.';

comment on function public.get_pocket_rollover_history_v1(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date,
  integer
) is
  'Returns rollover history using actual non-recurring expenses plus projected recurring expenses for each pocket month.';

comment on function public.get_pocket_rollover_breakdown_v1(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date
) is
  'Returns a full-lineage rollover contribution ledger using actual non-recurring expenses plus projected recurring expenses. Missing months carry through unchanged.';
