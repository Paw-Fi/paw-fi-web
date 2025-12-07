-- Settlement RPC: performs split line settlement and creates notification_events in one
-- transaction, so mobile/web clients don't need direct table access.

create or replace function public.households_settle_all_debts_and_notify(
  p_household_id uuid,
  p_member_user_id uuid,
  p_mode text, -- 'to_member' | 'from_member' | 'both'
  p_you_owe_cents_before integer default 0,
  p_you_are_owed_cents_before integer default 0,
  p_currency text default null,
  p_settlement_note text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id   uuid;
  v_currency   text;
  v_note       text;
  v_count_to   integer := 0; -- lines where actor owed member
  v_count_from integer := 0; -- lines where member owed actor
  v_total      integer := 0;
  v_payload    jsonb;
begin
  -- Use auth.uid() rather than trusting client-supplied user id
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'households_settle_all_debts_and_notify: auth.uid() is null';
  end if;

  -- Normalize optional currency and note
  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    v_currency := null;
  end if;

  if p_settlement_note is not null and p_settlement_note <> '' then
    v_note := p_settlement_note;
  else
    v_note := null;
  end if;

  if p_mode not in ('to_member', 'from_member', 'both') then
    raise exception 'households_settle_all_debts_and_notify: invalid mode %', p_mode;
  end if;

  -- Direction 1: current user owes the member (payer = member, user = current)
  if p_mode in ('to_member', 'both') then
    with groups as (
      select id
      from public.expense_split_groups
      where household_id = p_household_id
        and payer_user_id = p_member_user_id
        and (v_currency is null or upper(currency) = v_currency)
    ), updated as (
      update public.expense_split_lines l
      set is_settled = true,
          settled_at = now(),
          settled_by_user_id = v_actor_id,
          settlement_note = coalesce(v_note, settlement_note)
      where l.split_group_id in (select id from groups)
        and l.user_id = v_actor_id
        and l.is_settled = false
      returning l.id
    )
    select count(*) into v_count_to from updated;
  end if;

  -- Direction 2: member owes the current user (payer = current, user = member)
  if p_mode in ('from_member', 'both') then
    with groups as (
      select id
      from public.expense_split_groups
      where household_id = p_household_id
        and payer_user_id = v_actor_id
        and (v_currency is null or upper(currency) = v_currency)
    ), updated as (
      update public.expense_split_lines l
      set is_settled = true,
          settled_at = now(),
          settled_by_user_id = v_actor_id,
          settlement_note = coalesce(v_note, settlement_note)
      where l.split_group_id in (select id from groups)
        and l.user_id = p_member_user_id
        and l.is_settled = false
      returning l.id
    )
    select count(*) into v_count_from from updated;
  end if;

  v_total := coalesce(v_count_to, 0) + coalesce(v_count_from, 0);

  if v_total > 0 then
    if p_mode = 'both' then
      -- Express netting payload (pair-wise settlement in both directions)
      v_payload := jsonb_build_object(
        'from_user_id', v_actor_id,
        'to_user_id', p_member_user_id,
        'lines_settled_current_user_owes', v_count_to,
        'lines_settled_member_owes', v_count_from,
        'amounts_before', jsonb_build_object(
          'you_owe_cents', coalesce(p_you_owe_cents_before, 0),
          'you_are_owed_cents', coalesce(p_you_are_owed_cents_before, 0),
          'net_pay_cents', greatest(coalesce(p_you_owe_cents_before, 0) - coalesce(p_you_are_owed_cents_before, 0), 0)
        ),
        -- actor_name intentionally left null; Edge Function falls back to 'Someone'.
        'actor_name', null,
        'currency', v_currency
      );
    elsif p_mode = 'to_member' then
      -- Simple one-direction settlement: actor owed member
      v_payload := jsonb_build_object(
        'from_user_id', v_actor_id,
        'to_user_id', p_member_user_id,
        'amount_cents', coalesce(p_you_owe_cents_before, 0),
        'line_count', v_total,
        'actor_name', null,
        'currency', v_currency
      );
    else
      -- p_mode = 'from_member': member owed actor
      v_payload := jsonb_build_object(
        'from_user_id', v_actor_id,
        'to_user_id', p_member_user_id,
        'amount_cents', coalesce(p_you_are_owed_cents_before, 0),
        'line_count', v_total,
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
  end if;

  return v_total;
end;
$$;

comment on function public.households_settle_all_debts_and_notify is
  'Settles split lines between auth.uid() and p_member_user_id within a household and enqueues a split_settled notification_event in one transaction.';
