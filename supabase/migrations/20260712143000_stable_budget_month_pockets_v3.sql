create or replace function public.calculate_pocket_rollover_carry_v2(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_envelope_name text,
  p_rollover_group_id uuid,
  p_budget_month date
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_name text := lower(trim(coalesce(p_envelope_name, '')));
  v_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_previous_budget_month date := (date_trunc('month', p_budget_month)::date - interval '1 month')::date;
  v_carry bigint := 0;
  v_spent bigint;
  v_match record;
  v_period_start date;
  v_period_end date;
begin
  if (p_rollover_group_id is null and v_name = '') or p_budget_month is null then
    return 0;
  end if;

  for v_match in
    select distinct on (date_trunc('month', b.period_month)::date)
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
    where date_trunc('month', b.period_month)::date >= (v_previous_budget_month - interval '120 months')::date
      and date_trunc('month', b.period_month)::date <= v_previous_budget_month
      and upper(b.currency) = v_currency
      and (
        (p_rollover_group_id is not null and e.rollover_group_id = p_rollover_group_id)
        or (p_rollover_group_id is null and lower(trim(e.name)) = v_name)
      )
      and upper(e.currency) = v_currency
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by
      date_trunc('month', b.period_month)::date asc,
      (b.period_month = date_trunc('month', b.period_month)::date) desc,
      e.updated_at desc nulls last,
      e.created_at desc nulls last
  loop
    if v_match.envelope_id is null or v_match.rollover_enabled = false then
      v_carry := 0;
      continue;
    end if;

    v_period_start := public.financial_cycle_start_for_month(
      v_match.period_month,
      v_start_day
    );
    v_period_end := public.next_financial_cycle_start(v_period_start, v_start_day);

    select coalesce(sum(ex.amount_cents), 0)::bigint
    into v_spent
    from public.expenses ex
    join public.envelope_category_links l
      on l.envelope_id = v_match.envelope_id
     and lower(trim(coalesce(ex.category, ''))) = lower(trim(l.category))
    where lower(coalesce(ex.type::text, 'expense')) <> 'income'
      and upper(coalesce(ex.currency, '')) = v_currency
      and ex.deleted_at is null
      and ex.date >= v_period_start
      and ex.date < v_period_end
      and (
        (v_scope = 'household' and ex.household_id = p_household_id)
        or (v_scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
        or (v_scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
      );

    v_carry := coalesce(v_match.base_cents, 0) + coalesce(v_carry, 0) +
      coalesce(v_match.opening_rollover_cents, 0) - coalesce(v_spent, 0);

    if v_carry < 0 and v_match.rollover_negative = false then
      v_carry := 0;
    elsif v_match.rollover_cap_cents is not null and v_carry > v_match.rollover_cap_cents then
      v_carry := v_match.rollover_cap_cents;
    end if;
  end loop;

  return coalesce(v_carry, 0);
end;
$$;

create or replace function public.get_pocket_rollover_history_v2(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_rollover_group_id uuid,
  p_budget_month date,
  p_limit_months integer default 12
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_budget_month date := date_trunc('month', p_budget_month)::date;
  v_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_limit integer := greatest(1, least(coalesce(p_limit_months, 12), 36));
  v_rows jsonb;
begin
  if p_rollover_group_id is null or p_budget_month is null then
    return '[]'::jsonb;
  end if;

  with envelope_months as (
    select distinct on (date_trunc('month', b.period_month)::date)
      b.period_month as budget_month,
      public.financial_cycle_start_for_month(b.period_month, v_start_day) as period_start,
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
    where date_trunc('month', b.period_month)::date <= v_budget_month
      and upper(b.currency) = v_currency
      and upper(e.currency) = v_currency
      and e.rollover_group_id = p_rollover_group_id
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by
      date_trunc('month', b.period_month)::date desc,
      (b.period_month = date_trunc('month', b.period_month)::date) desc,
      e.updated_at desc nulls last,
      e.created_at desc nulls last
    limit v_limit
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
     and ex.date >= em.period_start
     and ex.date < public.next_financial_cycle_start(em.period_start, v_start_day)
     and (
       (v_scope = 'household' and ex.household_id = p_household_id)
       or (v_scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
       or (v_scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
     )
    group by em.envelope_id
  ),
  calculated as (
    select
      em.*,
      coalesce(sbm.spent_cents, 0)::bigint as spent_cents,
      case
        when em.rollover_enabled then public.calculate_pocket_rollover_carry_v2(
          p_user_id => p_user_id,
          p_scope => p_scope,
          p_household_id => p_household_id,
          p_currency => v_currency,
          p_envelope_name => em.name,
          p_rollover_group_id => em.rollover_group_id,
          p_budget_month => em.budget_month
        )
        else 0
      end::bigint as incoming_rollover_cents
    from envelope_months em
    left join spent_by_month sbm on sbm.envelope_id = em.envelope_id
  ),
  balances as (
    select
      c.*,
      case when c.rollover_enabled
        then c.base_cents + c.incoming_rollover_cents + c.opening_rollover_cents
        else c.base_cents
      end::bigint as available_cents
    from calculated c
  ),
  carry_values as (
    select
      b.*,
      (b.available_cents - b.spent_cents)::bigint as remaining_cents,
      case
        when b.rollover_enabled = false then 0
        when b.available_cents - b.spent_cents < 0 and b.rollover_negative = false then 0
        when b.rollover_cap_cents is not null and b.available_cents - b.spent_cents > b.rollover_cap_cents then b.rollover_cap_cents
        else b.available_cents - b.spent_cents
      end::bigint as carry_to_next_cents
    from balances b
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'period_month', cv.period_start,
    'budget_month', cv.budget_month,
    'name', cv.name,
    'base_budget_cents', cv.base_cents,
    'rollover_from_previous_cents', cv.incoming_rollover_cents,
    'opening_rollover_cents', cv.opening_rollover_cents,
    'available_budget_cents', cv.available_cents,
    'spent_cents', cv.spent_cents,
    'remaining_cents', cv.remaining_cents,
    'carry_to_next_cents', cv.carry_to_next_cents,
    'rollover_enabled', cv.rollover_enabled,
    'rollover_negative', cv.rollover_negative,
    'rollover_cap_cents', cv.rollover_cap_cents,
    'cap_applied_cents', greatest(cv.remaining_cents - cv.carry_to_next_cents, 0),
    'negative_dropped_cents', case
      when cv.remaining_cents < 0 and cv.rollover_negative = false then abs(cv.remaining_cents)
      else 0
    end
  ) order by cv.budget_month asc), '[]'::jsonb)
  into v_rows
  from carry_values cv;

  return v_rows;
end;
$$;

create or replace function public.get_pocket_rollover_breakdown_v2(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_rollover_group_id uuid,
  p_budget_month date
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_history jsonb;
  v_current jsonb;
  v_next_period date;
begin
  v_history := public.get_pocket_rollover_history_v2(
    p_user_id,
    p_scope,
    p_household_id,
    p_currency,
    p_rollover_group_id,
    p_budget_month,
    12
  );
  v_current := coalesce(v_history -> (jsonb_array_length(v_history) - 1), '{}'::jsonb);
  v_next_period := public.next_financial_cycle_start(
    coalesce((v_current ->> 'period_month')::date, public.financial_cycle_start_for_month(p_budget_month, public.user_financial_month_start_day(p_user_id))),
    public.user_financial_month_start_day(p_user_id)
  );

  return jsonb_build_object(
    'period_month', coalesce(v_current ->> 'period_month', p_budget_month::text),
    'currency', upper(coalesce(nullif(trim(p_currency), ''), 'USD')),
    'total_incoming_rollover_cents', coalesce((v_current ->> 'rollover_from_previous_cents')::bigint, 0),
    'opening_rollover_cents', coalesce((v_current ->> 'opening_rollover_cents')::bigint, 0),
    'current_rollover_total_cents', coalesce((v_current ->> 'rollover_from_previous_cents')::bigint, 0) + coalesce((v_current ->> 'opening_rollover_cents')::bigint, 0),
    'contributions', '[]'::jsonb,
    'adjustments', '[]'::jsonb,
    'monthly_history', v_history,
    'warnings', '[]'::jsonb,
    'next_month_preview', jsonb_build_object(
      'period_month', v_next_period,
      'raw_carry_cents', coalesce((v_current ->> 'remaining_cents')::bigint, 0),
      'carry_cents', coalesce((v_current ->> 'carry_to_next_cents')::bigint, 0),
      'cap_applied_cents', coalesce((v_current ->> 'cap_applied_cents')::bigint, 0),
      'negative_dropped_cents', coalesce((v_current ->> 'negative_dropped_cents')::bigint, 0),
      'rollover_negative', coalesce((v_current ->> 'rollover_negative')::boolean, false),
      'rollover_cap_cents', (v_current ->> 'rollover_cap_cents')::bigint
    )
  );
end;
$$;

do $$
begin
  if to_regprocedure('public.get_pockets_month_v2_financial_impl(uuid,text,date,uuid,text,boolean,boolean)') is null
     and to_regprocedure('public.get_pockets_month_v2(uuid,text,date,uuid,text,boolean,boolean)') is not null then
    alter function public.get_pockets_month_v2(
      uuid,
      text,
      date,
      uuid,
      text,
      boolean,
      boolean
    ) rename to get_pockets_month_v2_financial_impl;
  end if;
end $$;

create or replace function public.get_pockets_month_v3(
  p_user_id uuid,
  p_scope text,
  p_budget_month date,
  p_household_id uuid default null,
  p_currency text default null,
  p_include_projected_recurring boolean default true,
  p_allow_currency_fallback boolean default false
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_budget_month date := date_trunc('month', p_budget_month)::date;
  v_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_period_start date;
  v_previous_budget_month date;
  v_period_payload jsonb;
  v_anchor_payload jsonb;
  v_previous_payload jsonb;
  v_structure_payload jsonb;
  v_payload jsonb;
  v_previous_budget_cents bigint := 0;
  v_has_previous_month_pockets boolean := false;
begin
  if p_budget_month is null then
    raise exception 'Missing budget month'
      using errcode = '22023';
  end if;

  v_period_start := public.financial_cycle_start_for_month(
    v_budget_month,
    v_start_day
  );
  v_previous_budget_month := (v_budget_month - interval '1 month')::date;

  -- The period payload owns transaction and recurring calculations. Its date
  -- range is the user's custom financial cycle and never changes stored keys.
  v_period_payload := public.get_pockets_month_v2_financial_impl(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_period_month => v_period_start,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_include_projected_recurring => p_include_projected_recurring,
    p_allow_currency_fallback => p_allow_currency_fallback
  );

  -- Budget configuration remains keyed by the stable first day of the anchor
  -- month. This keeps every pre-feature budget visible and allows users to
  -- change their financial start day without rewriting historical data.
  v_anchor_payload := public.get_pockets_month_v1(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_period_month => v_budget_month,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_allow_currency_fallback => p_allow_currency_fallback
  );

  -- A short-lived feature rollout may already have written a custom-date key.
  -- Prefer the stable row, but retain the custom row as a compatibility source
  -- until the next write naturally rekeys it to the stable anchor.
  v_structure_payload := case
    when v_anchor_payload -> 'budget' <> 'null'::jsonb
      or jsonb_array_length(coalesce(v_anchor_payload -> 'envelopes', '[]'::jsonb)) > 0
      then v_anchor_payload
    else v_period_payload
  end;

  if nullif(v_structure_payload ->> 'selected_currency', '') is not null
     and upper(v_structure_payload ->> 'selected_currency') is distinct from upper(v_period_payload ->> 'selected_currency') then
    v_period_payload := public.get_pockets_month_v2_financial_impl(
      p_user_id => p_user_id,
      p_scope => p_scope,
      p_period_month => v_period_start,
      p_household_id => p_household_id,
      p_currency => v_structure_payload ->> 'selected_currency',
      p_include_projected_recurring => p_include_projected_recurring,
      p_allow_currency_fallback => false
    );
  end if;

  v_previous_payload := public.get_pockets_month_v1(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_period_month => v_previous_budget_month,
    p_household_id => p_household_id,
    p_currency => coalesce(v_structure_payload ->> 'selected_currency', p_currency),
    p_allow_currency_fallback => p_allow_currency_fallback
  );

  v_previous_budget_cents := coalesce(
    (v_previous_payload -> 'budget' ->> 'total_budget_cents')::bigint,
    nullif(v_structure_payload ->> 'previous_budget_cents', '')::bigint,
    0
  );
  v_has_previous_month_pockets :=
    jsonb_array_length(coalesce(v_previous_payload -> 'envelopes', '[]'::jsonb)) > 0
    or coalesce((v_structure_payload ->> 'has_previous_month_pockets')::boolean, false);

  with envelope_base as (
    select
      value as row,
      nullif(value ->> 'id', '')::uuid as envelope_id,
      coalesce(a.amount_cents, e.budget_amount_cents, (value ->> 'budget_amount_cents')::bigint, 0)::bigint as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents,
      e.rollover_group_id
    from jsonb_array_elements(coalesce(v_structure_payload -> 'envelopes', '[]'::jsonb)) value
    left join public.budget_envelopes e
      on e.id = nullif(value ->> 'id', '')::uuid
    left join public.envelope_allocations a
      on a.envelope_id = e.id
     and a.period_month = v_budget_month
  ),
  monthly_rows as (
    select value as row
    from jsonb_array_elements(coalesce(v_period_payload -> 'actual_expenses', '[]'::jsonb)) value
    union all
    select value as row
    from jsonb_array_elements(coalesce(v_period_payload -> 'projected_recurring_expenses', '[]'::jsonb)) value
  ),
  link_rows as (
    select
      nullif(value ->> 'envelope_id', '')::uuid as envelope_id,
      lower(trim(coalesce(value ->> 'category', ''))) as category
    from jsonb_array_elements(coalesce(v_structure_payload -> 'category_links', '[]'::jsonb)) value
    where nullif(value ->> 'envelope_id', '') is not null
  ),
  linked_categories as (
    select distinct category from link_rows where category <> ''
  ),
  spent_rows as (
    select
      lr.envelope_id,
      coalesce(sum((mr.row ->> 'amount_cents')::bigint), 0)::bigint as spent_cents
    from link_rows lr
    left join monthly_rows mr
      on lower(trim(coalesce(mr.row ->> 'category', 'uncategorized'))) = lr.category
    group by lr.envelope_id
  ),
  total_spend as (
    select coalesce(sum((row ->> 'amount_cents')::bigint), 0)::bigint as total_spend_cents
    from monthly_rows
  ),
  category_totals as (
    select
      lower(trim(coalesce(row ->> 'category', 'uncategorized'))) as category,
      coalesce(sum((row ->> 'amount_cents')::bigint), 0)::bigint as amount_cents
    from monthly_rows
    group by 1
  ),
  uncategorized_totals as (
    select ct.category, ct.amount_cents
    from category_totals ct
    where not exists (
      select 1 from linked_categories lc where lc.category = ct.category
    )
  ),
  uncategorized_expenses as (
    select
      lower(trim(coalesce(mr.row ->> 'category', 'uncategorized'))) as category,
      jsonb_agg(mr.row order by (mr.row ->> 'date')::date desc) as expenses
    from monthly_rows mr
    where not exists (
      select 1
      from linked_categories lc
      where lc.category = lower(trim(coalesce(mr.row ->> 'category', 'uncategorized')))
    )
    group by 1
  ),
  rollover_rows as (
    select
      eb.*,
      coalesce(sr.spent_cents, 0)::bigint as spent_cents,
      case
        when eb.rollover_enabled then public.calculate_pocket_rollover_carry_v2(
          p_user_id => p_user_id,
          p_scope => p_scope,
          p_household_id => p_household_id,
          p_currency => coalesce(v_structure_payload ->> 'selected_currency', p_currency),
          p_envelope_name => eb.row ->> 'name',
          p_rollover_group_id => eb.rollover_group_id,
          p_budget_month => v_budget_month
        )
        else 0
      end::bigint as incoming_rollover_cents
    from envelope_base eb
    left join spent_rows sr on sr.envelope_id = eb.envelope_id
  ),
  enriched_envelopes as (
    select coalesce(
      jsonb_agg(
        rr.row || jsonb_build_object(
          'rollover_enabled', rr.rollover_enabled,
          'rollover_negative', rr.rollover_negative,
          'rollover_cap_cents', rr.rollover_cap_cents,
          'opening_rollover_cents', rr.opening_rollover_cents,
          'rollover_group_id', rr.rollover_group_id,
          'base_budget_amount_cents', rr.base_cents,
          'rollover_from_previous_cents', rr.incoming_rollover_cents,
          'available_budget_cents', case
            when rr.rollover_enabled then rr.base_cents + rr.incoming_rollover_cents + rr.opening_rollover_cents
            else rr.base_cents
          end,
          'spent_cents', rr.spent_cents,
          'remaining_cents', case
            when rr.rollover_enabled then rr.base_cents + rr.incoming_rollover_cents + rr.opening_rollover_cents - rr.spent_cents
            else rr.base_cents - rr.spent_cents
          end
        )
        order by rr.row ->> 'name'
      ),
      '[]'::jsonb
    ) as rows
    from rollover_rows rr
  )
  select v_period_payload || jsonb_build_object(
    'period_month', v_period_start,
    'budget_month', v_budget_month,
    'selected_currency', coalesce(
      v_structure_payload ->> 'selected_currency',
      v_period_payload ->> 'selected_currency',
      upper(p_currency)
    ),
    'budget', v_structure_payload -> 'budget',
    'previous_budget_cents', v_previous_budget_cents,
    'has_previous_month_pockets', v_has_previous_month_pockets,
    'envelopes', (select rows from enriched_envelopes),
    'allocations', coalesce(v_structure_payload -> 'allocations', '[]'::jsonb),
    'category_links', coalesce(v_structure_payload -> 'category_links', '[]'::jsonb),
    'spent_by_envelope', coalesce((
      select jsonb_agg(jsonb_build_object(
        'envelope_id', sr.envelope_id,
        'spent_cents', sr.spent_cents
      ) order by sr.envelope_id)
      from spent_rows sr
    ), '[]'::jsonb),
    'total_spend_cents', coalesce((select total_spend_cents from total_spend), 0),
    'uncategorized_totals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', ut.category,
        'amount_cents', ut.amount_cents
      ) order by ut.amount_cents desc, ut.category asc)
      from uncategorized_totals ut
    ), '[]'::jsonb),
    'uncategorized_expenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', ue.category,
        'expenses', ue.expenses
      ) order by ue.category asc)
      from uncategorized_expenses ue
    ), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

