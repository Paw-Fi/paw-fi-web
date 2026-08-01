create or replace function public.reset_user_financial_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  removed_wallet_count integer := 0;
  deletable_account_ids uuid[] := '{}'::uuid[];
  v_deletable_expense_ids uuid[] := '{}'::uuid[];
  v_existing_deleting_user_ids text;
  v_plaid_connection_payload jsonb := '[]'::jsonb;
  v_plaid_connection_ids uuid[] := '{}'::uuid[];
  v_plaid_bank_account_ids uuid[] := '{}'::uuid[];
  v_supabase_url text;
  v_internal_service_secret text;
  v_service_role_key text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Not authenticated');
  end if;

  v_existing_deleting_user_ids := current_setting(
    'moneko.deleting_user_ids',
    true
  );

  perform set_config(
    'moneko.deleting_user_ids',
    case
      when current_user_id::text = any(
        string_to_array(coalesce(v_existing_deleting_user_ids, ''), ',')
      ) then coalesce(v_existing_deleting_user_ids, current_user_id::text)
      when nullif(v_existing_deleting_user_ids, '') is null then current_user_id::text
      else v_existing_deleting_user_ids || ',' || current_user_id::text
    end,
    true
  );

  perform 1
  from public.bank_connections bc
  where bc.user_id = current_user_id
    and bc.provider = 'plaid'
    and bc.household_id is null
    and bc.removed_at is null
  for update;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'connectionId', bc.id,
          'accessTokenEncrypted', coalesce(
            bc.access_token_encrypted,
            bc.plaid_access_token_encrypted,
            bct.token_encrypted
          ),
          'plaidAccessTokenEncrypted', bc.plaid_access_token_encrypted
        )
      ),
      '[]'::jsonb
    ),
    coalesce(array_agg(bc.id), '{}'::uuid[])
  into v_plaid_connection_payload, v_plaid_connection_ids
  from public.bank_connections bc
  left join public.bank_connection_tokens bct
    on bct.bank_connection_id = bc.id
    and bct.token_type = 'access'
  where bc.user_id = current_user_id
    and bc.provider = 'plaid'
    and bc.household_id is null
    and bc.removed_at is null;

  select coalesce(array_agg(ba.id), '{}'::uuid[])
  into v_plaid_bank_account_ids
  from public.bank_accounts ba
  join public.bank_connections account_connection
    on account_connection.id = ba.bank_connection_id
  where account_connection.user_id = current_user_id
    and account_connection.provider = 'plaid'
    and account_connection.household_id is null;

  insert into public.plaid_offboarding_jobs as existing (
    user_id,
    connection_id,
    access_token_encrypted,
    plaid_access_token_encrypted,
    reason
  )
  select
    current_user_id,
    (item ->> 'connectionId')::uuid,
    nullif(item ->> 'accessTokenEncrypted', ''),
    nullif(item ->> 'plaidAccessTokenEncrypted', ''),
    'reset_financial_data'
  from jsonb_array_elements(v_plaid_connection_payload) as item
  where nullif(item ->> 'connectionId', '') is not null
  on conflict (connection_id, reason)
    where connection_id is not null
      and status in ('pending', 'processing')
  do update set
    access_token_encrypted = coalesce(
      existing.access_token_encrypted,
      excluded.access_token_encrypted
    ),
    plaid_access_token_encrypted = coalesce(
      existing.plaid_access_token_encrypted,
      excluded.plaid_access_token_encrypted
    ),
    updated_at = now();

  if jsonb_array_length(v_plaid_connection_payload) > 0 then
    select decrypted_secret into v_supabase_url
    from vault.decrypted_secrets
    where name = 'supabase_url'
    limit 1;

    select decrypted_secret into v_internal_service_secret
    from vault.decrypted_secrets
    where name = 'internal_service_secret'
    limit 1;

    select decrypted_secret into v_service_role_key
    from vault.decrypted_secrets
    where name = 'service_role_key'
    limit 1;

    if v_supabase_url is not null
      and v_internal_service_secret is not null
      and v_service_role_key is not null then
      perform net.http_post(
        url := v_supabase_url || '/functions/v1/plaid-user-offboarding-cleanup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Moneko-Internal-Key', v_internal_service_secret,
          'X-Internal-Service-Secret', v_internal_service_secret,
          'Authorization', 'Bearer ' || v_service_role_key,
          'apikey', v_service_role_key
        ),
        body := jsonb_build_object('userId', current_user_id::text),
        timeout_milliseconds := 10000
      );
    end if;
  end if;

  if array_length(v_plaid_connection_ids, 1) is not null
    or array_length(v_plaid_bank_account_ids, 1) is not null then
    delete from public.bank_transaction_raw btr
    where btr.bank_connection_id = any(v_plaid_connection_ids)
      or btr.bank_account_id = any(v_plaid_bank_account_ids);
  end if;

  if array_length(v_plaid_connection_ids, 1) is not null then
    delete from public.bank_webhook_events bwe
    where bwe.bank_connection_id = any(v_plaid_connection_ids);
  end if;

  update public.bank_connections bc
  set
    status = 'disabled',
    item_status = 'removed',
    item_health_state = 'removed',
    relink_state = null,
    removed_at = now(),
    access_token_encrypted = null,
    plaid_access_token_encrypted = null,
    next_manual_refresh_eligible_at = null,
    error_code = null,
    error_message = null,
    updated_at = now()
  where bc.user_id = current_user_id
    and bc.provider = 'plaid'
    and bc.household_id is null
    and bc.removed_at is null;

  if array_length(v_plaid_bank_account_ids, 1) is not null then
    delete from public.bank_accounts ba
    where ba.id = any(v_plaid_bank_account_ids);
  end if;

  if array_length(v_plaid_connection_ids, 1) is not null then
    delete from public.bank_connection_tokens bct
    where bct.bank_connection_id = any(v_plaid_connection_ids);

    update public.bank_sync_jobs bsj
    set
      status = 'failed',
      processed_at = now(),
      processing_started_at = null,
      updated_at = now(),
      payload = jsonb_build_object(
        'removal_reason', 'reset_financial_data',
        'error', 'item_removed'
      )
    where bsj.bank_connection_id = any(v_plaid_connection_ids)
      and bsj.status in ('pending', 'processing');
  end if;

  perform 1
  from public.accounts account
  where account.user_id = current_user_id
    and account.household_id is null
  for update;

  select coalesce(array_agg(account.id), '{}'::uuid[])
  into deletable_account_ids
  from public.accounts account
  where account.user_id = current_user_id
    and account.household_id is null;

  perform 1
  from public.expenses expense
  where expense.user_id = current_user_id
  for update;

  select coalesce(array_agg(expense.id), '{}'::uuid[])
  into v_deletable_expense_ids
  from public.expenses expense
  where expense.user_id = current_user_id;

  if array_length(v_deletable_expense_ids, 1) is not null then
    delete from public.recurring_occurrences occurrence
    where occurrence.recurring_id = any(v_deletable_expense_ids);

    update public.recurring_occurrences occurrence
    set
      status = case
        when occurrence.was_skipped_before_confirmation then 'skipped'
        else 'pending'
      end,
      confirmation_source = case
        when occurrence.was_skipped_before_confirmation then 'user'
        else null
      end,
      actual_transaction_id = null,
      split_group_id = null,
      paid_date = null,
      amount_cents = null,
      currency = null,
      confirmed_at = null,
      confirmed_by_user_id = null,
      idempotency_key = null,
      request_fingerprint = null,
      updated_at = clock_timestamp()
    where occurrence.actual_transaction_id = any(v_deletable_expense_ids);

    update public.expenses preserved_actual
    set
      parent_recurring_id = null,
      scheduled_occurrence_date = null,
      recurring_confirmed_at = null,
      recurring_confirmation_source = null,
      updated_at = clock_timestamp()
    where preserved_actual.parent_recurring_id = any(v_deletable_expense_ids)
      and preserved_actual.id <> all(v_deletable_expense_ids);

    delete from public.expenses expense
    where expense.id = any(v_deletable_expense_ids)
      and expense.parent_recurring_id is not null;

    delete from public.expenses expense
    where expense.id = any(v_deletable_expense_ids)
      and expense.parent_recurring_id is null;
  end if;

  delete from public.ai_scenario_history scenario
  where scenario.user_id = current_user_id;

  delete from public.financial_health_profiles profile
  where profile.user_id = current_user_id;

  delete from public.daily_budgets daily_budget
  where daily_budget.contact_id in (
    select contact.id
    from public.user_contacts contact
    where contact.user_id = current_user_id
  );

  delete from public.budgets budget
  where budget.user_id = current_user_id;

  if array_length(deletable_account_ids, 1) is not null then
    delete from public.account_transfers transfer
    where transfer.created_by_user_id = current_user_id
       or transfer.from_account_id = any(deletable_account_ids)
       or transfer.to_account_id = any(deletable_account_ids);

    with removed_wallets as (
      delete from public.accounts account
      where account.id = any(deletable_account_ids)
      returning account.id
    )
    select count(*) into removed_wallet_count from removed_wallets;
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Financial data reset successfully',
    'primary_wallet_id', null,
    'removed_wallets', removed_wallet_count
  );
exception
  when others then
    return jsonb_build_object('success', false, 'message', SQLERRM);
end;
$$;

revoke all on function public.reset_user_financial_data()
  from public, anon, authenticated;
grant execute on function public.reset_user_financial_data() to authenticated;

comment on function public.reset_user_financial_data() is
  'Resets all user financial data with dependency-safe recurring cleanup, queues every live Plaid connection for provider removal, sanitizes local bank tokens, and deletes every user-owned wallet.';
