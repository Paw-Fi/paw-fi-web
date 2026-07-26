create or replace function public.suppress_resolved_recurring_reminder_event_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recurring_id uuid;
  v_occurrence_date date;
begin
  if new.event_type <> 'recurring_reminder' then
    return new;
  end if;

  if coalesce(new.payload ->> 'expense_id', '') !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    or coalesce(new.payload ->> 'occurrence_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    return new;
  end if;
  v_recurring_id := (new.payload ->> 'expense_id')::uuid;
  v_occurrence_date := (new.payload ->> 'occurrence_date')::date;

  if exists (
    select 1
    from public.recurring_occurrences occurrence
    where occurrence.recurring_id = v_recurring_id
      and occurrence.scheduled_occurrence_date = v_occurrence_date
      and occurrence.status in ('confirmed', 'skipped')
  ) or exists (
    select 1
    from public.expenses expense
    where expense.id = v_recurring_id
      and coalesce(expense.recurrence_rule -> 'excluded_dates', '[]'::jsonb)
        ? v_occurrence_date::text
  ) then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists suppress_resolved_recurring_reminder_event on public.notification_events;
create trigger suppress_resolved_recurring_reminder_event
before insert on public.notification_events
for each row
execute function public.suppress_resolved_recurring_reminder_event_v1();
