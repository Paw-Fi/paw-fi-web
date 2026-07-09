set lock_timeout = '5s';
set statement_timeout = '10min';

-- Optimize cold Pocket Details transaction feed reads.
--
-- Pocket Details loads current and previous month expense rows through the
-- generic transaction feed RPCs using category lists, expense type, currency,
-- and a bounded month range. The generic path keeps those filters outside the
-- first expense scan so cold plans can scan far more rows than needed. This
-- migration preserves the public RPC signatures and response JSON, keeps the
-- existing wallet-details fast path, and adds a conservative category/date
-- fast path for pocket-details reads before falling back to the general path.

-- Recommended supporting indexes are created by
-- 20260709084710_optimize_wallet_details_transaction_feed_rpc.sql.
-- This migration only replaces the RPC bodies to avoid new index-build risk on
-- hot production tables.

create or replace function public.get_user_transactions_page_v1(
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
  v_currencies text[];
  v_categories text[];
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

  v_categories := nullif(
    array(
      select distinct lower(trim(value))
      from unnest(coalesce(p_categories, '{}'::text[])) as category_value(value)
      where trim(value) <> ''
    ),
    '{}'::text[]
  );

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

  -- Fast path used by Pocket Details: category-filtered expense rows for one
  -- bounded month range. This keeps category/date/type predicates inside the
  -- first expense scan and avoids the transfer branch, which is only relevant
  -- for account-scoped wallet feeds.
  if p_account_id is null
     and v_categories is not null
     and p_start_date is not null
     and p_end_date is not null
     and coalesce(lower(p_type), 'all') = 'expense'
     and coalesce(trim(p_search_query), '') = '' then
    with contact_ids as (
      select uc.id
      from public.user_contacts uc
      where uc.user_id = p_user_id
    ),
    filtered_expenses as (
      select
        e.id::text as id,
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
        e.merchant,
        e.breakdown,
        e.receipt_image_url,
        e.split_group_id,
        e.account_id,
        lower(coalesce(e.type::text, 'expense')) as type,
        e.is_recurring
      from public.expenses e
      where coalesce(e.is_recurring, false) = false
        and (
          e.type is null
          or e.type = 'expense'
        )
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
        and lower(coalesce(e.category, 'uncategorized')) = any(p_categories)
        and (p_category is null or lower(coalesce(e.category, 'uncategorized')) = lower(p_category))
        and (p_start_date is null or e.date >= p_start_date)
        and (p_end_date is null or e.date <= p_end_date)
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
  end if;

  -- Fast path used by Wallet Details: one wallet, no unassigned-account merge.
  -- This lets Postgres seek directly into account/currency/date indexes instead
  -- of planning the generic account_id/unassigned OR predicate.
  if p_account_id is not null and coalesce(p_include_unassigned_account, false) = false then
    with contact_ids as (
      select uc.id
      from public.user_contacts uc
      where uc.user_id = p_user_id
    ),
    filtered_expenses as (
      select
        e.id::text as id,
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
        e.merchant,
        e.breakdown,
        e.receipt_image_url,
        e.split_group_id,
        e.account_id,
        lower(coalesce(e.type::text, 'expense')) as type,
        e.is_recurring
      from public.expenses e
      where e.account_id = p_account_id
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
          p_category is null
          or lower(coalesce(e.category, 'uncategorized')) = lower(p_category)
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
            coalesce(p_cursor_id, repeat('z', 64))
          )
        )
      order by e.date desc, e.created_at desc, e.id::text desc
      limit v_page_size + 1
    ),
    filtered_transfer_out as (
      select
        ('transfer:' || t.id::text || ':out') as id,
        null::uuid as contact_id,
        t.created_by_user_id as user_id,
        t.household_id,
        t.date,
        abs(t.amount_cents)::bigint as amount_cents,
        t.currency,
        'transfers'::text as category,
        t.created_at,
        t.updated_at,
        coalesce(nullif(trim(t.note), ''), 'Transfer out') as raw_text,
        null::text as merchant,
        null::jsonb as breakdown,
        null::text as receipt_image_url,
        null::uuid as split_group_id,
        t.from_account_id as account_id,
        'expense'::text as type,
        false as is_recurring
      from public.account_transfers t
      where t.from_account_id = p_account_id
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
        and (
          coalesce(lower(p_type), 'all') in ('all', 'expense')
        )
        and (p_start_date is null or t.date >= p_start_date)
        and (p_end_date is null or t.date <= p_end_date)
        and (
          p_category is null
          or lower(p_category) = 'transfers'
        )
        and (
          p_categories is null
          or array_length(p_categories, 1) is null
          or 'transfers' = any(p_categories)
        )
        and (
          coalesce(trim(p_search_query), '') = ''
          or 'transfers' like '%' || lower(trim(p_search_query)) || '%'
          or lower(coalesce(nullif(trim(t.note), ''), 'Transfer out')) like '%' || lower(trim(p_search_query)) || '%'
          or ((abs(t.amount_cents)::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
        )
        and (
          p_cursor_date is null
          or (t.date, t.created_at, ('transfer:' || t.id::text || ':out')) < (
            p_cursor_date,
            coalesce(p_cursor_created_at, 'infinity'::timestamptz),
            coalesce(p_cursor_id, repeat('z', 64))
          )
        )
      order by t.date desc, t.created_at desc, ('transfer:' || t.id::text || ':out') desc
      limit v_page_size + 1
    ),
    filtered_transfer_in as (
      select
        ('transfer:' || t.id::text || ':in') as id,
        null::uuid as contact_id,
        t.created_by_user_id as user_id,
        t.household_id,
        t.date,
        abs(t.amount_cents)::bigint as amount_cents,
        t.currency,
        'transfers'::text as category,
        t.created_at,
        t.updated_at,
        coalesce(nullif(trim(t.note), ''), 'Transfer in') as raw_text,
        null::text as merchant,
        null::jsonb as breakdown,
        null::text as receipt_image_url,
        null::uuid as split_group_id,
        t.to_account_id as account_id,
        'income'::text as type,
        false as is_recurring
      from public.account_transfers t
      where t.to_account_id = p_account_id
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
        and (
          coalesce(lower(p_type), 'all') in ('all', 'income')
        )
        and (p_start_date is null or t.date >= p_start_date)
        and (p_end_date is null or t.date <= p_end_date)
        and (
          p_category is null
          or lower(p_category) = 'transfers'
        )
        and (
          p_categories is null
          or array_length(p_categories, 1) is null
          or 'transfers' = any(p_categories)
        )
        and (
          coalesce(trim(p_search_query), '') = ''
          or 'transfers' like '%' || lower(trim(p_search_query)) || '%'
          or lower(coalesce(nullif(trim(t.note), ''), 'Transfer in')) like '%' || lower(trim(p_search_query)) || '%'
          or ((abs(t.amount_cents)::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
        )
        and (
          p_cursor_date is null
          or (t.date, t.created_at, ('transfer:' || t.id::text || ':in')) < (
            p_cursor_date,
            coalesce(p_cursor_created_at, 'infinity'::timestamptz),
            coalesce(p_cursor_id, repeat('z', 64))
          )
        )
      order by t.date desc, t.created_at desc, ('transfer:' || t.id::text || ':in') desc
      limit v_page_size + 1
    ),
    combined_items as (
      select * from filtered_expenses
      union all
      select * from filtered_transfer_out
      union all
      select * from filtered_transfer_in
    ),
    ordered_expenses as (
      select *
      from combined_items
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
  end if;

  -- General path: previous implementation retained for non-wallet-detail calls.
  with contact_ids as (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = p_user_id
  ),
  filtered_expenses as (
    select
      e.id::text as id,
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
      e.merchant,
      e.breakdown,
      e.receipt_image_url,
      e.split_group_id,
      e.account_id,
      lower(coalesce(e.type::text, 'expense')) as type,
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
      ('transfer:' || t.id::text || ':' || case when t.to_account_id = p_account_id then 'in' else 'out' end) as id,
      null::uuid as contact_id,
      t.created_by_user_id as user_id,
      t.household_id,
      t.date,
      abs(t.amount_cents)::bigint as amount_cents,
      t.currency,
      'transfers'::text as category,
      t.created_at,
      t.updated_at,
      coalesce(
        nullif(trim(t.note), ''),
        case
          when t.to_account_id = p_account_id then 'Transfer in'
          else 'Transfer out'
        end
      ) as raw_text,
      null::text as merchant,
      null::jsonb as breakdown,
      null::text as receipt_image_url,
      null::uuid as split_group_id,
      case
        when t.to_account_id = p_account_id then t.to_account_id
        else t.from_account_id
      end as account_id,
      case
        when t.to_account_id = p_account_id then 'income'
        else 'expense'
      end as type,
      false as is_recurring
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
      and (
        p_cursor_date is null
        or (i.date, i.created_at, i.id::text) < (
          p_cursor_date,
          coalesce(p_cursor_created_at, 'infinity'::timestamptz),
          coalesce(p_cursor_id, repeat('z', 64))
        )
      )
  ),
  ordered_expenses as (
    select *
    from filtered_items
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
  v_categories text[];
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

  v_categories := nullif(
    array(
      select distinct lower(trim(value))
      from unnest(coalesce(p_categories, '{}'::text[])) as category_value(value)
      where trim(value) <> ''
    ),
    '{}'::text[]
  );

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

  -- Fast path used by Pocket Details: category-filtered expense summaries for
  -- one bounded month range. The response shape matches the generic summary RPC
  -- exactly while letting Postgres start from category/date indexes.
  if p_account_id is null
     and v_categories is not null
     and p_start_date is not null
     and p_end_date is not null
     and coalesce(lower(p_type), 'all') = 'expense'
     and coalesce(trim(p_search_query), '') = '' then
    with contact_ids as (
      select uc.id
      from public.user_contacts uc
      where uc.user_id = p_user_id
    ),
    filtered_expenses as materialized (
      select
        e.date,
        e.amount_cents,
        upper(coalesce(e.currency, '')) as currency,
        e.category,
        e.raw_text,
        lower(coalesce(e.type::text, 'expense')) as type
      from public.expenses e
      where coalesce(e.is_recurring, false) = false
        and (
          e.type is null
          or e.type = 'expense'
        )
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
        and lower(coalesce(e.category, 'uncategorized')) = any(p_categories)
        and (p_category is null or lower(coalesce(e.category, 'uncategorized')) = lower(p_category))
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
      select date_trunc('year', date)::date as bucket_start,
             sum(abs(amount_cents))::bigint as amount_cents
      from spend_rows
      group by 1
    ),
    currency_yearly_rollup as (
      select date_trunc('year', date)::date as bucket_start,
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
      from filtered_expenses
      group by 1
    ),
    currency_rollup as (
      select upper(coalesce(currency, '')) as currency,
             count(*)::integer as transaction_count
      from spend_rows
      group by 1
    )
    select jsonb_build_object(
      'transaction_count', (select count(*) from filtered_expenses),
      'expense_total_cents', coalesce((select sum(abs(amount_cents)) from spend_rows), 0),
      'income_total_cents', coalesce((select sum(abs(amount_cents)) from income_rows), 0),
      'has_multiple_currencies', (select count(*) from currency_rollup) > 1,
      'category_summaries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'category', c.category,
          'amount_cents', c.amount_cents,
          'transaction_count', c.transaction_count
        ) order by c.amount_cents desc)
        from category_rollup c
      ), '[]'::jsonb),
      'yearly_period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', y.bucket_start,
          'amount_cents', y.amount_cents
        ) order by y.bucket_start asc)
        from yearly_rollup y
      ), '[]'::jsonb),
      'period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', p.bucket_start,
          'amount_cents', p.amount_cents
        ) order by p.bucket_start asc)
        from period_rollup p
      ), '[]'::jsonb),
      'currency_category_summaries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'category', c.category,
          'currency', c.currency,
          'amount_cents', c.amount_cents,
          'transaction_count', c.transaction_count
        ) order by c.amount_cents desc)
        from currency_category_rollup c
      ), '[]'::jsonb),
      'currency_yearly_period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', y.bucket_start,
          'currency', y.currency,
          'amount_cents', y.amount_cents
        ) order by y.bucket_start asc, y.currency asc)
        from currency_yearly_rollup y
      ), '[]'::jsonb),
      'currency_period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', p.bucket_start,
          'currency', p.currency,
          'amount_cents', p.amount_cents
        ) order by p.bucket_start asc, p.currency asc)
        from currency_period_rollup p
      ), '[]'::jsonb),
      'currency_type_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'currency', t.currency,
          'expense_total_cents', t.expense_total_cents,
          'income_total_cents', t.income_total_cents,
          'transaction_count', t.transaction_count
        ) order by t.currency asc)
        from currency_type_rollup t
      ), '[]'::jsonb)
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
  end if;

  -- Fast path used by Wallet Details. The current production summary excludes
  -- transfers from every returned aggregate, so this path does not scan
  -- account_transfers at all.
  if p_account_id is not null and coalesce(p_include_unassigned_account, false) = false then
    with contact_ids as (
      select uc.id
      from public.user_contacts uc
      where uc.user_id = p_user_id
    ),
    filtered_expenses as materialized (
      select
        e.date,
        e.amount_cents,
        upper(coalesce(e.currency, '')) as currency,
        e.category,
        e.raw_text,
        lower(coalesce(e.type::text, 'expense')) as type
      from public.expenses e
      where e.account_id = p_account_id
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
          p_category is null
          or lower(coalesce(e.category, 'uncategorized')) = lower(p_category)
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
      select date_trunc('year', date)::date as bucket_start,
             sum(abs(amount_cents))::bigint as amount_cents
      from spend_rows
      group by 1
    ),
    currency_yearly_rollup as (
      select date_trunc('year', date)::date as bucket_start,
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
      from filtered_expenses
      group by 1
    ),
    currency_rollup as (
      select upper(coalesce(currency, '')) as currency,
             count(*)::integer as transaction_count
      from spend_rows
      group by 1
    )
    select jsonb_build_object(
      'transaction_count', (select count(*) from filtered_expenses),
      'expense_total_cents', coalesce((select sum(abs(amount_cents)) from spend_rows), 0),
      'income_total_cents', coalesce((select sum(abs(amount_cents)) from income_rows), 0),
      'has_multiple_currencies', (select count(*) from currency_rollup) > 1,
      'category_summaries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'category', c.category,
          'amount_cents', c.amount_cents,
          'transaction_count', c.transaction_count
        ) order by c.amount_cents desc)
        from category_rollup c
      ), '[]'::jsonb),
      'yearly_period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', y.bucket_start,
          'amount_cents', y.amount_cents
        ) order by y.bucket_start asc)
        from yearly_rollup y
      ), '[]'::jsonb),
      'period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', p.bucket_start,
          'amount_cents', p.amount_cents
        ) order by p.bucket_start asc)
        from period_rollup p
      ), '[]'::jsonb),
      'currency_category_summaries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'category', c.category,
          'currency', c.currency,
          'amount_cents', c.amount_cents,
          'transaction_count', c.transaction_count
        ) order by c.amount_cents desc)
        from currency_category_rollup c
      ), '[]'::jsonb),
      'currency_yearly_period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', y.bucket_start,
          'currency', y.currency,
          'amount_cents', y.amount_cents
        ) order by y.bucket_start asc, y.currency asc)
        from currency_yearly_rollup y
      ), '[]'::jsonb),
      'currency_period_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket_start', p.bucket_start,
          'currency', p.currency,
          'amount_cents', p.amount_cents
        ) order by p.bucket_start asc, p.currency asc)
        from currency_period_rollup p
      ), '[]'::jsonb),
      'currency_type_totals', coalesce((
        select jsonb_agg(jsonb_build_object(
          'currency', t.currency,
          'expense_total_cents', t.expense_total_cents,
          'income_total_cents', t.income_total_cents,
          'transaction_count', t.transaction_count
        ) order by t.currency asc)
        from currency_type_rollup t
      ), '[]'::jsonb)
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
  end if;

  -- General path: previous implementation retained for non-wallet-detail calls.
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

reset lock_timeout;
reset statement_timeout;

notify pgrst, 'reload schema';
