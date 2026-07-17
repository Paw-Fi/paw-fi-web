-- Preserve the applied July 16 settlement projection as a private rollback
-- diagnostic, then expose the same RPC signature with corrected display
-- metadata. Settlement math remains sourced from remaining_amount_cents;
-- total_amount_cents is the full parent transaction amount.

alter function public.households_get_settlement_breakdown_v2(uuid, uuid, text)
  rename to households_get_settlement_breakdown_share_projection_v3;

revoke all on function public.households_get_settlement_breakdown_share_projection_v3(
  uuid, uuid, text
) from public, anon, authenticated;

create function public.households_get_settlement_breakdown_v2(
  p_household_id uuid,
  p_other_user_id uuid,
  p_currency text default null
)
returns table (
  direction text,
  expense_id uuid,
  split_group_id uuid,
  split_line_id uuid,
  expense_date timestamptz,
  expense_description text,
  expense_category text,
  expense_raw_text text,
  expense_type text,
  total_amount_cents bigint,
  remaining_amount_cents bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    breakdown.direction,
    breakdown.expense_id,
    breakdown.split_group_id,
    breakdown.split_line_id,
    case
      when breakdown.expense_id is null then breakdown.expense_date
      else coalesce(expense.created_at, breakdown.expense_date)
    end as expense_date,
    breakdown.expense_description,
    breakdown.expense_category,
    breakdown.expense_raw_text,
    breakdown.expense_type,
    case
      when breakdown.expense_id is null then breakdown.total_amount_cents
      else coalesce(abs(expense.amount_cents), breakdown.total_amount_cents)
    end::bigint as total_amount_cents,
    breakdown.remaining_amount_cents
  from public.households_get_settlement_breakdown_share_projection_v3(
    p_household_id,
    p_other_user_id,
    p_currency
  ) breakdown
  left join public.expenses expense
    on expense.id = breakdown.expense_id
    and expense.deleted_at is null
  order by
    case
      when breakdown.expense_id is null then breakdown.expense_date
      else coalesce(expense.created_at, breakdown.expense_date)
    end desc,
    breakdown.split_group_id desc nulls last,
    breakdown.split_line_id desc nulls last;
$$;

revoke all on function public.households_get_settlement_breakdown_v2(
  uuid, uuid, text
) from public, anon;

grant execute on function public.households_get_settlement_breakdown_v2(
  uuid, uuid, text
) to authenticated;

comment on function public.households_get_settlement_breakdown_v2(
  uuid, uuid, text
) is 'Returns current-cycle pairwise settlement shares at their real remaining amounts, with each source row carrying its full parent transaction total and exact created timestamp.';
