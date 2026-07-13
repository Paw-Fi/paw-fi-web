set lock_timeout = '5s';
set statement_timeout = '2min';

-- Permanent user deletion replaced physical expense deletion, so the expense
-- foreign key no longer cascades into split groups. Restore that invariant
-- without changing live or restorable provider transactions.
create or replace function public.cleanup_soft_deleted_expense_splits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  select expense.household_id
  into v_household_id
  from public.expenses expense
  where expense.id = new.id
    and expense.deleted_at is not null
    and expense.deleted_reason = 'user_deleted';

  if not found then
    return new;
  end if;

  if v_household_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end if;

  delete from public.expense_split_groups split_group
  where split_group.expense_id = new.id;

  return new;
end;
$$;

revoke all on function public.cleanup_soft_deleted_expense_splits()
  from public, anon, authenticated;

create or replace function public.lock_soft_deleted_expense_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.household_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || new.household_id::text, 0)
    );
  end if;

  return new;
end;
$$;

revoke all on function public.lock_soft_deleted_expense_household()
  from public, anon, authenticated;

drop trigger if exists lock_soft_deleted_expense_household
  on public.expenses;

create trigger lock_soft_deleted_expense_household
before update on public.expenses
for each row
when (
  new.deleted_at is not null
  and (
    old.deleted_at is distinct from new.deleted_at
    or old.deleted_reason is distinct from new.deleted_reason
  )
)
execute function public.lock_soft_deleted_expense_household();

drop trigger if exists cleanup_soft_deleted_expense_splits
  on public.expenses;

create constraint trigger cleanup_soft_deleted_expense_splits
after update on public.expenses
deferrable initially deferred
for each row
when (
  new.deleted_at is not null
  and (
    old.deleted_at is distinct from new.deleted_at
    or old.deleted_reason is distinct from new.deleted_reason
  )
)
execute function public.cleanup_soft_deleted_expense_splits();

create or replace function public.reject_split_group_for_deleted_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended('household:' || new.household_id::text, 0)
  );

  if exists (
    select 1
    from public.expenses expense
    where expense.id = new.expense_id
      and expense.deleted_at is not null
  ) then
    raise exception 'Cannot create a split for a deleted expense'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_split_group_for_deleted_expense()
  from public, anon, authenticated;

drop trigger if exists reject_split_group_for_deleted_expense
  on public.expense_split_groups;

create trigger reject_split_group_for_deleted_expense
before insert or update of expense_id on public.expense_split_groups
for each row
execute function public.reject_split_group_for_deleted_expense();

-- Repair only orphaned settlement inputs created by earlier soft deletes. This
-- is the same dependent-row cleanup that ON DELETE CASCADE performed before
-- delete-expense switched to tombstones.
lock table public.household_settlement_events in share row exclusive mode;

do $$
declare
  v_deleted_count integer;
begin
  loop
    with deleted_split_groups as (
      select split_group.id
      from public.expense_split_groups split_group
      join public.expenses expense
        on expense.id = split_group.expense_id
      where expense.deleted_at is not null
        and expense.deleted_reason = 'user_deleted'
      order by split_group.id
      limit 1000
    )
    delete from public.expense_split_groups split_group
    using deleted_split_groups deleted
    where split_group.id = deleted.id;

    get diagnostics v_deleted_count = row_count;
    exit when v_deleted_count = 0;
  end loop;
end;
$$;

-- Keep legacy clients from reading split groups whose parent transaction is a
-- tombstone, even if a future write path bypasses the cleanup trigger.
drop policy if exists "Members can view household split groups"
  on public.expense_split_groups;
drop policy if exists "Split groups require an active expense"
  on public.expense_split_groups;

create policy "Members can view household split groups"
on public.expense_split_groups
for select
using (
  exists (
    select 1
    from public.household_members membership
    where membership.household_id = expense_split_groups.household_id
      and membership.user_id = (select auth.uid())
  )
);