revoke execute on function public.calculate_pocket_rollover_carry_v2(
  uuid,
  text,
  uuid,
  text,
  text,
  uuid,
  date
) from public, anon;

grant execute on function public.calculate_pocket_rollover_carry_v2(
  uuid,
  text,
  uuid,
  text,
  text,
  uuid,
  date
) to authenticated, service_role;

revoke execute on function public.get_pocket_rollover_history_v2(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date,
  integer
) from public, anon;

grant execute on function public.get_pocket_rollover_history_v2(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date,
  integer
) to authenticated, service_role;

revoke execute on function public.get_pocket_rollover_breakdown_v2(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date
) from public, anon;

grant execute on function public.get_pocket_rollover_breakdown_v2(
  uuid,
  text,
  uuid,
  text,
  uuid,
  date
) to authenticated, service_role;

create or replace function public.get_pockets_month_v2(
  p_user_id uuid,
  p_scope text,
  p_period_month date,
  p_household_id uuid default null,
  p_currency text default null,
  p_include_projected_recurring boolean default true,
  p_allow_currency_fallback boolean default false
) returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.get_pockets_month_v3(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_budget_month => date_trunc('month', p_period_month)::date,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_include_projected_recurring => p_include_projected_recurring,
    p_allow_currency_fallback => p_allow_currency_fallback
  );
$$;

revoke execute on function public.get_pockets_month_v2(
  uuid,
  text,
  date,
  uuid,
  text,
  boolean,
  boolean
) from public, anon;

grant execute on function public.get_pockets_month_v2(
  uuid,
  text,
  date,
  uuid,
  text,
  boolean,
  boolean
) to authenticated, service_role;

revoke execute on function public.get_pockets_month_v3(
  uuid,
  text,
  date,
  uuid,
  text,
  boolean,
  boolean
) from public, anon;

grant execute on function public.get_pockets_month_v3(
  uuid,
  text,
  date,
  uuid,
  text,
  boolean,
  boolean
) to authenticated, service_role;
