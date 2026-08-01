alter table public.idempotency_keys
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.idempotency_keys
set user_id = split_part(key, '|', 3)::uuid
where user_id is null
  and key like 'wallet_capture|%'
  and split_part(key, '|', 3) ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

update public.idempotency_keys
set user_id = split_part(key, ':', 2)::uuid
where user_id is null
  and key like 'wallet_capture:%'
  and split_part(key, ':', 2) ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

create index if not exists idempotency_keys_user_id_idx
  on public.idempotency_keys(user_id)
  where user_id is not null;

alter table public.users
  add column if not exists financial_data_reset_at timestamptz;

alter function public.reset_user_financial_data()
  rename to reset_user_financial_data_core_v3;

revoke all on function public.reset_user_financial_data_core_v3()
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

  select coalesce(array_agg(expense.id::text), '{}'::text[])
  into v_deletable_expense_id_texts
  from public.expenses expense
  where expense.user_id = current_user_id;

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

  v_result := public.reset_user_financial_data_core_v3();
  if coalesce((v_result ->> 'success')::boolean, false) is not true then
    raise warning 'Financial reset core failed for user %: %',
      current_user_id,
      coalesce(v_result ->> 'message', 'unknown error');
    perform set_config(
      'moneko.deleting_user_ids',
      coalesce(v_existing_deleting_user_ids, ''),
      true
    );
    return jsonb_build_object(
      'success', false,
      'message', 'Financial data reset failed',
      'code', 'RESET_FAILED'
    );
  end if;

  if array_length(v_deletable_expense_id_texts, 1) is not null then
    delete from public.notification_events event
    where event.payload ->> 'expense_id' = any(v_deletable_expense_id_texts);
  end if;

  delete from public.user_category_preferences preference
  where preference.user_id = current_user_id;

  delete from public.notification_capture_ai_attempts attempt
  where attempt.user_id = current_user_id;

  delete from public.notification_capture_classifications classification
  where classification.user_id = current_user_id;

  delete from public.wallet_capture_events capture
  where capture.user_id = current_user_id;

  delete from public.account_transfers transfer
  where transfer.created_by_user_id = current_user_id;

  delete from public.idempotency_keys idempotency
  where idempotency.user_id = current_user_id;

  delete from public.plaid_link_update_sessions session
  where session.user_id = current_user_id;

  if array_length(v_plaid_connection_ids, 1) is not null then
    delete from public.plaid_sync_events event
    where event.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_sync_audit audit
    where audit.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_sync_locks lock
    where lock.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_sync_jobs job
    where job.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_connection_tokens token
    where token.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_accounts account
    where account.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_transaction_raw transaction_raw
    where transaction_raw.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_webhook_events webhook
    where webhook.bank_connection_id = any(v_plaid_connection_ids)
       or (
         array_length(v_plaid_provider_item_ids, 1) is not null
         and webhook.provider = 'plaid'
         and webhook.provider_item_id = any(v_plaid_provider_item_ids)
       );

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

  delete from storage.objects object
  where (
      object.bucket_id = 'expense-receipts'
      and object.name like 'receipts/' || current_user_id::text || '/%'
    )
    or (
      object.bucket_id = 'public'
      and (
        object.name like current_user_id::text || '/wallet-logos/%'
        or object.name like current_user_id::text || '/pocket-logos/%'
      )
    );

  update public.users app_user
  set financial_data_reset_at = clock_timestamp()
  where app_user.id = current_user_id;

  perform set_config(
    'moneko.deleting_user_ids',
    coalesce(v_existing_deleting_user_ids, ''),
    true
  );

  return v_result || jsonb_build_object(
    'storage_metadata_cleared', true,
    'main_page_artifacts_cleared', true,
    'financial_data_reset_at', (
      select app_user.financial_data_reset_at
      from public.users app_user
      where app_user.id = current_user_id
    )
  );
exception
  when others then
    raise warning 'Financial reset follow-up failed for user %: %',
      current_user_id,
      sqlerrm;
    perform set_config(
      'moneko.deleting_user_ids',
      coalesce(v_existing_deleting_user_ids, ''),
      true
    );
    return jsonb_build_object(
      'success', false,
      'message', 'Financial data reset failed',
      'code', 'RESET_FAILED'
    );
end;
$$;

revoke all on function public.reset_user_financial_data()
  from public, anon, authenticated;
grant execute on function public.reset_user_financial_data() to authenticated;

comment on function public.reset_user_financial_data() is
  'Resets user-owned main-page financial data, dependent notifications and learned categorization, personal wallet and Plaid synchronization artifacts, and user-owned receipt/logo storage metadata.';
