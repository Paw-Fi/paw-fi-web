-- Atomic write boundary for user-confirmed recurring occurrences.  The Edge
-- Function authenticates callers; this RPC remains service-role only.
alter table public.recurring_occurrences
  add column idempotency_key text,
  add column request_fingerprint text;

create unique index recurring_occurrences_idempotency_key_idx
  on public.recurring_occurrences (recurring_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.recurring_occurrence_is_scheduled_v1(
  p_rule jsonb, p_scheduled_date date
) returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_anchor date;
  v_end date;
  v_frequency text;
  v_interval integer;
begin
  if p_rule is null or p_scheduled_date is null then return false; end if;
  v_anchor := nullif(p_rule ->> 'anchor_date', '')::date;
  v_end := nullif(p_rule ->> 'end_date', '')::date;
  v_frequency := lower(coalesce(nullif(p_rule ->> 'frequency', ''), 'monthly'));
  v_interval := greatest(coalesce(nullif(p_rule ->> 'interval', '')::integer, 1), 1);
  if v_anchor is null or p_scheduled_date < v_anchor
    or (v_end is not null and p_scheduled_date > v_end) then return false; end if;
  case v_frequency
    when 'daily' then return (p_scheduled_date - v_anchor) % v_interval = 0;
    when 'weekly' then return (p_scheduled_date - v_anchor) % (7 * v_interval) = 0;
    when 'biweekly' then return (p_scheduled_date - v_anchor) % 14 = 0;
    when 'monthly' then
      return public.calculate_next_occurrence_on_or_after(v_anchor, 'monthly', v_interval, v_end, p_scheduled_date) = p_scheduled_date;
    when 'yearly' then
      return public.calculate_next_occurrence_on_or_after(v_anchor, 'yearly', v_interval, v_end, p_scheduled_date) = p_scheduled_date;
    else return false;
  end case;
exception when others then return false;
end;
$$;

create or replace function public.confirm_recurring_occurrence_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_scheduled_occurrence_date date,
  p_paid_date date,
  p_amount_cents bigint,
  p_account_id uuid,
  p_merchant text,
  p_description text,
  p_custom_splits jsonb default null,
  p_payer_user_id uuid default null,
  p_update_future_amount boolean default false,
  p_client_record_id uuid default null,
  p_idempotency_key text default null
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
  v_split_group_id uuid;
  v_fingerprint text;
  v_rule jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_split_type text;
  v_member_count integer;
  v_remainder bigint;
  v_line record;
begin
  if v_role <> 'service_role' then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  if p_actor_user_id is null or p_recurring_id is null or p_scheduled_occurrence_date is null
    or p_paid_date is null or p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'OCCURRENCE_INVALID_INPUT';
  end if;
  if p_paid_date > current_date then raise exception 'OCCURRENCE_PAID_DATE_IN_FUTURE'; end if;
  if p_merchant is not null and char_length(btrim(p_merchant)) > 255 then raise exception 'OCCURRENCE_INVALID_MERCHANT'; end if;

  select * into v_template from public.expenses where id = p_recurring_id and deleted_at is null for update;
  if not found then raise exception 'OCCURRENCE_NOT_FOUND'; end if;
  if v_template.is_recurring is not true or v_template.recurrence_rule is null
    or v_template.provider_fields ->> 'source' = 'plaid_recurring_template' then
    raise exception 'OCCURRENCE_NOT_MANUALLY_CONFIRMABLE';
  end if;
  if v_template.household_id is null then
    if v_template.user_id is distinct from p_actor_user_id then raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  elsif not public.is_member_of_household(v_template.household_id, p_actor_user_id) then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  if not public.recurring_occurrence_is_scheduled_v1(v_template.recurrence_rule, p_scheduled_occurrence_date) then
    raise exception 'OCCURRENCE_NOT_SCHEDULED';
  end if;
  if p_scheduled_occurrence_date > current_date then raise exception 'OCCURRENCE_NOT_DUE'; end if;

  v_fingerprint := md5(jsonb_build_object('paid_date', p_paid_date, 'amount_cents', p_amount_cents,
    'account_id', p_account_id, 'merchant', nullif(btrim(p_merchant), ''), 'description', coalesce(p_description, ''),
    'payer_user_id', p_payer_user_id, 'custom_splits', coalesce(p_custom_splits, 'null'::jsonb))::text);
  select * into v_occurrence from public.recurring_occurrences
  where recurring_id = p_recurring_id and scheduled_occurrence_date = p_scheduled_occurrence_date for update;
  if found and v_occurrence.status = 'confirmed' then
    if v_occurrence.request_fingerprint = v_fingerprint then
      select * into strict v_actual from public.expenses where id = v_occurrence.actual_transaction_id;
      return jsonb_build_object('duplicate', true, 'occurrence', to_jsonb(v_occurrence), 'transaction', to_jsonb(v_actual));
    end if;
    raise exception 'OCCURRENCE_CONFLICT';
  end if;

  if p_account_id is null then raise exception 'OCCURRENCE_ACCOUNT_REQUIRED'; end if;
  select * into v_account from public.accounts where id = p_account_id for key share;
  if not found or v_account.is_archived or upper(v_account.currency) <> upper(v_template.currency)
    or (v_template.household_id is null and (v_account.user_id is distinct from p_actor_user_id or v_account.household_id is not null))
    or (v_template.household_id is not null and v_account.household_id is distinct from v_template.household_id) then
    raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';
  end if;

  insert into public.expenses
  select (jsonb_populate_record(null::public.expenses,
    (to_jsonb(v_template) - 'id' - 'idempotency_key' - 'wallet_capture_idempotency_key' - 'wallet_capture_id') ||
    jsonb_build_object('id', coalesce(p_client_record_id, gen_random_uuid()), 'date', p_paid_date,
      'amount_cents', p_amount_cents, 'merchant', nullif(btrim(p_merchant), ''), 'raw_text', coalesce(p_description, ''),
      'is_recurring', false, 'recurrence_rule', null, 'parent_recurring_id', p_recurring_id,
      'scheduled_occurrence_date', p_scheduled_occurrence_date, 'recurring_confirmed_at', clock_timestamp(),
      'recurring_confirmation_source', 'user', 'account_id', p_account_id, 'split_group_id', null,
      'idempotency_key', 'recurring-occurrence:v1:' || p_recurring_id::text || ':' || p_scheduled_occurrence_date::text,
      'deleted_at', null, 'deleted_reason', null))).*
  returning * into v_actual;

  insert into public.recurring_occurrences (
    recurring_id, scheduled_occurrence_date, status, confirmation_source, actual_transaction_id,
    paid_date, amount_cents, currency, confirmed_at, confirmed_by_user_id, idempotency_key, request_fingerprint
  ) values (p_recurring_id, p_scheduled_occurrence_date, 'confirmed', 'user', v_actual.id,
    p_paid_date, p_amount_cents, upper(v_template.currency), clock_timestamp(), p_actor_user_id,
    nullif(btrim(p_idempotency_key), ''), v_fingerprint)
  on conflict (recurring_id, scheduled_occurrence_date) do update set
    status = excluded.status, confirmation_source = excluded.confirmation_source,
    actual_transaction_id = excluded.actual_transaction_id, paid_date = excluded.paid_date,
    amount_cents = excluded.amount_cents, currency = excluded.currency, confirmed_at = excluded.confirmed_at,
    confirmed_by_user_id = excluded.confirmed_by_user_id, idempotency_key = excluded.idempotency_key,
    request_fingerprint = excluded.request_fingerprint
  returning * into v_occurrence;

  -- Shared expense splits are created only for the materialized actual.
  if v_template.household_id is not null and coalesce(v_template.type, 'expense') <> 'income' and p_custom_splits is not null then
    v_split_type := p_custom_splits ->> 'splitType';
    if v_split_type not in ('equal', 'amount', 'percentage', 'shares') then raise exception 'OCCURRENCE_INVALID_SPLIT'; end if;
    if not exists (select 1 from jsonb_array_elements(coalesce(p_custom_splits -> 'memberSplits', '[]'::jsonb))) then raise exception 'OCCURRENCE_INVALID_SPLIT'; end if;
    if exists (select 1 from jsonb_array_elements(p_custom_splits -> 'memberSplits') line(value) where not public.is_member_of_household(v_template.household_id, (line.value ->> 'userId')::uuid)) then raise exception 'OCCURRENCE_SPLIT_MEMBER_NOT_ACTIVE'; end if;
    if v_split_type = 'amount' then
      select coalesce(jsonb_agg(jsonb_build_object('user_id', line.value ->> 'userId', 'amount_cents', round((line.value ->> 'amount')::numeric * 100)::bigint)), '[]'::jsonb)
      into v_lines from jsonb_array_elements(p_custom_splits -> 'memberSplits') line(value);
      if (select coalesce(sum((line.value ->> 'amount_cents')::bigint), 0) from jsonb_array_elements(v_lines) line(value)) <> p_amount_cents then raise exception 'OCCURRENCE_SPLIT_TOTAL_MISMATCH'; end if;
    else
      -- Equal/percentage/shares must be concretely allocated before settlement sees them.
      select count(*) into v_member_count from jsonb_array_elements(p_custom_splits -> 'memberSplits');
      if v_split_type = 'equal' then
        v_remainder := p_amount_cents % v_member_count;
        select jsonb_agg(jsonb_build_object('user_id', line.value ->> 'userId', 'amount_cents', p_amount_cents / v_member_count + case when line.ordinality <= v_remainder then 1 else 0 end)) into v_lines
        from jsonb_array_elements(p_custom_splits -> 'memberSplits') with ordinality line(value, ordinality);
      else
        raise exception 'OCCURRENCE_SPLIT_TYPE_REQUIRES_SERVER_ALLOCATION';
      end if;
    end if;
    v_split_group_id := gen_random_uuid();
    perform public.households_commit_expense_split_write_v3(p_actor_user_id, v_actual.id, v_split_group_id,
      v_template.household_id, coalesce(p_payer_user_id, p_actor_user_id), v_split_type, upper(v_template.currency),
      p_amount_cents, coalesce(p_description, ''), v_lines,
      jsonb_build_object('household_id', v_template.household_id, 'currency', upper(v_template.currency), 'amount_cents', p_amount_cents, 'split_group_id', null, 'account_id', p_account_id), null, p_account_id);
    update public.expense_split_groups set recurring_occurrence_id = v_occurrence.id where id = v_split_group_id;
    update public.recurring_occurrences set split_group_id = v_split_group_id where id = v_occurrence.id returning * into v_occurrence;
  end if;

  v_rule := jsonb_set(v_template.recurrence_rule, '{excluded_dates}',
    (select jsonb_agg(value order by value) from (select jsonb_array_elements_text(coalesce(v_template.recurrence_rule -> 'excluded_dates', '[]'::jsonb)) value union select p_scheduled_occurrence_date::text) dates), true);
  update public.expenses set recurrence_rule = v_rule,
    amount_cents = case when p_update_future_amount then p_amount_cents else amount_cents end where id = p_recurring_id;
  delete from public.recurring_transaction_reminders_sent where expense_id = p_recurring_id and occurrence_date = p_scheduled_occurrence_date;
  delete from public.notification_events where event_type = 'recurring_reminder' and is_sent is false
    and payload ->> 'expense_id' = p_recurring_id::text and payload ->> 'occurrence_date' = p_scheduled_occurrence_date::text;
  return jsonb_build_object('duplicate', false, 'occurrence', to_jsonb(v_occurrence), 'transaction', to_jsonb(v_actual),
    'split_group_id', v_split_group_id);
end;
$$;

revoke all on function public.recurring_occurrence_is_scheduled_v1(jsonb, date) from public, anon, authenticated;
revoke all on function public.confirm_recurring_occurrence_v1(uuid, uuid, date, date, bigint, uuid, text, text, jsonb, uuid, boolean, uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_recurring_occurrence_v1(uuid, uuid, date, date, bigint, uuid, text, text, jsonb, uuid, boolean, uuid, text) to service_role;
