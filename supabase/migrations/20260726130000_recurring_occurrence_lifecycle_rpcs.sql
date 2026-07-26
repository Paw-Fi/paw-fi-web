-- Follow-up lifecycle boundaries.  Never infer settlement mutability from a
-- line's current settled flag alone: historical snapshots are immutable too.
create or replace function public.recurring_occurrence_has_settlement_activity_v1(
  p_expense_id uuid, p_split_group_id uuid
) returns boolean
language sql
security definer
set search_path = ''
as $$
  select p_expense_id is not null and (
    exists (
      select 1 from public.expense_split_lines line
      where line.split_group_id = p_split_group_id
        and (line.is_settled is true or line.settlement_ledger_seq is not null or line.cycle_boundary_event_id is not null)
    ) or exists (
      select 1 from public.household_settlement_event_allocations_v2 allocation
      where allocation.expense_id = p_expense_id
         or allocation.split_group_id = p_split_group_id
         or allocation.split_line_id in (select id from public.expense_split_lines where split_group_id = p_split_group_id)
    ) or exists (
      select 1 from public.household_settlement_cycle_baseline_lines baseline
      where baseline.expense_id = p_expense_id
         or baseline.split_group_id = p_split_group_id
         or baseline.split_line_id in (select id from public.expense_split_lines where split_group_id = p_split_group_id)
    ) or exists (
      select 1 from public.household_settlement_legacy_cutover_lines_v3 cutover
      where cutover.expense_id = p_expense_id
         or cutover.split_group_id = p_split_group_id
         or cutover.split_line_id in (select id from public.expense_split_lines where split_group_id = p_split_group_id)
    )
  );
$$;

create or replace function public.recurring_occurrence_authorize_v1(
  p_recurring_id uuid, p_actor_user_id uuid
) returns public.expenses
language plpgsql
security definer
set search_path = ''
as $$
declare v_template public.expenses%rowtype;
begin
  select * into v_template from public.expenses where id = p_recurring_id and deleted_at is null for update;
  if not found then raise exception 'OCCURRENCE_NOT_FOUND'; end if;
  if v_template.is_recurring is not true then raise exception 'OCCURRENCE_NOT_MANUALLY_CONFIRMABLE'; end if;
  if v_template.household_id is null then
    if v_template.user_id is distinct from p_actor_user_id then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  elsif v_template.privacy_scope::text <> 'full' and v_template.user_id is distinct from p_actor_user_id then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  elsif not public.is_member_of_household(v_template.household_id, p_actor_user_id) then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  return v_template;
end;
$$;

create or replace function public.update_recurring_occurrence_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_scheduled_occurrence_date date,
  p_paid_date date default null,
  p_amount_cents bigint default null,
  p_account_id uuid default null,
  p_merchant text default null,
  p_description text default null,
  p_update_future_amount boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(nullif(auth.jwt() ->> 'role', ''), nullif(current_setting('request.jwt.claim.role', true), ''), '');
  v_template public.expenses%rowtype;
  v_occurrence public.recurring_occurrences%rowtype;
  v_actual public.expenses%rowtype;
  v_account record;
  v_locked boolean;
  v_paid_date date;
  v_amount_cents bigint;
  v_account_id uuid;
  v_financial_change boolean;
