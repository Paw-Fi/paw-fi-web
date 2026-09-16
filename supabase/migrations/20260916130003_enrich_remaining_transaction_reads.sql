create or replace function public.get_user_expense_by_id_v2(
  p_user_id uuid,
  p_expense_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  v_payload := public.get_user_expense_by_id_v1(p_user_id, p_expense_id);
  if v_payload is null then
    return null;
  end if;
  return (public.enrich_merchant_identity_items(jsonb_build_array(v_payload)) -> 0);
end;
$$;

create or replace function public.get_plaid_sync_review_transactions_v3(
  p_user_id uuid,
  p_bank_connection_id uuid,
  p_bank_account_ids uuid[],
  p_household_id uuid default null,
  p_cursor_review_priority boolean default null,
  p_cursor_date date default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 200
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  v_payload := public.get_plaid_sync_review_transactions_v2(
    p_user_id,
    p_bank_connection_id,
    p_bank_account_ids,
    p_household_id,
    p_cursor_review_priority,
    p_cursor_date,
    p_cursor_created_at,
    p_cursor_id,
    p_limit
  );
  return jsonb_set(
    v_payload,
    '{items}',
    public.enrich_merchant_identity_items(v_payload -> 'items'),
    true
  );
end;
$$;

create or replace function public.get_home_mom_transactions_v3(
  p_user_id uuid,
  p_start_date date default null,
  p_end_date date default null,
  p_before_date date default null,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 1000
) returns table (
  id text,
  contact_id uuid,
  user_id uuid,
  household_id uuid,
  date date,
  amount_cents bigint,
  currency text,
  category text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_text text,
  split_group_id uuid,
  bank_account_id uuid,
  type text,
  analytics_class text,
  analytics_is_final boolean,
  analytics_spending_multiplier smallint,
  analytics_counts_toward_income boolean,
  is_recurring boolean,
  merchant_id uuid,
  merchant_domain text
)
language sql
security invoker
set search_path = ''
as $$
  select
    item.id,
    item.contact_id,
    item.user_id,
    item.household_id,
    item.date,
    item.amount_cents,
    item.currency,
    item.category,
    item.created_at,
    item.updated_at,
    item.raw_text,
    item.split_group_id,
    item.bank_account_id,
    item.type,
    item.analytics_class,
    item.analytics_is_final,
    item.analytics_spending_multiplier,
    item.analytics_counts_toward_income,
    item.is_recurring,
    expense.merchant_id,
    merchant.domain
  from public.get_home_mom_transactions_v2(
    p_user_id,
    p_start_date,
    p_end_date,
    p_before_date,
    p_before_created_at,
    p_before_id,
    p_limit
  ) item
  join public.expenses expense on expense.id::text = item.id
  left join public.merchants merchant on merchant.id = expense.merchant_id;
$$;

revoke all on function public.get_user_expense_by_id_v2(uuid, text) from public, anon;
grant execute on function public.get_user_expense_by_id_v2(uuid, text) to authenticated;
revoke all on function public.get_plaid_sync_review_transactions_v3(
  uuid, uuid, uuid[], uuid, boolean, date, timestamptz, uuid, integer
) from public, anon;
grant execute on function public.get_plaid_sync_review_transactions_v3(
  uuid, uuid, uuid[], uuid, boolean, date, timestamptz, uuid, integer
) to authenticated;
revoke all on function public.get_home_mom_transactions_v3(
  uuid, date, date, date, timestamptz, uuid, integer
) from public, anon;
grant execute on function public.get_home_mom_transactions_v3(
  uuid, date, date, date, timestamptz, uuid, integer
) to authenticated;

notify pgrst, 'reload schema';
