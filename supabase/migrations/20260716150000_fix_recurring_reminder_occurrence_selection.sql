create or replace function public.calculate_next_occurrence_on_or_after(
  p_anchor_date date,
  p_frequency text,
  p_interval integer,
  p_end_date date,
  p_reference_date date
) returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_frequency text := lower(coalesce(nullif(trim(p_frequency), ''), 'monthly'));
  v_interval integer := greatest(coalesce(p_interval, 1), 1);
  v_next_date date;
  v_step_days integer;
  v_steps integer;
  v_months_difference integer;
  v_candidate_month date;
  v_anchor_day integer := extract(day from p_anchor_date)::integer;
begin
  if p_anchor_date is null or p_reference_date is null then
    return null;
  end if;

  if p_reference_date <= p_anchor_date then
    v_next_date := p_anchor_date;
  else
    case v_frequency
      when 'daily' then
        v_step_days := v_interval;
        v_steps := ceil(
          (p_reference_date - p_anchor_date)::numeric / v_step_days
        )::integer;
        v_next_date := p_anchor_date + (v_steps * v_step_days);

      when 'weekly' then
        v_step_days := v_interval * 7;
        v_steps := ceil(
          (p_reference_date - p_anchor_date)::numeric / v_step_days
        )::integer;
        v_next_date := p_anchor_date + (v_steps * v_step_days);

      when 'biweekly' then
        v_step_days := 14;
        v_steps := ceil(
          (p_reference_date - p_anchor_date)::numeric / v_step_days
        )::integer;
        v_next_date := p_anchor_date + (v_steps * v_step_days);

      when 'monthly' then
        v_months_difference :=
          (extract(year from p_reference_date)::integer - extract(year from p_anchor_date)::integer) * 12
          + extract(month from p_reference_date)::integer
          - extract(month from p_anchor_date)::integer;
        v_steps := greatest(floor(v_months_difference::numeric / v_interval)::integer, 0);

        loop
          v_candidate_month := (
            date_trunc('month', p_anchor_date)::date
            + make_interval(months => v_steps * v_interval)
          )::date;
          v_next_date := public.make_clamped_calendar_date_v1(
            extract(year from v_candidate_month)::integer,
            extract(month from v_candidate_month)::integer,
            v_anchor_day
          );
          exit when v_next_date >= p_reference_date;
          v_steps := v_steps + 1;
        end loop;

      when 'yearly' then
        v_steps := greatest(
          floor(
            (extract(year from p_reference_date)::integer - extract(year from p_anchor_date)::integer)::numeric
            / v_interval
          )::integer,
          0
        );

        loop
          v_next_date := public.make_clamped_calendar_date_v1(
            extract(year from p_anchor_date)::integer + (v_steps * v_interval),
            extract(month from p_anchor_date)::integer,
            v_anchor_day
          );
          exit when v_next_date >= p_reference_date;
          v_steps := v_steps + 1;
        end loop;

      else
        return null;
    end case;
  end if;

  if p_end_date is not null and v_next_date > p_end_date then
    return null;
  end if;

  return v_next_date;
end;
$$;

create or replace function public.calculate_next_occurrence(
  p_anchor_date date,
  p_frequency text,
  p_interval integer default 1,
  p_end_date date default null
) returns date
language sql
stable
set search_path = public
as $$
  select public.calculate_next_occurrence_on_or_after(
    p_anchor_date,
    p_frequency,
    p_interval,
    p_end_date,
    current_date
  );
$$;

create or replace function public.calculate_recurring_reminder_occurrence(
  p_anchor_date date,
  p_frequency text,
  p_interval integer,
  p_end_date date,
  p_reminder_value integer,
  p_reminder_unit text,
  p_now timestamptz
) returns date
language plpgsql
stable
set search_path = public
as $$
declare
  v_reference_date date;
begin
  if p_reminder_value is null or p_reminder_value < 0 or p_now is null then
    return null;
  end if;

  case lower(coalesce(p_reminder_unit, ''))
    when 'days' then
      v_reference_date := p_now::date + p_reminder_value;
    when 'hours' then
      v_reference_date := (p_now + make_interval(hours => p_reminder_value))::date;
    else
      return null;
  end case;

  return public.calculate_next_occurrence_on_or_after(
    p_anchor_date,
    p_frequency,
    p_interval,
    p_end_date,
    v_reference_date
  );
end;
$$;

