set lock_timeout = '5s';
set statement_timeout = '10min';

alter table public.plaid_offboarding_jobs
  add column if not exists link_completion_session_id uuid
    references public.plaid_link_update_sessions(id) on delete set null,
  add column if not exists link_completion_nonce text;

create index if not exists idx_plaid_offboarding_exchange_session
  on public.plaid_offboarding_jobs(link_completion_session_id)
  where reason = 'orphan_exchange_escrow';

create or replace function public.complete_plaid_link_exchange_v1(
  p_user_id uuid,
  p_connection_id uuid,
  p_provider_item_id text,
  p_link_session_id uuid,
  p_link_completion_nonce text,
  p_link_request_id text default null,
  p_provider_link_session_id text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if p_user_id is null
    or p_connection_id is null
    or nullif(trim(coalesce(p_provider_item_id, '')), '') is null
    or p_link_session_id is null
    or nullif(trim(coalesce(p_link_completion_nonce, '')), '') is null then
    return false;
  end if;

  perform 1
  from public.plaid_link_update_sessions session
  where session.id = p_link_session_id
    and session.user_id = p_user_id
    and session.connection_id is null
    and session.mode = 'new'
    and session.nonce = p_link_completion_nonce
  for update;
  if not found then
    return false;
  end if;

  perform 1
  from public.bank_connections connection
  where connection.id = p_connection_id
    and connection.user_id = p_user_id
    and connection.provider = 'plaid'
    and connection.provider_item_id = p_provider_item_id
    and connection.removed_at is null
    and connection.status in ('pending', 'active', 'needs_reauth', 'error')
    and coalesce(connection.item_status, '') not in ('removed', 'pending_removal')
    and connection.metadata ->> 'plaid_link_completion_session_id' =
      p_link_session_id::text
    and connection.metadata ->> 'plaid_link_completion_nonce' =
      p_link_completion_nonce
  for update;
  if not found then
    return false;
  end if;

  update public.plaid_link_update_sessions session
  set consumed_at = coalesce(session.consumed_at, v_now),
      completed_at = coalesce(session.completed_at, v_now),
      processing_started_at = null,
      link_request_id = coalesce(p_link_request_id, session.link_request_id),
      link_session_id = coalesce(
        p_provider_link_session_id,
        session.link_session_id
      ),
      updated_at = v_now
  where session.id = p_link_session_id;

  update public.plaid_offboarding_jobs job
  set connection_id = p_connection_id,
      status = 'completed',
      access_token_encrypted = null,
      plaid_access_token_encrypted = null,
      processing_started_at = null,
      next_attempt_at = null,
      processed_at = coalesce(job.processed_at, v_now),
      last_error = null,
      last_error_at = null,
      updated_at = v_now
  where job.user_id = p_user_id
    and job.provider_item_id = p_provider_item_id
    and job.reason = 'orphan_exchange_escrow'
    and job.link_completion_session_id = p_link_session_id
    and job.link_completion_nonce = p_link_completion_nonce;

  return true;
end;
$$;

revoke all on function public.complete_plaid_link_exchange_v1(
  uuid, uuid, text, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.complete_plaid_link_exchange_v1(
  uuid, uuid, text, uuid, text, text, text
) to service_role;

create or replace function public.preserve_live_plaid_exchange_escrow_v1(
  p_user_id uuid,
  p_connection_id uuid,
  p_provider_item_id text,
  p_reason text default 'preserved_live_connection_without_exact_session_identity'
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  perform 1
  from public.bank_connections connection
  where connection.id = p_connection_id
    and connection.user_id = p_user_id
    and connection.provider = 'plaid'
    and connection.provider_item_id = p_provider_item_id
    and connection.removed_at is null
    and connection.status in ('pending', 'active', 'needs_reauth', 'error')
    and coalesce(connection.item_status, '') not in ('removed', 'pending_removal')
  for update;
  if not found then
    return false;
  end if;

  update public.plaid_offboarding_jobs job
  set connection_id = p_connection_id,
      status = 'completed',
      access_token_encrypted = null,
      plaid_access_token_encrypted = null,
      processing_started_at = null,
      next_attempt_at = null,
      processed_at = coalesce(job.processed_at, v_now),
      last_error = left(coalesce(p_reason, 'preserved_live_connection'), 1000),
      last_error_at = v_now,
      updated_at = v_now
  where job.user_id = p_user_id
    and job.provider_item_id = p_provider_item_id
    and job.reason = 'orphan_exchange_escrow';

  return true;
end;
$$;

revoke all on function public.preserve_live_plaid_exchange_escrow_v1(
  uuid, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.preserve_live_plaid_exchange_escrow_v1(
  uuid, uuid, text, text
) to service_role;

alter table public.bank_webhook_events
  add column if not exists recovery_status text,
  add column if not exists recovery_attempt_count integer,
  add column if not exists recovery_max_attempts integer,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists dead_letter_alerted_at timestamptz;

update public.bank_webhook_events
set recovery_status = case
      when processed_at is not null then 'completed'
      when processing_started_at is not null then 'processing'
      else 'pending'
    end,
    recovery_attempt_count = coalesce(recovery_attempt_count, 0),
    recovery_max_attempts = coalesce(recovery_max_attempts, 12)
where recovery_status is null
   or recovery_attempt_count is null
   or recovery_max_attempts is null;

alter table public.bank_webhook_events
  alter column recovery_status set default 'pending',
  alter column recovery_status set not null,
  alter column recovery_attempt_count set default 0,
  alter column recovery_attempt_count set not null,
  alter column recovery_max_attempts set default 12,
  alter column recovery_max_attempts set not null;

alter table public.bank_webhook_events
  drop constraint if exists bank_webhook_events_recovery_status_check,
  add constraint bank_webhook_events_recovery_status_check
    check (recovery_status in ('pending', 'processing', 'completed', 'dead_letter')),
  drop constraint if exists bank_webhook_events_recovery_attempt_count_check,
  add constraint bank_webhook_events_recovery_attempt_count_check
    check (recovery_attempt_count >= 0),
  drop constraint if exists bank_webhook_events_recovery_max_attempts_check,
  add constraint bank_webhook_events_recovery_max_attempts_check
    check (recovery_max_attempts > 0);

create index if not exists idx_bank_webhook_events_recovery_ready
  on public.bank_webhook_events(
    provider,
    recovery_status,
    next_attempt_at,
    received_at
  )
  where processed_at is null;

create or replace function public.claim_bank_webhook_event_v1(
  p_event_id uuid,
  p_lock_token uuid,
  p_lease_minutes integer default 15
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event_id is null or p_lock_token is null then
    return false;
  end if;

  update public.bank_webhook_events event
  set recovery_status = 'processing',
      recovery_attempt_count = event.recovery_attempt_count + 1,
      last_attempt_at = now(),
      processing_started_at = now(),
      processing_lock_token = p_lock_token,
      next_attempt_at = null
  where event.id = p_event_id
    and event.processed_at is null
    and event.recovery_attempt_count < event.recovery_max_attempts
    and (
      (
        event.recovery_status = 'pending'
        and (event.next_attempt_at is null or event.next_attempt_at <= now())
      )
      or (
        event.recovery_status = 'processing'
        and event.processing_started_at < now() - make_interval(
          mins => greatest(coalesce(p_lease_minutes, 15), 1)
        )
      )
    );
  return found;
end;
$$;

revoke all on function public.claim_bank_webhook_event_v1(uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_bank_webhook_event_v1(uuid, uuid, integer)
  to service_role;

create or replace function public.claim_pending_bank_webhook_events_v2(
  p_provider text,
  p_batch_size integer,
  p_lock_token uuid,
  p_lease_minutes integer default 15
) returns table (id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(trim(coalesce(p_provider, '')), '') is null
    or p_lock_token is null then
    return;
  end if;

  update public.bank_webhook_events event
  set recovery_status = 'dead_letter',
      dead_lettered_at = coalesce(event.dead_lettered_at, now()),
      processing_started_at = null,
      processing_lock_token = null,
      next_attempt_at = null,
      processing_error = coalesce(
        event.processing_error,
        'webhook_recovery_attempts_exhausted'
      )
  where event.provider = p_provider
    and event.processed_at is null
    and event.recovery_attempt_count >= event.recovery_max_attempts
    and (
      (
        event.recovery_status = 'pending'
        and (event.next_attempt_at is null or event.next_attempt_at <= now())
      )
      or (
        event.recovery_status = 'processing'
        and event.processing_started_at < now() - make_interval(
          mins => greatest(coalesce(p_lease_minutes, 15), 1)
        )
      )
    );

  return query
  with candidates as (
    select event.id
    from public.bank_webhook_events event
    where event.provider = p_provider
      and event.processed_at is null
      and event.recovery_attempt_count < event.recovery_max_attempts
      and (
        (
          event.recovery_status = 'pending'
          and (event.next_attempt_at is null or event.next_attempt_at <= now())
        )
        or (
          event.recovery_status = 'processing'
          and event.processing_started_at < now() - make_interval(
            mins => greatest(coalesce(p_lease_minutes, 15), 1)
          )
        )
      )
    order by coalesce(event.next_attempt_at, event.received_at), event.received_at
    limit greatest(least(coalesce(p_batch_size, 10), 100), 1)
    for update skip locked
  )
  update public.bank_webhook_events event
  set recovery_status = 'processing',
      recovery_attempt_count = event.recovery_attempt_count + 1,
      last_attempt_at = now(),
      processing_started_at = now(),
      processing_lock_token = p_lock_token,
      next_attempt_at = null
  from candidates
  where event.id = candidates.id
  returning event.id;
end;
$$;

revoke all on function public.claim_pending_bank_webhook_events_v2(
  text, integer, uuid, integer
) from public, anon, authenticated;
grant execute on function public.claim_pending_bank_webhook_events_v2(
  text, integer, uuid, integer
) to service_role;

create or replace function public.complete_bank_webhook_event_v2(
  p_event_id uuid,
  p_lock_token uuid,
  p_outcome text,
  p_error text default null,
  p_retry_delay_seconds integer default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.bank_webhook_events%rowtype;
  v_delay_seconds integer;
begin
  select event.*
  into v_event
  from public.bank_webhook_events event
  where event.id = p_event_id
    and event.recovery_status = 'processing'
    and event.processing_lock_token = p_lock_token
  for update;
  if not found then
    return 'lost_claim';
  end if;

  if p_outcome = 'completed' then
    update public.bank_webhook_events event
    set recovery_status = 'completed',
        processed_at = coalesce(event.processed_at, now()),
        processing_started_at = null,
        processing_lock_token = null,
        next_attempt_at = null,
        processing_error = nullif(left(coalesce(p_error, ''), 1000), '')
    where event.id = p_event_id;
    return 'completed';
  end if;

  if p_outcome <> 'retry' then
    raise exception 'Unsupported webhook completion outcome'
      using errcode = '22023';
  end if;

  if v_event.recovery_attempt_count >= v_event.recovery_max_attempts then
    update public.bank_webhook_events event
    set recovery_status = 'dead_letter',
        dead_lettered_at = coalesce(event.dead_lettered_at, now()),
        processing_started_at = null,
        processing_lock_token = null,
        next_attempt_at = null,
        processing_error = left(
          coalesce(p_error, 'webhook_recovery_attempts_exhausted'),
          1000
        )
    where event.id = p_event_id;
    return 'dead_letter';
  end if;

  v_delay_seconds := greatest(
    30,
    least(
      coalesce(
        p_retry_delay_seconds,
        30 * power(
          2,
          least(greatest(v_event.recovery_attempt_count - 1, 0), 7)
        )::integer
      ),
      3600
    )
  );

  update public.bank_webhook_events event
  set recovery_status = 'pending',
      processing_started_at = null,
      processing_lock_token = null,
      next_attempt_at = now() + make_interval(secs => v_delay_seconds),
      processing_error = left(coalesce(p_error, 'webhook_processing_retry'), 1000)
  where event.id = p_event_id;
  return 'pending';
end;
$$;

revoke all on function public.complete_bank_webhook_event_v2(
  uuid, uuid, text, text, integer
) from public, anon, authenticated;
grant execute on function public.complete_bank_webhook_event_v2(
  uuid, uuid, text, text, integer
) to service_role;

create or replace function public.prevent_duplicate_plaid_persistent_account_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_institution_id text;
  v_currency text;
  v_name text;
  v_mask text;
  v_type text;
  v_subtype text;
  v_provider_account_id text;
  v_persistent_id text;
  v_identity_key text;
begin
  if new.provider is distinct from 'plaid' then
    return new;
  end if;

  select
    connection.household_id,
    nullif(trim(connection.metadata ->> 'institution_id'), '')
  into v_household_id, v_institution_id
  from public.bank_connections connection
  where connection.id = new.bank_connection_id
    and connection.user_id = new.user_id
    and connection.provider = 'plaid';

  v_persistent_id := nullif(trim(coalesce(new.provider_persistent_account_id, '')), '');
  v_provider_account_id := nullif(trim(coalesce(new.provider_account_id, '')), '');
  v_currency := nullif(upper(trim(coalesce(new.currency, ''))), '');
  v_name := nullif(lower(trim(coalesce(new.name, ''))), '');
  v_mask := nullif(lower(trim(coalesce(new.mask, ''))), '');
  v_type := nullif(lower(trim(coalesce(new.type, ''))), '');
  v_subtype := nullif(lower(trim(coalesce(new.subtype, ''))), '');

  v_identity_key := case
    when v_persistent_id is not null then 'persistent:' || v_persistent_id
    when v_institution_id is not null
      and v_currency is not null
      and v_name is not null
      and v_mask is not null
      and v_type is not null
      and v_subtype is not null then
      'signature:' || v_institution_id || ':' || v_currency || ':' ||
      v_name || ':' || v_mask || ':' || v_type || ':' || v_subtype
    else null
  end;

  if v_identity_key is null then
    return new;
  end if;

  if v_provider_account_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      new.user_id::text || ':' ||
      coalesce(v_household_id::text, 'personal') || ':provider:' ||
      v_provider_account_id,
      0
    ));
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    new.user_id::text || ':' ||
    coalesce(v_household_id::text, 'personal') || ':' ||
    v_identity_key,
    0
  ));

  if exists (
    select 1
    from public.bank_accounts account
    join public.bank_connections connection
      on connection.id = account.bank_connection_id
    where account.id <> new.id
      and account.user_id = new.user_id
      and account.provider = 'plaid'
      and connection.household_id is not distinct from v_household_id
      and connection.removed_at is null
      and connection.status in ('pending', 'active', 'needs_reauth', 'error')
      and (
        (
          v_persistent_id is not null
          and nullif(trim(coalesce(account.provider_persistent_account_id, '')), '') is not null
          and nullif(trim(coalesce(account.provider_persistent_account_id, '')), '') =
            v_persistent_id
        )
        or (
          (
            v_persistent_id is null
            or nullif(trim(coalesce(account.provider_persistent_account_id, '')), '') is null
          )
          and v_provider_account_id is not null
          and nullif(trim(coalesce(account.provider_account_id, '')), '') =
            v_provider_account_id
        )
        or (
          v_persistent_id is null
          and nullif(trim(coalesce(account.provider_persistent_account_id, '')), '') is null
          and account.bank_connection_id is distinct from new.bank_connection_id
          and nullif(trim(connection.metadata ->> 'institution_id'), '') =
            v_institution_id
          and nullif(upper(trim(coalesce(account.currency, ''))), '') = v_currency
          and nullif(lower(trim(coalesce(account.name, ''))), '') = v_name
          and nullif(lower(trim(coalesce(account.mask, ''))), '') = v_mask
          and nullif(lower(trim(coalesce(account.type, ''))), '') = v_type
          and nullif(lower(trim(coalesce(account.subtype, ''))), '') = v_subtype
        )
      )
  ) then
    raise exception 'Plaid account is already connected in this scope'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_duplicate_plaid_persistent_account_v1
  on public.bank_accounts;
create trigger prevent_duplicate_plaid_persistent_account_v1
before insert or update of provider_account_id, provider_persistent_account_id,
  bank_connection_id, currency, name, mask, type, subtype
on public.bank_accounts
for each row
execute function public.prevent_duplicate_plaid_persistent_account_v1();
