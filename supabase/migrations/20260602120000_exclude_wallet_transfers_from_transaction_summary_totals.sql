create or replace function public.get_user_transactions_summary_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_currencies text[] default null,
  p_category text default null,
  p_account_id uuid default null,
  p_include_unassigned_account boolean default false,
  p_categories text[] default null,
  p_type text default 'all',
  p_search_query text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_interval_granularity text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_currencies text[];
  v_payload jsonb;
begin
  v_currencies := nullif(
    array(
      select distinct upper(trim(value))
      from unnest(coalesce(p_currencies, '{}'::text[])) as currency_value(value)
      where trim(value) <> ''
    ),
    '{}'::text[]
  );
  if v_currencies is null and nullif(trim(coalesce(p_currency, '')), '') is not null then
    v_currencies := array[upper(trim(p_currency))];
  end if;

  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction summary access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household transaction summary access'
      using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  filtered_expenses as (
    select
      e.date,
      e.amount_cents,
      upper(coalesce(e.currency, '')) as currency,
      e.category,
      e.raw_text,
      lower(coalesce(e.type::text, 'expense')) as type,
      false as is_transfer
    from public.expenses e
    where coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null
          and e.household_id is null
          and (
            e.user_id = p_user_id
            or exists (
              select 1
              from contact_ids c
              where c.id = e.contact_id
            )
          )
        )
        or (
          p_household_id is not null
          and e.household_id = p_household_id
        )
      )
      and (
        v_currencies is null
        or upper(coalesce(e.currency, '')) = any(v_currencies)
      )
      and (
        p_account_id is null
        or e.account_id = p_account_id
        or (p_include_unassigned_account = true and e.account_id is null)
      )
  ),
  filtered_transfers as (
    select
      t.date,
      abs(t.amount_cents)::bigint as amount_cents,
      upper(coalesce(t.currency, '')) as currency,
      'transfers'::text as category,
      coalesce(
        nullif(trim(t.note), ''),
        case
          when t.to_account_id = p_account_id then 'Transfer in'
          else 'Transfer out'
        end
      ) as raw_text,
      case
        when t.to_account_id = p_account_id then 'income'
        else 'expense'
      end as type,
      true as is_transfer
    from public.account_transfers t
    where p_account_id is not null
      and (
        t.from_account_id = p_account_id
        or t.to_account_id = p_account_id
      )
      and (
        (
          p_household_id is null
          and t.household_id is null
          and t.created_by_user_id = p_user_id
        )
        or (
          p_household_id is not null
          and t.household_id = p_household_id
        )
      )
      and (
        v_currencies is null
        or upper(coalesce(t.currency, '')) = any(v_currencies)
      )
  ),
  combined_items as (
    select * from filtered_expenses
    union all
    select * from filtered_transfers
  ),
  filtered_items as (
    select *
    from combined_items i
    where (
        p_category is null
        or lower(coalesce(i.category, 'uncategorized')) = lower(p_category)
      )
      and (
        p_categories is null
        or array_length(p_categories, 1) is null
        or lower(coalesce(i.category, 'uncategorized')) = any(p_categories)
      )
      and (
        coalesce(lower(p_type), 'all') = 'all'
        or lower(coalesce(i.type, 'expense')) = lower(p_type)
      )
      and (p_start_date is null or i.date >= p_start_date)
      and (p_end_date is null or i.date <= p_end_date)
      and (
        coalesce(trim(p_search_query), '') = ''
        or lower(coalesce(i.category, 'uncategorized')) like '%' || lower(trim(p_search_query)) || '%'
        or lower(coalesce(i.raw_text, '')) like '%' || lower(trim(p_search_query)) || '%'
        or ((i.amount_cents::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
      )
  ),
  spend_rows as (
    select *
    from filtered_items
    where lower(coalesce(type::text, 'expense')) <> 'income'
      and is_transfer = false
  ),
  income_rows as (
    select *
    from filtered_items
    where lower(coalesce(type::text, 'expense')) = 'income'
      and is_transfer = false
  ),
  summary_rows as (
    select *
    from filtered_items
    where is_transfer = false
  ),
  category_rollup as (
    select
      lower(coalesce(category, 'uncategorized')) as category,
      sum(abs(amount_cents))::bigint as amount_cents,
      count(*)::integer as transaction_count
    from spend_rows
    group by 1
  ),
  currency_category_rollup as (
    select
      lower(coalesce(category, 'uncategorized')) as category,
      upper(coalesce(currency, '')) as currency,
      sum(abs(amount_cents))::bigint as amount_cents,
      count(*)::integer as transaction_count
    from spend_rows
    group by 1, 2
  ),
  yearly_rollup as (
    select
      date_trunc('year', date)::date as bucket_start,
      sum(abs(amount_cents))::bigint as amount_cents
    from spend_rows
    group by 1
  ),
  currency_yearly_rollup as (
    select
      date_trunc('year', date)::date as bucket_start,
      upper(coalesce(currency, '')) as currency,
      sum(abs(amount_cents))::bigint as amount_cents
    from spend_rows
    group by 1, 2
  ),
  period_rollup as (
    select
      case coalesce(lower(p_interval_granularity), 'yearly')
        when 'daily' then date_trunc('day', date)::date
        when 'weekly' then date_trunc('week', date)::date
        when 'monthly' then date_trunc('month', date)::date
        else date_trunc('year', date)::date
      end as bucket_start,
      sum(abs(amount_cents))::bigint as amount_cents
    from spend_rows
    group by 1
  ),
  currency_period_rollup as (
    select
      case coalesce(lower(p_interval_granularity), 'yearly')
        when 'daily' then date_trunc('day', date)::date
        when 'weekly' then date_trunc('week', date)::date
        when 'monthly' then date_trunc('month', date)::date
        else date_trunc('year', date)::date
      end as bucket_start,
      upper(coalesce(currency, '')) as currency,
      sum(abs(amount_cents))::bigint as amount_cents
    from spend_rows
    group by 1, 2
  ),
  currency_type_rollup as (
    select
      upper(coalesce(currency, '')) as currency,
      sum(case when lower(coalesce(type::text, 'expense')) <> 'income' then abs(amount_cents) else 0 end)::bigint as expense_total_cents,
      sum(case when lower(coalesce(type::text, 'expense')) = 'income' then abs(amount_cents) else 0 end)::bigint as income_total_cents,
      count(*)::integer as transaction_count
    from summary_rows
    group by 1
  ),
  currency_rollup as (
    select
      upper(coalesce(currency, '')) as currency,
      count(*)::integer as transaction_count
    from spend_rows
    group by 1
  )
  select jsonb_build_object(
    'transaction_count', (select count(*) from summary_rows),
    'expense_total_cents', coalesce((select sum(abs(amount_cents)) from spend_rows), 0),
    'income_total_cents', coalesce((select sum(abs(amount_cents)) from income_rows), 0),
    'has_multiple_currencies', (select count(*) from currency_rollup) > 1,
    'category_summaries', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category', c.category,
            'amount_cents', c.amount_cents,
            'transaction_count', c.transaction_count
          )
          order by c.amount_cents desc
        )
        from category_rollup c
      ),
      '[]'::jsonb
    ),
    'yearly_period_totals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'bucket_start', y.bucket_start,
            'amount_cents', y.amount_cents
          )
          order by y.bucket_start asc
        )
        from yearly_rollup y
      ),
      '[]'::jsonb
    ),
    'period_totals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'bucket_start', p.bucket_start,
            'amount_cents', p.amount_cents
          )
          order by p.bucket_start asc
        )
        from period_rollup p
      ),
      '[]'::jsonb
    ),
    'currency_category_summaries', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category', c.category,
            'currency', c.currency,
            'amount_cents', c.amount_cents,
            'transaction_count', c.transaction_count
          )
          order by c.amount_cents desc
        )
        from currency_category_rollup c
      ),
      '[]'::jsonb
    ),
    'currency_yearly_period_totals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'bucket_start', y.bucket_start,
            'currency', y.currency,
            'amount_cents', y.amount_cents
          )
          order by y.bucket_start asc, y.currency asc
        )
        from currency_yearly_rollup y
      ),
      '[]'::jsonb
    ),
    'currency_period_totals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'bucket_start', p.bucket_start,
            'currency', p.currency,
            'amount_cents', p.amount_cents
          )
          order by p.bucket_start asc, p.currency asc
        )
        from currency_period_rollup p
      ),
      '[]'::jsonb
    ),
    'currency_type_totals', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'currency', t.currency,
            'expense_total_cents', t.expense_total_cents,
            'income_total_cents', t.income_total_cents,
            'transaction_count', t.transaction_count
          )
          order by t.currency asc
        )
        from currency_type_rollup t
      ),
      '[]'::jsonb
    )
  ) into v_payload;

  return coalesce(
    v_payload,
    jsonb_build_object(
      'transaction_count', 0,
      'expense_total_cents', 0,
      'income_total_cents', 0,
      'has_multiple_currencies', false,
      'category_summaries', '[]'::jsonb,
      'yearly_period_totals', '[]'::jsonb,
      'period_totals', '[]'::jsonb,
      'currency_category_summaries', '[]'::jsonb,
      'currency_yearly_period_totals', '[]'::jsonb,
      'currency_period_totals', '[]'::jsonb,
      'currency_type_totals', '[]'::jsonb
    )
  );
end;
$$;

notify pgrst, 'reload schema';
