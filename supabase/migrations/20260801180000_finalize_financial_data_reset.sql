create table if not exists public.financial_storage_cleanup_jobs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  removed_object_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.financial_storage_cleanup_jobs enable row level security;
revoke all on table public.financial_storage_cleanup_jobs
  from public, anon, authenticated;
grant select, insert, update on table public.financial_storage_cleanup_jobs
  to service_role;

create or replace function public.claim_financial_storage_cleanup_job(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean := false;
begin
  update public.financial_storage_cleanup_jobs job
  set
    status = 'processing',
    attempt_count = job.attempt_count + 1,
    last_error = null,
    updated_at = now()
  where job.user_id = p_user_id
    and job.status in ('pending', 'failed')
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_financial_storage_cleanup_job(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_financial_storage_cleanup_job(uuid)
  to service_role;

do $$
begin
  if to_regprocedure('public.perform_user_financial_data_reset()') is null then
    if to_regprocedure('public.reset_user_financial_data_core_v3()') is not null then
      alter function public.reset_user_financial_data_core_v3()
        rename to perform_user_financial_data_reset;
    else
      alter function public.reset_user_financial_data()
        rename to perform_user_financial_data_reset;
    end if;
  elsif to_regprocedure('public.reset_user_financial_data_core_v3()') is not null then
    drop function public.reset_user_financial_data_core_v3();
  end if;
end;
$$;

revoke all on function public.perform_user_financial_data_reset()
  from public, anon, authenticated;

create or replace function public.reset_user_financial_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  v_result jsonb;
  v_phase text := 'authenticate';
  v_existing_deleting_user_ids text;
  v_deletable_expense_id_texts text[] := '{}'::text[];
  v_plaid_connection_ids uuid[] := '{}'::uuid[];
  v_plaid_provider_item_ids text[] := '{}'::text[];
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Not authenticated');
  end if;

  v_existing_deleting_user_ids := current_setting(
    'moneko.deleting_user_ids',
    true
  );

  v_phase := 'capture_expense_ids';
  select coalesce(array_agg(expense.id::text), '{}'::text[])
  into v_deletable_expense_id_texts
  from public.expenses expense
  where expense.user_id = current_user_id;

  v_phase := 'capture_plaid_ids';
  select
    coalesce(array_agg(bc.id), '{}'::uuid[]),
    coalesce(
      array_agg(bc.provider_item_id) filter (
        where nullif(trim(bc.provider_item_id), '') is not null
      ),
      '{}'::text[]
    )
  into v_plaid_connection_ids, v_plaid_provider_item_ids
  from public.bank_connections bc
  where bc.user_id = current_user_id
    and bc.provider = 'plaid'
    and bc.household_id is null;

  v_phase := 'core_reset_v3';
  v_result := public.perform_user_financial_data_reset();
  if coalesce((v_result ->> 'success')::boolean, false) is not true then
    perform set_config(
      'moneko.deleting_user_ids',
      coalesce(v_existing_deleting_user_ids, ''),
      true
    );
    return jsonb_build_object(
      'success', false,
      'phase', v_phase,
      'sqlstate', null,
      'message', format(
        '[phase=%s] %s',
        v_phase,
        coalesce(v_result ->> 'message', 'Core reset failed')
      )
    );
  end if;

  v_phase := 'notification_events';
  if array_length(v_deletable_expense_id_texts, 1) is not null then
    delete from public.notification_events event
    where event.payload ->> 'expense_id' = any(v_deletable_expense_id_texts);
  end if;

  v_phase := 'category_preferences';
  delete from public.user_category_preferences preference
  where preference.user_id = current_user_id;

  if to_regclass('public.notification_capture_ai_attempts') is not null then
    v_phase := 'notification_capture_attempts';
    execute 'delete from public.notification_capture_ai_attempts where user_id = $1'
      using current_user_id;
  end if;

  if to_regclass('public.notification_capture_classifications') is not null then
    v_phase := 'notification_capture_classifications';
    execute 'delete from public.notification_capture_classifications where user_id = $1'
      using current_user_id;
  end if;

  if to_regclass('public.wallet_capture_events') is not null then
    v_phase := 'wallet_capture_events';
    execute 'delete from public.wallet_capture_events where user_id = $1'
      using current_user_id;
  end if;

  v_phase := 'account_transfers';
  delete from public.account_transfers transfer
  where transfer.created_by_user_id = current_user_id;

  v_phase := 'idempotency_keys';
  delete from public.idempotency_keys idempotency
  where idempotency.user_id = current_user_id;

  v_phase := 'plaid_link_update_sessions';
  delete from public.plaid_link_update_sessions session
  where session.user_id = current_user_id;

  if array_length(v_plaid_connection_ids, 1) is not null then
    v_phase := 'plaid_sync_events';
    delete from public.plaid_sync_events event
    where event.bank_connection_id = any(v_plaid_connection_ids);

    v_phase := 'bank_sync_audit';
    delete from public.bank_sync_audit audit
    where audit.bank_connection_id = any(v_plaid_connection_ids);

    v_phase := 'bank_sync_locks';
    delete from public.bank_sync_locks lock
    where lock.bank_connection_id = any(v_plaid_connection_ids);

    v_phase := 'bank_sync_jobs';
    delete from public.bank_sync_jobs job
    where job.bank_connection_id = any(v_plaid_connection_ids);

    v_phase := 'bank_connection_tokens';
    delete from public.bank_connection_tokens token
    where token.bank_connection_id = any(v_plaid_connection_ids);

    v_phase := 'bank_transaction_raw';
    delete from public.bank_transaction_raw transaction_raw
    where transaction_raw.bank_connection_id = any(v_plaid_connection_ids);

    v_phase := 'bank_webhook_events';
    delete from public.bank_webhook_events webhook
    where webhook.bank_connection_id = any(v_plaid_connection_ids)
       or (
         array_length(v_plaid_provider_item_ids, 1) is not null
         and webhook.provider = 'plaid'
         and webhook.provider_item_id = any(v_plaid_provider_item_ids)
       );

    v_phase := 'bank_accounts';
    delete from public.bank_accounts account
    where account.bank_connection_id = any(v_plaid_connection_ids);

    v_phase := 'sanitize_bank_connections';
    update public.bank_connections bc
    set
      status = 'disabled',
      item_status = 'removed',
      item_health_state = 'removed',
      relink_state = null,
      removed_at = coalesce(bc.removed_at, now()),
      access_token_encrypted = null,
      plaid_access_token_encrypted = null,
      next_manual_refresh_eligible_at = null,
      plaid_cursor = null,
      last_synced_at = null,
      error_code = null,
      error_message = null,
      metadata = '{}'::jsonb,
      updated_at = now()
    where bc.id = any(v_plaid_connection_ids);
  end if;

  v_phase := 'storage_cleanup_job';
  insert into public.financial_storage_cleanup_jobs as existing (
    user_id,
    status,
    attempt_count,
    removed_object_count,
    last_error,
    updated_at,
    completed_at
  ) values (
    current_user_id,
    'pending',
    0,
    0,
    null,
    now(),
    null
  )
  on conflict (user_id) do update set
    status = 'pending',
    removed_object_count = 0,
    last_error = null,
    updated_at = now(),
    completed_at = null;

  v_phase := 'storage_cleanup_dispatch';
  if exists (
    select 1 from vault.decrypted_secrets where name = 'supabase_url'
  ) and exists (
    select 1 from vault.decrypted_secrets where name = 'internal_service_secret'
  ) and exists (
    select 1 from vault.decrypted_secrets where name = 'service_role_key'
  ) then
    perform net.http_post(
      url := (
        select decrypted_secret || '/functions/v1/reset-financial-storage-cleanup'
        from vault.decrypted_secrets
        where name = 'supabase_url'
        limit 1
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Moneko-Internal-Key', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'internal_service_secret'
          limit 1
        ),
        'X-Internal-Service-Secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'internal_service_secret'
          limit 1
        ),
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'service_role_key'
          limit 1
        ),
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'service_role_key'
          limit 1
        )
      ),
      body := jsonb_build_object('userId', current_user_id::text),
      timeout_milliseconds := 10000
    );
  end if;

  v_phase := 'reset_marker';
  update public.users app_user
  set financial_data_reset_at = clock_timestamp()
  where app_user.id = current_user_id;

  perform set_config(
    'moneko.deleting_user_ids',
    coalesce(v_existing_deleting_user_ids, ''),
    true
  );

  return v_result || jsonb_build_object(
    'storage_cleanup_queued', true,
    'main_page_artifacts_cleared', true,
    'financial_data_reset_at', (
      select app_user.financial_data_reset_at
      from public.users app_user
      where app_user.id = current_user_id
    )
  );
exception
  when others then
    perform set_config(
      'moneko.deleting_user_ids',
      coalesce(v_existing_deleting_user_ids, ''),
      true
    );
    return jsonb_build_object(
      'success', false,
      'phase', v_phase,
      'sqlstate', SQLSTATE,
      'message', format(
        '[phase=%s sqlstate=%s] %s',
        v_phase,
        SQLSTATE,
        SQLERRM
      )
    );
end;
$$;

revoke all on function public.reset_user_financial_data()
  from public, anon, authenticated;
grant execute on function public.reset_user_financial_data() to authenticated;

comment on function public.reset_user_financial_data() is
  'Resets user financial data and queues user-owned receipt and logo deletion through the Storage API.';