create policy "Split groups require an active expense"
on public.expense_split_groups
as restrictive
for select
using (
  exists (
    select 1
    from public.expenses expense
    where expense.id = expense_split_groups.expense_id
      and expense.deleted_at is null
  )
);

drop policy if exists "Split lines require an active expense"
  on public.expense_split_lines;

create policy "Split lines require an active expense"
on public.expense_split_lines
as restrictive
for select
using (
  exists (
    select 1
    from public.expense_split_groups split_group
    join public.expenses expense
      on expense.id = split_group.expense_id
    where split_group.id = expense_split_lines.split_group_id
      and expense.deleted_at is null
  )
);

-- PostgreSQL ORs permissive policies, so keep privacy authorization separate
-- and enforce tombstone visibility with a restrictive policy that future
-- permissive policies cannot bypass.
drop policy if exists "Users can view their expenses and household expenses"
  on public.expenses;
drop policy if exists "Users can view expenses and income with privacy"
  on public.expenses;
drop policy if exists "Deleted transactions are hidden"
  on public.expenses;

create policy "Users can view expenses and income with privacy"
on public.expenses
for select
using (
  user_id = (select auth.uid())
  or (
    household_id is not null
    and exists (
      select 1
      from public.household_members membership
      where membership.household_id = expenses.household_id
        and membership.user_id = (select auth.uid())
    )
    and (
      privacy_scope in ('full', 'balances_only')
      or user_id = (select auth.uid())
    )
  )
);

create policy "Deleted transactions are hidden"
on public.expenses
as restrictive
for select
using (deleted_at is null);

-- Keep temporarily removed provider transactions available for bank-sync
-- restoration, but exclude them from the server-authoritative balance.
alter function public.households_get_pairwise_settlement_balances_v2(uuid, text)
  rename to households_get_pairwise_settlement_balances_raw_v2;

revoke all on function public.households_get_pairwise_settlement_balances_raw_v2(uuid, text)
  from public, anon, authenticated;

