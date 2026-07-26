-- Task 14 follow-up. Preserve a user skip if that occurrence is temporarily
-- materialized, and ensure locked notes-only edits do not imply a merchant edit.
alter table public.recurring_occurrences
  add column if not exists was_skipped_before_confirmation boolean not null default false;

update public.recurring_occurrences
set was_skipped_before_confirmation = true
where status = 'skipped';

create or replace function public.recurring_occurrence_preserve_skip_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'skipped' and new.status = 'confirmed' then
    new.was_skipped_before_confirmation := true;
  end if;
  return new;
end;
$$;

drop trigger if exists recurring_occurrence_preserve_skip on public.recurring_occurrences;
create trigger recurring_occurrence_preserve_skip
before update on public.recurring_occurrences
for each row execute function public.recurring_occurrence_preserve_skip_v1();

create or replace function public.update_recurring_occurrence_v1(
  p_actor_user_id uuid, p_recurring_id uuid, p_scheduled_occurrence_date date,
  p_paid_date date default null, p_amount_cents bigint default null,
  p_account_id uuid default null, p_merchant text default null,
  p_description text default null, p_update_future_amount boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
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
  select * into v_occurrence from public.recurring_occurrences where recurring_id = p_recurring_id and scheduled_occurrence_date = p_scheduled_occurrence_date for update;
  if not found or v_occurrence.status <> 'confirmed' then raise exception 'OCCURRENCE_NOT_CONFIRMED'; end if;
  select * into strict v_actual from public.expenses where id = v_occurrence.actual_transaction_id and deleted_at is null for update;
  v_locked := public.recurring_occurrence_has_settlement_activity_v1(v_actual.id, v_occurrence.split_group_id);
  v_paid_date := coalesce(p_paid_date, v_actual.date);
  v_amount_cents := coalesce(p_amount_cents, v_actual.amount_cents);
  v_account_id := coalesce(p_account_id, v_actual.account_id);
  v_financial_change := v_paid_date is distinct from v_actual.date
    or v_amount_cents is distinct from v_actual.amount_cents
    or v_account_id is distinct from v_actual.account_id
    or (p_merchant is not null and nullif(btrim(p_merchant), '') is distinct from v_actual.merchant);
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
    or (v_template.household_id is not null and v_account.household_id is distinct from v_template.household_id) then raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'; end if;
  if v_occurrence.split_group_id is not null and v_amount_cents is distinct from v_actual.amount_cents then raise exception 'OCCURRENCE_SHARED_SPLIT_REVIEW_REQUIRED'; end if;
  update public.expenses set date = v_paid_date, amount_cents = v_amount_cents, account_id = v_account_id,
    merchant = case when p_merchant is null then merchant else nullif(btrim(p_merchant), '') end,
    raw_text = coalesce(p_description, raw_text) where id = v_actual.id returning * into v_actual;
  update public.recurring_occurrences set paid_date = v_paid_date, amount_cents = v_amount_cents where id = v_occurrence.id returning * into v_occurrence;
  if p_update_future_amount then update public.expenses set amount_cents = v_amount_cents where id = v_template.id; end if;
  return jsonb_build_object('locked', false, 'occurrence', to_jsonb(v_occurrence), 'transaction', to_jsonb(v_actual));
end;
$$;

create or replace function public.unconfirm_recurring_occurrence_v1(
  p_actor_user_id uuid, p_recurring_id uuid, p_scheduled_occurrence_date date
) returns jsonb
language plpgsql security definer set search_path = ''
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
  select * into v_occurrence from public.recurring_occurrences where recurring_id = p_recurring_id and scheduled_occurrence_date = p_scheduled_occurrence_date for update;
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
  if not v_occurrence.was_skipped_before_confirmation then
    v_rule := jsonb_set(v_template.recurrence_rule, '{excluded_dates}',
      coalesce((select jsonb_agg(value) from jsonb_array_elements_text(coalesce(v_template.recurrence_rule -> 'excluded_dates', '[]'::jsonb)) value where value <> p_scheduled_occurrence_date::text), '[]'::jsonb), true);
    update public.expenses set recurrence_rule = v_rule where id = v_template.id;
  end if;
  update public.recurring_occurrences set
    status = case when v_occurrence.was_skipped_before_confirmation then 'skipped' else 'pending' end,
    confirmation_source = case when v_occurrence.was_skipped_before_confirmation then 'user' else null end,
    actual_transaction_id = null, split_group_id = null, paid_date = null, amount_cents = null,
    currency = null, confirmed_at = null, confirmed_by_user_id = null, idempotency_key = null,
    request_fingerprint = null where id = v_occurrence.id returning * into v_occurrence;
  delete from public.recurring_transaction_reminders_sent where expense_id = p_recurring_id and occurrence_date = p_scheduled_occurrence_date;
  return jsonb_build_object('occurrence', to_jsonb(v_occurrence), 'restored_projection', not v_occurrence.was_skipped_before_confirmation);
end;
$$;

create or replace function public.skip_recurring_occurrence_v1(
  p_actor_user_id uuid, p_recurring_id uuid, p_scheduled_occurrence_date date
) returns jsonb
language plpgsql security definer set search_path = ''
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
  elsif not public.is_member_of_household(v_template.household_id, p_actor_user_id) then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  if not public.recurring_occurrence_is_scheduled_v1(v_template.recurrence_rule, p_scheduled_occurrence_date) then raise exception 'OCCURRENCE_NOT_SCHEDULED'; end if;
  if exists (select 1 from public.recurring_occurrences where recurring_id = p_recurring_id and scheduled_occurrence_date = p_scheduled_occurrence_date and status = 'confirmed') then raise exception 'OCCURRENCE_CONFLICT'; end if;
  insert into public.recurring_occurrences (recurring_id, scheduled_occurrence_date, status, confirmation_source, confirmed_by_user_id, was_skipped_before_confirmation)
  values (p_recurring_id, p_scheduled_occurrence_date, 'skipped', 'user', p_actor_user_id, true)
  on conflict (recurring_id, scheduled_occurrence_date) do update set status = 'skipped', confirmation_source = 'user', actual_transaction_id = null, paid_date = null, amount_cents = null, confirmed_at = null, confirmed_by_user_id = excluded.confirmed_by_user_id, was_skipped_before_confirmation = true;
  update public.expenses set recurrence_rule = jsonb_set(v_template.recurrence_rule, '{excluded_dates}',
    (select jsonb_agg(value order by value) from (select jsonb_array_elements_text(coalesce(v_template.recurrence_rule -> 'excluded_dates', '[]'::jsonb)) value union select p_scheduled_occurrence_date::text) dates), true) where id = p_recurring_id;
  delete from public.recurring_transaction_reminders_sent where expense_id = p_recurring_id and occurrence_date = p_scheduled_occurrence_date;
  delete from public.notification_events where event_type = 'recurring_reminder' and is_sent is false and payload ->> 'expense_id' = p_recurring_id::text and payload ->> 'occurrence_date' = p_scheduled_occurrence_date::text;
  return jsonb_build_object('skipped', true);
end;
$$;