begin
  if v_role <> 'service_role' then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  if p_actor_user_id is null or p_recurring_id is null or p_scheduled_occurrence_date is null then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;
  v_template := public.recurring_occurrence_authorize_v1(p_recurring_id, p_actor_user_id);
  select * into v_occurrence from public.recurring_occurrences
  where recurring_id = p_recurring_id and scheduled_occurrence_date = p_scheduled_occurrence_date
  for update;
  if not found or v_occurrence.status <> 'confirmed' then raise exception 'OCCURRENCE_NOT_CONFIRMED'; end if;
  select * into strict v_actual from public.expenses where id = v_occurrence.actual_transaction_id and deleted_at is null for update;
  v_locked := public.recurring_occurrence_has_settlement_activity_v1(v_actual.id, v_occurrence.split_group_id);
  v_paid_date := coalesce(p_paid_date, v_actual.date);
  v_amount_cents := coalesce(p_amount_cents, v_actual.amount_cents);
  v_account_id := coalesce(p_account_id, v_actual.account_id);
  v_financial_change := v_paid_date is distinct from v_actual.date
    or v_amount_cents is distinct from v_actual.amount_cents
    or v_account_id is distinct from v_actual.account_id
    or nullif(btrim(p_merchant), '') is distinct from v_actual.merchant;
  if v_locked and v_financial_change then raise exception 'OCCURRENCE_SETTLEMENT_LOCKED'; end if;
  if v_locked then
    update public.expenses set raw_text = coalesce(p_description, raw_text) where id = v_actual.id returning * into v_actual;
    return jsonb_build_object('locked', true, 'occurrence', to_jsonb(v_occurrence), 'transaction', to_jsonb(v_actual));
  end if;
  if v_paid_date > current_date then raise exception 'OCCURRENCE_PAID_DATE_IN_FUTURE'; end if;
  if v_amount_cents <= 0 then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;
  if p_merchant is not null and char_length(btrim(p_merchant)) > 255 then raise exception 'OCCURRENCE_INVALID_MERCHANT'; end if;
  if v_account_id is null then raise exception 'OCCURRENCE_ACCOUNT_REQUIRED'; end if;
  select * into v_account from public.accounts where id = v_account_id for key share;
  if not found or v_account.is_archived or upper(v_account.currency) <> upper(v_template.currency)
    or (v_template.household_id is null and (v_account.user_id is distinct from p_actor_user_id or v_account.household_id is not null))
    or (v_template.household_id is not null and v_account.household_id is distinct from v_template.household_id) then
    raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';
  end if;
  -- An amount change on a shared occurrence requires revalidated split input;
  -- this RPC intentionally refuses a stale split instead of silently changing debt.
  if v_occurrence.split_group_id is not null and v_amount_cents is distinct from v_actual.amount_cents then
    raise exception 'OCCURRENCE_SHARED_SPLIT_REVIEW_REQUIRED';
  end if;
  update public.expenses set date = v_paid_date, amount_cents = v_amount_cents, account_id = v_account_id,
    merchant = case when p_merchant is null then merchant else nullif(btrim(p_merchant), '') end,
    raw_text = coalesce(p_description, raw_text) where id = v_actual.id returning * into v_actual;
  update public.recurring_occurrences set paid_date = v_paid_date, amount_cents = v_amount_cents
    where id = v_occurrence.id returning * into v_occurrence;
  if p_update_future_amount then update public.expenses set amount_cents = v_amount_cents where id = v_template.id; end if;
  return jsonb_build_object('locked', false, 'occurrence', to_jsonb(v_occurrence), 'transaction', to_jsonb(v_actual));
end;
$$;

