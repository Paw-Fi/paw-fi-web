-- Two bounded confirmation nudges for unresolved recurring occurrences. These
-- are intentionally independent of the user's optional upcoming reminder.

create table if not exists public.recurring_overdue_nudges_sent (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  occurrence_date date not null,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  stage smallint not null check (stage in (1, 3)),
  created_at timestamptz not null default now(),
  unique (expense_id, occurrence_date, recipient_user_id, stage)
);

create index if not exists recurring_overdue_nudges_sent_occurrence_idx
  on public.recurring_overdue_nudges_sent (expense_id, occurrence_date);

alter table public.recurring_overdue_nudges_sent enable row level security;
revoke all on table public.recurring_overdue_nudges_sent from public, anon, authenticated;
grant select, insert, update, delete on table public.recurring_overdue_nudges_sent to service_role;
drop policy if exists recurring_overdue_nudges_sent_service_role on public.recurring_overdue_nudges_sent;
create policy recurring_overdue_nudges_sent_service_role
  on public.recurring_overdue_nudges_sent
  for all to service_role
  using (true) with check (true);

create or replace function public.recurring_recipient_wall_now_v1(
  p_user_id uuid,
  p_now timestamptz
) returns timestamp
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_offset_match text[];
  v_offset_minutes integer;
begin
  select nullif(trim(contact.preferred_timezone), '')
  into v_timezone
  from public.user_contacts contact
  where contact.user_id = p_user_id
  order by contact.updated_at desc nulls last, contact.created_at desc, contact.id desc
  limit 1;

  v_offset_match := regexp_match(
    coalesce(v_timezone, ''),
    '^(?:UTC|GMT)([+-])([0-9]{1,2})(?::?([0-9]{2}))?$'
  );
  if v_offset_match is not null then
    v_offset_minutes := (v_offset_match[2]::integer * 60)
      + coalesce(v_offset_match[3], '0')::integer;
    if coalesce(v_offset_match[3], '0')::integer > 59
      or v_offset_minutes > 14 * 60 then
      return p_now at time zone 'UTC';
    end if;
    if v_offset_match[1] = '-' then v_offset_minutes := -v_offset_minutes; end if;
    return (p_now at time zone 'UTC') + make_interval(mins => v_offset_minutes);
  end if;

  if exists (
    select 1 from pg_timezone_names timezone_name where timezone_name.name = v_timezone
  ) then
    return p_now at time zone v_timezone;
  end if;

  return p_now at time zone 'UTC';
end;
$$;

create or replace function public.recurring_wall_timestamp_to_utc_v1(
  p_wall_time timestamp,
  p_user_id uuid
) returns timestamptz
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone text;
  v_offset_match text[];
  v_offset_minutes integer;
begin
  select nullif(trim(contact.preferred_timezone), '')
  into v_timezone
  from public.user_contacts contact
  where contact.user_id = p_user_id
  order by contact.updated_at desc nulls last, contact.created_at desc, contact.id desc
  limit 1;

  v_offset_match := regexp_match(
    coalesce(v_timezone, ''),
    '^(?:UTC|GMT)([+-])([0-9]{1,2})(?::?([0-9]{2}))?$'
  );
  if v_offset_match is not null then
    v_offset_minutes := (v_offset_match[2]::integer * 60)
      + coalesce(v_offset_match[3], '0')::integer;
    if coalesce(v_offset_match[3], '0')::integer <= 59
      and v_offset_minutes <= 14 * 60 then
      if v_offset_match[1] = '-' then v_offset_minutes := -v_offset_minutes; end if;
      return (p_wall_time - make_interval(mins => v_offset_minutes)) at time zone 'UTC';
    end if;
  end if;

  if exists (
    select 1 from pg_timezone_names timezone_name where timezone_name.name = v_timezone
  ) then
    return p_wall_time at time zone v_timezone;
  end if;

  return p_wall_time at time zone 'UTC';
end;
$$;

