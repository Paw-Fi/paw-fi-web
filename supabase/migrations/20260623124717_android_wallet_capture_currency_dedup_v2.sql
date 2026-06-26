alter table public.wallet_capture_events
  add column if not exists currency_evidence_raw text,
  add column if not exists currency_evidence_type text,
  add column if not exists currency_is_ambiguous boolean not null default false,
  add column if not exists source_class text;

create or replace function public.android_wallet_capture_source_class(
  p_package text,
  p_app_label text default null
)
returns text
language sql
immutable
as $$
  select case
    when public.is_android_wallet_source(p_package, p_app_label) then 'wallet'
    when lower(coalesce(p_package, '')) in (
      'com.google.android.apps.messaging',
      'com.samsung.android.messaging',
      'com.android.mms',
      'com.android.messaging'
    )
      or lower(coalesce(p_app_label, '')) ~ '\m(?:messages|messaging|sms|text messages)\M'
      then 'sms'
    when nullif(trim(coalesce(p_package, '')), '') is not null then 'bank'
    else 'unknown'
  end;
$$;

update public.wallet_capture_events
set source_class = public.android_wallet_capture_source_class(source_package, source_app_label)
where source_class is null;

create index if not exists idx_wallet_capture_events_v2_lookup
  on public.wallet_capture_events(
    user_id,
    scope_key,
    transaction_type,
    amount_cents,
    transaction_date,
    notification_posted_at,
    source_class
  )
  where status = 'saved';

