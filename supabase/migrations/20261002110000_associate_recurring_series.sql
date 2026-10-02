-- Explicit domain continuity: never infer series/payment identity from labels,
-- amounts or cadence. The canonical series and confirmed payment IDs survive.
create table public.recurring_series_associations (
  replacement_recurring_id uuid primary key references public.expenses(id) on delete cascade,
  canonical_recurring_id uuid not null references public.expenses(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  household_id uuid,
  canonical_idempotency_key text,
  replacement_idempotency_key text not null,
  request_fingerprint text not null,
  payment_associations jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  check (replacement_recurring_id <> canonical_recurring_id)
);
alter table public.recurring_series_associations enable row level security;
revoke all on table public.recurring_series_associations from public, anon, authenticated;
grant select, insert, delete on table public.recurring_series_associations to service_role;
create policy recurring_series_associations_service_only on public.recurring_series_associations
  for all to service_role using (true) with check (true);

create or replace function public.associate_recurring_series(
  p_actor_user_id uuid, p_canonical_recurring_id uuid, p_replacement_recurring_id uuid,
  p_payment_associations jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_canonical public.expenses%rowtype;
  v_replacement public.expenses%rowtype;
  v_import public.expenses%rowtype;
  v_actual public.expenses%rowtype;
  v_association public.recurring_series_associations%rowtype;
  v_pair record;
  v_payments jsonb;
  v_import_ids uuid[];
  v_actual_ids uuid[];
  v_fingerprint text;
  v_provider text;
  v_bank_id uuid;
  v_aliases jsonb;
  v_result jsonb;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' or p_actor_user_id is null then
    raise exception 'ASSOCIATION_UNAUTHORIZED';
  end if;
  if p_canonical_recurring_id is null or p_replacement_recurring_id is null
    or p_canonical_recurring_id = p_replacement_recurring_id
    or jsonb_typeof(coalesce(p_payment_associations, '[]')) <> 'array'
    or jsonb_array_length(coalesce(p_payment_associations, '[]')) > 1000 then
    raise exception 'ASSOCIATION_INVALID_INPUT';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('importedTransactionId', x."importedTransactionId",
    'canonicalTransactionId', x."canonicalTransactionId") order by x."importedTransactionId"), '[]'),
    coalesce(array_agg(x."importedTransactionId"), '{}'::uuid[]),
    coalesce(array_agg(x."canonicalTransactionId"), '{}'::uuid[])
  into v_payments, v_import_ids, v_actual_ids
  from jsonb_to_recordset(coalesce(p_payment_associations, '[]'))
    as x("importedTransactionId" uuid, "canonicalTransactionId" uuid);
  if array_position(v_import_ids, null) is not null or array_position(v_actual_ids, null) is not null
    or cardinality(v_import_ids) <> (select count(distinct x) from unnest(v_import_ids) x)
    or cardinality(v_actual_ids) <> (select count(distinct x) from unnest(v_actual_ids) x)
    or v_import_ids && v_actual_ids then raise exception 'ASSOCIATION_INVALID_INPUT'; end if;
  v_fingerprint := md5(jsonb_build_object('canonical', p_canonical_recurring_id,
    'replacement', p_replacement_recurring_id, 'payments', v_payments)::text);

  -- Same template-first, UUID-ordered lock boundary as sync and confirmation.
  perform e.id from public.expenses e
    where e.id in (p_canonical_recurring_id, p_replacement_recurring_id) order by e.id for update;
  select * into v_canonical from public.expenses where id = p_canonical_recurring_id;
  select * into v_replacement from public.expenses where id = p_replacement_recurring_id;
  if v_canonical.id is null or v_replacement.id is null then raise exception 'ASSOCIATION_NOT_FOUND'; end if;
  if v_canonical.user_id is distinct from v_replacement.user_id
    or v_canonical.household_id is distinct from v_replacement.household_id
    or v_canonical.privacy_scope is distinct from v_replacement.privacy_scope then
    raise exception 'ASSOCIATION_SCOPE_MISMATCH';
  end if;
  if v_canonical.household_id is null then
    if v_canonical.user_id is distinct from p_actor_user_id then raise exception 'ASSOCIATION_UNAUTHORIZED'; end if;
  elsif not exists (select 1 from public.household_members m
    where m.household_id = v_canonical.household_id and m.user_id = p_actor_user_id and m.role in ('owner', 'admin'))
    or (v_canonical.user_id is distinct from p_actor_user_id and v_canonical.privacy_scope::text is distinct from 'full') then
    raise exception 'ASSOCIATION_UNAUTHORIZED';
  end if;
  select * into v_association from public.recurring_series_associations
    where replacement_recurring_id = p_replacement_recurring_id;
  if found then
    if v_association.canonical_recurring_id <> p_canonical_recurring_id
      or v_association.request_fingerprint <> v_fingerprint
      or v_association.payment_associations is distinct from v_payments then raise exception 'ASSOCIATION_RETRY_CONFLICT'; end if;
    return v_association.result || jsonb_build_object('duplicate', true);
  end if;
  if v_canonical.deleted_at is not null or v_replacement.deleted_at is not null
    or v_canonical.is_recurring is not true or v_replacement.is_recurring is not true
    or v_canonical.provider is not null or v_replacement.provider is not null
    or coalesce(v_canonical.provider_fields ->> 'source', '') not in ('plaid_recurring_template', 'bank_recurring_template')
    or coalesce(v_replacement.provider_fields ->> 'source', '') not in ('plaid_recurring_template', 'bank_recurring_template') then
    raise exception 'ASSOCIATION_INVALID_SERIES';
  end if;
  if v_canonical.currency is distinct from v_replacement.currency
    or v_canonical.type is distinct from v_replacement.type then raise exception 'ASSOCIATION_SCOPE_MISMATCH'; end if;
  if v_canonical.account_id is null or v_canonical.account_id is distinct from v_replacement.account_id then
    raise exception 'ASSOCIATION_WALLET_MISMATCH';
  end if;
  v_provider := coalesce(nullif(v_replacement.provider_fields ->> 'provider', ''),
    case when v_replacement.provider_fields ->> 'source' = 'plaid_recurring_template' then 'plaid' end);
  if v_provider is null or v_provider is distinct from coalesce(nullif(v_canonical.provider_fields ->> 'provider', ''),
    case when v_canonical.provider_fields ->> 'source' = 'plaid_recurring_template' then 'plaid' end) then
    raise exception 'ASSOCIATION_SCOPE_MISMATCH';
  end if;
  v_bank_id := nullif(v_replacement.provider_fields ->> 'bank_account_id', '')::uuid;
  if not exists (select 1 from public.bank_accounts b join public.bank_connections bc on bc.id = b.bank_connection_id
    where b.id = v_bank_id and b.user_id = v_canonical.user_id and bc.user_id = v_canonical.user_id
      and b.provider = v_provider and bc.provider = v_provider and b.currency = v_canonical.currency
      and coalesce(b.status, 'active') = 'active' and bc.removed_at is null
      and bc.status is distinct from 'disabled' and coalesce(bc.item_status, '') not in ('removed', 'pending_removal')
      and bc.household_id is not distinct from v_canonical.household_id) then
    raise exception 'ASSOCIATION_SCOPE_MISMATCH';
  end if;
  if not exists (select 1 from public.accounts a where a.id = v_canonical.account_id and a.is_archived is false
    and a.currency = v_canonical.currency and a.household_id is not distinct from v_canonical.household_id
    and (v_canonical.household_id is not null or a.user_id = v_canonical.user_id)
    and a.linked_bank_account_id = v_bank_id) then raise exception 'ASSOCIATION_WALLET_MISMATCH'; end if;
  if exists (select 1 from public.bank_accounts b join public.bank_connections bc on bc.id = b.bank_connection_id
    where b.id::text = v_canonical.provider_fields ->> 'bank_account_id' and bc.removed_at is null
      and coalesce(b.status, 'active') = 'active' and bc.status is distinct from 'disabled'
      and coalesce(bc.item_status, '') not in ('removed', 'pending_removal')) then
    raise exception 'ASSOCIATION_SOURCE_CONNECTED';
  end if;
  if nullif(v_replacement.idempotency_key, '') is null or coalesce(v_replacement.user_overrides, '{}') <> '{}'::jsonb
    or v_replacement.split_group_id is not null
    or exists (select 1 from public.recurring_occurrences o where o.recurring_id = v_replacement.id
      and (o.status <> 'confirmed' or o.confirmation_source is distinct from 'system'))
    or exists (select 1 from public.expenses e where e.parent_recurring_id = v_replacement.id and e.deleted_at is null
      and not (e.id = any(v_import_ids))
      and (e.provider is distinct from v_provider or e.split_group_id is not null or coalesce(e.user_overrides, '{}') <> '{}'::jsonb)) then
    raise exception 'ASSOCIATION_REPLACEMENT_MODIFIED';
  end if;
  perform e.id from public.expenses e where e.id = any(v_import_ids || v_actual_ids) order by e.id for update;
  for v_pair in select * from jsonb_to_recordset(v_payments) as x("importedTransactionId" uuid, "canonicalTransactionId" uuid) loop
    select * into v_import from public.expenses where id = v_pair."importedTransactionId";
    select * into v_actual from public.expenses where id = v_pair."canonicalTransactionId";
    if v_import.id is null or v_actual.id is null or v_import.deleted_at is not null or v_actual.deleted_at is not null
      or v_import.is_recurring is not false or v_actual.is_recurring is not false
      or v_import.user_id is distinct from v_canonical.user_id or v_actual.user_id is distinct from v_canonical.user_id
      or v_import.household_id is distinct from v_canonical.household_id or v_actual.household_id is distinct from v_canonical.household_id
      or v_import.privacy_scope is distinct from v_canonical.privacy_scope or v_actual.privacy_scope is distinct from v_canonical.privacy_scope
      or v_import.currency is distinct from v_canonical.currency or v_actual.currency is distinct from v_canonical.currency
      or v_import.type is distinct from v_canonical.type or v_actual.type is distinct from v_canonical.type
      or v_import.account_id is distinct from v_canonical.account_id or v_actual.account_id is distinct from v_canonical.account_id
      or v_import.provider is distinct from v_provider or v_import.bank_account_id is distinct from v_bank_id
      or v_import.provider_transaction_id is null or v_import.amount_cents <= 0
      or (v_import.parent_recurring_id is not null and v_import.parent_recurring_id <> v_replacement.id)
      or v_actual.parent_recurring_id is distinct from v_canonical.id
      or (v_actual.provider is not null and (v_actual.provider <> v_provider or v_actual.bank_account_id is not null))
      or v_import.split_group_id is not null or coalesce(v_import.user_overrides, '{}') <> '{}'::jsonb
      or (v_actual.split_group_id is not null and (v_actual.amount_cents,v_actual.date,v_actual.account_id)
        is distinct from (v_import.amount_cents,v_import.date,v_import.account_id))
      or not exists (select 1 from public.recurring_occurrences o where o.recurring_id = v_canonical.id
        and o.actual_transaction_id = v_actual.id and o.status = 'confirmed'
        and o.scheduled_occurrence_date = v_actual.scheduled_occurrence_date) then
      raise exception 'ASSOCIATION_PAYMENT_CONFLICT';
    end if;
  end loop;
  v_aliases := case when jsonb_typeof(v_replacement.provider_fields -> 'transaction_ids') = 'array'
    then v_replacement.provider_fields -> 'transaction_ids' else '[]'::jsonb end
    || case when jsonb_typeof(v_replacement.recurrence_rule #> '{provider_hint,transaction_ids}') = 'array'
    then v_replacement.recurrence_rule #> '{provider_hint,transaction_ids}' else '[]'::jsonb end;
  -- A confirmed series association is not permission to pick a payment for an
  -- already confirmed manual cycle. Every such collision needs an explicit pair.
  begin
    if exists (select 1 from public.expenses e join public.recurring_occurrences o on o.recurring_id = v_canonical.id
      and o.scheduled_occurrence_date = case when e.id = any(v_import_ids) then null
        else public.bank_recurring_cycle_date_v1(v_canonical.recurrence_rule, e.date) end
      join public.expenses a on a.id = o.actual_transaction_id
      where e.user_id = v_canonical.user_id and e.bank_account_id = v_bank_id and e.provider = v_provider
        and e.deleted_at is null and e.is_recurring is false and not (e.id = any(v_import_ids))
        and (e.parent_recurring_id = v_replacement.id or v_aliases ? e.provider_transaction_id
          or v_aliases ? e.provider_pending_transaction_id or v_aliases ? e.provider_posted_from_pending_transaction_id)
        and o.status = 'confirmed' and not (a.id = any(v_actual_ids))
        and (a.provider is null or a.bank_account_id is distinct from v_bank_id)) then
      raise exception 'ASSOCIATION_PAYMENT_REVIEW_REQUIRED';
    end if;
  exception when raise_exception then
    if sqlerrm = 'OCCURRENCE_AMBIGUOUS_BANK_CYCLE' then raise exception 'ASSOCIATION_PAYMENT_REVIEW_REQUIRED'; end if;
    raise;
  end;

  delete from public.recurring_occurrences where recurring_id = v_replacement.id;
  update public.expenses set parent_recurring_id = null, scheduled_occurrence_date = null,
    recurring_confirmed_at = null, recurring_confirmation_source = null, updated_at = clock_timestamp()
    where parent_recurring_id = v_replacement.id and deleted_at is null;
  for v_pair in select * from jsonb_to_recordset(v_payments) as x("importedTransactionId" uuid, "canonicalTransactionId" uuid) loop
    select * into v_import from public.expenses where id = v_pair."importedTransactionId";
    update public.expenses set provider_transaction_id = null, deleted_at = clock_timestamp(),
      deleted_reason = 'recurring_reconciled', updated_at = clock_timestamp() where id = v_import.id;
    update public.expenses set provider = v_provider, bank_account_id = v_bank_id,
      provider_transaction_id = v_import.provider_transaction_id,
      provider_pending_transaction_id = v_import.provider_pending_transaction_id,
      provider_posted_from_pending_transaction_id = v_import.provider_posted_from_pending_transaction_id,
      provider_pending = v_import.provider_pending, raw_provider_payload = v_import.raw_provider_payload,
      provider_fields = coalesce(v_import.provider_fields, '{}') - 'recurring_reconciliation',
      date = case when coalesce(user_overrides, '{}') ? 'date' then date else v_import.date end,
      amount_cents = case when coalesce(user_overrides, '{}') ? 'amount_cents' then amount_cents else v_import.amount_cents end,
      analytics_is_final = true, updated_at = clock_timestamp() where id = v_pair."canonicalTransactionId";
    update public.recurring_occurrences o set paid_date = a.date, amount_cents = a.amount_cents,
      currency = a.currency, updated_at = clock_timestamp() from public.expenses a
      where o.actual_transaction_id = a.id and a.id = v_pair."canonicalTransactionId";
  end loop;
  -- The new provider discovery key now resolves to the original domain ID.
  update public.expenses set idempotency_key = 'associated-recurring:' || id::text,
    deleted_at = clock_timestamp(), deleted_reason = 'recurring_series_associated', updated_at = clock_timestamp()
    where id = v_replacement.id;
  update public.expenses set idempotency_key = v_replacement.idempotency_key,
    provider_fields = v_replacement.provider_fields || case when v_canonical.provider_fields ? 'template_fields'
      then jsonb_build_object('template_fields', v_canonical.provider_fields -> 'template_fields') else '{}'::jsonb end,
    recurrence_rule = case when v_replacement.recurrence_rule ? 'provider_hint'
      then jsonb_set(v_canonical.recurrence_rule, '{provider_hint}', v_replacement.recurrence_rule -> 'provider_hint', true)
      else v_canonical.recurrence_rule end, updated_at = clock_timestamp() where id = v_canonical.id;
  if v_provider = 'plaid' then
    perform public.reconcile_bank_recurring_occurrences_v1(v_canonical.user_id, array[v_canonical.id], array[v_bank_id]);
  end if;
  delete from public.recurring_transaction_reminders_sent where expense_id = v_replacement.id;
  delete from public.notification_events where event_type = 'recurring_reminder' and is_sent is false
    and payload ->> 'expense_id' = v_replacement.id::text;
  v_result := jsonb_build_object('canonicalRecurringId', v_canonical.id, 'replacementRecurringId', v_replacement.id,
    'canonicalTransactionIds', to_jsonb(v_actual_ids), 'retiredTransactionIds', to_jsonb(v_import_ids), 'duplicate', false);
  insert into public.recurring_series_associations(replacement_recurring_id,canonical_recurring_id,
    owner_user_id,actor_user_id,household_id,canonical_idempotency_key,replacement_idempotency_key,
    request_fingerprint,payment_associations,result)
  values (v_replacement.id,v_canonical.id,v_canonical.user_id,p_actor_user_id,v_canonical.household_id,
    v_canonical.idempotency_key,v_replacement.idempotency_key,v_fingerprint,v_payments,v_result);
  return v_result;
end;
$$;
revoke all on function public.associate_recurring_series(uuid,uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.associate_recurring_series(uuid,uuid,uuid,jsonb) to service_role;

-- A provider writer holding a stale pre-association snapshot cannot resurrect
-- the retired replacement. Its next read will find the canonical discovery key.
create or replace function public.protect_associated_recurring_series()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is null and exists (select 1 from public.recurring_series_associations a
    where a.replacement_recurring_id = old.id) then raise exception 'ASSOCIATION_REPLACEMENT_RETIRED'; end if;
  return new;
end;
$$;
revoke all on function public.protect_associated_recurring_series() from public, anon, authenticated;
create trigger protect_associated_recurring_series before update on public.expenses
  for each row when (old.is_recurring is true) execute function public.protect_associated_recurring_series();
notify pgrst, 'reload schema';
