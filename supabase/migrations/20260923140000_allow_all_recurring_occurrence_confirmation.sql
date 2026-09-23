-- Occurrence lifecycle follows is_recurring. projection_enabled only controls
-- whether unconfirmed projections participate in forecasts and aggregates.

create or replace function public.recurring_next_available_occurrence_v1(
  p_recurring_id uuid,
  p_rule jsonb,
  p_reference_date date
) returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_anchor date;
  v_end date;
  v_frequency text;
  v_interval integer;
  v_candidate date;
begin
  if p_recurring_id is null or p_rule is null or p_reference_date is null then
    return null;
  end if;

  v_anchor := nullif(p_rule ->> 'anchor_date', '')::date;
  v_end := nullif(p_rule ->> 'end_date', '')::date;
  v_frequency := lower(coalesce(nullif(p_rule ->> 'frequency', ''), 'monthly'));
  v_interval := greatest(coalesce(nullif(p_rule ->> 'interval', '')::integer, 1), 1);
  v_candidate := public.calculate_next_occurrence_on_or_after(
    v_anchor,
    v_frequency,
    v_interval,
    v_end,
    p_reference_date
  );

  for v_attempt in 1..1000 loop
    if v_candidate is null then return null; end if;
    if not exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(p_rule -> 'excluded_dates', '[]'::jsonb)
      ) excluded(value)
      where excluded.value = v_candidate::text
    ) and not exists (
      select 1
      from public.recurring_occurrences occurrence
      where occurrence.recurring_id = p_recurring_id
        and occurrence.scheduled_occurrence_date = v_candidate
        and occurrence.status in ('confirmed', 'skipped')
    ) then
      return v_candidate;
    end if;

    v_candidate := public.calculate_next_occurrence_on_or_after(
      v_anchor,
      v_frequency,
      v_interval,
      v_end,
      v_candidate + 1
    );
  end loop;

  return null;
exception when others then
  return null;
end;
$$;

create or replace function public.recurring_latest_actionable_occurrence_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_rule jsonb
) returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_wall_now timestamp;
  v_reference_date date;
  v_reminder_value integer := 0;
  v_reminder_unit text;
  v_candidate date;
begin
  if p_actor_user_id is null or p_recurring_id is null or p_rule is null then
    return null;
  end if;

  v_wall_now := public.recurring_user_wall_now_v1(p_actor_user_id);
  v_reminder_unit := lower(coalesce(p_rule -> 'reminder' ->> 'unit', ''));
  if coalesce(p_rule -> 'reminder' ->> 'enabled', 'false') = 'true'
    and coalesce(p_rule -> 'reminder' ->> 'value', '') ~ '^[0-9]+$' then
    v_reminder_value := (p_rule -> 'reminder' ->> 'value')::integer;
  end if;

  v_reference_date := v_wall_now::date + case
    when v_reminder_unit = 'days' then v_reminder_value
    when v_reminder_unit = 'hours' then ceil(v_reminder_value::numeric / 24)::integer
    else 0
  end;
  v_candidate := public.recurring_previous_occurrence_on_or_before_v1(
    p_rule,
    v_reference_date
  );

  for v_attempt in 1..1000 loop
    exit when v_candidate is null;
    if public.recurring_occurrence_confirmation_opens_at_v1(
      p_rule,
      v_candidate
    ) <= v_wall_now
      and not exists (
        select 1
        from jsonb_array_elements_text(
          coalesce(p_rule -> 'excluded_dates', '[]'::jsonb)
        ) excluded(value)
        where excluded.value = v_candidate::text
      )
      and not exists (
        select 1
        from public.recurring_occurrences occurrence
        where occurrence.recurring_id = p_recurring_id
          and occurrence.scheduled_occurrence_date = v_candidate
          and occurrence.status in ('confirmed', 'skipped')
      ) then
      return v_candidate;
    end if;

    v_candidate := public.recurring_previous_occurrence_on_or_before_v1(
      p_rule,
      v_candidate - 1
    );
  end loop;

  if exists (
    select 1
    from public.recurring_occurrences occurrence
    where occurrence.recurring_id = p_recurring_id
      and occurrence.scheduled_occurrence_date > v_wall_now::date
      and occurrence.status = 'confirmed'
  ) then
    return null;
  end if;

  return public.recurring_next_available_occurrence_v1(
    p_recurring_id,
    p_rule,
    v_wall_now::date
  );