create or replace function public.claim_android_wallet_capture_event_v2(
  p_user_id uuid,
  p_scope_key text,
  p_household_id uuid,
  p_is_portfolio boolean,
  p_account_id uuid,
  p_capture_source text,
  p_source_package text,
  p_source_app_label text,
  p_exact_event_key text,
  p_logical_fingerprint text,
  p_merchant_key text,
  p_transaction_type text,
  p_amount_cents integer,
  p_currency text,
  p_transaction_date date,
  p_notification_posted_at timestamptz,
  p_currency_evidence_raw text default null,
  p_currency_evidence_type text default null,
  p_currency_is_ambiguous boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_existing public.wallet_capture_events%rowtype;
  v_duplicate record;
  v_claim_id uuid;
  v_lock_key text;
  v_source_package text := nullif(lower(trim(coalesce(p_source_package, ''))), '');
  v_source_app_label text := nullif(trim(coalesce(p_source_app_label, '')), '');
  v_merchant_key text := nullif(trim(coalesce(p_merchant_key, '')), '');
  v_currency text := upper(trim(coalesce(p_currency, '')));
  v_currency_evidence_type text := nullif(trim(coalesce(p_currency_evidence_type, '')), '');
  v_source_class text;
  v_duplicate_usable boolean := false;
  v_can_correct_ambiguous_currency boolean := false;
  v_corrected_expense record;
begin
  if p_capture_source <> 'android_notification_listener' then
    raise exception 'claim_android_wallet_capture_event_v2 only supports android_notification_listener';
  end if;

  if p_user_id is null or nullif(trim(coalesce(p_scope_key, '')), '') is null then
    raise exception 'Missing wallet capture scope';
  end if;

  if nullif(trim(coalesce(p_exact_event_key, '')), '') is null then
    raise exception 'Missing wallet capture exact event key';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Invalid wallet capture amount';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid wallet capture currency';
  end if;

  v_source_class := public.android_wallet_capture_source_class(v_source_package, v_source_app_label);
  v_lock_key := concat_ws(
    '|',
    p_user_id::text,
    p_scope_key,
    p_transaction_type,
    p_amount_cents::text,
    p_transaction_date::text
  );

  perform pg_advisory_xact_lock(hashtext(v_lock_key)::bigint);

  select *
  into v_existing
  from public.wallet_capture_events
  where user_id = p_user_id
    and exact_event_key = p_exact_event_key
    and status in ('processing', 'saved', 'duplicate')
  order by created_at desc
  limit 1;

  if found then
    if v_existing.status = 'processing' and v_existing.created_at < v_now - interval '10 minutes' then
      update public.wallet_capture_events
      set status = 'failed',
          error_text = 'stale_processing_claim_released',
          updated_at = v_now
      where id = v_existing.id;
    elsif v_existing.status = 'processing' then
      return jsonb_build_object('status', 'processing', 'claimId', v_existing.id);
    else
      select e.id, e.category, e.amount_cents, e.currency
      into v_duplicate
      from public.expenses e
      where e.id = coalesce(v_existing.expense_id, v_existing.duplicate_of_expense_id)
      limit 1;

      if found then
        return jsonb_build_object(
          'status', 'duplicate',
          'reason', 'exact_event_key',
          'expenseId', v_duplicate.id,
          'category', v_duplicate.category,
          'amountCents', v_duplicate.amount_cents,
          'currency', v_duplicate.currency
        );
      end if;

      update public.wallet_capture_events
      set status = 'failed',
          error_text = 'exact_event_missing_expense',
          updated_at = v_now
      where id = v_existing.id;
    end if;
  end if;

  select w.id,
         w.status,
         w.currency as event_currency,
         w.currency_is_ambiguous as event_currency_is_ambiguous,
         e.id as expense_id,
         e.category,
         e.amount_cents,
         e.currency,
         e.account_id as expense_account_id,
         e.user_id as expense_user_id,
         e.household_id as expense_household_id,
         coalesce(a.is_system, false) as expense_account_is_system,
         lower(trim(coalesce(a.name, ''))) as expense_account_name
  into v_duplicate
  from public.wallet_capture_events w
  join public.expenses e
    on e.id = w.expense_id
    or e.wallet_capture_idempotency_key = w.exact_event_key
  left join public.accounts a
    on a.id = e.account_id
  where (
      w.status = 'saved'
      or (w.status = 'processing' and w.created_at < v_now - interval '10 minutes')
    )
    and w.user_id = p_user_id
    and w.scope_key = p_scope_key
    and (
      w.account_id is not distinct from p_account_id
      or w.account_id is null
      or p_account_id is null
    )
    and w.transaction_type = p_transaction_type
    and w.amount_cents = p_amount_cents
    and (
      w.currency = v_currency
      or w.currency_is_ambiguous = true
      or p_currency_is_ambiguous = true
    )
    and w.source_package is distinct from v_source_package
    and w.notification_posted_at between p_notification_posted_at - interval '5 minutes'
                                     and p_notification_posted_at + interval '5 minutes'
    and abs(extract(epoch from (w.notification_posted_at - p_notification_posted_at))) <= 120
    and abs(w.transaction_date - p_transaction_date) <= 1
    and (
      v_merchant_key is null
      or nullif(trim(coalesce(w.merchant_key, '')), '') is null
      or w.merchant_key = v_merchant_key
      or w.merchant_key like v_merchant_key || ' %'
      or v_merchant_key like w.merchant_key || ' %'
    )
    and (
      coalesce(w.source_class, public.android_wallet_capture_source_class(w.source_package, w.source_app_label))
        is distinct from v_source_class
      or public.is_android_wallet_source(w.source_package, w.source_app_label)
      or public.is_android_wallet_source(v_source_package, v_source_app_label)
    )
  order by
    case when w.currency = v_currency then 0 else 1 end,
    abs(extract(epoch from (w.notification_posted_at - p_notification_posted_at))) asc,
    w.created_at asc
  limit 1;

  if found then
    v_duplicate_usable := true;
    if v_duplicate.event_currency <> v_currency then
      v_can_correct_ambiguous_currency :=
        v_duplicate.event_currency_is_ambiguous = true
        and p_currency_is_ambiguous = false
        and (
          v_duplicate.expense_account_id is null
          or (
            v_duplicate.expense_account_is_system = true
            and v_duplicate.expense_account_name = 'spending'
          )
        );

      if v_can_correct_ambiguous_currency then
        update public.expenses e
        set currency = v_currency,
            account_id = coalesce(
              p_account_id,
              public.ensure_spending_account_for_currency(
                v_duplicate.expense_user_id,
                v_duplicate.expense_household_id,
                v_currency
              )
            ),
            updated_at = v_now
        where e.id = v_duplicate.expense_id
          and e.deleted_at is null
        returning e.id, e.category, e.amount_cents, e.currency
        into v_corrected_expense;

        if found then
          v_duplicate.expense_id := v_corrected_expense.id;
          v_duplicate.category := v_corrected_expense.category;
          v_duplicate.amount_cents := v_corrected_expense.amount_cents;
          v_duplicate.currency := v_corrected_expense.currency;
        else
          v_duplicate_usable := false;
        end if;

        update public.wallet_capture_events
        set currency = v_currency,
            account_id = coalesce(p_account_id, account_id),
            currency_evidence_raw = p_currency_evidence_raw,
            currency_evidence_type = v_currency_evidence_type,
            currency_is_ambiguous = false,
            updated_at = v_now
        where id = v_duplicate.id;
      else
        v_duplicate_usable := false;
      end if;
    end if;

    if v_duplicate_usable and v_duplicate.expense_id is not null then
      if v_duplicate.status = 'processing' then
        update public.wallet_capture_events
        set status = 'saved',
            expense_id = v_duplicate.expense_id,
            updated_at = v_now
        where id = v_duplicate.id;
      end if;

      insert into public.wallet_capture_events (
        user_id,
        scope_key,
        household_id,
        is_portfolio,
        account_id,
        capture_source,
        source_package,
        source_app_label,
        source_class,
        exact_event_key,
        logical_fingerprint,
        merchant_key,
        transaction_type,
        amount_cents,
        currency,
        currency_evidence_raw,
        currency_evidence_type,
        currency_is_ambiguous,
        transaction_date,
        notification_posted_at,
        status,
        duplicate_of_expense_id,
        result,
        created_at,
        updated_at
      ) values (
        p_user_id,
        p_scope_key,
        p_household_id,
        p_is_portfolio,
        p_account_id,
        p_capture_source,
        v_source_package,
        v_source_app_label,
        v_source_class,
        p_exact_event_key,
        p_logical_fingerprint,
        v_merchant_key,
        p_transaction_type,
        p_amount_cents,
        v_currency,
        p_currency_evidence_raw,
        v_currency_evidence_type,
        coalesce(p_currency_is_ambiguous, false),
        p_transaction_date,
        p_notification_posted_at,
        'duplicate',
        v_duplicate.expense_id,
        jsonb_build_object('reason', 'android_logical_duplicate_v2'),
        v_now,
        v_now
      )
      returning id into v_claim_id;

      return jsonb_build_object(
        'status', 'duplicate',
        'reason', 'android_logical_duplicate_v2',
        'claimId', v_claim_id,
        'expenseId', v_duplicate.expense_id,
        'category', v_duplicate.category,
        'amountCents', v_duplicate.amount_cents,
        'currency', v_duplicate.currency
      );
    end if;
  end if;

  select w.id
  into v_claim_id
  from public.wallet_capture_events w
  where w.status = 'processing'
    and w.created_at >= v_now - interval '10 minutes'
    and w.user_id = p_user_id
    and w.scope_key = p_scope_key
    and (
      w.account_id is not distinct from p_account_id
      or w.account_id is null
      or p_account_id is null
    )
    and w.transaction_type = p_transaction_type
    and w.amount_cents = p_amount_cents
    and (
      w.currency = v_currency
      or w.currency_is_ambiguous = true
      or p_currency_is_ambiguous = true
    )
    and w.source_package is distinct from v_source_package
    and w.notification_posted_at between p_notification_posted_at - interval '5 minutes'
                                     and p_notification_posted_at + interval '5 minutes'
    and abs(extract(epoch from (w.notification_posted_at - p_notification_posted_at))) <= 120
    and abs(w.transaction_date - p_transaction_date) <= 1
    and (
      v_merchant_key is null
      or nullif(trim(coalesce(w.merchant_key, '')), '') is null
      or w.merchant_key = v_merchant_key
      or w.merchant_key like v_merchant_key || ' %'
      or v_merchant_key like w.merchant_key || ' %'
    )
    and (
      coalesce(w.source_class, public.android_wallet_capture_source_class(w.source_package, w.source_app_label))
        is distinct from v_source_class
      or public.is_android_wallet_source(w.source_package, w.source_app_label)
      or public.is_android_wallet_source(v_source_package, v_source_app_label)
    )
  order by abs(extract(epoch from (w.notification_posted_at - p_notification_posted_at))) asc,
           w.created_at asc
  limit 1;

  if found then
    return jsonb_build_object('status', 'processing', 'claimId', v_claim_id);
  end if;

  insert into public.wallet_capture_events (
    user_id,
    scope_key,
    household_id,
    is_portfolio,
    account_id,
    capture_source,
    source_package,
    source_app_label,
    source_class,
    exact_event_key,
    logical_fingerprint,
    merchant_key,
    transaction_type,
    amount_cents,
    currency,
    currency_evidence_raw,
    currency_evidence_type,
    currency_is_ambiguous,
    transaction_date,
    notification_posted_at,
    status,
    created_at,
    updated_at
  ) values (
    p_user_id,
    p_scope_key,
    p_household_id,
    p_is_portfolio,
    p_account_id,
    p_capture_source,
    v_source_package,
    v_source_app_label,
    v_source_class,
    p_exact_event_key,
    p_logical_fingerprint,
    v_merchant_key,
    p_transaction_type,
    p_amount_cents,
    v_currency,
    p_currency_evidence_raw,
    v_currency_evidence_type,
    coalesce(p_currency_is_ambiguous, false),
    p_transaction_date,
    p_notification_posted_at,
    'processing',
    v_now,
    v_now
  )
  returning id into v_claim_id;

  return jsonb_build_object('status', 'claimed', 'claimId', v_claim_id);
end;
$$;

revoke all on function public.android_wallet_capture_source_class(text, text) from public, anon, authenticated;
revoke all on function public.claim_android_wallet_capture_event_v2(uuid, text, uuid, boolean, uuid, text, text, text, text, text, text, text, integer, text, date, timestamptz, text, text, boolean) from public, anon, authenticated;

grant execute on function public.claim_android_wallet_capture_event_v2(uuid, text, uuid, boolean, uuid, text, text, text, text, text, text, text, integer, text, date, timestamptz, text, text, boolean) to service_role;
