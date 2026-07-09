create or replace function public.normalize_financial_month_start_day(p_start_day integer)

returns integer

language sql

immutable

as $$

  select case

    when p_start_day between 1 and 31 then p_start_day

    else 1

  end;

$$;



create or replace function public.financial_cycle_start_for_month(p_month date, p_start_day integer)

returns date

language sql

immutable

as $$

  select make_date(

    extract(year from p_month)::integer,

    extract(month from p_month)::integer,

    least(

      public.normalize_financial_month_start_day(p_start_day),

      extract(day from (date_trunc('month', p_month)::date + interval '1 month - 1 day'))::integer

    )

  );

$$;



create or replace function public.next_financial_cycle_start(p_period_start date, p_start_day integer)

returns date

language sql

immutable

as $$

  select public.financial_cycle_start_for_month(

    (date_trunc('month', p_period_start)::date + interval '1 month')::date,

    p_start_day

  );

$$;



create or replace function public.previous_financial_cycle_start(p_period_start date, p_start_day integer)

returns date

language sql

immutable

as $$

  select public.financial_cycle_start_for_month(

    (date_trunc('month', p_period_start)::date - interval '1 month')::date,

    p_start_day

  );

$$;



create or replace function public.user_financial_month_start_day(p_user_id uuid)

returns integer

language sql

stable

security definer

set search_path = public

as $$

  select public.normalize_financial_month_start_day(

    coalesce((

      select uc.financial_month_start_day

      from public.user_contacts uc

      where uc.user_id = p_user_id

      order by uc.created_at desc nulls last,
        uc.updated_at desc nulls last,
        uc.id desc

      limit 1

    ), 1)

  );

$$;

revoke execute on function public.normalize_financial_month_start_day(integer)
  from PUBLIC, anon;
grant execute on function public.normalize_financial_month_start_day(integer)
  to authenticated, service_role;

revoke execute on function public.financial_cycle_start_for_month(date, integer)
  from PUBLIC, anon;
grant execute on function public.financial_cycle_start_for_month(date, integer)
  to authenticated, service_role;

revoke execute on function public.next_financial_cycle_start(date, integer)
  from PUBLIC, anon;
grant execute on function public.next_financial_cycle_start(date, integer)
  to authenticated, service_role;

revoke execute on function public.previous_financial_cycle_start(date, integer)
  from PUBLIC, anon;
grant execute on function public.previous_financial_cycle_start(date, integer)
  to authenticated, service_role;

revoke execute on function public.user_financial_month_start_day(uuid)
  from PUBLIC, anon;
grant execute on function public.user_financial_month_start_day(uuid)
  to authenticated, service_role;