create or replace function public.check_recurring_reminders(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expense record;
  v_anchor_date date;
  v_frequency text;
  v_interval integer;
  v_end_date date;
  v_next_occurrence date;
  v_reminder_trigger_time timestamptz;
  v_reminder_value integer;
  v_reminder_unit text;
  v_lead_interval interval;
  v_claim_id uuid;
  v_reminders_created integer := 0;
begin
  for v_expense in
    select
      id,
      user_id,
      household_id,
      category,
      amount_cents,
      currency,
      type,
      recurrence_rule
    from public.expenses
    where is_recurring = true
      and recurrence_rule is not null
      and recurrence_rule->'reminder'->>'enabled' = 'true'
  loop
    begin
      v_anchor_date := (v_expense.recurrence_rule->>'anchor_date')::date;
      v_frequency := v_expense.recurrence_rule->>'frequency';
      v_interval := coalesce(
        (v_expense.recurrence_rule->>'interval')::integer,
        1
      );
      v_end_date := (v_expense.recurrence_rule->>'end_date')::date;
      v_reminder_value := (
        v_expense.recurrence_rule->'reminder'->>'value'
      )::integer;
      v_reminder_unit := lower(coalesce(
        v_expense.recurrence_rule->'reminder'->>'unit',
        ''
      ));

      continue when v_end_date is not null and v_end_date < p_now::date;

      case v_reminder_unit
        when 'days' then
          v_lead_interval := make_interval(days => v_reminder_value);
        when 'hours' then
          v_lead_interval := make_interval(hours => v_reminder_value);
        else
          continue;
      end case;

      v_next_occurrence := public.calculate_recurring_reminder_occurrence(
        v_anchor_date,
        v_frequency,
        v_interval,
        v_end_date,
        v_reminder_value,
        v_reminder_unit,
        p_now
      );
      continue when v_next_occurrence is null;

      v_reminder_trigger_time := v_next_occurrence::timestamptz - v_lead_interval;
      continue when p_now < v_reminder_trigger_time;
      continue when v_reminder_unit = 'hours'
        and p_now >= v_next_occurrence::timestamptz;

      v_claim_id := null;
      insert into public.recurring_transaction_reminders_sent (
        expense_id,
        occurrence_date,
        reminded_at
      ) values (
        v_expense.id,
        v_next_occurrence,
        p_now
      )
      on conflict (expense_id, occurrence_date) do nothing
      returning id into v_claim_id;

      continue when v_claim_id is null;

      if v_expense.household_id is null then
        insert into public.notification_events (
          household_id,
          user_id,
          event_type,
          payload,
          is_sent,
          created_at
        ) values (
          null,
          v_expense.user_id,
          'recurring_reminder',
          jsonb_build_object(
            'expense_id', v_expense.id,
            'category', v_expense.category,
            'amount_cents', v_expense.amount_cents,
            'currency', v_expense.currency,
            'type', v_expense.type,
            'occurrence_date', v_next_occurrence,
            'reminder_value', v_reminder_value,
            'reminder_unit', v_reminder_unit,
            'frequency', v_frequency
          ),
          false,
          p_now
        );
      else
        insert into public.notification_events (
          household_id,
          user_id,
          event_type,
          payload,
          is_sent,
          created_at
        )
        select
          v_expense.household_id,
          hm.user_id,
          'recurring_reminder',
          jsonb_build_object(
            'expense_id', v_expense.id,
            'category', v_expense.category,
            'amount_cents', v_expense.amount_cents,
            'currency', v_expense.currency,
            'type', v_expense.type,
            'occurrence_date', v_next_occurrence,
            'reminder_value', v_reminder_value,
            'reminder_unit', v_reminder_unit,
            'frequency', v_frequency
          ),
          false,
          p_now
        from public.household_members hm
        where hm.household_id = v_expense.household_id;
      end if;

      v_reminders_created := v_reminders_created + 1;
    exception when others then
      raise warning 'Error processing reminder for expense %: %', v_expense.id, sqlerrm;
    end;
  end loop;

  insert into public.cron_job_logs (job_name, executed_at, rows_affected)
  values ('check-recurring-reminders', p_now, v_reminders_created);

  return v_reminders_created;
end;
$$;

create or replace function public.check_recurring_reminders()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.check_recurring_reminders(now());
$$;

revoke execute on function public.calculate_next_occurrence_on_or_after(date, text, integer, date, date) from public, anon, authenticated;
revoke execute on function public.calculate_next_occurrence(date, text, integer, date) from public, anon, authenticated;
revoke execute on function public.calculate_recurring_reminder_occurrence(date, text, integer, date, integer, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.check_recurring_reminders(timestamptz) from public, anon, authenticated;
revoke execute on function public.check_recurring_reminders() from public, anon, authenticated;

grant execute on function public.calculate_next_occurrence_on_or_after(date, text, integer, date, date) to service_role;
grant execute on function public.calculate_next_occurrence(date, text, integer, date) to service_role;
grant execute on function public.calculate_recurring_reminder_occurrence(date, text, integer, date, integer, text, timestamptz) to service_role;
grant execute on function public.check_recurring_reminders(timestamptz) to service_role;
grant execute on function public.check_recurring_reminders() to service_role;
