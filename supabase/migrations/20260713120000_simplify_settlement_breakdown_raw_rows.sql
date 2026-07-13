create or replace function public.households_get_settlement_breakdown_rows_raw_v2(
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
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_currency text;
  v_backfill_processed integer := 0;
begin
  v_actor_id := (select auth.uid());
  if v_actor_id is null then
    raise exception 'households_get_settlement_breakdown_v2: auth.uid() is null';
  end if;

  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_get_settlement_breakdown_v2: actor not member of household';
  end if;

  if not public.is_member_of_household(p_household_id, p_other_user_id) then
    raise exception 'households_get_settlement_breakdown_v2: other member not in household';
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select household.currency
    into v_currency
    from public.households household
    where household.id = p_household_id;
  end if;

  loop
    v_backfill_processed := public.households_backfill_settlement_allocations_v2(
      p_household_id,
      v_actor_id,
      p_other_user_id,
      v_currency,
      5000
    );
    exit when v_backfill_processed = 0;
  end loop;

  return query
  with allocation_totals as (
    select
      allocation.split_line_id,
      coalesce(sum(allocation.allocated_amount_cents), 0) as allocated_cents
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.household_id = p_household_id
      and upper(allocation.currency) = v_currency
      and (
        (
          allocation.payer_user_id = p_other_user_id
          and allocation.participant_user_id = v_actor_id
        )
        or
        (
          allocation.payer_user_id = v_actor_id
          and allocation.participant_user_id = p_other_user_id
        )
      )
    group by allocation.split_line_id
  )
  select
    (
      case
        when split_group.payer_user_id = p_other_user_id
          and split_line.user_id = v_actor_id
          then 'you_owe'
        else 'they_owe_you'
      end
    )::text as direction,
    split_group.expense_id,
    split_group.id as split_group_id,
    split_line.id as split_line_id,
    coalesce(
      expense.date::timestamp at time zone 'UTC',
      split_group.created_at
    ) as expense_date,
    split_group.description::text as expense_description,
    expense.category::text as expense_category,
    expense.raw_text::text as expense_raw_text,
    expense.type::text as expense_type,
    abs(coalesce(split_line.amount_cents, 0))::bigint as total_amount_cents,
    greatest(
      abs(coalesce(split_line.amount_cents, 0))
        - coalesce(allocation.allocated_cents, 0),
      0
    )::bigint as remaining_amount_cents
  from public.expense_split_lines split_line
  join public.expense_split_groups split_group
    on split_group.id = split_line.split_group_id
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  left join allocation_totals allocation
    on allocation.split_line_id = split_line.id
  where split_group.household_id = p_household_id
    and upper(split_group.currency) = v_currency
    and split_line.is_settled = false
    and abs(coalesce(split_line.amount_cents, 0)) > 0
    and (
      (
        split_group.payer_user_id = p_other_user_id
        and split_line.user_id = v_actor_id
      )
      or
      (
        split_group.payer_user_id = v_actor_id
        and split_line.user_id = p_other_user_id
      )
    )
    and greatest(
      abs(coalesce(split_line.amount_cents, 0))
        - coalesce(allocation.allocated_cents, 0),
      0
    ) > 0
  order by
    coalesce(
      expense.date::timestamp at time zone 'UTC',
      split_group.created_at
    ) desc,
    split_group.id desc,
    split_line.id desc;
end;
$$;
