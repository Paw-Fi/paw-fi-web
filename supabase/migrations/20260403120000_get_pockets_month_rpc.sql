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

  -- Resolve budget for this scope/month/currency, with optional currency fallback.
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
  budget_final as (
    select * from budget_exact
    union all
    select * from budget_any_currency
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

  -- Legacy migration: envelopes historically existed without budget_id.
  -- Mobile attaches these to the viewed month budget when there are no budget-bound envelopes.
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

  -- If no budget exists for this month, suggest the most recent previous budget total
  -- using the same currency filter as the client.
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

  -- Determine if the immediate previous month has any pockets configured.
  -- Mirrors mobile logic: previousMonth budget must exist + at least one envelope.
  v_prev_month := (p_period_month - interval '1 month')::date;
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

  -- Build month payload.
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
    select l.envelope_id, lower(coalesce(l.category, '')) as category
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
      and coalesce(e.is_recurring, false) = false
      and lower(coalesce(e.type::text, 'expense')) <> 'income'
      and upper(coalesce(e.currency, '')) = v_currency
      and e.date >= p_period_month
      and e.date < (p_period_month + interval '1 month')::date
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
      on lr.category = lower(coalesce(nullif(trim(fe.category), ''), 'uncategorized'))
    group by lr.envelope_id
  ),
  total_spend as (
    select coalesce(sum(fe.amount_cents), 0)::bigint as total_spend_cents
    from filtered_expenses fe
  ),
  category_totals as (
    select
      lower(coalesce(nullif(trim(fe.category), ''), 'uncategorized')) as category,
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
      lower(coalesce(nullif(trim(fe.category), ''), 'uncategorized')) as category,
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
      where lc.category = lower(coalesce(nullif(trim(fe.category), ''), 'uncategorized'))
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

-- Supporting indexes for pockets monthly aggregation
create index if not exists idx_budget_envelopes_budget_currency
  on public.budget_envelopes(budget_id, currency);

create index if not exists idx_envelope_category_links_category_envelope
  on public.envelope_category_links(category, envelope_id);

create index if not exists idx_expenses_pockets_user_currency_date
  on public.expenses(user_id, currency, date)
  where (is_recurring is false or is_recurring is null)
    and type = 'expense';

create index if not exists idx_expenses_pockets_household_currency_date
  on public.expenses(household_id, currency, date)
  where (is_recurring is false or is_recurring is null)
    and type = 'expense'
    and household_id is not null;
