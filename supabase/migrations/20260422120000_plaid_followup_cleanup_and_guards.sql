create extension if not exists pg_net;

with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by user_id, duplicate_group_key
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rank_in_group
  from public.bank_connections
  where duplicate_group_key is not null
    and removed_at is null
)
update public.bank_connections bc
set duplicate_group_key = null,
    updated_at = now()
from ranked_duplicates rd
where bc.id = rd.id
  and rd.rank_in_group > 1;

create unique index if not exists idx_bank_connections_user_duplicate_group_key
  on public.bank_connections (user_id, duplicate_group_key)
  where duplicate_group_key is not null and removed_at is null;

create or replace function public.delete_user_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  deleted_contacts_count int := 0;
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
    return jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  end if;

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

    if v_supabase_url is null
      or v_internal_service_secret is null
      or v_service_role_key is null then
      return jsonb_build_object(
        'success', false,
        'message', 'Plaid offboarding cleanup is not configured'
      );
    end if;

    perform net.http_post(
      url := v_supabase_url || '/functions/v1/plaid-user-offboarding-cleanup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Moneko-Internal-Key', v_internal_service_secret,
        'X-Internal-Service-Secret', v_internal_service_secret,
        'Authorization', 'Bearer ' || v_service_role_key,
        'apikey', v_service_role_key
      ),
      body := jsonb_build_object(
        'userId', current_user_id::text,
        'connections', v_plaid_connection_payload
      ),
      timeout_milliseconds := 10000
    );
  end if;

  v_existing_deleting_user_ids := current_setting(
    'moneko.deleting_user_ids',
    true
  );

  perform set_config(
    'moneko.deleting_user_ids',
    case
      when nullif(v_existing_deleting_user_ids, '') is null then current_user_id::text
      else v_existing_deleting_user_ids || ',' || current_user_id::text
    end,
    true
  );

  if array_length(v_plaid_connection_ids, 1) is not null then
    delete from public.bank_webhook_events bwe
    where bwe.bank_connection_id = any(v_plaid_connection_ids);

    delete from public.bank_transaction_raw btr
    where btr.bank_connection_id = any(v_plaid_connection_ids)
      or btr.bank_account_id = any(v_plaid_bank_account_ids);
  end if;

  delete from public.account_transfers t
  where t.created_by_user_id = current_user_id
     or exists (
       select 1
       from public.accounts a
       where a.user_id = current_user_id
         and (a.id = t.from_account_id or a.id = t.to_account_id)
    );

  delete from public.expenses e
  where e.user_id = current_user_id;

  update public.expenses e
  set
    account_id = null,
    updated_at = now()
  where exists (
    select 1
    from public.accounts a
    where a.user_id = current_user_id
      and a.id = e.account_id
  );

  with deleted_contacts as (
    delete from public.user_contacts
    where user_id = current_user_id
    returning id
  )
  select count(*) into deleted_contacts_count from deleted_contacts;

  delete from auth.users where id = current_user_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Account deleted successfully',
    'deleted_contacts', deleted_contacts_count,
    'scheduled_plaid_cleanup', jsonb_array_length(v_plaid_connection_payload) > 0
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
end;
$$;

comment on function public.delete_user_account() is
  'Deletes the authenticated user account, schedules Plaid item cleanup through an internal edge function, and removes lingering bank data that does not cascade cleanly.';
