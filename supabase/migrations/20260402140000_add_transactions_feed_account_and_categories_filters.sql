create or replace function public.get_user_transactions_page_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_category text default null,
  p_account_id uuid default null,
  p_categories text[] default null,
  p_type text default 'all',
  p_search_query text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_page_size integer default 60,
  p_cursor_date date default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 60), 200));
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction page access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household transaction page access'
      using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  filtered_expenses as (
    select
      e.id,
      e.contact_id,
      e.user_id,
      e.household_id,
      e.date,
      e.amount_cents,
      e.currency,
      e.category,
      e.created_at,
      e.updated_at,
      e.raw_text,
      e.breakdown,
      e.receipt_image_url,
      e.split_group_id,
      e.account_id,
      e.type,
      e.is_recurring
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
        p_currency is null
        or upper(coalesce(e.currency, '')) = upper(p_currency)
      )
      and (
        p_category is null
        or lower(coalesce(e.category, 'uncategorized')) = lower(p_category)
      )
      and (
        p_account_id is null
        or e.account_id = p_account_id
      )
      and (
        p_categories is null
        or array_length(p_categories, 1) is null
        or lower(coalesce(e.category, 'uncategorized')) = any(p_categories)
      )
      and (
        coalesce(lower(p_type), 'all') = 'all'
        or lower(coalesce(e.type::text, 'expense')) = lower(p_type)
      )
      and (p_start_date is null or e.date >= p_start_date)
      and (p_end_date is null or e.date <= p_end_date)
      and (
        coalesce(trim(p_search_query), '') = ''
        or lower(coalesce(e.category, 'uncategorized')) like '%' || lower(trim(p_search_query)) || '%'
        or lower(coalesce(e.raw_text, '')) like '%' || lower(trim(p_search_query)) || '%'
        or ((e.amount_cents::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
      )
      and (
        p_cursor_date is null
        or (e.date, e.created_at, e.id::text) < (
          p_cursor_date,
          coalesce(p_cursor_created_at, 'infinity'::timestamptz),
          coalesce(p_cursor_id, repeat('z', 36))
        )
      )
  ),
  ordered_expenses as (
    select *
    from filtered_expenses
    order by date desc, created_at desc, id desc
    limit v_page_size + 1
  ),
  page_items as (
    select *
    from ordered_expenses
    limit v_page_size
  ),
  next_item as (
    select *
    from ordered_expenses
    offset v_page_size
    limit 1
  )
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'contact_id', p.contact_id,
            'user_id', p.user_id,
            'household_id', p.household_id,
            'date', p.date,
            'amount_cents', p.amount_cents,
            'currency', p.currency,
            'category', p.category,
            'created_at', p.created_at,
            'updated_at', p.updated_at,
            'raw_text', p.raw_text,
            'breakdown', p.breakdown,
            'receipt_image_url', p.receipt_image_url,
            'split_group_id', p.split_group_id,
            'account_id', p.account_id,
            'type', p.type,
            'is_recurring', p.is_recurring
          )
          order by p.date desc, p.created_at desc, p.id desc
        )
        from page_items p
      ),
      '[]'::jsonb
    ),
    'has_more', exists(select 1 from next_item),
    'next_cursor', (
      select case
        when exists(select 1 from next_item) then jsonb_build_object(
          'date', p.date,
          'created_at', p.created_at,
          'id', p.id
        )
        else null
      end
      from page_items p
      order by p.date asc, p.created_at asc, p.id asc
      limit 1
    )
  ) into v_payload;

  return coalesce(
    v_payload,
    jsonb_build_object(
      'items', '[]'::jsonb,
      'has_more', false,
      'next_cursor', null
    )
  );
end;
$$;

create or replace function public.get_user_transactions_summary_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_category text default null,
  p_account_id uuid default null,
  p_categories text[] default null,
  p_type text default 'all',
  p_search_query text default null,
  p_start_date date default null,
  p_end_date date default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payload jsonb;
begin
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
      e.id,
      e.date,
      e.amount_cents,
      e.currency,
      e.category,
      e.created_at,
      e.raw_text,
      e.type
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
        p_currency is null
        or upper(coalesce(e.currency, '')) = upper(p_currency)
      )
      and (
        p_category is null
        or lower(coalesce(e.category, 'uncategorized')) = lower(p_category)
      )
      and (
        p_account_id is null
        or e.account_id = p_account_id
      )
      and (
        p_categories is null
        or array_length(p_categories, 1) is null
        or lower(coalesce(e.category, 'uncategorized')) = any(p_categories)
      )
      and (
        coalesce(lower(p_type), 'all') = 'all'
        or lower(coalesce(e.type::text, 'expense')) = lower(p_type)
      )
      and (p_start_date is null or e.date >= p_start_date)
      and (p_end_date is null or e.date <= p_end_date)
      and (
        coalesce(trim(p_search_query), '') = ''
        or lower(coalesce(e.category, 'uncategorized')) like '%' || lower(trim(p_search_query)) || '%'
        or lower(coalesce(e.raw_text, '')) like '%' || lower(trim(p_search_query)) || '%'
        or ((e.amount_cents::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
      )
  ),
  spend_rows as (
    select *
    from filtered_expenses
    where lower(coalesce(type::text, 'expense')) <> 'income'
  ),
  income_rows as (
    select *
    from filtered_expenses
    where lower(coalesce(type::text, 'expense')) = 'income'
  ),
  category_rollup as (
    select
      lower(coalesce(category, 'uncategorized')) as category,
      sum(abs(amount_cents))::bigint as amount_cents,
      count(*)::integer as transaction_count
    from spend_rows
    group by 1
  ),
  yearly_rollup as (
    select
      date_trunc('year', date)::date as bucket_start,
      sum(abs(amount_cents))::bigint as amount_cents
    from spend_rows
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
    'transaction_count', (select count(*) from filtered_expenses),
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
      'yearly_period_totals', '[]'::jsonb
    )
  );
end;
$$;