create or replace function public.unconfirm_recurring_occurrence_v1(
  p_actor_user_id uuid, p_recurring_id uuid, p_scheduled_occurrence_date date
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(nullif(auth.jwt() ->> 'role', ''), nullif(current_setting('request.jwt.claim.role', true), ''), '');
  v_template public.expenses%rowtype;
  v_occurrence public.recurring_occurrences%rowtype;
  v_actual public.expenses%rowtype;
  v_rule jsonb;
begin
  if v_role <> 'service_role' then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  if p_actor_user_id is null or p_recurring_id is null or p_scheduled_occurrence_date is null then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;
  v_template := public.recurring_occurrence_authorize_v1(p_recurring_id, p_actor_user_id);
  select * into v_occurrence from public.recurring_occurrences
  where recurring_id = p_recurring_id and scheduled_occurrence_date = p_scheduled_occurrence_date for update;
  if not found or v_occurrence.status <> 'confirmed' then raise exception 'OCCURRENCE_NOT_CONFIRMED'; end if;
  select * into strict v_actual from public.expenses where id = v_occurrence.actual_transaction_id and deleted_at is null for update;
  if public.recurring_occurrence_has_settlement_activity_v1(v_actual.id, v_occurrence.split_group_id) then raise exception 'OCCURRENCE_SETTLEMENT_LOCKED'; end if;
  if v_occurrence.split_group_id is not null then
    perform set_config('moneko.settlement_split_write_expense_id', v_actual.id::text, true);
    update public.expenses set split_group_id = null where id = v_actual.id;
    delete from public.expense_split_groups where id = v_occurrence.split_group_id;
    perform set_config('moneko.settlement_split_write_expense_id', '', true);
  end if;
  update public.expenses set deleted_at = clock_timestamp(), deleted_reason = 'recurring_occurrence_unconfirmed' where id = v_actual.id;
  v_rule := jsonb_set(v_template.recurrence_rule, '{excluded_dates}',
    coalesce((select jsonb_agg(value) from jsonb_array_elements_text(coalesce(v_template.recurrence_rule -> 'excluded_dates', '[]'::jsonb)) value where value <> p_scheduled_occurrence_date::text), '[]'::jsonb), true);
  update public.expenses set recurrence_rule = v_rule where id = v_template.id;
  update public.recurring_occurrences set status = 'pending', confirmation_source = null, actual_transaction_id = null,
    split_group_id = null, paid_date = null, amount_cents = null, currency = null, confirmed_at = null,
    confirmed_by_user_id = null, idempotency_key = null, request_fingerprint = null where id = v_occurrence.id returning * into v_occurrence;
  delete from public.recurring_transaction_reminders_sent where expense_id = p_recurring_id and occurrence_date = p_scheduled_occurrence_date;
  return jsonb_build_object('occurrence', to_jsonb(v_occurrence), 'restored_projection', true);
end;
$$;

create or replace function public.list_recurring_occurrences_v1(
  p_actor_user_id uuid, p_recurring_id uuid, p_before_scheduled_date date default null, p_limit integer default 50
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_template public.expenses%rowtype;
begin
  if coalesce(nullif(auth.jwt() ->> 'role', ''), nullif(current_setting('request.jwt.claim.role', true), '')) <> 'service_role' then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  v_template := public.recurring_occurrence_authorize_v1(p_recurring_id, p_actor_user_id);
  return coalesce((select jsonb_agg(row.payload order by row.scheduled_occurrence_date desc)
  from (
    select occurrence.scheduled_occurrence_date, jsonb_build_object(
      'occurrence', to_jsonb(occurrence), 'transaction', case when actual.id is null then null else to_jsonb(actual) end,
      'split_group', case when split_group.id is null then null else to_jsonb(split_group) end,
      'settlement_locked', public.recurring_occurrence_has_settlement_activity_v1(actual.id, occurrence.split_group_id)
    ) as payload
    from public.recurring_occurrences occurrence
    left join public.expenses actual on actual.id = occurrence.actual_transaction_id
    left join public.expense_split_groups split_group on split_group.id = occurrence.split_group_id
    where occurrence.recurring_id = v_template.id
      and (p_before_scheduled_date is null or occurrence.scheduled_occurrence_date < p_before_scheduled_date)
    order by occurrence.scheduled_occurrence_date desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) row), '[]'::jsonb);
end;
$$;

revoke all on function public.recurring_occurrence_has_settlement_activity_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.recurring_occurrence_authorize_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_recurring_occurrence_v1(uuid, uuid, date, date, bigint, uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.unconfirm_recurring_occurrence_v1(uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.list_recurring_occurrences_v1(uuid, uuid, date, integer) from public, anon, authenticated;
grant execute on function public.update_recurring_occurrence_v1(uuid, uuid, date, date, bigint, uuid, text, text, boolean) to service_role;
grant execute on function public.unconfirm_recurring_occurrence_v1(uuid, uuid, date) to service_role;
grant execute on function public.list_recurring_occurrences_v1(uuid, uuid, date, integer) to service_role;
