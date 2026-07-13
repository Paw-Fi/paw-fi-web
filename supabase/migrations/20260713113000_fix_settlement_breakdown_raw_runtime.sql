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
  with pairwise_balance as (
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
      where split_group.household_id = p_household_id
        and split_line.is_settled = false
        and split_group.payer_user_id = p_other_user_id
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
      where split_group.household_id = p_household_id
        and split_line.is_settled = false
        and split_group.payer_user_id = v_actor_id
        and split_line.user_id = p_other_user_id
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
        and settlement.payer_user_id = p_other_user_id
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
        and settlement.participant_user_id = p_other_user_id
        and upper(settlement.currency) = v_currency
    )
    select
      coalesce(sum(delta.split_to_delta), 0) as split_to_cents,
      coalesce(sum(delta.split_from_delta), 0) as split_from_cents,
      coalesce(sum(delta.paid_to_delta), 0) as paid_to_cents,
      coalesce(sum(delta.paid_from_delta), 0) as paid_from_cents,
      (coalesce(sum(delta.split_to_delta), 0) - coalesce(sum(delta.split_from_delta), 0))
        - (coalesce(sum(delta.paid_to_delta), 0) - coalesce(sum(delta.paid_from_delta), 0)) as net_cents
    from deltas delta
    where delta.other_user_id = p_other_user_id
  ),
  allocation_totals as (
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
  ),
  obligation_rows as (
    select
      case
        when split_group.payer_user_id = p_other_user_id
          and split_line.user_id = v_actor_id
          then 'you_owe'
        else 'they_owe_you'
      end as direction,
      split_group.expense_id,
      split_group.id as split_group_id,
      split_line.id as split_line_id,
      coalesce(
        expense.date::timestamp at time zone 'UTC',
        split_group.created_at
      ) as expense_date,
      split_group.description as expense_description,
      expense.category as expense_category,
      expense.raw_text as expense_raw_text,
      expense.type as expense_type,
      abs(coalesce(split_line.amount_cents, 0)) as total_amount_cents,
      greatest(
        abs(coalesce(split_line.amount_cents, 0))
          - coalesce(allocation.allocated_cents, 0),
        0
      ) as remaining_amount_cents
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    left join public.expenses expense
      on expense.id = split_group.expense_id
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
  ),
  obligation_net as (
    select
      coalesce(
        sum(
          case
            when obligation.direction = 'you_owe'
              then obligation.remaining_amount_cents
            else 0
          end
        ),
        0
      )
      - coalesce(
        sum(
          case
            when obligation.direction = 'they_owe_you'
              then obligation.remaining_amount_cents
            else 0
          end
        ),
        0
      ) as net_cents
    from obligation_rows obligation
  ),
  adjustment_row as (
    select
      case
        when (balance.net_cents - obligation.net_cents) > 0 then 'you_owe'
        else 'they_owe_you'
      end as direction,
      null::uuid as expense_id,
      null::uuid as split_group_id,
      null::uuid as split_line_id,
      now() as expense_date,
      'Settlement adjustment'::text as expense_description,
      null::text as expense_category,
      null::text as expense_raw_text,
      'adjustment'::text as expense_type,
      abs(balance.net_cents - obligation.net_cents) as total_amount_cents,
      abs(balance.net_cents - obligation.net_cents) as remaining_amount_cents
    from pairwise_balance balance
    cross join obligation_net obligation
    where (balance.net_cents - obligation.net_cents) <> 0
  )
  select
    case
      when source.direction = 'you_owe' then 'you_owe'
      else 'they_owe_you'
    end as direction,
    source.expense_id,
    source.split_group_id,
    source.split_line_id,
    source.expense_date,
    source.expense_description,
    source.expense_category,
    source.expense_raw_text,
    source.expense_type,
    source.total_amount_cents::bigint,
    source.remaining_amount_cents::bigint
  from (
    select * from obligation_rows
    union all
    select * from adjustment_row
  ) source
  order by
    source.expense_date desc,
    source.split_group_id desc nulls last,
    source.split_line_id desc nulls last;
end;
$$;