create or replace function public.get_pockets_month_v1(
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
  v_scope text;
  v_currency text;
  v_budget_id uuid;
  v_budget_currency text;
  v_budget_total_cents bigint;
  v_budget_json jsonb;
  v_previous_budget_cents bigint;
  v_has_previous_month_pockets boolean := false;
  v_payload jsonb;
  v_financial_month_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_prev_month date;
  v_prev_budget_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized pockets access'
      using errcode = '42501';
  end if;

  v_scope := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  if v_scope not in ('personal', 'portfolio', 'household') then
    raise exception 'Invalid pockets scope'
      using errcode = '22023';
  end if;

  if v_scope <> 'personal' then
    if p_household_id is null then
      raise exception 'Missing household_id for scoped pockets'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.household_members hm
      where hm.household_id = p_household_id
        and hm.user_id = p_user_id
    ) then
      raise exception 'Unauthorized household pockets access'
        using errcode = '42501';
    end if;
  end if;

  v_currency := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));

  with budget_exact as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where b.period_month = p_period_month
      and upper(b.currency) = v_currency
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ),
  budget_any_currency as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where p_allow_currency_fallback = true
      and not exists (select 1 from budget_exact)
      and b.period_month = p_period_month
      and (
        (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
        or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
        or (v_scope = 'household' and b.household_id = p_household_id)
      )
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ),
  budget_legacy_personal_exact as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where v_scope = 'personal'
      and not exists (select 1 from budget_exact)
      and not exists (select 1 from budget_any_currency)
      and b.period_month = p_period_month
      and upper(b.currency) = v_currency
      and b.household_id is null
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ),
  budget_legacy_personal_any_currency as (
    select b.id, b.currency, b.total_budget_cents
    from public.budgets b
    where v_scope = 'personal'
      and p_allow_currency_fallback = true
      and not exists (select 1 from budget_exact)
      and not exists (select 1 from budget_any_currency)
      and not exists (select 1 from budget_legacy_personal_exact)
      and b.period_month = p_period_month
      and b.household_id is null
    order by b.updated_at desc nulls last, b.created_at desc nulls last
    limit 1
  ),
  budget_final as (
    select * from budget_exact
    union all
    select * from budget_any_currency
    union all
    select * from budget_legacy_personal_exact
    union all
    select * from budget_legacy_personal_any_currency
    limit 1
  )
  select
    id,
    upper(currency),
    total_budget_cents,
    jsonb_build_object(
      'id', id,
      'currency', upper(currency),
      'period_month', p_period_month,
      'total_budget_cents', total_budget_cents
    )
  into
    v_budget_id,
    v_budget_currency,
    v_budget_total_cents,
    v_budget_json
  from budget_final;

  if v_budget_currency is not null and v_budget_currency <> '' then
    v_currency := v_budget_currency;
  end if;

  if v_budget_id is not null and not exists (
    select 1
    from public.budget_envelopes e
    where e.budget_id = v_budget_id
      and upper(e.currency) = v_currency
      and (
        (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
        or (v_scope = 'household' and e.household_id = p_household_id)
      )
    limit 1
  ) then
    update public.budget_envelopes e
    set budget_id = v_budget_id,
        updated_at = now()
    where e.budget_id is null
      and upper(e.currency) = v_currency
      and (
        (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
        or (v_scope = 'household' and e.household_id = p_household_id)
      );
  end if;

  if v_budget_id is null then
    select b.total_budget_cents
    into v_previous_budget_cents
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
  else
    v_previous_budget_cents := 0;
  end if;

  v_prev_month := public.previous_financial_cycle_start(p_period_month, v_financial_month_start_day);
  select b.id
  into v_prev_budget_id
  from public.budgets b
  where b.period_month = v_prev_month
    and upper(b.currency) = v_currency
    and (
      (v_scope = 'personal' and b.household_id is null and b.user_id = p_user_id)
      or (v_scope = 'portfolio' and b.household_id = p_household_id and b.user_id = p_user_id)
      or (v_scope = 'household' and b.household_id = p_household_id)
    )
  order by b.updated_at desc nulls last, b.created_at desc nulls last
  limit 1;

  if v_prev_budget_id is not null then
    v_has_previous_month_pockets := exists (
      select 1
      from public.budget_envelopes e
      where e.budget_id = v_prev_budget_id
        and upper(e.currency) = v_currency
        and (
          (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
          or (v_scope = 'household' and e.household_id = p_household_id)
        )
      limit 1
    );
  end if;

  with envelope_rows as (
    select
      e.id,
      e.name,
      e.budget_amount_cents,
      e.household_id,
      upper(e.currency) as currency,
      e.icon,
      e.color,
      e.budget_id
    from public.budget_envelopes e
    where v_budget_id is not null
      and e.budget_id = v_budget_id
      and upper(e.currency) = v_currency
      and (
        (v_scope in ('personal', 'portfolio') and e.user_id = p_user_id)
        or (v_scope = 'household' and e.household_id = p_household_id)
      )
    order by e.name asc
  ),
  env_ids as (
    select coalesce(array_agg(id), '{}'::uuid[]) as ids
    from envelope_rows
  ),
  allocations_rows as (
    select ea.envelope_id, ea.amount_cents
    from public.envelope_allocations ea
    where ea.period_month = p_period_month
      and ea.envelope_id in (select unnest(ids) from env_ids)
  ),
  link_rows as (
    select l.envelope_id, lower(trim(coalesce(l.category, ''))) as category
    from public.envelope_category_links l
    where l.envelope_id in (select unnest(ids) from env_ids)
  ),
  linked_categories as (
    select distinct lr.category as category
    from link_rows lr
    where lr.category <> ''
  ),
  should_compute_spend as (
    select exists (select 1 from envelope_rows limit 1) as ok
  ),
  filtered_expenses as (
    select
      e.id,
      e.date,
      e.amount_cents,
      e.currency,
      e.category,
      e.household_id,
      e.user_id,
      e.split_group_id,
      e.raw_text,
      e.created_at,
      e.updated_at,
      e.type,
      e.is_recurring
    from public.expenses e
    where (select ok from should_compute_spend) = true
      and lower(coalesce(e.type::text, 'expense')) <> 'income'
      and upper(coalesce(e.currency, '')) = v_currency
      and e.date >= p_period_month
      and e.date < public.next_financial_cycle_start(p_period_month, v_financial_month_start_day)
      and (
        (v_scope = 'household' and e.household_id = p_household_id)
        or (v_scope = 'personal' and e.user_id = p_user_id and e.household_id is null)
        or (v_scope = 'portfolio' and e.user_id = p_user_id and e.household_id = p_household_id)
      )
  ),
  spent_by_envelope as (
    select
      lr.envelope_id,
      sum(fe.amount_cents)::bigint as spent_cents
    from filtered_expenses fe
    join link_rows lr
      on lr.category = lower(trim(coalesce(fe.category, '')))
    group by lr.envelope_id
  ),
  total_spend as (
    select coalesce(sum(fe.amount_cents), 0)::bigint as total_spend_cents
    from filtered_expenses fe
  ),
  category_totals as (
    select
      lower(trim(coalesce(fe.category, 'uncategorized'))) as category,
      sum(fe.amount_cents)::bigint as amount_cents
    from filtered_expenses fe
    group by 1
  ),
  uncategorized_totals as (
    select ct.category, ct.amount_cents
    from category_totals ct
    where not exists (
      select 1 from linked_categories lc
      where lc.category = ct.category
    )
  ),
  uncategorized_expenses as (
    select
      lower(trim(coalesce(fe.category, 'uncategorized'))) as category,
      jsonb_agg(
        jsonb_build_object(
          'id', fe.id,
          'date', fe.date,
          'amount_cents', fe.amount_cents,
          'currency', fe.currency,
          'category', fe.category,
          'household_id', fe.household_id,
          'user_id', fe.user_id,
          'split_group_id', fe.split_group_id,
          'raw_text', fe.raw_text,
          'created_at', fe.created_at,
          'updated_at', fe.updated_at,
          'type', fe.type,
          'is_recurring', fe.is_recurring
        )
        order by fe.date desc, fe.created_at desc, fe.id desc
      ) as expenses
    from filtered_expenses fe
    where not exists (
      select 1 from linked_categories lc
      where lc.category = lower(trim(coalesce(fe.category, 'uncategorized')))
    )
    group by 1
  ),
  actual_expenses as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', fe.id,
          'date', fe.date,
          'amount_cents', fe.amount_cents,
          'currency', fe.currency,
          'category', fe.category,
          'household_id', fe.household_id,
          'user_id', fe.user_id,
          'split_group_id', fe.split_group_id,
          'raw_text', fe.raw_text,
          'created_at', fe.created_at,
          'updated_at', fe.updated_at,
          'type', fe.type,
          'is_recurring', fe.is_recurring
        )
        order by fe.date asc, fe.created_at asc, fe.id asc
      ),
      '[]'::jsonb
    ) as rows
    from filtered_expenses fe
  )
  select jsonb_build_object(
    'period_month', p_period_month,
    'selected_currency', v_currency,
    'budget', v_budget_json,
    'previous_budget_cents', coalesce(v_previous_budget_cents, 0),
    'has_previous_month_pockets', coalesce(v_has_previous_month_pockets, false),
    'envelopes', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', er.id,
            'name', er.name,
            'budget_amount_cents', er.budget_amount_cents,
            'household_id', er.household_id,
            'currency', er.currency,
            'icon', er.icon,
            'color', er.color,
            'budget_id', er.budget_id
          )
          order by er.name asc
        )
        from envelope_rows er
      ),
      '[]'::jsonb
    ),
    'allocations', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'envelope_id', ar.envelope_id,
            'amount_cents', ar.amount_cents
          )
        )
        from allocations_rows ar
      ),
      '[]'::jsonb
    ),
    'category_links', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'envelope_id', lr.envelope_id,
            'category', lr.category
          )
        )
        from link_rows lr
      ),
      '[]'::jsonb
    ),
    'spent_by_envelope', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'envelope_id', s.envelope_id,
            'spent_cents', s.spent_cents
          )
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
          order by ut.amount_cents desc
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
    ),
    'actual_expenses', (select rows from actual_expenses)
  )
  into v_payload;

  return coalesce(
    v_payload,
    jsonb_build_object(
      'period_month', p_period_month,
      'selected_currency', v_currency,
      'budget', null,
      'previous_budget_cents', coalesce(v_previous_budget_cents, 0),
      'has_previous_month_pockets', coalesce(v_has_previous_month_pockets, false),
      'envelopes', '[]'::jsonb,
      'allocations', '[]'::jsonb,
      'category_links', '[]'::jsonb,
      'spent_by_envelope', '[]'::jsonb,
      'total_spend_cents', 0,
      'uncategorized_totals', '[]'::jsonb,
      'uncategorized_expenses', '[]'::jsonb,
      'actual_expenses', '[]'::jsonb
    )
  );
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
  v_financial_month_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_month_end date := public.next_financial_cycle_start(p_period_month, v_financial_month_start_day) - 1;