create or replace function public.enqueue_recurring_overdue_confirmation_nudges_v1(
  p_now timestamptz default now()
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_created integer := 0;
begin
  -- Expiry is a delivery boundary, not a replay request. Old unsent rows are
  -- settled without generating a historical backlog.
  update public.notification_events event
  set is_sent = true,
      sent_at = p_now,
      processing_started_at = null,
      delivery_error = 'Recurring confirmation nudge expired before delivery'
  where event.event_type = 'recurring_reminder'
    and event.is_sent = false
    and event.payload ->> 'phase' = 'overdue'
    and coalesce(event.payload ->> 'expires_at', '') ~ '^\d{4}-\d{2}-\d{2}T'
    and (event.payload ->> 'expires_at')::timestamptz <= p_now;

  with recipient_series as (
    select expense.*, recipient.user_id as recipient_user_id,
      public.recurring_recipient_wall_now_v1(recipient.user_id, p_now) as local_now
    from public.expenses expense
    left join public.households household on household.id = expense.household_id
    cross join lateral (
      select expense.user_id as user_id
      where expense.household_id is null
        or coalesce(household.is_portfolio, false)
        or coalesce(expense.privacy_scope::text, 'full') <> 'full'
      union all
      select member.user_id
      from public.household_members member
      where member.household_id = expense.household_id
        and not coalesce(household.is_portfolio, false)
        and coalesce(expense.privacy_scope::text, 'full') = 'full'
    ) recipient
    where expense.is_recurring is true
      and expense.deleted_at is null
      and expense.recurrence_rule is not null
      and coalesce(expense.recurrence_rule ->> 'archived', 'false') <> 'true'
      and coalesce(expense.recurrence_rule ->> 'disabled', 'false') <> 'true'
  ), candidates as (
    select series.*, scheduled.occurrence_date, stage.stage,
      case
        when lower(series.recurrence_rule ->> 'frequency') = 'daily' then
          scheduled.occurrence_date + case
              when coalesce(series.recurrence_rule ->> 'due_time', '') ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
                then (series.recurrence_rule ->> 'due_time')::time
              else time '09:00:00'
            end
          + make_interval(hours => stage.stage_hour_offset)
        else
          (scheduled.occurrence_date + stage.stage_day_offset) + time '09:00:00'
      end as target_wall_time,
      case
        when lower(series.recurrence_rule ->> 'frequency') = 'daily' then interval '12 hours'
        else interval '1 day'
      end as delivery_window
    from recipient_series series
    cross join lateral (
      select candidate_date as occurrence_date
      from (values (series.local_now::date), (series.local_now::date - 1),
                   (series.local_now::date - 3)) days(candidate_date)
      where public.recurring_occurrence_is_scheduled_v1(
        series.recurrence_rule, candidate_date
      )
    ) scheduled
    cross join (values
      (1::smallint, 1, 1),
      (3::smallint, 3, 3)
    ) stage(stage, stage_day_offset, stage_hour_offset)
  ), inserted_ledger as (
    insert into public.recurring_overdue_nudges_sent (
      expense_id, occurrence_date, recipient_user_id, stage
    )
    select candidate.id, candidate.occurrence_date, candidate.recipient_user_id, candidate.stage
    from candidates candidate
    where p_now >= public.recurring_wall_timestamp_to_utc_v1(
        candidate.target_wall_time, candidate.recipient_user_id)
      and p_now < public.recurring_wall_timestamp_to_utc_v1(
        candidate.target_wall_time, candidate.recipient_user_id) + interval '30 minutes'
      and not exists (
        select 1 from public.recurring_occurrences occurrence
        where occurrence.recurring_id = candidate.id
          and occurrence.scheduled_occurrence_date = candidate.occurrence_date
          and occurrence.status in ('confirmed', 'skipped')
      )
      and not (coalesce(candidate.recurrence_rule -> 'excluded_dates', '[]'::jsonb)
        ? candidate.occurrence_date::text)
    on conflict do nothing
    returning expense_id, occurrence_date, recipient_user_id, stage
  ), inserted_events as (
    insert into public.notification_events (
      household_id, user_id, event_type, payload, is_sent, created_at
    )
    select expense.household_id, ledger.recipient_user_id, 'recurring_reminder',
      jsonb_build_object(
        'expense_id', expense.id,
        'household_id', expense.household_id,
        'category', expense.category,
        'amount_cents', expense.amount_cents,
        'currency', expense.currency,
        'type', expense.type,
        'occurrence_date', ledger.occurrence_date,
        'frequency', expense.recurrence_rule ->> 'frequency',
        'phase', 'overdue',
        'stage', ledger.stage,
        'deep_link', 'moneko://recurring/' || expense.id::text
          || '?occurrence_date=' || ledger.occurrence_date::text,
        'expires_at', public.recurring_wall_timestamp_to_utc_v1(
          candidate.target_wall_time,
          ledger.recipient_user_id
        ) + candidate.delivery_window
      ), false, p_now
    from inserted_ledger ledger
    join public.expenses expense on expense.id = ledger.expense_id
    join candidates candidate on candidate.id = ledger.expense_id
      and candidate.occurrence_date = ledger.occurrence_date
      and candidate.recipient_user_id = ledger.recipient_user_id
      and candidate.stage = ledger.stage
    returning id
  )
  select count(*) into v_created from inserted_events;

  return v_created;
end;
$$;

create or replace function public.claim_notification_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.notification_events%rowtype;
  v_expense public.expenses%rowtype;
  v_occurrence_date date;
  v_stage smallint;
  v_due_time time;
  v_target_wall_time timestamp;
  v_stage_three_target timestamp;
  v_delivery_window interval;
begin
  select * into v_event from public.notification_events where id = p_event_id;
  if not found or v_event.is_sent then return false; end if;
  -- Acquire the shared occurrence lock before any event row lock. Otherwise
  -- stage 3 suppressing stage 1 can deadlock with a concurrent stage 1 claim.
  if v_event.event_type = 'recurring_reminder'
    and v_event.payload ->> 'phase' = 'overdue' then
    perform pg_advisory_xact_lock(hashtextextended(
      coalesce(v_event.payload ->> 'expense_id', '') || ':'
        || coalesce(v_event.payload ->> 'occurrence_date', '') || ':'
        || v_event.user_id::text,
      0
    ));
  end if;
  select * into v_event from public.notification_events where id = p_event_id for update;
  if not found or v_event.is_sent then return false; end if;
  if v_event.processing_started_at >= now() - interval '15 minutes' then
    return false;
  end if;

  if v_event.event_type = 'recurring_reminder' then
    if coalesce(v_event.payload ->> 'expires_at', '') ~ '^\d{4}-\d{2}-\d{2}T'
      and (v_event.payload ->> 'expires_at')::timestamptz <= now() then
      update public.notification_events set is_sent = true, sent_at = now(),
        processing_started_at = null,
        delivery_error = 'Recurring confirmation nudge expired before delivery'
      where id = p_event_id;
      return false;
    end if;

    if coalesce(v_event.payload ->> 'expense_id', '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or coalesce(v_event.payload ->> 'occurrence_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
      return false;
    end if;
    v_occurrence_date := (v_event.payload ->> 'occurrence_date')::date;
    select * into v_expense from public.expenses
    where id = (v_event.payload ->> 'expense_id')::uuid
      and is_recurring is true and deleted_at is null;

    if not found
      or v_event.household_id is distinct from v_expense.household_id
      or coalesce(v_expense.recurrence_rule ->> 'archived', 'false') = 'true'
      or coalesce(v_expense.recurrence_rule ->> 'disabled', 'false') = 'true'
      or (v_event.payload ->> 'phase' is distinct from 'overdue'
        and coalesce(v_expense.recurrence_rule -> 'reminder' ->> 'enabled', 'false') <> 'true')
      or not public.recurring_occurrence_is_scheduled_v1(v_expense.recurrence_rule, v_occurrence_date)
      or (coalesce(v_expense.recurrence_rule -> 'excluded_dates', '[]'::jsonb)
        ? v_occurrence_date::text)
      or exists (
        select 1 from public.recurring_occurrences occurrence
        where occurrence.recurring_id = v_expense.id
          and occurrence.scheduled_occurrence_date = v_occurrence_date
          and occurrence.status in ('confirmed', 'skipped')
      )
      or ((v_expense.household_id is null
           or coalesce(v_expense.privacy_scope::text, 'full') <> 'full'
           or exists (
             select 1 from public.households household
             where household.id = v_expense.household_id and household.is_portfolio
           ))
        and v_event.user_id is distinct from v_expense.user_id)
      or (v_expense.household_id is not null
        and not exists (
          select 1 from public.households household
          where household.id = v_expense.household_id and household.is_portfolio
        )
        and not exists (
        select 1 from public.household_members member
        where member.household_id = v_expense.household_id and member.user_id = v_event.user_id
      )) then
      update public.notification_events set is_sent = true, sent_at = now(),
        processing_started_at = null,
        delivery_error = 'Recurring occurrence is no longer eligible for delivery'
      where id = p_event_id;
      return false;
    end if;

    if v_event.payload ->> 'phase' = 'overdue' then
      v_stage := case when v_event.payload ->> 'stage' in ('1', '3')
        then (v_event.payload ->> 'stage')::smallint else null end;
      if v_stage is null then
        update public.notification_events set is_sent = true, sent_at = now(),
          processing_started_at = null,
          delivery_error = 'Recurring confirmation nudge has an invalid stage'
        where id = p_event_id;
        return false;
      end if;

      v_due_time := case
        when coalesce(v_expense.recurrence_rule ->> 'due_time', '') ~
          '^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
          then (v_expense.recurrence_rule ->> 'due_time')::time
        else time '09:00:00'
      end;
      v_delivery_window := case
        when lower(v_expense.recurrence_rule ->> 'frequency') = 'daily'
          then interval '12 hours' else interval '1 day'
      end;
      v_target_wall_time := case
        when lower(v_expense.recurrence_rule ->> 'frequency') = 'daily'
          then v_occurrence_date + v_due_time + make_interval(hours => v_stage)
        else (v_occurrence_date + v_stage) + time '09:00:00'
      end;
      v_stage_three_target := case
        when lower(v_expense.recurrence_rule ->> 'frequency') = 'daily'
          then v_occurrence_date + v_due_time + interval '3 hours'
        else (v_occurrence_date + 3) + time '09:00:00'
      end;

      if now() < public.recurring_wall_timestamp_to_utc_v1(
        v_target_wall_time, v_event.user_id) then
        update public.notification_events set processing_started_at = null
        where id = p_event_id;
        return false;
      end if;
      if now() >= public.recurring_wall_timestamp_to_utc_v1(
        v_target_wall_time, v_event.user_id) + v_delivery_window then
        update public.notification_events set is_sent = true, sent_at = now(),
          processing_started_at = null,
          delivery_error = 'Recurring confirmation nudge expired after its due clock changed'
        where id = p_event_id;
        return false;
      end if;

      if v_stage = 1 and now() >= public.recurring_wall_timestamp_to_utc_v1(
        v_stage_three_target, v_event.user_id) then
        update public.notification_events set is_sent = true, sent_at = now(),
          processing_started_at = null,
          delivery_error = 'Recurring confirmation nudge stage 1 is obsolete because stage 3 is eligible'
        where id = p_event_id;
        return false;
      end if;

      if v_stage = 3 then
        if exists (
          select 1 from public.notification_events stage_one
          where stage_one.event_type = 'recurring_reminder'
            and stage_one.user_id = v_event.user_id
            and stage_one.payload ->> 'phase' = 'overdue'
            and stage_one.payload ->> 'expense_id' = v_expense.id::text
            and stage_one.payload ->> 'occurrence_date' = v_occurrence_date::text
            and stage_one.payload ->> 'stage' = '1'
            and stage_one.is_sent is false
            and stage_one.processing_started_at >= now() - interval '15 minutes'
        ) then
          return false;
        end if;
        update public.notification_events stage_one
        set is_sent = true, sent_at = now(), processing_started_at = null,
          delivery_error = 'Recurring confirmation nudge stage 1 is obsolete because stage 3 is eligible'
        where stage_one.id <> p_event_id
          and stage_one.event_type = 'recurring_reminder'
          and stage_one.is_sent is false
          and stage_one.user_id = v_event.user_id
          and stage_one.payload ->> 'phase' = 'overdue'
          and stage_one.payload ->> 'expense_id' = v_expense.id::text
          and stage_one.payload ->> 'occurrence_date' = v_occurrence_date::text
          and stage_one.payload ->> 'stage' = '1';
      end if;
    end if;

    if v_event.payload ->> 'phase' = 'overdue' and exists (
      select 1 from public.notification_events prior
      where prior.id <> p_event_id and prior.is_sent is true
        and prior.event_type = 'recurring_reminder' and prior.user_id = v_event.user_id
        and prior.payload ->> 'phase' = 'overdue'
        and prior.payload ->> 'expense_id' = v_expense.id::text
        and prior.payload ->> 'occurrence_date' = v_occurrence_date::text
        and prior.sent_at > now() - interval '15 minutes'
        and prior.delivery_error is null
    ) then
      update public.notification_events set processing_started_at = null
      where id = p_event_id;
      return false;
    end if;
  end if;

  update public.notification_events set processing_started_at = now()
  where id = p_event_id
    and (processing_started_at is null or processing_started_at < now() - interval '15 minutes');
  return found;
end;
$$;

revoke all on function public.recurring_recipient_wall_now_v1(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.recurring_wall_timestamp_to_utc_v1(timestamp, uuid) from public, anon, authenticated;
revoke all on function public.enqueue_recurring_overdue_confirmation_nudges_v1(timestamptz) from public, anon, authenticated;
grant execute on function public.enqueue_recurring_overdue_confirmation_nudges_v1(timestamptz) to service_role;
grant execute on function public.claim_notification_event(uuid) to service_role;

do $$ begin
  perform cron.unschedule('enqueue-recurring-overdue-confirmation-nudges');
exception when others then
  null;
end $$;

select cron.schedule(
  'enqueue-recurring-overdue-confirmation-nudges',
  '*/10 * * * *',
  $$select public.enqueue_recurring_overdue_confirmation_nudges_v1(now());$$
);
