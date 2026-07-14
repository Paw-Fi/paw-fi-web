create or replace function public.households_get_pairwise_settlement_balances_v2(
  p_household_id uuid,
  p_currency text default null
)
returns table (
  other_user_id uuid,
  currency text,
  split_to_cents bigint,
  split_from_cents bigint,
  paid_to_cents bigint,
  paid_from_cents bigint,
  net_cents bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_currency text;
begin
  v_actor_id := (select auth.uid());
  if v_actor_id is null then
    raise exception 'households_get_pairwise_settlement_balances_v2: auth.uid() is null';
  end if;

  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_get_pairwise_settlement_balances_v2: actor not member of household';
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select household.currency
    into v_currency
    from public.households household
    where household.id = p_household_id;
  end if;

  return query
  with deltas as (
    select
      split_group.payer_user_id as other_user_id,
      abs(coalesce(split_line.amount_cents, 0)) as split_to_delta,
      0::bigint as split_from_delta,
      0::bigint as paid_to_delta,
      0::bigint as paid_from_delta
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and split_line.is_settled = false
      and split_group.payer_user_id <> v_actor_id
      and split_line.user_id = v_actor_id
      and upper(split_group.currency) = v_currency

    union all

    select
      split_line.user_id as other_user_id,
      0::bigint,
      abs(coalesce(split_line.amount_cents, 0)),
      0::bigint,
      0::bigint
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and split_line.is_settled = false
      and split_group.payer_user_id = v_actor_id
      and split_line.user_id <> v_actor_id
      and upper(split_group.currency) = v_currency

    union all

    select
      settlement.payer_user_id as other_user_id,
      0::bigint,
      0::bigint,
      abs(coalesce(settlement.amount_cents, 0)),
      0::bigint
    from public.household_settlement_events settlement
    where settlement.household_id = p_household_id
      and settlement.participant_user_id = v_actor_id
      and upper(settlement.currency) = v_currency

    union all

    select
      settlement.participant_user_id as other_user_id,
      0::bigint,
      0::bigint,
      0::bigint,
      abs(coalesce(settlement.amount_cents, 0))
    from public.household_settlement_events settlement
    where settlement.household_id = p_household_id
      and settlement.payer_user_id = v_actor_id
      and upper(settlement.currency) = v_currency
  )
  select
    delta.other_user_id,
    v_currency as currency,
    coalesce(sum(delta.split_to_delta), 0)::bigint as split_to_cents,
    coalesce(sum(delta.split_from_delta), 0)::bigint as split_from_cents,
    coalesce(sum(delta.paid_to_delta), 0)::bigint as paid_to_cents,
    coalesce(sum(delta.paid_from_delta), 0)::bigint as paid_from_cents,
    (
      (coalesce(sum(delta.split_to_delta), 0) - coalesce(sum(delta.split_from_delta), 0))
        - (coalesce(sum(delta.paid_to_delta), 0) - coalesce(sum(delta.paid_from_delta), 0))
    )::bigint as net_cents
  from deltas delta
  where delta.other_user_id is not null
    and delta.other_user_id <> v_actor_id
  group by delta.other_user_id
  having
    coalesce(sum(delta.split_to_delta), 0) <> 0
    or coalesce(sum(delta.split_from_delta), 0) <> 0
    or coalesce(sum(delta.paid_to_delta), 0) <> 0
    or coalesce(sum(delta.paid_from_delta), 0) <> 0
  order by abs(
    (coalesce(sum(delta.split_to_delta), 0) - coalesce(sum(delta.split_from_delta), 0))
      - (coalesce(sum(delta.paid_to_delta), 0) - coalesce(sum(delta.paid_from_delta), 0))
  ) desc,
  delta.other_user_id asc;
end;
$$;
