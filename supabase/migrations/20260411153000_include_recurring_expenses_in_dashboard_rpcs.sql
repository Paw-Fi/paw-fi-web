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
    where (
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
    where (
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
