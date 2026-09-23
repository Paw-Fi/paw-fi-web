-- Permit an authenticated user to pre-confirm only the immediate next
-- unresolved future occurrence. Existing reminder-window and paid-date guards
-- remain unchanged for every other occurrence.
do $$
declare
  v_definition text;
  v_declaration_anchor constant text := E'  v_line record;\nbegin';
  v_paid_date_guard constant text :=
    'if p_paid_date > current_date then raise exception ''OCCURRENCE_PAID_DATE_IN_FUTURE''; end if;';
  v_due_date_guard constant text :=
    'if public.recurring_occurrence_confirmation_opens_at_v1(v_template.recurrence_rule, p_scheduled_occurrence_date) > public.recurring_user_wall_now_v1(p_actor_user_id) then raise exception ''OCCURRENCE_NOT_DUE''; end if;';
  v_preconfirmation_guard constant text := $guard$
  v_user_wall_now := public.recurring_user_wall_now_v1(p_actor_user_id);
  v_next_available_occurrence := public.recurring_next_available_occurrence_v1(
    p_recurring_id,
    v_template.recurrence_rule,
    v_user_wall_now::date
  );
  v_is_next_preconfirmation :=
    p_scheduled_occurrence_date > v_user_wall_now::date
    and (
      p_scheduled_occurrence_date = v_next_available_occurrence
      or exists (
        select 1
        from public.recurring_occurrences occurrence
        where occurrence.recurring_id = p_recurring_id
          and occurrence.scheduled_occurrence_date = p_scheduled_occurrence_date
          and occurrence.status = 'confirmed'
      )
    )
    and not exists (
      select 1
      from public.recurring_occurrences occurrence
      where occurrence.recurring_id = p_recurring_id
        and occurrence.scheduled_occurrence_date > v_user_wall_now::date
        and occurrence.scheduled_occurrence_date <> p_scheduled_occurrence_date
        and occurrence.status = 'confirmed'
    );
  if p_paid_date > v_user_wall_now::date and not v_is_next_preconfirmation then
    raise exception 'OCCURRENCE_PAID_DATE_IN_FUTURE';
  end if;
  if public.recurring_occurrence_confirmation_opens_at_v1(
      v_template.recurrence_rule,
      p_scheduled_occurrence_date
    ) > v_user_wall_now
    and not v_is_next_preconfirmation then
    raise exception 'OCCURRENCE_NOT_DUE';
  end if;
$guard$;
begin
  select pg_get_functiondef(
    'public.confirm_recurring_occurrence_v1(uuid,uuid,date,date,bigint,uuid,text,text,jsonb,uuid,boolean,uuid,text)'::regprocedure
  ) into v_definition;

  if v_definition is null
    or position(v_declaration_anchor in v_definition) = 0
    or position(v_paid_date_guard in v_definition) = 0
    or position(v_due_date_guard in v_definition) = 0 then
    raise exception 'Expected recurring confirmation guards were not found';
  end if;

  v_definition := replace(
    v_definition,
    v_declaration_anchor,
    E'  v_line record;\n  v_user_wall_now timestamp;\n  v_next_available_occurrence date;\n  v_is_next_preconfirmation boolean := false;\nbegin'
  );
  v_definition := replace(v_definition, v_paid_date_guard, '');
  v_definition := replace(
    v_definition,
    v_due_date_guard,
    v_preconfirmation_guard
  );
  execute v_definition;
end;
$$;
