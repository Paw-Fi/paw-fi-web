-- Align rollover cap semantics with the detailed contribution ledger:
-- caps limit outgoing carry into the next month, not current-month availability.

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
begin
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
    where b.period_month >= (p_period_month - interval '120 months')::date
      and b.period_month <= v_prev_month
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
    order by b.period_month asc, e.updated_at desc nulls last, e.created_at desc nulls last
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
      select coalesce(sum(ex.amount_cents), 0)::bigint
      into v_spent
      from public.expenses ex
      join public.envelope_category_links l
        on l.envelope_id = v_env_id
       and lower(trim(coalesce(ex.category, ''))) = lower(trim(l.category))
      where lower(coalesce(ex.type::text, 'expense')) <> 'income'
        and upper(coalesce(ex.currency, '')) = v_currency
        and ex.deleted_at is null
        and ex.date >= v_match.period_month
        and ex.date < (v_match.period_month + interval '1 month')::date
        and (
          (v_scope = 'household' and ex.household_id = p_household_id)
          or (v_scope = 'personal' and ex.user_id = p_user_id and ex.household_id is null)
          or (v_scope = 'portfolio' and ex.user_id = p_user_id and ex.household_id = p_household_id)
        );

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
begin
  if p_rollover_group_id is null or p_period_month is null then
    return '[]'::jsonb;
  end if;

  with envelope_months as (
    select
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
    order by b.period_month desc
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
     and ex.date >= em.period_month
     and ex.date < (em.period_month + interval '1 month')::date
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
        'remaining_cents',
          case
            when c.rollover_enabled then c.base_cents + c.incoming_rollover_cents + c.opening_rollover_cents - c.spent_cents
            else c.base_cents - c.spent_cents
          end,
        'rollover_enabled', c.rollover_enabled,
        'rollover_negative', c.rollover_negative,
        'rollover_cap_cents', c.rollover_cap_cents
      )
      order by c.period_month asc
    ),
    '[]'::jsonb
  )
  into v_rows
  from calculated c;

  return coalesce(v_rows, '[]'::jsonb);
end;
$$;

