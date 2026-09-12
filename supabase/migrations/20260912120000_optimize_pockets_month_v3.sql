-- Keep the public v3 response unchanged while removing its two hot-path costs:
-- repeated full month calculations and one historical expense query per envelope.

create or replace function public.get_pockets_month_structure_v1(
  p_user_id uuid,
  p_scope text,
  p_period_month date,
  p_household_id uuid default null,
  p_currency text default null,
  p_allow_currency_fallback boolean default false
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_requested_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_budget_id uuid;
  v_currency text;
  v_budget_total_cents bigint;
  v_previous_budget_cents bigint := 0;
  v_has_previous_month_pockets boolean := false;
  v_previous_budget_id uuid;
  v_previous_month date;
  v_financial_month_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized pockets access' using errcode = '42501';
  end if;

  if v_scope not in ('personal', 'portfolio', 'household') then
    raise exception 'Invalid pockets scope' using errcode = '22023';
  end if;

  if v_scope <> 'personal' then
    if p_household_id is null then
      raise exception 'Missing household_id for scoped pockets' using errcode = '22023';
    end if;
    if not exists (
      select 1
      from public.household_members hm
      where hm.household_id = p_household_id
        and hm.user_id = p_user_id
    ) then
      raise exception 'Unauthorized household pockets access' using errcode = '42501';
    end if;
  end if;

  with budget_exact as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where b.period_month = p_period_month
      and upper(b.currency) = v_requested_currency
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ), budget_any_currency as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where p_allow_currency_fallback
      and not exists (select 1 from budget_exact)
      and b.period_month = p_period_month
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ), budget_legacy_personal_exact as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where v_scope = 'personal'
      and not exists (select 1 from budget_exact)
      and not exists (select 1 from budget_any_currency)
      and b.period_month = p_period_month
      and upper(b.currency) = v_requested_currency
      and b.household_id is null
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ), budget_legacy_personal_any_currency as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where v_scope = 'personal'
      and p_allow_currency_fallback
      and not exists (select 1 from budget_exact)
      and not exists (select 1 from budget_any_currency)
      and not exists (select 1 from budget_legacy_personal_exact)
      and b.period_month = p_period_month
      and b.household_id is null
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ), budget_final as (
    select * from budget_exact
    union all select * from budget_any_currency
    union all select * from budget_legacy_personal_exact
    union all select * from budget_legacy_personal_any_currency
    limit 1
  )
  select id, upper(currency), total_budget_cents
  into v_budget_id, v_currency, v_budget_total_cents
  from budget_final;

  v_currency := coalesce(v_currency, v_requested_currency);

  -- Retain the legacy attachment side effect from v1 without building expense JSON.
  if v_budget_id is not null and not exists (
    select 1 from public.budget_envelopes e
    where e.budget_id = v_budget_id
      and upper(e.currency) = v_currency
      and (
        (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
        or (v_scope = 'household' and e.household_id = p_household_id)
      )
  ) then
    update public.budget_envelopes e
    set budget_id = v_budget_id, updated_at = now()
    where e.budget_id is null
      and upper(e.currency) = v_currency
      and (
        (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
        or (v_scope = 'household' and e.household_id = p_household_id)
      );
  end if;

  if v_budget_id is null then
    select b.total_budget_cents into v_previous_budget_cents
    from public.budgets b
    where b.period_month < p_period_month
      and upper(b.currency) = v_currency
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by b.period_month desc
    limit 1;
  end if;

  v_previous_month := public.previous_financial_cycle_start(
    p_period_month,
    v_financial_month_start_day
  );
  select b.id into v_previous_budget_id
  from public.budgets b
  where b.period_month = v_previous_month
    and upper(b.currency) = v_currency
    and (
      (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
      or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
      or (v_scope = 'household' and b.household_id = p_household_id)
    )
  order by b.updated_at desc nulls last, b.created_at desc nulls last
  limit 1;

  if v_previous_budget_id is not null then
    v_has_previous_month_pockets := exists (
      select 1 from public.budget_envelopes e
      where e.budget_id = v_previous_budget_id
        and upper(e.currency) = v_currency
        and (
          (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
          or (v_scope = 'household' and e.household_id = p_household_id)
        )
    );
  end if;

  with envelope_rows as (
    select e.id, e.name, e.budget_amount_cents, e.household_id,
      upper(e.currency) as currency, e.icon, e.color, e.budget_id
    from public.budget_envelopes e
    where e.budget_id = v_budget_id
      and upper(e.currency) = v_currency
      and (
        (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
        or (v_scope = 'household' and e.household_id = p_household_id)
      )
  ), allocations as (
    select ea.envelope_id, ea.amount_cents
    from public.envelope_allocations ea
    where ea.period_month = p_period_month
      and ea.envelope_id in (select id from envelope_rows)
  ), links as (
    select l.envelope_id, lower(trim(coalesce(l.category, ''))) as category
    from public.envelope_category_links l
    where l.envelope_id in (select id from envelope_rows)
  )
  select jsonb_build_object(
    'selected_currency', v_currency,
    'budget', case when v_budget_id is null then null else jsonb_build_object(
      'id', v_budget_id,
      'currency', v_currency,
      'period_month', p_period_month,
      'total_budget_cents', v_budget_total_cents
    ) end,
    'previous_budget_cents', coalesce(v_previous_budget_cents, 0),
    'has_previous_month_pockets', v_has_previous_month_pockets,
    'envelopes', coalesce((select jsonb_agg(jsonb_build_object(
      'id', er.id, 'name', er.name, 'budget_amount_cents', er.budget_amount_cents,
      'household_id', er.household_id, 'currency', er.currency, 'icon', er.icon,
      'color', er.color, 'budget_id', er.budget_id
    ) order by er.name) from envelope_rows er), '[]'::jsonb),
    'allocations', coalesce((select jsonb_agg(jsonb_build_object(
      'envelope_id', a.envelope_id, 'amount_cents', a.amount_cents
    )) from allocations a), '[]'::jsonb),
    'category_links', coalesce((select jsonb_agg(jsonb_build_object(
      'envelope_id', l.envelope_id, 'category', l.category
    )) from links l), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

create or replace function public.calculate_pocket_rollovers_batch_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_budget_month date,
  p_target_envelope_ids uuid[]
) returns table (envelope_id uuid, incoming_rollover_cents bigint)
language sql
security invoker
set search_path = public
as $$
  with recursive
  settings as (
    select
      lower(coalesce(nullif(trim(p_scope), ''), 'personal')) as scope,
      upper(coalesce(nullif(trim(p_currency), ''), 'USD')) as currency,
      public.user_financial_month_start_day(p_user_id) as start_day,
      (date_trunc('month', p_budget_month)::date - interval '1 month')::date as previous_budget_month
  ), targets as (
    select e.id as target_envelope_id, e.rollover_group_id,
      lower(trim(coalesce(e.name, ''))) as normalized_name
    from public.budget_envelopes e
    where e.id = any(coalesce(p_target_envelope_ids, '{}'::uuid[]))
      and coalesce(e.rollover_enabled, false)
      and (e.rollover_group_id is not null or lower(trim(coalesce(e.name, ''))) <> '')
  ), historical_raw as (
    select
      t.target_envelope_id,
      date_trunc('month', b.period_month)::date as month_key,
      b.period_month,
      e.id as historical_envelope_id,
      coalesce(a.amount_cents, e.budget_amount_cents, 0)::bigint as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents,
      public.financial_cycle_start_for_month(b.period_month, s.start_day) as period_start,
      public.next_financial_cycle_start(
        public.financial_cycle_start_for_month(b.period_month, s.start_day), s.start_day
      ) as period_end,
      e.updated_at,
      e.created_at
    from targets t
    cross join settings s
    join public.budgets b on
      b.period_month >= (s.previous_budget_month - interval '120 months')::date
      and b.period_month < (s.previous_budget_month + interval '1 month')::date
      and upper(b.currency) = s.currency
      and (
        (s.scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (s.scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (s.scope = 'household' and b.household_id = p_household_id)
      )
    join public.budget_envelopes e on e.budget_id = b.id
      and upper(e.currency) = s.currency
      and (
        (t.rollover_group_id is not null and e.rollover_group_id = t.rollover_group_id)
        or (t.rollover_group_id is null and lower(trim(e.name)) = t.normalized_name)
      )
    left join public.envelope_allocations a
      on a.envelope_id = e.id and a.period_month = b.period_month
  ), historical as (
    select distinct on (target_envelope_id, month_key)
      target_envelope_id, month_key, period_month, historical_envelope_id,
      base_cents, rollover_enabled, rollover_negative, rollover_cap_cents,
      opening_rollover_cents, period_start, period_end
    from historical_raw
    order by target_envelope_id, month_key,
      (period_month = month_key) desc, updated_at desc nulls last, created_at desc nulls last
  ), scoped_expenses as materialized (
    select ex.date, ex.amount_cents, ex.analytics_spending_multiplier,
      lower(trim(coalesce(ex.category, ''))) as normalized_category
    from public.expenses ex
    cross join settings s
    where ex.analytics_is_final
      and ex.analytics_spending_multiplier <> 0
      and upper(coalesce(ex.currency, '')) = s.currency
      and ex.deleted_at is null
      and ex.date >= (select min(period_start) from historical)
      and ex.date < (select max(period_end) from historical)
      and (
        (s.scope = 'household' and ex.household_id = p_household_id)
        or (s.scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
        or (s.scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
      )
  ), spent_by_month as (
    select h.target_envelope_id, h.historical_envelope_id,
      coalesce(sum(ex.amount_cents * ex.analytics_spending_multiplier), 0)::bigint as spent_cents
    from historical h
    left join public.envelope_category_links l on l.envelope_id = h.historical_envelope_id
    left join scoped_expenses ex
      on ex.normalized_category = lower(trim(coalesce(l.category, '')))
      and ex.date >= h.period_start and ex.date < h.period_end
    group by h.target_envelope_id, h.historical_envelope_id
  ), historical_with_spend as (
    select h.*, coalesce(sbm.spent_cents, 0)::bigint as spent_cents,
      row_number() over (partition by h.target_envelope_id order by h.month_key) as sequence_number
    from historical h
    left join spent_by_month sbm
      on sbm.target_envelope_id = h.target_envelope_id
      and sbm.historical_envelope_id = h.historical_envelope_id
  ), carries as (
    select
      h.target_envelope_id, h.sequence_number,
      case
        when not h.rollover_enabled then 0::bigint
        when h.base_cents + h.opening_rollover_cents - h.spent_cents < 0
          and not h.rollover_negative then 0::bigint
        when h.rollover_cap_cents is not null
          and h.base_cents + h.opening_rollover_cents - h.spent_cents > h.rollover_cap_cents
          then h.rollover_cap_cents
        else h.base_cents + h.opening_rollover_cents - h.spent_cents
      end::bigint as carry_cents
    from historical_with_spend h
    where h.sequence_number = 1

    union all

    select
      h.target_envelope_id, h.sequence_number,
      case
        when not h.rollover_enabled then 0::bigint
        when h.base_cents + c.carry_cents + h.opening_rollover_cents - h.spent_cents < 0
          and not h.rollover_negative then 0::bigint
        when h.rollover_cap_cents is not null
          and h.base_cents + c.carry_cents + h.opening_rollover_cents - h.spent_cents > h.rollover_cap_cents
          then h.rollover_cap_cents
        else h.base_cents + c.carry_cents + h.opening_rollover_cents - h.spent_cents
      end::bigint as carry_cents
    from carries c
    join historical_with_spend h
      on h.target_envelope_id = c.target_envelope_id
      and h.sequence_number = c.sequence_number + 1
  ), latest_carry as (
    select distinct on (target_envelope_id) target_envelope_id, carry_cents
    from carries
    order by target_envelope_id, sequence_number desc
  )
  select t.target_envelope_id, coalesce(lc.carry_cents, 0)::bigint
  from targets t
  left join latest_carry lc on lc.target_envelope_id = t.target_envelope_id;
$$;

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
  v_anchor_structure jsonb;
  v_structure_payload jsonb;
  v_period_payload jsonb;
  v_previous_structure jsonb;
  v_payload jsonb;
  v_effective_currency text;
  v_has_structure boolean;
  v_previous_budget_cents bigint := 0;
  v_has_previous_month_pockets boolean := false;
begin
  if p_budget_month is null then
    raise exception 'Missing budget month' using errcode = '22023';
  end if;

  v_period_start := public.financial_cycle_start_for_month(v_budget_month, v_start_day);
  v_previous_budget_month := (v_budget_month - interval '1 month')::date;

  -- Preserve the released ordering: this call may attach legacy unbound
  -- envelopes to a custom-date budget before the stable anchor is inspected.
  v_period_payload := public.get_pockets_month_v2_financial_impl(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_period_month => v_period_start,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_include_projected_recurring => p_include_projected_recurring,
    p_allow_currency_fallback => p_allow_currency_fallback
  );

  v_anchor_structure := public.get_pockets_month_structure_v1(
    p_user_id, p_scope, v_budget_month, p_household_id, p_currency, p_allow_currency_fallback
  );
  v_has_structure := v_anchor_structure -> 'budget' <> 'null'::jsonb
    or jsonb_array_length(coalesce(v_anchor_structure -> 'envelopes', '[]'::jsonb)) > 0;

  if v_has_structure then
    v_structure_payload := v_anchor_structure;
  else
    v_structure_payload := v_period_payload;
    v_has_structure := v_period_payload -> 'budget' <> 'null'::jsonb
      or jsonb_array_length(coalesce(v_period_payload -> 'envelopes', '[]'::jsonb)) > 0;
  end if;

  v_effective_currency := nullif(v_structure_payload ->> 'selected_currency', '');
  if v_effective_currency is not null
     and upper(v_effective_currency) is distinct from upper(v_period_payload ->> 'selected_currency') then
    v_period_payload := public.get_pockets_month_v2_financial_impl(
      p_user_id => p_user_id,
      p_scope => p_scope,
      p_period_month => v_period_start,
      p_household_id => p_household_id,
      p_currency => v_effective_currency,
      p_include_projected_recurring => p_include_projected_recurring,
      p_allow_currency_fallback => false
    );
  end if;

  -- Structure-only v1 preserves its budget selection, authorization, and legacy
  -- attachment behavior without constructing historical expense JSON.
  v_previous_structure := public.get_pockets_month_structure_v1(
    p_user_id,
    p_scope,
    v_previous_budget_month,
    p_household_id,
    coalesce(v_structure_payload ->> 'selected_currency', p_currency),
    p_allow_currency_fallback
  );
  v_previous_budget_cents := coalesce(
    (v_previous_structure -> 'budget' ->> 'total_budget_cents')::bigint,
    nullif(v_structure_payload ->> 'previous_budget_cents', '')::bigint,
    0
  );
  v_has_previous_month_pockets :=
    jsonb_array_length(coalesce(v_previous_structure -> 'envelopes', '[]'::jsonb)) > 0
    or coalesce((v_structure_payload ->> 'has_previous_month_pockets')::boolean, false);

  with envelope_base as (
    select value as row, nullif(value ->> 'id', '')::uuid as envelope_id,
      coalesce(a.amount_cents, e.budget_amount_cents, (value ->> 'budget_amount_cents')::bigint, 0)::bigint as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents, coalesce(e.opening_rollover_cents, 0)::bigint as opening_rollover_cents,
      e.rollover_group_id
    from jsonb_array_elements(coalesce(v_structure_payload -> 'envelopes', '[]'::jsonb)) value
    left join public.budget_envelopes e on e.id = nullif(value ->> 'id', '')::uuid
    left join public.envelope_allocations a on a.envelope_id = e.id and a.period_month = v_budget_month
  ), monthly_rows as materialized (
    select value as row,
      lower(trim(coalesce(value ->> 'category', 'uncategorized'))) as category,
      coalesce((value ->> 'amount_cents')::bigint, 0)::bigint as amount_cents,
      (value ->> 'date')::date as expense_date
    from jsonb_array_elements(coalesce(v_period_payload -> 'actual_expenses', '[]'::jsonb)) value
    union all
    select value, lower(trim(coalesce(value ->> 'category', 'uncategorized'))),
      coalesce((value ->> 'amount_cents')::bigint, 0)::bigint, (value ->> 'date')::date
    from jsonb_array_elements(coalesce(v_period_payload -> 'projected_recurring_expenses', '[]'::jsonb)) value
  ), link_rows as (
    select nullif(value ->> 'envelope_id', '')::uuid as envelope_id,
      lower(trim(coalesce(value ->> 'category', ''))) as category
    from jsonb_array_elements(coalesce(v_structure_payload -> 'category_links', '[]'::jsonb)) value
    where nullif(value ->> 'envelope_id', '') is not null
  ), linked_categories as (
    select distinct category from link_rows where category <> ''
  ), spent_rows as (
    select lr.envelope_id, coalesce(sum(mr.amount_cents), 0)::bigint as spent_cents
    from link_rows lr left join monthly_rows mr on mr.category = lr.category
    group by lr.envelope_id
  ), total_spend as (
    select coalesce(sum(amount_cents), 0)::bigint as total_spend_cents from monthly_rows
  ), category_totals as (
    select category, coalesce(sum(amount_cents), 0)::bigint as amount_cents
    from monthly_rows group by category
  ), uncategorized_totals as (
    select ct.category, ct.amount_cents from category_totals ct
    where not exists (select 1 from linked_categories lc where lc.category = ct.category)
  ), uncategorized_expenses as (
    select mr.category, jsonb_agg(mr.row order by mr.expense_date desc) as expenses
    from monthly_rows mr
    where not exists (select 1 from linked_categories lc where lc.category = mr.category)
    group by mr.category
  ), rollover_carries as (
    select r.envelope_id, r.incoming_rollover_cents
    from public.calculate_pocket_rollovers_batch_v1(
      p_user_id, p_scope, p_household_id,
      coalesce(v_effective_currency, p_currency), v_budget_month,
      array(select envelope_id from envelope_base where rollover_enabled and envelope_id is not null)
    ) r
  ), rollover_rows as (
    select eb.*, coalesce(sr.spent_cents, 0)::bigint as spent_cents,
      coalesce(rc.incoming_rollover_cents, 0)::bigint as incoming_rollover_cents
    from envelope_base eb
    left join spent_rows sr on sr.envelope_id = eb.envelope_id
    left join rollover_carries rc on rc.envelope_id = eb.envelope_id
  ), enriched_envelopes as (
    select coalesce(jsonb_agg(rr.row || jsonb_build_object(
      'rollover_enabled', rr.rollover_enabled, 'rollover_negative', rr.rollover_negative,
      'rollover_cap_cents', rr.rollover_cap_cents, 'opening_rollover_cents', rr.opening_rollover_cents,
      'rollover_group_id', rr.rollover_group_id, 'base_budget_amount_cents', rr.base_cents,
      'rollover_from_previous_cents', rr.incoming_rollover_cents,
      'available_budget_cents', case when rr.rollover_enabled then rr.base_cents + rr.incoming_rollover_cents + rr.opening_rollover_cents else rr.base_cents end,
      'spent_cents', rr.spent_cents,
      'remaining_cents', case when rr.rollover_enabled then rr.base_cents + rr.incoming_rollover_cents + rr.opening_rollover_cents - rr.spent_cents else rr.base_cents - rr.spent_cents end
    ) order by rr.row ->> 'name'), '[]'::jsonb) as rows
    from rollover_rows rr
  )
  select v_period_payload || jsonb_build_object(
    'period_month', v_period_start, 'budget_month', v_budget_month,
    'selected_currency', coalesce(v_effective_currency, v_period_payload ->> 'selected_currency', upper(p_currency)),
    'budget', v_structure_payload -> 'budget',
    'previous_budget_cents', v_previous_budget_cents,
    'has_previous_month_pockets', v_has_previous_month_pockets,
    'envelopes', (select rows from enriched_envelopes),
    'allocations', coalesce(v_structure_payload -> 'allocations', '[]'::jsonb),
    'category_links', coalesce(v_structure_payload -> 'category_links', '[]'::jsonb),
    'spent_by_envelope', coalesce((select jsonb_agg(jsonb_build_object(
      'envelope_id', sr.envelope_id, 'spent_cents', sr.spent_cents
    ) order by sr.envelope_id) from spent_rows sr), '[]'::jsonb),
    'total_spend_cents', coalesce((select total_spend_cents from total_spend), 0),
    'uncategorized_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'category', ut.category, 'amount_cents', ut.amount_cents
    ) order by ut.amount_cents desc, ut.category) from uncategorized_totals ut), '[]'::jsonb),
    'uncategorized_expenses', coalesce((select jsonb_agg(jsonb_build_object(
      'category', ue.category, 'expenses', ue.expenses
    ) order by ue.category) from uncategorized_expenses ue), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

revoke all on function public.get_pockets_month_structure_v1(uuid, text, date, uuid, text, boolean) from public, anon;
revoke all on function public.calculate_pocket_rollovers_batch_v1(uuid, text, uuid, text, date, uuid[]) from public, anon;
grant execute on function public.get_pockets_month_structure_v1(uuid, text, date, uuid, text, boolean) to authenticated, service_role;
grant execute on function public.calculate_pocket_rollovers_batch_v1(uuid, text, uuid, text, date, uuid[]) to authenticated, service_role;

notify pgrst, 'reload schema';
