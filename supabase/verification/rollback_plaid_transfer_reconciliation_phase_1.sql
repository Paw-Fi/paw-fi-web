-- FUNCTION-ONLY ROLLBACK. Run only to reverse the Phase 1 reconciliation rewrite.
-- Never rerun 20260717120000_plaid_atomic_sync_and_review.sql: that historical
-- migration contains schema, index, trigger, privilege, and data changes.

set lock_timeout = '5s';
set statement_timeout = '2min';

create or replace function public.apply_plaid_sync_batch_v1(
  p_user_id uuid,
  p_bank_connection_id uuid,
  p_expected_cursor_generation integer,
  p_next_cursor text,
  p_expense_inserts jsonb,
  p_expense_updates jsonb,
  p_removed_provider_transaction_ids text[],
  p_removed_bank_account_ids uuid[],
  p_processed_bank_account_ids uuid[],
  p_lock_token uuid,
  p_audit_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.bank_connections%rowtype;
  v_now timestamptz := now();
  v_inserted integer := 0;
  v_updated integer := 0;
  v_removed integer := 0;
  v_inserted_rows jsonb := '[]'::jsonb;
  v_expected_inserts integer := 0;
  v_expected_updates integer := 0;
begin
  if jsonb_typeof(coalesce(p_expense_inserts, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_expense_updates, '[]'::jsonb)) <> 'array' then
    raise exception 'Plaid sync mutation payloads must be JSON arrays'
      using errcode = '22023';
  end if;
  v_expected_inserts := jsonb_array_length(coalesce(p_expense_inserts, '[]'::jsonb));
  v_expected_updates := jsonb_array_length(coalesce(p_expense_updates, '[]'::jsonb));

  select * into v_connection
  from public.bank_connections
  where id = p_bank_connection_id
    and user_id = p_user_id
    and provider = 'plaid'
    and removed_at is null
  for update;

  if v_connection.id is null then
    raise exception 'Plaid connection not found' using errcode = 'P0002';
  end if;
  if coalesce(v_connection.cursor_generation, 0) <> coalesce(p_expected_cursor_generation, 0) then
    raise exception 'Plaid cursor generation changed during sync' using errcode = '40001';
  end if;
  perform 1
  from public.bank_sync_locks
  where bank_connection_id = p_bank_connection_id
    and lock_token = p_lock_token
    and locked_until > v_now
  for update;
  if not found then
    raise exception 'Plaid sync lock lease was lost' using errcode = '40001';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_processed_bank_account_ids, '{}'::uuid[])) account_id
    where not exists (
      select 1 from public.bank_accounts ba
      where ba.id = account_id
        and ba.bank_connection_id = p_bank_connection_id
        and ba.user_id = p_user_id
        and ba.provider = 'plaid'
    )
  ) then
    raise exception 'Plaid batch contains an account outside the connection' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_removed_bank_account_ids, '{}'::uuid[])) account_id
    where not exists (
      select 1 from public.bank_accounts ba
      where ba.id = account_id
        and ba.bank_connection_id = p_bank_connection_id
        and ba.user_id = p_user_id
        and ba.provider = 'plaid'
    )
  ) then
    raise exception 'Plaid removal batch contains an account outside the connection' using errcode = '42501';
  end if;
  if exists (
    select 1
    from jsonb_populate_recordset(
      null::public.expenses,
      coalesce(p_expense_inserts, '[]'::jsonb)
        || coalesce(p_expense_updates, '[]'::jsonb)
    ) r
    where r.account_id is not null
      and not exists (
        select 1 from public.accounts a
        where a.id = r.account_id
          and a.linked_bank_account_id = r.bank_account_id
          and upper(a.currency) = upper(r.currency)
          and a.household_id is not distinct from r.household_id
          and (
            a.user_id = p_user_id
            or exists (
              select 1 from public.household_members hm
              where hm.household_id = a.household_id
                and hm.user_id = p_user_id
            )
          )
      )
  ) then
    raise exception 'Plaid batch contains an invalid linked wallet' using errcode = '42501';
  end if;
  if exists (
    select 1
    from jsonb_populate_recordset(
      null::public.expenses,
      coalesce(p_expense_inserts, '[]'::jsonb)
        || coalesce(p_expense_updates, '[]'::jsonb)
    ) r
    where r.household_id is not null
      and not exists (
        select 1 from public.household_members hm
        where hm.household_id = r.household_id
          and hm.user_id = p_user_id
      )
  ) then
    raise exception 'Plaid batch contains an unauthorized household' using errcode = '42501';
  end if;
  if exists (
    select 1
    from jsonb_populate_recordset(
      null::public.expenses,
      coalesce(p_expense_inserts, '[]'::jsonb)
        || coalesce(p_expense_updates, '[]'::jsonb)
    ) r
    where r.household_id is distinct from v_connection.household_id
  ) then
    raise exception 'Plaid batch does not match the connection scope' using errcode = '42501';
  end if;

  with inserted as (
    insert into public.expenses (
      id, user_id, bank_account_id, provider, provider_transaction_id,
      amount_cents, currency, date, type, category, raw_text, merchant,
      source, raw_provider_payload, is_recurring, recurrence_rule,
      household_id, account_id, contact_id, normalized_amount_cents,
      base_currency, fx_rate, provider_pfc_primary, provider_pfc_detailed,
      provider_pfc_confidence, provider_pfc_version,
      provider_transaction_code, provider_pending, analytics_class,
      analytics_direction, analytics_is_final,
      analytics_spending_multiplier, analytics_counts_toward_income,
      classification_source, classification_version, deleted_at,
      classification_review_state, classification_review_reason,
      deleted_reason, provider_deleted_at, provider_fields, user_overrides,
      sync_version, provider_pending_transaction_id,
      provider_posted_from_pending_transaction_id,
      provider_sync_cursor_generation
    )
    select
      coalesce(r.id, gen_random_uuid()), r.user_id, r.bank_account_id,
      r.provider, r.provider_transaction_id, r.amount_cents, r.currency,
      r.date, r.type, r.category, r.raw_text, r.merchant, r.source,
      r.raw_provider_payload, r.is_recurring, r.recurrence_rule,
      r.household_id, r.account_id, null,
      r.normalized_amount_cents, r.base_currency, r.fx_rate,
      r.provider_pfc_primary, r.provider_pfc_detailed,
      r.provider_pfc_confidence, r.provider_pfc_version,
      r.provider_transaction_code, r.provider_pending, r.analytics_class,
      r.analytics_direction, r.analytics_is_final,
      r.analytics_spending_multiplier, r.analytics_counts_toward_income,
      r.classification_source, r.classification_version, r.deleted_at,
      r.classification_review_state, r.classification_review_reason,
      r.deleted_reason, r.provider_deleted_at, r.provider_fields,
      r.user_overrides, r.sync_version, r.provider_pending_transaction_id,
      r.provider_posted_from_pending_transaction_id,
      r.provider_sync_cursor_generation
    from jsonb_populate_recordset(
      null::public.expenses,
      coalesce(p_expense_inserts, '[]'::jsonb)
    ) r
    where r.user_id = p_user_id
      and r.provider = 'plaid'
      and r.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
    returning id, provider_transaction_id, amount_cents, currency, date,
      type, category, raw_text, merchant, is_recurring, recurrence_rule,
      created_at, updated_at, bank_account_id, account_id, user_id,
      household_id, contact_id, analytics_class, classification_source,
      classification_review_state, classification_review_reason,
      provider_pfc_confidence
  )
  select count(*)::integer, coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb)
  into v_inserted, v_inserted_rows
  from inserted;
  if v_inserted <> v_expected_inserts then
    raise exception 'Plaid batch insert scope validation failed' using errcode = '42501';
  end if;

  with updated as (
    update public.expenses e
    set
      provider_transaction_id = r.provider_transaction_id,
      amount_cents = case when e.user_overrides ? 'amount_cents' then e.amount_cents else r.amount_cents end,
      currency = case when e.user_overrides ? 'currency' then e.currency else r.currency end,
      date = case when e.user_overrides ? 'date' then e.date else r.date end,
      type = case when e.user_overrides ? 'type' then e.type else r.type end,
      category = case when e.user_overrides ? 'category' then e.category else r.category end,
      raw_text = case when e.user_overrides ? 'raw_text' then e.raw_text else r.raw_text end,
      merchant = case when e.user_overrides ? 'merchant' then e.merchant else r.merchant end,
      source = case when e.user_overrides ? 'source' then e.source else r.source end,
      raw_provider_payload = r.raw_provider_payload,
      is_recurring = case when e.user_overrides ? 'is_recurring' then e.is_recurring else r.is_recurring end,
      recurrence_rule = case when e.user_overrides ? 'recurrence_rule' then e.recurrence_rule else r.recurrence_rule end,
      household_id = case when e.user_overrides ? 'household_id' then e.household_id else r.household_id end,
      account_id = case when e.user_overrides ? 'account_id' then e.account_id else r.account_id end,
      contact_id = e.contact_id,
      normalized_amount_cents = case
        when e.user_overrides ? 'amount_cents' or e.user_overrides ? 'currency'
          then e.normalized_amount_cents
        else r.normalized_amount_cents
      end,
      base_currency = case when e.user_overrides ? 'currency' then e.base_currency else r.base_currency end,
      fx_rate = case when e.user_overrides ? 'currency' then e.fx_rate else r.fx_rate end,
      provider_pfc_primary = r.provider_pfc_primary,
      provider_pfc_detailed = r.provider_pfc_detailed,
      provider_pfc_confidence = r.provider_pfc_confidence,
      provider_pfc_version = r.provider_pfc_version,
      provider_transaction_code = r.provider_transaction_code,
      provider_pending = r.provider_pending,
      analytics_class = case
        when e.classification_source = 'user_override' then e.analytics_class
        else r.analytics_class
      end,
      analytics_direction = case
        when e.classification_source = 'user_override' then e.analytics_direction
        else r.analytics_direction
      end,
      analytics_is_final = case
        when e.classification_source = 'user_override' then e.analytics_is_final
        else r.analytics_is_final
      end,
      analytics_spending_multiplier = case
        when e.classification_source = 'user_override' then e.analytics_spending_multiplier
        else r.analytics_spending_multiplier
      end,
      analytics_counts_toward_income = case
        when e.classification_source = 'user_override' then e.analytics_counts_toward_income
        else r.analytics_counts_toward_income
      end,
      classification_source = case
        when e.classification_source = 'user_override' then e.classification_source
        else r.classification_source
      end,
      classification_version = r.classification_version,
      classification_review_state = case
        when e.classification_source = 'user_override' then e.classification_review_state
        else r.classification_review_state
      end,
      classification_review_reason = case
        when e.classification_source = 'user_override' then e.classification_review_reason
        else r.classification_review_reason
      end,
      deleted_at = case when e.deleted_reason = 'user_deleted' then e.deleted_at else r.deleted_at end,
      deleted_reason = case when e.deleted_reason = 'user_deleted' then e.deleted_reason else r.deleted_reason end,
      provider_deleted_at = case
        when e.deleted_reason = 'user_deleted' then e.provider_deleted_at
        else r.provider_deleted_at
      end,
      provider_fields = r.provider_fields,
      user_overrides = e.user_overrides,
      sync_version = r.sync_version,
      provider_pending_transaction_id = r.provider_pending_transaction_id,
      provider_posted_from_pending_transaction_id = r.provider_posted_from_pending_transaction_id,
      provider_sync_cursor_generation = r.provider_sync_cursor_generation,
      updated_at = v_now
    from jsonb_populate_recordset(
      null::public.expenses,
      coalesce(p_expense_updates, '[]'::jsonb)
    ) r
    where e.id = r.id
      and e.user_id = p_user_id
      and e.provider = 'plaid'
      and e.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
      and r.user_id = p_user_id
      and r.provider = 'plaid'
      and r.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
    returning e.id
  )
  select count(*)::integer into v_updated from updated;
  if v_updated <> v_expected_updates then
    raise exception 'Plaid batch update target changed' using errcode = '40001';
  end if;

  with removed as (
    update public.expenses e
    set deleted_at = v_now,
      deleted_reason = 'provider_removed',
      provider_deleted_at = v_now,
      updated_at = v_now
    where e.user_id = p_user_id
      and e.provider = 'plaid'
      and e.bank_account_id = any(coalesce(p_removed_bank_account_ids, '{}'::uuid[]))
      and e.provider_transaction_id = any(coalesce(p_removed_provider_transaction_ids, '{}'::text[]))
      and e.deleted_at is null
    returning e.id
  )
  select count(*)::integer into v_removed from removed;

  update public.expenses e
  set classification_source = case
        when coalesce(e.provider_transaction_code, '') in (
          'atm', 'cash', 'cash advance', 'cashback', 'transfer', 'refund',
          'bank charge', 'late fee', 'membership fee', 'returned item fee',
          'adjustment', 'purchase'
        ) then 'plaid_transaction_code'
        else 'plaid_pfc_' || coalesce(e.provider_pfc_version, 'v2')
      end,
      classification_review_state = 'not_required',
      classification_review_reason = null,
      updated_at = v_now
  where e.user_id = p_user_id
    and e.provider = 'plaid'
    and e.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
    and e.classification_source <> 'user_override'
    and e.classification_review_reason = 'possible_transfer_match';

  with transfer_candidates as (
    select e.id
    from public.expenses e
    join public.expenses m
      on m.user_id = e.user_id
      and m.provider = 'plaid'
      and m.deleted_at is null
      and m.analytics_is_final
      and m.bank_account_id is distinct from e.bank_account_id
      and m.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
      and m.household_id is not distinct from v_connection.household_id
      and upper(coalesce(m.currency, '')) = upper(coalesce(e.currency, ''))
      and abs(m.amount_cents) = abs(e.amount_cents)
      and m.type is distinct from e.type
      and abs(m.date - e.date) <= 3
    where e.user_id = p_user_id
      and e.provider = 'plaid'
      and e.deleted_at is null
      and e.analytics_is_final
      and e.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
      and e.household_id is not distinct from v_connection.household_id
      and e.classification_source <> 'user_override'
    union
    select m.id
    from public.expenses e
    join public.expenses m
      on m.user_id = e.user_id
      and m.provider = 'plaid'
      and m.deleted_at is null
      and m.analytics_is_final
      and m.bank_account_id is distinct from e.bank_account_id
      and m.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
      and m.household_id is not distinct from v_connection.household_id
      and upper(coalesce(m.currency, '')) = upper(coalesce(e.currency, ''))
      and abs(m.amount_cents) = abs(e.amount_cents)
      and m.type is distinct from e.type
      and abs(m.date - e.date) <= 3
    where e.user_id = p_user_id
      and e.provider = 'plaid'
      and e.deleted_at is null
      and e.analytics_is_final
      and e.bank_account_id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
      and e.household_id is not distinct from v_connection.household_id
      and m.classification_source <> 'user_override'
  )
  update public.expenses e
  set analytics_class = 'unknown',
      analytics_direction = 'none',
      analytics_spending_multiplier = 0,
      analytics_counts_toward_income = false,
      classification_source = 'plaid_possible_transfer',
      classification_review_state = 'needs_review',
      classification_review_reason = 'possible_transfer_match',
      updated_at = v_now
  where e.id in (select id from transfer_candidates);

  update public.bank_accounts
  set last_synced_at = v_now
  where id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
    and bank_connection_id = p_bank_connection_id
    and user_id = p_user_id;

  update public.bank_connections
  set cursor = p_next_cursor,
    plaid_cursor = p_next_cursor,
    cursor_generation = coalesce(cursor_generation, 0) + 1,
    last_successful_sync_at = v_now,
    last_synced_at = v_now,
    status = 'active',
    item_status = case
      when item_status in (
        'pending_relink', 'newly_connected', 'initial_sync_in_progress',
        'reconnected', 'accounts_updated'
      ) then 'active'
      else coalesce(item_status, 'active')
    end,
    item_health_state = 'healthy',
    needs_resync = false,
    relink_state = case
      when relink_state = 'required' then null
      when relink_state = 'new_accounts_available' then 'new_accounts_available'
      else null
    end,
    error_code = null,
    error_message = null
  where id = p_bank_connection_id and user_id = p_user_id;

  if p_audit_id is not null then
    update public.bank_sync_audit
    set synced_accounts = cardinality(coalesce(p_processed_bank_account_ids, '{}'::uuid[])),
      inserted_transactions = v_inserted,
      updated_transactions = v_updated,
      status = 'succeeded',
      finished_at = v_now,
      error_message = null
    where id = p_audit_id and bank_connection_id = p_bank_connection_id;
  end if;

  insert into public.plaid_sync_events (
    bank_connection_id, bank_sync_audit_id, event_type, payload
  ) values (
    p_bank_connection_id,
    p_audit_id,
    'batch_applied',
    jsonb_build_object(
      'inserted', v_inserted,
      'updated', v_updated,
      'removed', v_removed,
      'accounts', cardinality(coalesce(p_processed_bank_account_ids, '{}'::uuid[])),
      'cursor_generation', coalesce(p_expected_cursor_generation, 0) + 1
    )
  );

  return jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'removed', v_removed,
    'accounts_processed', cardinality(coalesce(p_processed_bank_account_ids, '{}'::uuid[])),
    'inserted_records', v_inserted_rows,
    'cursor_generation', coalesce(p_expected_cursor_generation, 0) + 1
  );
end;
$$;

revoke all on function public.apply_plaid_sync_batch_v1(
  uuid,
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  text[],
  uuid[],
  uuid[],
  uuid,
  uuid
)
from public, anon, authenticated, service_role;

comment on function public.apply_plaid_sync_batch_v1(
  uuid,
  uuid,
  integer,
  text,
  jsonb,
  jsonb,
  text[],
  uuid[],
  uuid[],
  uuid,
  uuid
)
is 'Internal implementation owned by apply_plaid_sync_batch_v2; direct worker execution is revoked.';

reset statement_timeout;
reset lock_timeout;