begin
  -- CRITICAL: keep this wrapper recurring-aware even if the legacy v1 payload
  -- still exists.
  -- STRICT REQUIREMENT: pockets must receive month-projected recurring spend
  -- in the same RPC path used for the main page, or users will report that
  -- recurring transactions are missing from pocket totals again.
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
  )
  select v_base_payload || jsonb_build_object(
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
  v_financial_month_start_day integer := public.user_financial_month_start_day(p_user_id);
  v_prev_month date := public.previous_financial_cycle_start(p_period_month, v_financial_month_start_day);
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
          and ex.date < public.next_financial_cycle_start(v_match.period_month, v_financial_month_start_day)
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
          p_range_end => public.next_financial_cycle_start(v_match.period_month, v_financial_month_start_day) - 1
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
     and ex.date < public.next_financial_cycle_start(em.period_month, v_financial_month_start_day)
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
      p_range_end => public.next_financial_cycle_start(em.period_month, v_financial_month_start_day) - 1
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
       and ex.date < public.next_financial_cycle_start(em.period_month, v_financial_month_start_day)
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
        p_range_end => public.next_financial_cycle_start(em.period_month, v_financial_month_start_day) - 1
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
      v_expected_month := public.next_financial_cycle_start(
        v_previous_month,
        v_financial_month_start_day
      );
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
        'period_month', public.next_financial_cycle_start(p_period_month, v_financial_month_start_day),
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
    ), jsonb_build_object('period_month', public.next_financial_cycle_start(p_period_month, v_financial_month_start_day), 'carry_cents', 0))
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