create function public.households_get_pairwise_settlement_balances_v2(
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
    coalesce(sum(delta.split_to_delta), 0) as split_to_cents,
    coalesce(sum(delta.split_from_delta), 0) as split_from_cents,
    coalesce(sum(delta.paid_to_delta), 0) as paid_to_cents,
    coalesce(sum(delta.paid_from_delta), 0) as paid_from_cents,
    (coalesce(sum(delta.split_to_delta), 0) - coalesce(sum(delta.split_from_delta), 0))
      - (coalesce(sum(delta.paid_to_delta), 0) - coalesce(sum(delta.paid_from_delta), 0)) as net_cents
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

revoke all on function public.households_get_pairwise_settlement_balances_v2(uuid, text)
  from public, anon;

grant execute on function public.households_get_pairwise_settlement_balances_v2(uuid, text)
  to authenticated;

create or replace function public.households_settle_amount_and_notify(
  p_household_id uuid,
  p_member_user_id uuid,
  p_mode text,
  p_amount_cents bigint,
  p_currency text default null,
  p_settlement_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_currency text;
  v_note text;
  v_net_before bigint := 0;
  v_max_pay bigint := 0;
  v_pay_cents bigint := 0;
  v_event_payer_id uuid;
  v_event_participant_id uuid;
  v_payload jsonb;
begin
  v_actor_id := (select auth.uid());
  if v_actor_id is null then
    raise exception 'households_settle_amount_and_notify: auth.uid() is null';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'households_settle_amount_and_notify: p_amount_cents must be > 0';
  end if;

  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_settle_amount_and_notify: actor not member of household';
  end if;

  if not public.is_member_of_household(p_household_id, p_member_user_id) then
    raise exception 'households_settle_amount_and_notify: member not member of household';
  end if;

  if p_mode not in ('to_member', 'from_member', 'both') then
    raise exception 'households_settle_amount_and_notify: invalid mode %', p_mode;
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select household.currency
    into v_currency
    from public.households household
    where household.id = p_household_id;
  end if;

  v_note := nullif(p_settlement_note, '');

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || p_household_id::text, 0)
  );

  select balance.net_cents
  into v_net_before
  from public.households_get_pairwise_settlement_balances_v2(
    p_household_id,
    v_currency
  ) balance
  where balance.other_user_id = p_member_user_id;

  v_net_before := coalesce(v_net_before, 0);

  if p_mode = 'both' then
    if v_net_before > 0 then
      v_event_payer_id := p_member_user_id;
      v_event_participant_id := v_actor_id;
      v_max_pay := v_net_before;
    elsif v_net_before < 0 then
      v_event_payer_id := v_actor_id;
      v_event_participant_id := p_member_user_id;
      v_max_pay := -v_net_before;
    else
      return 0;
    end if;
  elsif p_mode = 'to_member' then
    if v_net_before <= 0 then
      return 0;
    end if;
    v_event_payer_id := p_member_user_id;
    v_event_participant_id := v_actor_id;
    v_max_pay := v_net_before;
  else
    if v_net_before >= 0 then
      return 0;
    end if;
    v_event_payer_id := v_actor_id;
    v_event_participant_id := p_member_user_id;
    v_max_pay := -v_net_before;
  end if;

  v_pay_cents := least(p_amount_cents, v_max_pay);
  if v_pay_cents <= 0 then
    return 0;
  end if;

  insert into public.household_settlement_events (
    household_id,
    actor_user_id,
    payer_user_id,
    participant_user_id,
    currency,
    amount_cents,
    mode,
    is_express_netting,
    settlement_note
  ) values (
    p_household_id,
    v_actor_id,
    v_event_payer_id,
    v_event_participant_id,
    v_currency,
    v_pay_cents,
    p_mode,
    p_mode = 'both',
    v_note
  );

  if p_mode = 'both' then
    v_payload := jsonb_build_object(
      'from_user_id', v_actor_id,
      'to_user_id', p_member_user_id,
      'lines_settled_current_user_owes', 0,
      'lines_settled_member_owes', 0,
      'amounts_before', jsonb_build_object(
        'you_owe_cents', greatest(v_net_before, 0),
        'you_are_owed_cents', greatest(-v_net_before, 0),
        'net_pay_cents', v_pay_cents
      ),
      'actor_name', null,
      'currency', v_currency
    );
  else
    v_payload := jsonb_build_object(
      'from_user_id', v_actor_id,
      'to_user_id', p_member_user_id,
      'amount_cents', v_pay_cents,
      'line_count', 1,
      'actor_name', null,
      'currency', v_currency
    );
  end if;

  insert into public.notification_events (
    household_id,
    user_id,
    event_type,
    payload
  ) values (
    p_household_id,
    p_member_user_id,
    'split_settled',
    v_payload
  );

  return 1;
end;
$$;

