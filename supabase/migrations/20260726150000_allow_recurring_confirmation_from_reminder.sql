-- Allow an occurrence to be confirmed as soon as its configured reminder is due.
-- This changes only the due-date guard in the already-applied v1 RPC.

create or replace function public.recurring_user_wall_now_v1(
  p_actor_user_id uuid
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
  select preferred_timezone into v_timezone
  from public.user_contacts
  where user_id = p_actor_user_id
  order by updated_at desc nulls last
  limit 1;

  v_offset_match := regexp_match(
    coalesce(v_timezone, ''),
    '^(?:UTC|GMT)?([+-])([0-9]{2}):([0-9]{2})$'
  );
  if v_offset_match is not null then
    v_offset_minutes := (v_offset_match[2]::integer * 60) + v_offset_match[3]::integer;
    if v_offset_match[1] = '-' then v_offset_minutes := -v_offset_minutes; end if;
    return (current_timestamp + make_interval(mins => v_offset_minutes))::timestamp;
  else
    return current_timestamp at time zone coalesce(nullif(v_timezone, ''), 'UTC');
  end if;
end;
$$;

create or replace function public.recurring_occurrence_confirmation_opens_at_v1(
  p_rule jsonb,
  p_scheduled_occurrence_date date
) returns timestamp
language sql
stable
set search_path = ''
as $$
  select p_scheduled_occurrence_date::timestamp - case
    when coalesce(p_rule -> 'reminder' ->> 'enabled', 'false') <> 'true'
      then interval '0'
    when lower(coalesce(p_rule -> 'reminder' ->> 'unit', '')) = 'days'
      then make_interval(days => case
        when coalesce(p_rule -> 'reminder' ->> 'value', '') ~ '^[0-9]+$'
          then (p_rule -> 'reminder' ->> 'value')::integer
        else 0
      end)
    when lower(coalesce(p_rule -> 'reminder' ->> 'unit', '')) = 'hours'
      then make_interval(hours => case
        when coalesce(p_rule -> 'reminder' ->> 'value', '') ~ '^[0-9]+$'
          then (p_rule -> 'reminder' ->> 'value')::integer
        else 0
      end)
    else interval '0'
  end;
$$;

do $$
declare
  v_definition text;
  v_old_guard constant text :=
    'if p_scheduled_occurrence_date > current_date then raise exception ''OCCURRENCE_NOT_DUE''; end if;';
  v_new_guard constant text :=
    'if public.recurring_occurrence_confirmation_opens_at_v1(v_template.recurrence_rule, p_scheduled_occurrence_date) > public.recurring_user_wall_now_v1(p_actor_user_id) then raise exception ''OCCURRENCE_NOT_DUE''; end if;';
begin
  select pg_get_functiondef(
    'public.confirm_recurring_occurrence_v1(uuid,uuid,date,date,bigint,uuid,text,text,jsonb,uuid,boolean,uuid,text)'::regprocedure
  ) into v_definition;

  if v_definition is null or position(v_old_guard in v_definition) = 0 then
    raise exception 'Expected confirm_recurring_occurrence_v1 due-date guard was not found';
  end if;

  execute replace(v_definition, v_old_guard, v_new_guard);
end;
$$;

revoke all on function public.recurring_user_wall_now_v1(uuid) from public, anon, authenticated;
revoke all on function public.recurring_occurrence_confirmation_opens_at_v1(jsonb, date) from public, anon, authenticated;