create or replace function public.get_pockets_month_v2(
  p_user_id uuid,
  p_scope text,
  p_period_month date,
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
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_base_payload jsonb;
  v_payload jsonb;
  v_month_end date := (p_period_month + interval '1 month - 1 day')::date;
begin
  v_base_payload := public.get_pockets_month_v1(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_period_month => p_period_month,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_allow_currency_fallback => p_allow_currency_fallback
  );

  with actual_rows as (
    select value as row
    from jsonb_array_elements(coalesce(v_base_payload -> 'actual_expenses', '[]'::jsonb)) value
    where coalesce((value ->> 'is_recurring')::boolean, false) = false
  ),
  projected_rows as (
    select to_jsonb(p.*) as row
    from public.get_projected_scoped_recurring_expenses_v1(
      p_user_id => p_user_id,
      p_scope => v_scope,
      p_household_id => p_household_id,
      p_currency => coalesce(v_base_payload ->> 'selected_currency', p_currency),
      p_range_start => p_period_month,
      p_range_end => v_month_end
    ) p
    where p_include_projected_recurring = true
      and lower(coalesce(p.type, 'expense')) <> 'income'
  ),
  monthly_rows as (
    select row from actual_rows
    union all
    select row from projected_rows
  ),
  link_rows as (
    select
      nullif(value ->> 'envelope_id', '')::uuid as envelope_id,
      lower(trim(coalesce(value ->> 'category', ''))) as category
    from jsonb_array_elements(coalesce(v_base_payload -> 'category_links', '[]'::jsonb)) value
    where nullif(value ->> 'envelope_id', '') is not null
  ),
  linked_categories as (
    select distinct lr.category
    from link_rows lr
    where lr.category <> ''
  ),
  spent_by_envelope as (
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
      select 1
      from linked_categories lc
      where lc.category = ct.category
    )
  ),
  uncategorized_expenses as (
    select
      lower(trim(coalesce(mr.row ->> 'category', 'uncategorized'))) as category,
      jsonb_agg(
        mr.row
        order by
          (mr.row ->> 'date')::date desc,
          coalesce((mr.row ->> 'created_at')::timestamptz, 'epoch'::timestamptz) desc,
          mr.row ->> 'id' desc
      ) as expenses
    from monthly_rows mr
    where not exists (
      select 1
      from linked_categories lc
      where lc.category = lower(trim(coalesce(mr.row ->> 'category', 'uncategorized')))
    )
    group by 1
  ),
  actual_json as (
    select coalesce(
      jsonb_agg(
        row
        order by
          (row ->> 'date')::date asc,
          coalesce((row ->> 'created_at')::timestamptz, 'epoch'::timestamptz) asc,
          row ->> 'id' asc
      ),
      '[]'::jsonb
    ) as rows
    from actual_rows
  ),
  projected_json as (
    select coalesce(
      jsonb_agg(
        row
        order by
          (row ->> 'date')::date asc,
          coalesce((row ->> 'created_at')::timestamptz, 'epoch'::timestamptz) asc,
          row ->> 'id' asc
      ),
      '[]'::jsonb
    ) as rows
    from projected_rows
  ),
  envelope_base as (
    select
      value as row,
      nullif(value ->> 'id', '')::uuid as envelope_id,
      coalesce(a.amount_cents, e.budget_amount_cents, (value ->> 'budget_amount_cents')::bigint, 0) as base_cents,
      coalesce(e.rollover_enabled, false) as rollover_enabled,
      coalesce(e.rollover_negative, false) as rollover_negative,
      e.rollover_cap_cents,
      coalesce(e.opening_rollover_cents, 0) as opening_rollover_cents,
      e.rollover_group_id
    from jsonb_array_elements(coalesce(v_base_payload -> 'envelopes', '[]'::jsonb)) value
    left join public.budget_envelopes e
      on e.id = nullif(value ->> 'id', '')::uuid
    left join public.envelope_allocations a
      on a.envelope_id = e.id
     and a.period_month = p_period_month
  ),
  rollover_envelopes as (
    select
      eb.row,
      eb.envelope_id,
      eb.base_cents,
      eb.rollover_enabled,
      eb.rollover_negative,
      eb.rollover_cap_cents,
      eb.opening_rollover_cents,
      eb.rollover_group_id,
      coalesce(sbe.spent_cents, 0)::bigint as spent_cents,
      case
        when eb.rollover_enabled then public.calculate_pocket_rollover_carry_v1(
          p_user_id => p_user_id,
          p_scope => p_scope,
          p_household_id => p_household_id,
          p_currency => coalesce(v_base_payload ->> 'selected_currency', p_currency),
          p_envelope_name => eb.row ->> 'name',
          p_rollover_group_id => eb.rollover_group_id,
          p_period_month => p_period_month
        )
        else 0
      end::bigint as incoming_rollover_cents
    from envelope_base eb
    left join spent_by_envelope sbe on sbe.envelope_id = eb.envelope_id
  ),
  enriched_envelopes as (
    select coalesce(
      jsonb_agg(
        re.row || jsonb_build_object(
          'rollover_enabled', re.rollover_enabled,
          'rollover_negative', re.rollover_negative,
          'rollover_cap_cents', re.rollover_cap_cents,
          'opening_rollover_cents', re.opening_rollover_cents,
          'rollover_group_id', re.rollover_group_id,
          'base_budget_amount_cents', re.base_cents,
          'rollover_from_previous_cents',
            case when re.rollover_enabled then re.incoming_rollover_cents else 0 end,
          'available_budget_cents',
            case
              when re.rollover_enabled then re.base_cents + re.incoming_rollover_cents + re.opening_rollover_cents
              else re.base_cents
            end,
          'spent_cents', re.spent_cents,
          'remaining_cents',
            case
              when re.rollover_enabled then re.base_cents + re.incoming_rollover_cents + re.opening_rollover_cents - re.spent_cents
              else re.base_cents - re.spent_cents
            end
        )
        order by re.row ->> 'name'
      ),
      '[]'::jsonb
    ) as rows
    from rollover_envelopes re
  )
  select v_base_payload || jsonb_build_object(
    'envelopes', (select rows from enriched_envelopes),
    'actual_expenses', (select rows from actual_json),
    'projected_recurring_expenses', (select rows from projected_json),
    'spent_by_envelope', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'envelope_id', s.envelope_id,
            'spent_cents', s.spent_cents
          )
          order by s.envelope_id
        )
        from spent_by_envelope s
      ),
      '[]'::jsonb
    ),
    'total_spend_cents', coalesce((select total_spend_cents from total_spend), 0),
    'uncategorized_totals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category', ut.category,
            'amount_cents', ut.amount_cents
          )
          order by ut.amount_cents desc, ut.category asc
        )
        from uncategorized_totals ut
      ),
      '[]'::jsonb
    ),
    'uncategorized_expenses', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category', ue.category,
            'expenses', ue.expenses
          )
          order by ue.category asc
        )
        from uncategorized_expenses ue
      ),
      '[]'::jsonb
    )
  ) into v_payload;

  return coalesce(v_payload, v_base_payload);
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

revoke execute on function public.get_pockets_month_v2(
  uuid,
  text,
  date,
  uuid,
  text,
  boolean,
  boolean
) from PUBLIC, anon;
grant execute on function public.get_pockets_month_v2(
  uuid,
  text,
  date,
  uuid,
  text,
  boolean,
  boolean
) to authenticated, service_role;
