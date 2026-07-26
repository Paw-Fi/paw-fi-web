create or replace function public.get_household_income_summary_v2(
  p_user_id uuid,
  p_household_id uuid,
  p_start_date date default null,
  p_end_date date default null,
  p_currency varchar(3) default null
) returns table(
  total_income_cents bigint,
  currency varchar(3),
  member_breakdown jsonb,
  category_breakdown jsonb,
  transaction_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.household_members member
    where member.household_id = p_household_id
      and member.user_id = p_user_id
  ) then
    raise exception 'User is not a member of the household'
      using errcode = '42501';
  end if;

  return query
  with filtered_income as (
    select
      expense.user_id,
      expense.amount_cents,
      expense.currency,
      expense.normalized_amount_cents,
      expense.base_currency,
      expense.category,
      expense.privacy_scope
    from public.expenses expense
    where expense.household_id = p_household_id
      and expense.deleted_at is null
      and expense.analytics_is_final is true
      and expense.analytics_counts_toward_income is true
      and coalesce(expense.is_recurring, false) = false
      and (p_start_date is null or expense.date >= p_start_date)
      and (p_end_date is null or expense.date <= p_end_date)
      and (p_currency is null or upper(expense.currency) = upper(p_currency))
      and (
        expense.privacy_scope in ('full', 'balances_only')
        or expense.user_id = p_user_id
      )
  ), member_totals as (
    select user_id::text as member_key,
      sum(abs(case when p_currency is null
        then coalesce(normalized_amount_cents, amount_cents)
        else amount_cents end)) as total_cents
    from filtered_income
    group by user_id
  ), category_totals as (
    select category,
      sum(abs(case when p_currency is null
        then coalesce(normalized_amount_cents, amount_cents)
        else amount_cents end)) as total_cents
    from filtered_income
    where privacy_scope = 'full' or user_id = p_user_id
    group by category
  )
  select
    coalesce(sum(abs(case when p_currency is null
      then coalesce(item.normalized_amount_cents, item.amount_cents)
      else item.amount_cents end)), 0)::bigint,
    coalesce(p_currency, max(item.base_currency), max(item.currency), 'USD')::varchar(3),
    coalesce((select jsonb_object_agg(member_key, total_cents) from member_totals), '{}'::jsonb),
    coalesce((select jsonb_object_agg(category, total_cents) from category_totals), '{}'::jsonb),
    count(*)::integer
  from filtered_income item;
end;
$$;

revoke all on function public.get_household_income_summary_v2(uuid, uuid, date, date, varchar) from public, anon, authenticated;
grant execute on function public.get_household_income_summary_v2(uuid, uuid, date, date, varchar) to service_role;

notify pgrst, 'reload schema';
