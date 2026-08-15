create or replace function public.enqueue_bank_sync_job_v1(
  p_bank_connection_id uuid,
  p_provider text,
  p_trigger_source text,
  p_job_type text,
  p_dedupe_key text,
  p_webhook_event_id text,
  p_payload jsonb,
  p_set_needs_resync_on_duplicate boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
  v_is_webhook_duplicate boolean := false;
begin
  insert into public.bank_sync_jobs (
    bank_connection_id,
    provider,
    trigger_source,
    job_type,
    dedupe_key,
    webhook_event_id,
    payload,
    next_attempt_at,
    attempt_count
  ) values (
    p_bank_connection_id,
    p_provider,
    p_trigger_source,
    p_job_type,
    p_dedupe_key,
    p_webhook_event_id,
    coalesce(p_payload, '{}'::jsonb),
    null,
    0
  )
  on conflict do nothing
  returning id into v_job_id;

  if v_job_id is not null then
    return jsonb_build_object(
      'enqueued', true,
      'duplicate', false,
      'needs_resync_queued', false
    );
  end if;

  if p_webhook_event_id is not null then
    select exists (
      select 1
      from public.bank_sync_jobs job
      where job.webhook_event_id = p_webhook_event_id
    ) into v_is_webhook_duplicate;
  end if;

  if coalesce(p_set_needs_resync_on_duplicate, true)
      and p_job_type = 'transactions_sync'
      and not v_is_webhook_duplicate then
    update public.bank_connections
    set needs_resync = true,
        updated_at = now()
    where id = p_bank_connection_id;

    return jsonb_build_object(
      'enqueued', false,
      'duplicate', true,
      'needs_resync_queued', true
    );
  end if;

  return jsonb_build_object(
    'enqueued', false,
    'duplicate', true,
    'needs_resync_queued', false
  );
end;
$$;

revoke all on function public.enqueue_bank_sync_job_v1(
  uuid, text, text, text, text, text, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.enqueue_bank_sync_job_v1(
  uuid, text, text, text, text, text, jsonb, boolean
) to service_role;

create or replace function public.get_user_transactions_summary_v2(
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
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized transaction summary access' using errcode = '42501';
  end if;

  if p_household_id is not null and not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id and hm.user_id = p_user_id
  ) then
    raise exception 'Unauthorized household transaction summary access' using errcode = '42501';
  end if;

  v_currencies := nullif(array(
    select distinct upper(trim(value))
    from unnest(coalesce(p_currencies, '{}'::text[])) value
    where trim(value) <> ''
  ), '{}'::text[]);
  if v_currencies is null and nullif(trim(coalesce(p_currency, '')), '') is not null then
    v_currencies := array[upper(trim(p_currency))];
  end if;

  v_categories := nullif(array(
    select distinct lower(trim(value))
    from unnest(coalesce(p_categories, '{}'::text[])) value
    where trim(value) <> ''
  ), '{}'::text[]);

  with contact_ids as (
    select uc.id from public.user_contacts uc where uc.user_id = p_user_id
  ), filtered_items as materialized (
    select
      e.date,
      e.amount_cents,
      upper(coalesce(e.currency, '')) as currency,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only' then 'uncategorized'
        else lower(coalesce(e.category, 'uncategorized'))
      end as category,
      case
        when p_household_id is not null
          and e.user_id is distinct from p_user_id
          and e.privacy_scope = 'balances_only' then null
        else e.raw_text
      end as raw_text,
      not (
        p_household_id is not null
        and e.user_id is distinct from p_user_id
        and e.privacy_scope = 'balances_only'
      ) as dimensions_visible,
      lower(coalesce(e.type::text, 'expense')) as type,
      e.analytics_class,
      e.analytics_spending_multiplier,
      e.analytics_counts_toward_income
    from public.expenses e
    where e.deleted_at is null
      and coalesce(e.is_recurring, false) = false
      and (
        (
          p_household_id is null
          and e.household_id is null
          and (e.user_id = p_user_id or exists (
            select 1 from contact_ids c where c.id = e.contact_id
          ))
        )
        or (p_household_id is not null and e.household_id = p_household_id)
      )
      and (v_currencies is null or upper(coalesce(e.currency, '')) = any(v_currencies))
      and (p_account_id is null or e.account_id = p_account_id or (
        p_include_unassigned_account and e.account_id is null
      ))
      and (
        (p_category is null and v_categories is null)
        or (
          not (
            p_household_id is not null
            and e.user_id is distinct from p_user_id
            and e.privacy_scope = 'balances_only'
          )
          and (p_category is null or lower(coalesce(e.category, 'uncategorized')) = lower(p_category))
          and (v_categories is null or lower(coalesce(e.category, 'uncategorized')) = any(v_categories))
        )
      )
      and (
        coalesce(lower(p_type), 'all') = 'all'
        or (lower(p_type) = 'expense' and e.analytics_spending_multiplier <> 0)
        or (lower(p_type) = 'income' and e.analytics_counts_toward_income)
      )
      and (p_start_date is null or e.date >= p_start_date)
      and (p_end_date is null or e.date <= p_end_date)
      and (
        coalesce(trim(p_search_query), '') = ''
        or (
          not (
            p_household_id is not null
            and e.user_id is distinct from p_user_id
            and e.privacy_scope = 'balances_only'
          )
          and (
            lower(coalesce(e.category, 'uncategorized')) like '%' || lower(trim(p_search_query)) || '%'
            or lower(coalesce(e.raw_text, '')) like '%' || lower(trim(p_search_query)) || '%'
            or ((e.amount_cents::numeric / 100.0)::text like '%' || trim(p_search_query) || '%')
          )
        )
      )
  ), spend_rows as (
    select *, (amount_cents * analytics_spending_multiplier)::bigint as analytics_amount_cents
    from filtered_items
    where analytics_spending_multiplier <> 0
  ), income_rows as (
    select * from filtered_items where analytics_counts_toward_income
  ), category_rollup as (
    select category, sum(analytics_amount_cents)::bigint as amount_cents, count(*)::integer as transaction_count
    from spend_rows where dimensions_visible group by category
  ), currency_category_rollup as (
    select category, currency, sum(analytics_amount_cents)::bigint as amount_cents, count(*)::integer as transaction_count
    from spend_rows where dimensions_visible group by category, currency
  ), yearly_rollup as (
    select date_trunc('year', date)::date as bucket_start, sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1
  ), currency_yearly_rollup as (
    select date_trunc('year', date)::date as bucket_start, currency, sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1, currency
  ), period_rollup as (
    select case coalesce(lower(p_interval_granularity), 'yearly')
      when 'daily' then date_trunc('day', date)::date
      when 'weekly' then date_trunc('week', date)::date
      when 'monthly' then date_trunc('month', date)::date
      else date_trunc('year', date)::date end as bucket_start,
      sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1
  ), currency_period_rollup as (
    select case coalesce(lower(p_interval_granularity), 'yearly')
      when 'daily' then date_trunc('day', date)::date
      when 'weekly' then date_trunc('week', date)::date
      when 'monthly' then date_trunc('month', date)::date
      else date_trunc('year', date)::date end as bucket_start,
      currency, sum(analytics_amount_cents)::bigint as amount_cents
    from spend_rows where dimensions_visible group by 1, currency
  ), currency_type_rollup as (
    select
      currency,
      coalesce(sum(amount_cents * analytics_spending_multiplier) filter (
        where analytics_spending_multiplier <> 0
      ), 0)::bigint as expense_total_cents,
      coalesce(sum(abs(amount_cents)) filter (
        where analytics_counts_toward_income
      ), 0)::bigint as income_total_cents,
      count(*)::integer as transaction_count
    from filtered_items where dimensions_visible group by currency
  )
  select jsonb_build_object(
    'transaction_count', (select count(*) from filtered_items where dimensions_visible),
    'expense_total_cents', coalesce((select sum(analytics_amount_cents) from spend_rows), 0),
    'income_total_cents', coalesce((select sum(abs(amount_cents)) from income_rows), 0),
    'has_multiple_currencies', (select count(distinct currency) from spend_rows where dimensions_visible) > 1,
    'category_summaries', coalesce((select jsonb_agg(jsonb_build_object(
      'category', category, 'amount_cents', amount_cents, 'transaction_count', transaction_count
    ) order by amount_cents desc) from category_rollup), '[]'::jsonb),
    'yearly_period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'amount_cents', amount_cents
    ) order by bucket_start) from yearly_rollup), '[]'::jsonb),
    'period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'amount_cents', amount_cents
    ) order by bucket_start) from period_rollup), '[]'::jsonb),
    'currency_category_summaries', coalesce((select jsonb_agg(jsonb_build_object(
      'category', category, 'currency', currency, 'amount_cents', amount_cents,
      'transaction_count', transaction_count
    ) order by amount_cents desc) from currency_category_rollup), '[]'::jsonb),
    'currency_yearly_period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'currency', currency, 'amount_cents', amount_cents
    ) order by bucket_start, currency) from currency_yearly_rollup), '[]'::jsonb),
    'currency_period_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket_start', bucket_start, 'currency', currency, 'amount_cents', amount_cents
    ) order by bucket_start, currency) from currency_period_rollup), '[]'::jsonb),
    'currency_type_totals', coalesce((select jsonb_agg(jsonb_build_object(
      'currency', currency, 'expense_total_cents', expense_total_cents,
      'income_total_cents', income_total_cents, 'transaction_count', transaction_count
    ) order by currency) from currency_type_rollup), '[]'::jsonb)
  ) into v_payload;

  return coalesce(v_payload, jsonb_build_object(
    'transaction_count', 0, 'expense_total_cents', 0, 'income_total_cents', 0,
    'has_multiple_currencies', false, 'category_summaries', '[]'::jsonb,
    'yearly_period_totals', '[]'::jsonb, 'period_totals', '[]'::jsonb,
    'currency_category_summaries', '[]'::jsonb,
    'currency_yearly_period_totals', '[]'::jsonb,
    'currency_period_totals', '[]'::jsonb, 'currency_type_totals', '[]'::jsonb
  ));
end;
$$;

revoke execute on function public.get_user_transactions_summary_v2(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text, date, date, text
) from public, anon;
grant execute on function public.get_user_transactions_summary_v2(
  uuid, uuid, text, text[], text, uuid, boolean, text[], text, text, date, date, text
) to authenticated;

notify pgrst, 'reload schema';
