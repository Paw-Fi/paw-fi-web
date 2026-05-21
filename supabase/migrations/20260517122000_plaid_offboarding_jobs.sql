-- Durable outbox for Plaid item removal during user offboarding.

create table if not exists public.plaid_offboarding_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  connection_id uuid,
  access_token_encrypted text,
  plaid_access_token_encrypted text,
  reason text not null default 'account_deletion',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 8 check (max_attempts > 0),
  next_attempt_at timestamptz,
  processing_started_at timestamptz,
  alerted_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists idx_plaid_offboarding_jobs_active_connection
  on public.plaid_offboarding_jobs(connection_id, reason)
  where connection_id is not null and status in ('pending', 'processing');

create index if not exists idx_plaid_offboarding_jobs_ready
  on public.plaid_offboarding_jobs(status, next_attempt_at, created_at);

alter table public.plaid_offboarding_jobs enable row level security;

drop policy if exists "Plaid offboarding jobs service role only" on public.plaid_offboarding_jobs;
create policy "Plaid offboarding jobs service role only"
  on public.plaid_offboarding_jobs
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.claim_pending_plaid_offboarding_jobs(
  p_batch_size int default 20
)
returns setof public.plaid_offboarding_jobs
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  with claimed as (
    select id
    from public.plaid_offboarding_jobs
    where (
        status = 'pending'
        and (next_attempt_at is null or next_attempt_at <= now())
      )
      or (
        status = 'processing'
        and processing_started_at is not null
        and processing_started_at < now() - interval '15 minutes'
      )
    order by coalesce(next_attempt_at, created_at), created_at
    limit p_batch_size
    for update skip locked
  )
  update public.plaid_offboarding_jobs job
  set
    status = 'processing',
    processing_started_at = now(),
    updated_at = now()
  from claimed
  where job.id = claimed.id
  returning job.*;
end;
$$;

revoke all on function public.claim_pending_plaid_offboarding_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_pending_plaid_offboarding_jobs(int) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'plaid-offboarding-cleanup') then
      perform cron.unschedule('plaid-offboarding-cleanup');
    end if;

    perform cron.schedule(
      'plaid-offboarding-cleanup',
      '*/15 * * * *',
      $job$
        select
          case
            when (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url' limit 1) is null
              or (select decrypted_secret from vault.decrypted_secrets where name = 'internal_service_secret' limit 1) is null
            then null
            else net.http_post(
              url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url' limit 1) || '/functions/v1/plaid-user-offboarding-cleanup',
              headers := jsonb_build_object(
                'X-Moneko-Internal-Key', (select decrypted_secret from vault.decrypted_secrets where name = 'internal_service_secret' limit 1),
                'X-Internal-Service-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'internal_service_secret' limit 1),
                'Content-Type', 'application/json'
              ) || case
                when (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1) is null
                then '{}'::jsonb
                else jsonb_build_object(
                  'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
                  'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
                )
              end,
              body := '{}'::jsonb
            )
          end;
      $job$
    );
  end if;
end $$;

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
    return jsonb_build_object('success', false, 'message', 'Not authenticated');
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
    'account_deletion'
  from jsonb_array_elements(v_plaid_connection_payload) as item
  where nullif(item ->> 'connectionId', '') is not null
  on conflict do nothing;

  select coalesce(array_agg(ba.id), '{}'::uuid[])
  into v_plaid_bank_account_ids
  from public.bank_accounts ba
  where ba.user_id = current_user_id
    and ba.provider = 'plaid';

  if jsonb_array_length(v_plaid_connection_payload) > 0 then
    select decrypted_secret into v_supabase_url from vault.decrypted_secrets where name = 'supabase_url' limit 1;
    select decrypted_secret into v_internal_service_secret from vault.decrypted_secrets where name = 'internal_service_secret' limit 1;
    select decrypted_secret into v_service_role_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;

    if v_supabase_url is not null and v_internal_service_secret is not null and v_service_role_key is not null then
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

  v_existing_deleting_user_ids := current_setting('moneko.deleting_user_ids', true);
  perform set_config(
    'moneko.deleting_user_ids',
    case
      when nullif(v_existing_deleting_user_ids, '') is null then current_user_id::text
      else v_existing_deleting_user_ids || ',' || current_user_id::text
    end,
    true
  );

  if array_length(v_plaid_connection_ids, 1) is not null then
    delete from public.bank_webhook_events bwe where bwe.bank_connection_id = any(v_plaid_connection_ids);
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

  delete from public.expenses e where e.user_id = current_user_id;

  update public.expenses e
  set account_id = null, updated_at = now()
  where exists (
    select 1
    from public.accounts a
    where a.user_id = current_user_id
      and a.id = e.account_id
  );

  with deleted_contacts as (
    delete from public.user_contacts where user_id = current_user_id returning id
  )
  select count(*) into deleted_contacts_count from deleted_contacts;

  delete from auth.users where id = current_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'User not found');
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Account deleted successfully',
    'deleted_contacts', deleted_contacts_count,
    'scheduled_plaid_cleanup', jsonb_array_length(v_plaid_connection_payload) > 0,
    'durable_plaid_cleanup', jsonb_array_length(v_plaid_connection_payload) > 0
  );
end;
$$;
