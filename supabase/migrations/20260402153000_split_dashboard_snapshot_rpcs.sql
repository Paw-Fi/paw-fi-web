create or replace function public.get_dashboard_snapshot_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_interval_granularity text default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payload jsonb;
  v_interval_granularity text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized dashboard snapshot access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household dashboard snapshot access'
      using errcode = '42501';
  end if;

  v_interval_granularity := lower(coalesce(nullif(trim(p_interval_granularity), ''), 'monthly'));
  if v_interval_granularity not in ('daily', 'weekly', 'monthly', 'yearly') then
    v_interval_granularity := 'monthly';
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
      and (p_start_date is null or e.date >= p_start_date)
      and (p_end_date is null or e.date <= p_end_date)
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
  period_rollup as (
    select
      case
        when v_interval_granularity = 'daily' then date_trunc('day', date)::date
        when v_interval_granularity = 'weekly' then date_trunc('week', date)::date
        when v_interval_granularity = 'monthly' then date_trunc('month', date)::date
        else date_trunc('year', date)::date
      end as bucket_start,
      sum(abs(amount_cents))::bigint as amount_cents
    from spend_rows
    group by 1
  ),
  currency_rollup as (
    select upper(coalesce(currency, '')) as currency
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
      'period_totals', '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.get_dashboard_recent_transactions_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_limit integer default 5
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 20));
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized dashboard recent transactions access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household dashboard recent transactions access'
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
    order by e.date desc, e.created_at desc, e.id desc
    limit v_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'contact_id', f.contact_id,
        'user_id', f.user_id,
        'household_id', f.household_id,
        'date', f.date,
        'amount_cents', f.amount_cents,
        'currency', f.currency,
        'category', f.category,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'raw_text', f.raw_text,
        'breakdown', f.breakdown,
        'receipt_image_url', f.receipt_image_url,
        'split_group_id', f.split_group_id,
        'account_id', f.account_id,
        'type', f.type,
        'is_recurring', f.is_recurring
      )
      order by f.date desc, f.created_at desc, f.id desc
    ),
    '[]'::jsonb
  ) into v_payload
  from filtered_expenses f;

  return v_payload;
end;
$$;

create or replace function public.get_dashboard_calendar_transactions_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
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
    raise exception 'Unauthorized dashboard calendar transactions access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household dashboard calendar access'
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
      and (p_start_date is null or e.date >= p_start_date)
      and (p_end_date is null or e.date <= p_end_date)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'contact_id', f.contact_id,
        'user_id', f.user_id,
        'household_id', f.household_id,
        'date', f.date,
        'amount_cents', f.amount_cents,
        'currency', f.currency,
        'category', f.category,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'raw_text', f.raw_text,
        'breakdown', f.breakdown,
        'receipt_image_url', f.receipt_image_url,
        'split_group_id', f.split_group_id,
        'account_id', f.account_id,
        'type', f.type,
        'is_recurring', f.is_recurring
      )
      order by f.date desc, f.created_at desc, f.id desc
    ),
    '[]'::jsonb
  ) into v_payload
  from filtered_expenses f;

  return v_payload;
end;
$$;


create or replace function public.get_dashboard_currency_summaries_v1(
  p_user_id uuid,
  p_household_id uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized dashboard currency summary access'
      using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household dashboard currency summary access'
      using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  filtered_expenses as (
    select e.currency, e.amount_cents, e.type
    from public.expenses e
    where coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null
          and e.household_id is null
          and (e.user_id = p_user_id or exists (select 1 from contact_ids c where c.id = e.contact_id))
        )
        or (p_household_id is not null and e.household_id = p_household_id)
      )
  ),
  currency_rollup as (
    select
      upper(coalesce(currency, '')) as currency,
      count(*)::integer as transaction_count,
      sum(case when lower(coalesce(type::text, 'expense')) = 'income' then abs(amount_cents) else 0 end)::bigint as income_total_cents,
      sum(case when lower(coalesce(type::text, 'expense')) <> 'income' then abs(amount_cents) else 0 end)::bigint as expense_total_cents
    from filtered_expenses
    where upper(coalesce(currency, '')) <> ''
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'currency', c.currency,
        'transaction_count', c.transaction_count,
        'income_total_cents', c.income_total_cents,
        'expense_total_cents', c.expense_total_cents
      )
      order by c.currency asc
    ),
    '[]'::jsonb
  ) into v_payload
  from currency_rollup c;

  return v_payload;
end;
$$;


create or replace function public.get_dashboard_user_activity_v1(
  p_user_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_has_logged_transactions boolean;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized dashboard user activity access'
      using errcode = '42501';
  end if;

  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  member_households as (
    select hm.household_id
    from public.household_members hm
    where hm.user_id = p_user_id
  )
  select exists(
    select 1
    from public.expenses e
    where coalesce(e.is_recurring, false) = false
      and (
        (
          e.household_id is null
          and (
            e.user_id = p_user_id
            or exists (select 1 from contact_ids c where c.id = e.contact_id)
          )
        )
        or exists (
          select 1
          from member_households mh
          where mh.household_id = e.household_id
        )
      )
  ) into v_has_logged_transactions;

  return jsonb_build_object(
    'has_logged_transactions', coalesce(v_has_logged_transactions, false)
  );
end;
$$;
