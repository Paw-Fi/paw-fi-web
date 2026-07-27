create or replace function public.get_user_analytics(p_user_id uuid)
returns json
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_contact_ids uuid[];
  v_result json;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized user analytics access' using errcode = '42501';
  end if;

  select array_agg(id) into v_contact_ids
  from public.user_contacts
  where user_id = p_user_id;

  select json_build_object(
    'contact', (
      select row_to_json(contact_row.*)
      from (
        select id, user_id, phone_e164, verified, preferred_currency,
          preferred_timezone, financial_month_start_day, created_at, updated_at
        from public.user_contacts
        where user_id = p_user_id
        order by updated_at desc nulls last, created_at desc nulls last
        limit 1
      ) contact_row
    ),
    'expenses', coalesce((
      select json_agg(expense_row.*)
      from (
        select
          e.id, e.contact_id, e.user_id, e.date, e.amount_cents,
          e.currency, e.category, e.created_at, e.updated_at, e.raw_text,
          e.merchant, e.receipt_image_url, e.household_id, e.split_group_id,
          e.type, e.is_recurring, e.bank_account_id, e.account_id,
          e.analytics_class, e.analytics_is_final,
          e.analytics_spending_multiplier, e.analytics_counts_toward_income
        from public.expenses e
        where e.deleted_at is null
          and (
            e.user_id = p_user_id
            or (
              v_contact_ids is not null
              and array_length(v_contact_ids, 1) > 0
              and e.contact_id = any(v_contact_ids)
            )
          )
          and e.household_id is null
          and e.split_group_id is null
          and coalesce(e.is_recurring, false) = false
        order by e.date desc
      ) expense_row
    ), '[]'::json),
    'budgets', coalesce((
      select json_agg(budget_row.*)
      from (
        select id, contact_id, date, amount_cents, currency
        from public.daily_budgets
        where v_contact_ids is not null
          and array_length(v_contact_ids, 1) > 0
          and contact_id = any(v_contact_ids)
        order by date asc
        limit 10000
      ) budget_row
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_user_analytics(uuid) from public, anon;
grant execute on function public.get_user_analytics(uuid) to authenticated;

notify pgrst, 'reload schema';
