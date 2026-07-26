create or replace function public.skip_recurring_occurrence_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_scheduled_occurrence_date date
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.expenses%rowtype;
  v_role text := coalesce(nullif(auth.jwt() ->> 'role', ''), nullif(current_setting('request.jwt.claim.role', true), ''), '');
begin
  if v_role <> 'service_role' then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  select * into v_template from public.expenses where id = p_recurring_id and deleted_at is null for update;
  if not found or v_template.is_recurring is not true or v_template.recurrence_rule is null then raise exception 'OCCURRENCE_NOT_FOUND'; end if;
  if v_template.household_id is null then
    if v_template.user_id is distinct from p_actor_user_id then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  elsif not public.is_member_of_household(v_template.household_id, p_actor_user_id) then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  if not public.recurring_occurrence_is_scheduled_v1(v_template.recurrence_rule, p_scheduled_occurrence_date) then raise exception 'OCCURRENCE_NOT_SCHEDULED'; end if;
  if exists (select 1 from public.recurring_occurrences where recurring_id = p_recurring_id and scheduled_occurrence_date = p_scheduled_occurrence_date and status = 'confirmed') then raise exception 'OCCURRENCE_CONFLICT'; end if;

  insert into public.recurring_occurrences (recurring_id, scheduled_occurrence_date, status, confirmation_source, confirmed_by_user_id)
  values (p_recurring_id, p_scheduled_occurrence_date, 'skipped', 'user', p_actor_user_id)
  on conflict (recurring_id, scheduled_occurrence_date) do update set status = 'skipped', confirmation_source = 'user', actual_transaction_id = null, paid_date = null, amount_cents = null, confirmed_at = null, confirmed_by_user_id = excluded.confirmed_by_user_id;

  update public.expenses set recurrence_rule = jsonb_set(v_template.recurrence_rule, '{excluded_dates}',
    (select jsonb_agg(value order by value) from (select jsonb_array_elements_text(coalesce(v_template.recurrence_rule -> 'excluded_dates', '[]'::jsonb)) value union select p_scheduled_occurrence_date::text) dates), true)
  where id = p_recurring_id;
  delete from public.recurring_transaction_reminders_sent where expense_id = p_recurring_id and occurrence_date = p_scheduled_occurrence_date;
  delete from public.notification_events where event_type = 'recurring_reminder' and is_sent is false and payload ->> 'expense_id' = p_recurring_id::text and payload ->> 'occurrence_date' = p_scheduled_occurrence_date::text;
  return jsonb_build_object('skipped', true);
end;
$$;

revoke all on function public.skip_recurring_occurrence_v1(uuid, uuid, date) from public, anon, authenticated;
grant execute on function public.skip_recurring_occurrence_v1(uuid, uuid, date) to service_role;