create or replace function public.households_settle_all_debts_and_notify(
  p_household_id uuid,
  p_member_user_id uuid,
  p_mode text,
  p_you_owe_cents_before integer default 0,
  p_you_are_owed_cents_before integer default 0,
  p_currency text default null,
  p_settlement_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.households_settle_amount_and_notify(
    p_household_id,
    p_member_user_id,
    p_mode,
    9223372036854775807::bigint,
    p_currency,
    p_settlement_note
  );
end;
$$;

revoke all on function public.households_settle_amount_and_notify(uuid, uuid, text, bigint, text, text)
  from public, anon;
revoke all on function public.households_settle_all_debts_and_notify(uuid, uuid, text, integer, integer, text, text)
  from public, anon;

grant execute on function public.households_settle_amount_and_notify(uuid, uuid, text, bigint, text, text)
  to authenticated;
grant execute on function public.households_settle_all_debts_and_notify(uuid, uuid, text, integer, integer, text, text)
  to authenticated;

-- Preserve the allocation-aware implementation as an internal raw source.
-- The public wrapper below projects those rows onto the authoritative pairwise
-- net, removing reciprocal rows that no longer contribute to an amount owed.
alter function public.households_get_settlement_breakdown_v2(uuid, uuid, text)
  rename to households_get_settlement_breakdown_rows_raw_v2;

revoke all on function public.households_get_settlement_breakdown_rows_raw_v2(uuid, uuid, text)
  from public, anon, authenticated;

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
  with canonical_balance as (
    select balance.net_cents
    from public.households_get_pairwise_settlement_balances_v2(
      p_household_id,
      p_currency
    ) balance
    where balance.other_user_id = p_other_user_id
    limit 1
  ),
  raw_rows as (
    select raw.*
    from public.households_get_settlement_breakdown_rows_raw_v2(
      p_household_id,
      p_other_user_id,
      p_currency
    ) raw
  ),
  eligible_rows as (
    select
      raw.*,
      canonical.net_cents,
      split_group.created_at as obligation_created_at,
      coalesce(
        sum(raw.remaining_amount_cents) over (
          order by
            split_group.created_at desc,
            raw.expense_date desc,
            raw.split_group_id desc nulls last,
            raw.split_line_id desc nulls last
          rows between unbounded preceding and 1 preceding
        ),
        0
      )::bigint as newer_cents
    from raw_rows raw
    join public.expense_split_groups split_group
      on split_group.id = raw.split_group_id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    cross join canonical_balance canonical
    where lower(coalesce(raw.expense_type, '')) <> 'adjustment'
      and (
        (canonical.net_cents > 0 and raw.direction = 'you_owe')
        or
        (canonical.net_cents < 0 and raw.direction = 'they_owe_you')
      )
  ),
  projected_rows as (
    select
      eligible.direction,
      eligible.expense_id,
      eligible.split_group_id,
      eligible.split_line_id,
      eligible.expense_date,
      eligible.expense_description,
      eligible.expense_category,
      eligible.expense_raw_text,
      eligible.expense_type,
      eligible.total_amount_cents,
      least(
        eligible.remaining_amount_cents,
        greatest(abs(eligible.net_cents) - eligible.newer_cents, 0)
      )::bigint as remaining_amount_cents
    from eligible_rows eligible
    where eligible.newer_cents < abs(eligible.net_cents)
  ),
  projected_total as (
    select coalesce(sum(projected.remaining_amount_cents), 0)::bigint as cents
    from projected_rows projected
  ),
  adjustment_row as (
    select
      case
        when canonical.net_cents > 0 then 'you_owe'::text
        else 'they_owe_you'::text
      end as direction,
      null::uuid as expense_id,
      null::uuid as split_group_id,
      null::uuid as split_line_id,
      now() as expense_date,
      'Settlement adjustment'::text as expense_description,
      null::text as expense_category,
      null::text as expense_raw_text,
      'adjustment'::text as expense_type,
      (abs(canonical.net_cents) - total.cents)::bigint as total_amount_cents,
      (abs(canonical.net_cents) - total.cents)::bigint as remaining_amount_cents
    from canonical_balance canonical
    cross join projected_total total
    where abs(canonical.net_cents) > total.cents
  )
  select *
  from (
    select * from projected_rows
    union all
    select * from adjustment_row
  ) breakdown
  order by
    breakdown.expense_date desc,
    breakdown.split_group_id desc nulls last,
    breakdown.split_line_id desc nulls last;
$$;

revoke all on function public.households_get_settlement_breakdown_v2(uuid, uuid, text)
  from public, anon;

grant execute on function public.households_get_settlement_breakdown_v2(uuid, uuid, text)
  to authenticated;

comment on function public.households_get_settlement_breakdown_v2(uuid, uuid, text)
  is 'Returns current pairwise settlement rows projected to exactly the canonical net, excluding reciprocal or previously settled obligations that no longer contribute to the amount owed.';

notify pgrst, 'reload schema';

reset statement_timeout;
reset lock_timeout;
