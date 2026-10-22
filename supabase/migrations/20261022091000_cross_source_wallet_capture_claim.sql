-- Legacy rows were sometimes labelled Android even for iOS notifications.
-- Do not infer their actual platform or retroactively merge existing expenses.
alter table public.wallet_capture_events
  add column cross_source_match_eligible boolean not null default false,
  -- Lease ownership is independent of whether financial evidence is strong
  -- enough for a heuristic match. Legacy workers retain their old protocol.
  add column requires_active_claim boolean not null default false;

-- The insert guard also checks released claims, outside the active-only
-- unique index. Keep that lookup bounded to one request's history.
create index idx_wallet_capture_events_request_history
  on public.wallet_capture_events(user_id, exact_event_key, created_at desc);
create index idx_wallet_capture_events_cross_source
  on public.wallet_capture_events(user_id, scope_key, transaction_type,
    amount_cents, currency, notification_posted_at)
  where cross_source_match_eligible and status in ('processing', 'saved');
create index idx_wallet_capture_events_duplicate_source
  on public.wallet_capture_events(duplicate_of_expense_id, capture_source, source_package)
  where status = 'duplicate';

-- Retain Android's existing wallet/bank currency-evidence policy only within
-- Android. New cross-platform matches use the stricter common policy below.
-- For v3-owned captures the same source/app can consume a saved purchase only
-- once, including through the legacy Android wallet/bank matcher. Otherwise
-- that fallback could absorb the second of two identical purchases.
do $$
declare v_signature text; v_definition text; v_updated text;
begin
  foreach v_signature in array array[
    'public.claim_android_wallet_capture_event(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz)',
    'public.claim_android_wallet_capture_event_v2(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz,text,text,boolean)'
  ] loop
    v_definition := pg_get_functiondef(v_signature::regprocedure);
    v_updated := regexp_replace(v_definition, 'and w.user_id = p_user_id',
      'and w.capture_source = ''android_notification_listener''
       and (not w.requires_active_claim or not exists (
         select 1 from public.wallet_capture_events alias
         where alias.duplicate_of_expense_id = w.expense_id
           and alias.status = ''duplicate''
           and alias.capture_source = p_capture_source
           and alias.source_package is not distinct from v_source_package
       ))
       and w.user_id = p_user_id', 'gi');
    if v_updated = v_definition then
      raise exception 'Wallet capture source boundary missing in %', v_signature;
    end if;
    execute v_updated;
  end loop;
end;
$$;

create or replace function public.claim_wallet_capture_event_v3(
  p_user_id uuid, p_scope_key text, p_household_id uuid, p_is_portfolio boolean,
  p_account_id uuid, p_capture_source text, p_source_package text,
  p_source_app_label text, p_exact_event_key text, p_logical_fingerprint text,
  p_merchant_key text, p_transaction_type text, p_amount_cents integer,
  p_currency text, p_transaction_date date, p_notification_posted_at timestamptz,
  p_currency_evidence_raw text default null,
  p_currency_evidence_type text default null,
  p_currency_is_ambiguous boolean default false,
  p_cross_source_match_eligible boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_existing public.wallet_capture_events%rowtype;
  v_match record;
  v_expense record;
  v_claim_id uuid;
  v_merchant text := nullif(btrim(p_merchant_key), '');
  v_package text := nullif(lower(btrim(p_source_package)), '');
  v_currency text := upper(btrim(p_currency));
  v_eligible boolean;
  v_result jsonb;
begin
  if p_capture_source is null or p_capture_source not in (
    'ios_wallet_shortcut', 'ios_notification_shortcut', 'android_notification_listener'
  ) then raise exception 'Invalid wallet capture source'; end if;
  if p_user_id is null or nullif(btrim(p_scope_key), '') is null
    or nullif(btrim(p_exact_event_key), '') is null
    or nullif(btrim(p_logical_fingerprint), '') is null
    or p_transaction_type is null or p_transaction_type not in ('expense', 'income')
    or p_amount_cents is null or p_amount_cents <= 0
    or v_currency is null or v_currency !~ '^[A-Z]{3}$'
    or p_transaction_date is null then
    raise exception 'Invalid wallet capture identity';
  end if;
  v_eligible := coalesce(p_cross_source_match_eligible, false)
    and v_merchant is not null and p_notification_posted_at is not null
    and not coalesce(p_currency_is_ambiguous, true);

  -- Must match both legacy RPC lock keys; no day bucket at midnight.
  perform pg_advisory_xact_lock(hashtext(concat_ws('|', p_user_id::text,
    p_scope_key, p_transaction_type, p_amount_cents::text))::bigint);

  select * into v_existing from public.wallet_capture_events
  where user_id = p_user_id and exact_event_key = p_exact_event_key
    and status in ('processing', 'saved', 'duplicate')
  limit 1 for update;
  if found then
    select e.id, e.category, e.amount_cents, e.currency into v_expense
    from public.expenses e
    where e.user_id = p_user_id and (
      e.id = coalesce(v_existing.expense_id, v_existing.duplicate_of_expense_id)
      or e.wallet_capture_idempotency_key = v_existing.exact_event_key
    ) limit 1;
    if found then
      if v_existing.status = 'processing' then
        update public.wallet_capture_events set status = 'saved',
          expense_id = v_expense.id, updated_at = v_now where id = v_existing.id;
      end if;
      return jsonb_build_object('status', 'duplicate', 'reason', 'exact_event_key',
        'expenseId', v_expense.id, 'category', v_expense.category,
        'amountCents', v_expense.amount_cents, 'currency', v_expense.currency);
    end if;
    if v_existing.status = 'processing' and v_existing.created_at >= v_now - interval '10 minutes' then
      return jsonb_build_object('status', 'processing', 'claimId', v_existing.id);
    end if;
    update public.wallet_capture_events set status = 'failed',
      error_text = 'stale_or_missing_expense', updated_at = v_now
    where id = v_existing.id;
  end if;

  if v_eligible then
    select w.id, w.status, e.id as expense_id, e.category, e.amount_cents, e.currency
    into v_match
    from public.wallet_capture_events w
    left join public.expenses e on e.user_id = w.user_id
      and (e.id = w.expense_id or e.wallet_capture_idempotency_key = w.exact_event_key)
    where w.cross_source_match_eligible
      and w.status in ('processing', 'saved')
      and (e.id is not null or (w.status = 'processing' and w.created_at >= v_now - interval '10 minutes'))
      and w.user_id = p_user_id and w.scope_key = p_scope_key
      and w.account_id is not distinct from p_account_id
      and w.transaction_type = p_transaction_type
      and w.amount_cents = p_amount_cents and w.currency = v_currency
      and w.merchant_key = v_merchant
      and w.capture_source <> p_capture_source
      and w.notification_posted_at between p_notification_posted_at - interval '2 minutes'
                                       and p_notification_posted_at + interval '2 minutes'
      and abs(w.transaction_date - p_transaction_date) <= 1
      -- One observation per source/app channel for each expense. Android bank
      -- and wallet apps may each report it, but repeated purchases from the
      -- same channel must not be absorbed by an already matched purchase.
      and not exists (
        select 1 from public.wallet_capture_events alias
        where alias.duplicate_of_expense_id = e.id and alias.status = 'duplicate'
          and alias.capture_source = p_capture_source
          and alias.source_package is not distinct from v_package
      )
    order by abs(extract(epoch from (w.notification_posted_at - p_notification_posted_at))), w.created_at, w.id
    limit 1;
    if found then
      if v_match.expense_id is null then
        return jsonb_build_object('status', 'processing', 'claimId', v_match.id);
      end if;
      v_result := jsonb_build_object('status', 'duplicate',
        'reason', 'cross_source_wallet_capture', 'expenseId', v_match.expense_id,
        'category', v_match.category, 'amountCents', v_match.amount_cents, 'currency', v_match.currency);
      insert into public.wallet_capture_events (
        user_id, scope_key, household_id, is_portfolio, account_id, capture_source,
        source_package, source_app_label, exact_event_key, logical_fingerprint,
        merchant_key, transaction_type, amount_cents, currency, transaction_date,
        notification_posted_at, status, duplicate_of_expense_id, result,
        cross_source_match_eligible, requires_active_claim
      ) values (
        p_user_id, p_scope_key, p_household_id, p_is_portfolio, p_account_id, p_capture_source,
        v_package, p_source_app_label, p_exact_event_key, p_logical_fingerprint,
        v_merchant, p_transaction_type, p_amount_cents, v_currency, p_transaction_date,
        p_notification_posted_at, 'duplicate', v_match.expense_id, v_result, true, true
      ) returning id into v_claim_id;
      return v_result || jsonb_build_object('claimId', v_claim_id);
    end if;
  end if;

  if p_capture_source = 'android_notification_listener' then
    v_result := public.claim_android_wallet_capture_event_v2(
      p_user_id, p_scope_key, p_household_id, p_is_portfolio, p_account_id,
      p_capture_source, v_package, p_source_app_label, p_exact_event_key,
      p_logical_fingerprint, v_merchant, p_transaction_type, p_amount_cents,
      v_currency, p_transaction_date, coalesce(p_notification_posted_at, v_now),
      p_currency_evidence_raw, p_currency_evidence_type, p_currency_is_ambiguous
    );
    if v_result ->> 'status' in ('claimed', 'duplicate') then
      update public.wallet_capture_events
      set requires_active_claim = true,
          cross_source_match_eligible = case when v_result ->> 'status' = 'claimed'
            then v_eligible else cross_source_match_eligible end
      where id = (v_result ->> 'claimId')::uuid;
    end if;
    return v_result;
  end if;

  insert into public.wallet_capture_events (
    user_id, scope_key, household_id, is_portfolio, account_id, capture_source,
    source_package, source_app_label, exact_event_key, logical_fingerprint,
    merchant_key, transaction_type, amount_cents, currency, transaction_date,
    notification_posted_at, currency_evidence_raw, currency_evidence_type,
    currency_is_ambiguous, cross_source_match_eligible, requires_active_claim, status
  ) values (
    p_user_id, p_scope_key, p_household_id, p_is_portfolio, p_account_id, p_capture_source,
    v_package, p_source_app_label, p_exact_event_key, p_logical_fingerprint,
    v_merchant, p_transaction_type, p_amount_cents, v_currency, p_transaction_date,
    coalesce(p_notification_posted_at, v_now), p_currency_evidence_raw, p_currency_evidence_type,
    coalesce(p_currency_is_ambiguous, false), v_eligible, true, 'processing'
  ) returning id into v_claim_id;
  return jsonb_build_object('status', 'claimed', 'claimId', v_claim_id);
end;
$$;

revoke all on function public.claim_wallet_capture_event_v3(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz,text,text,boolean,boolean) from public, anon, authenticated;
grant execute on function public.claim_wallet_capture_event_v3(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz,text,text,boolean,boolean) to service_role;

-- Fence a stalled worker after its claim expires or is released. Without this,
-- a new source could take over and the old worker could later insert a second
-- expense under its different request key. No new expense payload is required.
create or replace function public.guard_wallet_capture_claim_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_claim public.wallet_capture_events%rowtype;
begin
  select * into v_claim from public.wallet_capture_events
  where user_id = new.user_id and exact_event_key = new.wallet_capture_idempotency_key
  order by (status in ('processing', 'saved', 'duplicate')) desc, created_at desc
  limit 1;
  if not found or not v_claim.requires_active_claim then return new; end if;

  perform pg_advisory_xact_lock(hashtext(concat_ws('|', v_claim.user_id::text,
    v_claim.scope_key, v_claim.transaction_type, v_claim.amount_cents::text))::bigint);
  select * into v_claim from public.wallet_capture_events where id = v_claim.id for update;
  if v_claim.status = 'saved' then return new; end if; -- exact-key unique index handles replay
  if v_claim.status <> 'processing' or v_claim.created_at < now() - interval '10 minutes' then
    raise exception using errcode = '40001', message = 'Wallet capture claim is no longer active';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_wallet_capture_claim_on_insert() from public, anon, authenticated;
create trigger wallet_capture_claim_on_insert
before insert on public.expenses
for each row
when (new.wallet_capture_idempotency_key is not null)
execute function public.guard_wallet_capture_claim_on_insert();
