create or replace function public.reset_user_financial_data()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  primary_account_id uuid;
  removed_wallet_count integer := 0;
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

  select a.id
  into primary_account_id
  from public.accounts a
  where a.user_id = current_user_id
    and a.household_id is null
    and a.is_archived = false
  order by
    case when a.is_default then 0 else 1 end,
    case when a.is_system then 0 else 1 end,
    a.created_at asc
  limit 1;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'connectionId', bc.id,
          'accessTokenEncrypted', bc.access_token_encrypted,
          'plaidAccessTokenEncrypted', bc.plaid_access_token_encrypted
        )
      ),
      '[]'::jsonb
    ),
    coalesce(array_agg(bc.id), '{}'::uuid[])
  into v_plaid_connection_payload, v_plaid_connection_ids
  from public.bank_connections bc
  where bc.user_id = current_user_id
    and bc.provider = 'plaid'
    and bc.removed_at is null
    and bc.status in ('pending', 'active', 'needs_reauth', 'error');

  select coalesce(array_agg(ba.id), '{}'::uuid[])
  into v_plaid_bank_account_ids
  from public.bank_accounts ba
  where ba.user_id = current_user_id
    and ba.provider = 'plaid';

  insert into public.plaid_offboarding_jobs (
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
  on conflict do nothing;

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

  if array_length(v_plaid_connection_ids, 1) is not null then
    delete from public.bank_webhook_events bwe
    where bwe.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_transaction_raw btr
    where btr.bank_connection_id = any(v_plaid_connection_ids)
      or btr.bank_account_id = any(v_plaid_bank_account_ids);
  end if;

  update public.bank_connections bc
  set
    status = 'disabled',
    item_status = 'removed',
    item_health_state = 'removed',
    relink_state = null,
    removed_at = now(),
    next_manual_refresh_eligible_at = null,
    error_code = null,
    error_message = null,
    updated_at = now()
  where bc.user_id = current_user_id
    and bc.provider = 'plaid'
    and bc.removed_at is null;

  if array_length(v_plaid_connection_ids, 1) is not null then
    delete from public.bank_accounts ba
    where ba.id = any(v_plaid_bank_account_ids)
       or ba.bank_connection_id = any(v_plaid_connection_ids);

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

  delete from public.expenses e
  where e.user_id = current_user_id;

  delete from public.ai_scenario_history s
  where s.user_id = current_user_id;

  delete from public.financial_health_profiles p
  where p.user_id = current_user_id;

  delete from public.daily_budgets db
  where db.contact_id in (
    select uc.id
    from public.user_contacts uc
    where uc.user_id = current_user_id
  );

  delete from public.budgets b
  where b.user_id = current_user_id;

  if primary_account_id is not null then
    delete from public.account_transfers t
    where (t.from_account_id in (
            select a.id
            from public.accounts a
            where a.user_id = current_user_id
              and a.household_id is null
              and a.id <> primary_account_id
          ))
       or (t.to_account_id in (
            select a.id
            from public.accounts a
            where a.user_id = current_user_id
              and a.household_id is null
              and a.id <> primary_account_id
          ));

    with removed_wallets as (
      delete from public.accounts a
      where a.user_id = current_user_id
        and a.household_id is null
        and a.id <> primary_account_id
      returning a.id
    )
    select count(*) into removed_wallet_count from removed_wallets;

    update public.accounts a
    set opening_balance_cents = 0,
        is_archived = false,
        is_default = true,
        updated_at = now()
    where a.id = primary_account_id;

    update public.accounts a
    set is_default = false,
        updated_at = now()
    where a.user_id = current_user_id
      and a.household_id is null
      and a.id <> primary_account_id
      and a.is_default = true;
  else
    delete from public.account_transfers t
    where t.created_by_user_id = current_user_id
       or exists (
         select 1
         from public.accounts a
         where a.user_id = current_user_id
           and a.household_id is null
           and (a.id = t.from_account_id or a.id = t.to_account_id)
       );

    with removed_wallets as (
      delete from public.accounts a
      where a.user_id = current_user_id
        and a.household_id is null
      returning a.id
    )
    select count(*) into removed_wallet_count from removed_wallets;
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Financial data reset successfully',
    'primary_wallet_id', primary_account_id,
    'removed_wallets', removed_wallet_count
  );
exception
  when others then
    return jsonb_build_object('success', false, 'message', SQLERRM);
end;
$$;

grant execute on function public.reset_user_financial_data() to authenticated;

comment on function public.reset_user_financial_data() is
  'Resets the authenticated user financial footprint: expenses, budgets, insight history, and personal wallets while keeping one primary wallet.';
