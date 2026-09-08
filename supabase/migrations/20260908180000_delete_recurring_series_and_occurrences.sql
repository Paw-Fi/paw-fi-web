create or replace function public.delete_recurring_series_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_template public.expenses%rowtype;
  v_actual_ids uuid[];
  v_deleted_actual_count integer := 0;
begin
  if v_role <> 'service_role' then
    raise exception 'RECURRING_DELETE_UNAUTHORIZED';
  end if;

  select *
  into v_template
  from public.expenses
  where id = p_recurring_id
    and deleted_at is null
    and is_recurring is true
    and recurrence_rule is not null
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'code', 'NOT_FOUND',
      'error', 'Recurring template not found'
    );
  end if;

  if v_template.household_id is null then
    if v_template.user_id is distinct from p_actor_user_id then
      return jsonb_build_object(
        'success', false,
        'code', 'UNAUTHORIZED',
        'error', 'Not the template owner'
      );
    end if;
  elsif not public.is_member_of_household(
    v_template.household_id,
    p_actor_user_id
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'UNAUTHORIZED',
      'error', 'Not a household member'
    );
  elsif v_template.user_id is distinct from p_actor_user_id
    and v_template.privacy_scope::text <> 'full' then
    return jsonb_build_object(
      'success', false,
      'code', 'UNAUTHORIZED',
      'error', 'Not the template owner'
    );
  end if;

  select coalesce(array_agg(distinct actual_id), '{}'::uuid[])
  into v_actual_ids
  from (
    select occurrence.actual_transaction_id as actual_id
    from public.recurring_occurrences occurrence
    where occurrence.recurring_id = v_template.id
      and occurrence.actual_transaction_id is not null
    union
    select actual.id
    from public.expenses actual
    where actual.parent_recurring_id = v_template.id
      and actual.id <> v_template.id
      and actual.deleted_at is null
  ) actuals;

  -- The ledger references its template with ON DELETE RESTRICT. Remove it
  -- before hiding the template and actual transactions in this same transaction.
  delete from public.recurring_occurrences
  where recurring_id = v_template.id;

  delete from public.recurring_transaction_reminders_sent
  where expense_id = v_template.id;

  delete from public.notification_events
  where event_type = 'recurring_reminder'
    and is_sent is false
    and payload ->> 'expense_id' = v_template.id::text;

  update public.expenses
  set
    deleted_at = clock_timestamp(),
    deleted_reason = 'user_deleted',
    updated_at = clock_timestamp()
  where id = any(v_actual_ids)
    and deleted_at is null;
  get diagnostics v_deleted_actual_count = row_count;

  update public.expenses
  set
    deleted_at = clock_timestamp(),
    deleted_reason = 'user_deleted',
    updated_at = clock_timestamp()
  where id = v_template.id;

  return jsonb_build_object(
    'success', true,
    'deleted', true,
    'deletedOccurrenceTransactionCount', v_deleted_actual_count
  );
end;
$$;

revoke all on function public.delete_recurring_series_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_recurring_series_v1(uuid, uuid)
  to service_role;
