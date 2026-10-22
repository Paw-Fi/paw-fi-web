-- A logical match may span midnight. Both claim RPCs must serialize that
-- comparison on the same key, independent of date, wallet and currency.
do $$
declare
  v_signature text;
  v_definition text;
  v_start integer;
  v_end integer;
begin
  foreach v_signature in array array[
    'public.claim_android_wallet_capture_event(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz)',
    'public.claim_android_wallet_capture_event_v2(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz,text,text,boolean)'
  ] loop
    v_definition := pg_get_functiondef(v_signature::regprocedure);
    v_start := strpos(lower(v_definition), 'v_lock_key := concat_ws(');
    v_end := strpos(lower(substr(v_definition, v_start)), ');');
    if v_start = 0 or v_end = 0 then
      raise exception 'Wallet capture lock definition missing in %', v_signature;
    end if;
    v_definition := substr(v_definition, 1, v_start - 1)
      || E'v_lock_key := concat_ws(''|'', p_user_id::text, p_scope_key, p_transaction_type, p_amount_cents::text);'
      || substr(v_definition, v_start + v_end + 1);
    execute v_definition;
  end loop;
end;
$$;

-- Commit capture ownership with the expense (also inside the household split
-- RPC transaction). A later response/enrichment failure cannot reopen it.
create or replace function public.mark_wallet_capture_saved_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.wallet_capture_events
  set status = 'saved', expense_id = new.id, error_text = null,
      updated_at = now()
  where user_id = new.user_id
    and exact_event_key = new.wallet_capture_idempotency_key
    and status = 'processing';
  return new;
end;
$$;

revoke all on function public.mark_wallet_capture_saved_on_insert() from public, anon, authenticated;
create trigger wallet_capture_saved_on_insert
after insert on public.expenses
for each row
when (new.wallet_capture_idempotency_key is not null)
execute function public.mark_wallet_capture_saved_on_insert();

create or replace function public.finalize_android_wallet_capture_event(
  p_claim_id uuid, p_expense_id uuid, p_result jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.wallet_capture_events w
  set status = 'saved', expense_id = p_expense_id, result = p_result,
      error_text = null, updated_at = now()
  where w.id = p_claim_id
    and w.status in ('processing', 'saved')
    and (w.expense_id is null or w.expense_id = p_expense_id)
    and exists (
      select 1 from public.expenses e
      where e.id = p_expense_id and e.user_id = w.user_id
        and e.wallet_capture_idempotency_key = w.exact_event_key
    );
end;
$$;

create or replace function public.release_android_wallet_capture_event(
  p_claim_id uuid, p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.wallet_capture_events%rowtype;
  v_expense_id uuid;
begin
  select * into v_claim from public.wallet_capture_events
  where id = p_claim_id and status = 'processing' for update;
  if not found then return; end if;

  -- Recover captures committed before the insert trigger was installed.
  select id into v_expense_id from public.expenses
  where user_id = v_claim.user_id
    and wallet_capture_idempotency_key = v_claim.exact_event_key;
  update public.wallet_capture_events
  set status = case when v_expense_id is null then 'failed' else 'saved' end,
      expense_id = v_expense_id,
      error_text = case when v_expense_id is null then nullif(btrim(p_error), '') else null end,
      updated_at = now()
  where id = p_claim_id;
end;
$$;

revoke all on function public.finalize_android_wallet_capture_event(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.release_android_wallet_capture_event(uuid, text) from public, anon, authenticated;
grant execute on function public.finalize_android_wallet_capture_event(uuid, uuid, jsonb) to service_role;
grant execute on function public.release_android_wallet_capture_event(uuid, text) to service_role;
