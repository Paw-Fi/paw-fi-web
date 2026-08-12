-- A single transaction boundary for replacing one projected occurrence with a
-- non-recurring override. The underlying confirmation RPC creates the actual,
-- updates the occurrence ledger, excludes the projection, and clears reminders.
-- The confirmation call above creates/links the occurrence. Apply an optional
-- one-off category change to its materialized actual in that same transaction.
create or replace function public.save_recurring_occurrence_override_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_scheduled_occurrence_date date,
  p_paid_date date,
  p_amount_cents bigint,
  p_account_id uuid default null,
  p_merchant text default null,
  p_description text default null,
  p_custom_splits jsonb default null,
  p_payer_user_id uuid default null,
  p_update_future_amount boolean default false,
  p_idempotency_key text default null,
  p_category text default null,
  p_currency text default null,
  p_source text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_actual_id uuid;
begin
  if nullif(btrim(p_category), '') is not null and char_length(btrim(p_category)) > 255 then
    raise exception 'OCCURRENCE_INVALID_CATEGORY';
  end if;
  if nullif(btrim(p_source), '') is not null and char_length(btrim(p_source)) > 255 then
    raise exception 'OCCURRENCE_INVALID_SOURCE';
  end if;
  if p_currency is not null and upper(btrim(p_currency)) <> (
    select upper(currency) from public.expenses where id = p_recurring_id
  ) then
    raise exception 'OCCURRENCE_CURRENCY_MISMATCH';
  end if;
  v_result := public.confirm_recurring_occurrence_v1(
    p_actor_user_id,
    p_recurring_id,
    p_scheduled_occurrence_date,
    p_paid_date,
    p_amount_cents,
    p_account_id,
    p_merchant,
    p_description,
    p_custom_splits,
    p_payer_user_id,
    p_update_future_amount,
    null,
    p_idempotency_key
  );
  v_actual_id := (v_result -> 'transaction' ->> 'id')::uuid;
  if nullif(btrim(p_category), '') is not null or nullif(btrim(p_source), '') is not null then
    update public.expenses
    set category = coalesce(nullif(btrim(p_category), ''), category),
        source = coalesce(nullif(btrim(p_source), ''), source)
    where id = v_actual_id;
  end if;
  return jsonb_set(
    v_result,
    '{transaction}',
    (select to_jsonb(actual) from public.expenses actual where actual.id = v_actual_id),
    true
  );
end;
$$;

revoke all on function public.save_recurring_occurrence_override_v1(uuid, uuid, date, date, bigint, uuid, text, text, jsonb, uuid, boolean, text, text, text, text) from public, anon, authenticated;
grant execute on function public.save_recurring_occurrence_override_v1(uuid, uuid, date, date, bigint, uuid, text, text, jsonb, uuid, boolean, text, text, text, text) to service_role;
