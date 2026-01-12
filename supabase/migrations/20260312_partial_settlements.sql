ALTER TABLE public.expense_split_lines
  DROP COLUMN IF EXISTS settled_cents;

DROP TRIGGER IF EXISTS trg_sync_expense_split_line_settlement ON public.expense_split_lines;

DROP FUNCTION IF EXISTS public.sync_expense_split_line_settlement();

CREATE TABLE IF NOT EXISTS public.household_settlement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  mode TEXT,
  is_express_netting BOOLEAN NOT NULL DEFAULT false,
  settlement_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT household_settlement_events_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT household_settlement_events_distinct_users CHECK (payer_user_id <> participant_user_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'household_settlement_events_amount_nonnegative'
      AND conrelid = 'public.household_settlement_events'::regclass
  ) THEN
    ALTER TABLE public.household_settlement_events
      DROP CONSTRAINT household_settlement_events_amount_nonnegative;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'household_settlement_events_amount_positive'
      AND conrelid = 'public.household_settlement_events'::regclass
  ) THEN
    ALTER TABLE public.household_settlement_events
      ADD CONSTRAINT household_settlement_events_amount_positive
      CHECK (amount_cents > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'household_settlement_events_distinct_users'
      AND conrelid = 'public.household_settlement_events'::regclass
  ) THEN
    ALTER TABLE public.household_settlement_events
      ADD CONSTRAINT household_settlement_events_distinct_users
      CHECK (payer_user_id <> participant_user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_household_settlement_events_household_created
  ON public.household_settlement_events (household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_household_settlement_events_household_pair_created
  ON public.household_settlement_events (household_id, payer_user_id, participant_user_id, created_at DESC);

ALTER TABLE public.household_settlement_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_settlement_events'
      AND policyname = 'Members can view household settlement events'
  ) THEN
    CREATE POLICY "Members can view household settlement events" ON public.household_settlement_events
      FOR SELECT USING (
        public.is_member_of_household(household_settlement_events.household_id)
      );
  END IF;
END $$;

DROP TABLE IF EXISTS public.household_settlement_event_lines;

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
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_currency text;
  v_note text;
  v_now timestamptz := now();
  v_split_to bigint := 0;
  v_split_from bigint := 0;
  v_paid_to bigint := 0;
  v_paid_from bigint := 0;
  v_net_before bigint := 0;
  v_pay_cents bigint := 0;
  v_event_payer_id uuid;
  v_event_participant_id uuid;
  v_payload jsonb;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'households_settle_all_debts_and_notify: auth.uid() is null';
  end if;

  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_settle_all_debts_and_notify: actor not member of household';
  end if;

  if not public.is_member_of_household(p_household_id, p_member_user_id) then
    raise exception 'households_settle_all_debts_and_notify: member not member of household';
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select h.currency into v_currency
    from public.households h
    where h.id = p_household_id;
  end if;

  if p_settlement_note is not null and p_settlement_note <> '' then
    v_note := p_settlement_note;
  else
    v_note := null;
  end if;

  if p_mode not in ('to_member', 'from_member', 'both') then
    raise exception 'households_settle_all_debts_and_notify: invalid mode %', p_mode;
  end if;

  select
    coalesce(sum(abs(coalesce(l.amount_cents, 0))), 0)
  into v_split_to
  from public.expense_split_lines l
  join public.expense_split_groups g on g.id = l.split_group_id
  where g.household_id = p_household_id
    and g.payer_user_id = p_member_user_id
    and l.user_id = v_actor_id
    and l.is_settled = false
    and upper(g.currency) = v_currency;

  select
    coalesce(sum(abs(coalesce(l.amount_cents, 0))), 0)
  into v_split_from
  from public.expense_split_lines l
  join public.expense_split_groups g on g.id = l.split_group_id
  where g.household_id = p_household_id
    and g.payer_user_id = v_actor_id
    and l.user_id = p_member_user_id
    and l.is_settled = false
    and upper(g.currency) = v_currency;

  select
    coalesce(sum(e.amount_cents), 0)
  into v_paid_to
  from public.household_settlement_events e
  where e.household_id = p_household_id
    and e.payer_user_id = p_member_user_id
    and e.participant_user_id = v_actor_id
    and upper(e.currency) = v_currency;

  select
    coalesce(sum(e.amount_cents), 0)
  into v_paid_from
  from public.household_settlement_events e
  where e.household_id = p_household_id
    and e.payer_user_id = v_actor_id
    and e.participant_user_id = p_member_user_id
    and upper(e.currency) = v_currency;

  v_net_before := (v_split_to - v_split_from) - (v_paid_to - v_paid_from);

  if p_mode = 'both' then
    if v_net_before = 0 then
      return 0;
    end if;
    if v_net_before > 0 then
      v_event_payer_id := p_member_user_id;
      v_event_participant_id := v_actor_id;
      v_pay_cents := v_net_before;
    else
      v_event_payer_id := v_actor_id;
      v_event_participant_id := p_member_user_id;
      v_pay_cents := -v_net_before;
    end if;
  elsif p_mode = 'to_member' then
    if v_net_before <= 0 then
      return 0;
    end if;
    v_event_payer_id := p_member_user_id;
    v_event_participant_id := v_actor_id;
    v_pay_cents := v_net_before;
  else
    if v_net_before >= 0 then
      return 0;
    end if;
    v_event_payer_id := v_actor_id;
    v_event_participant_id := p_member_user_id;
    v_pay_cents := -v_net_before;
  end if;

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
    settlement_note,
    created_at
  ) values (
    p_household_id,
    v_actor_id,
    v_event_payer_id,
    v_event_participant_id,
    v_currency,
    v_pay_cents,
    p_mode,
    (p_mode = 'both'),
    v_note,
    v_now
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
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_currency text;
  v_note text;
  v_now timestamptz := now();
  v_split_to bigint := 0;
  v_split_from bigint := 0;
  v_paid_to bigint := 0;
  v_paid_from bigint := 0;
  v_net_before bigint := 0;
  v_max_pay bigint := 0;
  v_pay_cents bigint := 0;
  v_event_payer_id uuid;
  v_event_participant_id uuid;
  v_payload jsonb;
begin
  v_actor_id := auth.uid();
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

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select h.currency into v_currency
    from public.households h
    where h.id = p_household_id;
  end if;

  if p_settlement_note is not null and p_settlement_note <> '' then
    v_note := p_settlement_note;
  else
    v_note := null;
  end if;

  if p_mode not in ('to_member', 'from_member', 'both') then
    raise exception 'households_settle_amount_and_notify: invalid mode %', p_mode;
  end if;

   select
     coalesce(sum(abs(coalesce(l.amount_cents, 0))), 0)
   into v_split_to
   from public.expense_split_lines l
   join public.expense_split_groups g on g.id = l.split_group_id
   where g.household_id = p_household_id
     and g.payer_user_id = p_member_user_id
     and l.user_id = v_actor_id
     and l.is_settled = false
     and upper(g.currency) = v_currency;

   select
     coalesce(sum(abs(coalesce(l.amount_cents, 0))), 0)
   into v_split_from
   from public.expense_split_lines l
   join public.expense_split_groups g on g.id = l.split_group_id
   where g.household_id = p_household_id
     and g.payer_user_id = v_actor_id
     and l.user_id = p_member_user_id
     and l.is_settled = false
     and upper(g.currency) = v_currency;

   select
     coalesce(sum(e.amount_cents), 0)
   into v_paid_to
   from public.household_settlement_events e
   where e.household_id = p_household_id
     and e.payer_user_id = p_member_user_id
     and e.participant_user_id = v_actor_id
     and upper(e.currency) = v_currency;

   select
     coalesce(sum(e.amount_cents), 0)
   into v_paid_from
   from public.household_settlement_events e
   where e.household_id = p_household_id
     and e.payer_user_id = v_actor_id
     and e.participant_user_id = p_member_user_id
     and upper(e.currency) = v_currency;

   v_net_before := (v_split_to - v_split_from) - (v_paid_to - v_paid_from);

   if p_mode = 'both' then
     if v_net_before = 0 then
       return 0;
     end if;
     if v_net_before > 0 then
       v_event_payer_id := p_member_user_id;
       v_event_participant_id := v_actor_id;
       v_max_pay := v_net_before;
     else
       v_event_payer_id := v_actor_id;
       v_event_participant_id := p_member_user_id;
       v_max_pay := -v_net_before;
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
     settlement_note,
     created_at
   ) values (
     p_household_id,
     v_actor_id,
     v_event_payer_id,
     v_event_participant_id,
     v_currency,
     v_pay_cents,
     p_mode,
     (p_mode = 'both'),
     v_note,
     v_now
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

 grant execute on function public.households_settle_all_debts_and_notify(uuid, uuid, text, integer, integer, text, text) to authenticated;
 grant execute on function public.households_settle_amount_and_notify(uuid, uuid, text, bigint, text, text) to authenticated;