exception when others then
  return null;
end;
$$;

create or replace function public.recurring_actionable_occurrence_count_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_rule jsonb
) returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_wall_now timestamp;
  v_reference_date date;
  v_reminder_value integer := 0;
  v_reminder_unit text;
  v_anchor_date date;
  v_end_date date;
  v_frequency text;
  v_interval integer;
  v_excluded_dates date[];
  v_count integer;
begin
  if p_actor_user_id is null or p_recurring_id is null or p_rule is null then
    return 0;
  end if;

  v_wall_now := public.recurring_user_wall_now_v1(p_actor_user_id);
  v_reminder_unit := lower(coalesce(p_rule -> 'reminder' ->> 'unit', ''));
  if coalesce(p_rule -> 'reminder' ->> 'enabled', 'false') = 'true'
    and coalesce(p_rule -> 'reminder' ->> 'value', '') ~ '^[0-9]+$' then
    v_reminder_value := (p_rule -> 'reminder' ->> 'value')::integer;
  end if;
  v_reference_date := v_wall_now::date + case
    when v_reminder_unit = 'days' then v_reminder_value
    when v_reminder_unit = 'hours' then ceil(v_reminder_value::numeric / 24)::integer
    else 0
  end;
  v_anchor_date := nullif(p_rule ->> 'anchor_date', '')::date;
  v_end_date := nullif(p_rule ->> 'end_date', '')::date;
  v_frequency := lower(coalesce(nullif(p_rule ->> 'frequency', ''), 'monthly'));
  v_interval := greatest(coalesce(nullif(p_rule ->> 'interval', '')::integer, 1), 1);
  select coalesce(array_agg(excluded.value::date), '{}'::date[])
    into v_excluded_dates
  from jsonb_array_elements_text(
    coalesce(p_rule -> 'excluded_dates', '[]'::jsonb)
  ) excluded(value);

  select count(*)::integer into v_count
  from public.project_recurring_occurrence_dates_v1(
    v_anchor_date,
    v_frequency,
    v_interval,
    v_anchor_date,
    v_reference_date,
    v_end_date,
    v_excluded_dates
  ) occurrence_date
  where public.recurring_occurrence_confirmation_opens_at_v1(
      p_rule,
      occurrence_date
    ) <= v_wall_now
    and not exists (
      select 1
      from public.recurring_occurrences occurrence
      where occurrence.recurring_id = p_recurring_id
        and occurrence.scheduled_occurrence_date = occurrence_date
        and occurrence.status in ('confirmed', 'skipped')
    );

  return coalesce(v_count, 0);
exception when others then
  return 0;
end;
$$;

create or replace function public.has_actionable_recurring_occurrences_v1(
  p_actor_user_id uuid,
  p_household_id uuid default null,
  p_currencies text[] default null
) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  ) <> 'service_role' then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  if p_actor_user_id is null then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;

  return exists (
    select 1
    from public.expenses template
    where template.is_recurring is true
      and template.recurrence_rule is not null
      and template.deleted_at is null
      and template.provider is null
      and template.bank_account_id is null
      and (
        p_currencies is null
        or cardinality(p_currencies) = 0
        or upper(template.currency) = any (
          select upper(currency) from unnest(p_currencies) currency
        )
      )
      and (
        (p_household_id is null
          and template.household_id is null
          and template.user_id = p_actor_user_id)
        or
        (p_household_id is not null
          and template.household_id = p_household_id
          and (
            template.user_id = p_actor_user_id
            or (
              template.privacy_scope::text = 'full'
              and public.is_member_of_household(p_household_id, p_actor_user_id)
            )
          ))
      )
      and public.recurring_actionable_occurrence_count_v1(
        p_actor_user_id,
        template.id,
        template.recurrence_rule
      ) > 0
  );
end;
$$;

revoke all on function public.recurring_next_available_occurrence_v1(uuid, jsonb, date) from public, anon, authenticated;
revoke all on function public.recurring_latest_actionable_occurrence_v1(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.recurring_actionable_occurrence_count_v1(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.has_actionable_recurring_occurrences_v1(uuid, uuid, text[]) from public, anon, authenticated;
grant execute on function public.has_actionable_recurring_occurrences_v1(uuid, uuid, text[]) to service_role;
