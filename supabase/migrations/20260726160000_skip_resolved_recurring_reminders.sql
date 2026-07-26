-- Do not schedule reminders for occurrence ledger entries already resolved by
-- a confirmation or explicit skip. `excluded_dates` remains for old clients.

do $$
declare
  v_definition text;
  v_old_guard constant text :=
    'continue when v_next_occurrence is null;';
  v_new_guard constant text :=
    'continue when v_next_occurrence is null;
      continue when exists (
        select 1 from public.recurring_occurrences occurrence
        where occurrence.recurring_id = v_expense.id
          and occurrence.scheduled_occurrence_date = v_next_occurrence
          and occurrence.status in (''confirmed'', ''skipped'')
      );';
begin
  select pg_get_functiondef(
    'public.check_recurring_reminders(timestamptz)'::regprocedure
  ) into v_definition;

  if v_definition is null or position(v_old_guard in v_definition) = 0 then
    raise exception 'Expected check_recurring_reminders occurrence guard was not found';
  end if;

  execute replace(v_definition, v_old_guard, v_new_guard);
end;
$$;
