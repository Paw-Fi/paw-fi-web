set lock_timeout = '5s';
set statement_timeout = '2min';

-- Monthly reports and calendar views read an unfiltered, bounded date range.
-- Keep those predicates in the first expense scan instead of routing through
-- the generic account/category/search CTE chain.
create or replace function public.get_bounded_transactions_page_v1(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null,
  p_currencies text[] default null,
  p_type text default 'all',
  p_start_date date default null,
  p_end_date date default null,
  p_page_size integer default 60,
  p_cursor_date date default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_auth_user_id uuid := (select auth.uid());
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 60), 200));
  v_currencies text[];
  v_payload jsonb;
begin
  if v_auth_user_id is null or v_auth_user_id <> p_user_id then
    raise exception 'Unauthorized bounded transaction page access'
      using errcode = '42501';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'A valid bounded transaction date range is required'
      using errcode = '22023';
  end if;

  if p_end_date - p_start_date > 800 then
    raise exception 'Bounded transaction date range exceeds 800 days'
      using errcode = '22023';
  end if;

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household bounded transaction access'
      using errcode = '42501';
  end if;

  v_currencies := nullif(
    array(
      select distinct upper(trim(value))
      from unnest(coalesce(p_currencies, '{}'::text[])) as currency_value(value)
      where trim(value) <> ''
    ),
    '{}'::text[]
  );
  if v_currencies is null
     and nullif(trim(coalesce(p_currency, '')), '') is not null then
    v_currencies := array[upper(trim(p_currency))];
  end if;

  with contact_ids as materialized (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  filtered_expenses as materialized (
    select
      e.id::text as id,
      e.contact_id,
      e.user_id,
      e.household_id,
      e.date,
      e.amount_cents,
      e.currency,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only'
          then null
        else e.category
      end as category,
      e.created_at,
      e.updated_at,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only'
          then null
        else e.raw_text
      end as raw_text,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only'
          then null
        else e.merchant
      end as merchant,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only'
          then null
        else e.breakdown
      end as breakdown,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only'
          then null
        else e.receipt_image_url
      end as receipt_image_url,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only'
          then null
        else e.split_group_id
      end as split_group_id,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only'
          then null
        else e.account_id
      end as account_id,
      lower(coalesce(e.type::text, 'expense')) as type,
      e.is_recurring
    from public.expenses e
    where e.deleted_at is null
      and coalesce(e.is_recurring, false) = false
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
        coalesce(lower(p_type), 'all') = 'all'
        or lower(coalesce(e.type::text, 'expense')) = lower(p_type)
      )
      and e.date >= p_start_date
      and e.date <= p_end_date
      and (
        p_cursor_date is null
        or (e.date, e.created_at, e.id::text) < (
          p_cursor_date,
          coalesce(p_cursor_created_at, 'infinity'::timestamptz),
          coalesce(p_cursor_id, repeat('z', 64))
        )
      )
    order by e.date desc, e.created_at desc, e.id::text desc
    limit v_page_size + 1
  ),
  page_items as (
    select *
    from filtered_expenses
    limit v_page_size
  ),
  next_item as (
    select *
    from filtered_expenses
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
            'merchant', p.merchant,
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

comment on function public.get_bounded_transactions_page_v1(
  uuid,
  uuid,
  text,
  text[],
  text,
  date,
  date,
  integer,
  date,
  timestamptz,
  text
) is 'Returns one keyset page for unfiltered bounded transaction ranges used by monthly reports and calendar views.';

revoke all on function public.get_bounded_transactions_page_v1(
  uuid,
  uuid,
  text,
  text[],
  text,
  date,
  date,
  integer,
  date,
  timestamptz,
  text
) from public, anon;

grant execute on function public.get_bounded_transactions_page_v1(
  uuid,
  uuid,
  text,
  text[],
  text,
  date,
  date,
  integer,
  date,
  timestamptz,
  text
) to authenticated;

notify pgrst, 'reload schema';

reset statement_timeout;
reset lock_timeout;
