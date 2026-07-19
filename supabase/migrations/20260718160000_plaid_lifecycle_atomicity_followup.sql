set lock_timeout = '5s';
set statement_timeout = '10min';

alter table public.bank_connections
  add column if not exists plaid_recurring_refresh_pending boolean not null default false;

alter table public.bank_connections
  alter column plaid_access_token_encrypted drop not null;

alter table public.plaid_offboarding_jobs
  add column if not exists token_expires_at timestamptz;

alter table public.plaid_offboarding_jobs
  add column if not exists provider_item_id text,
  add column if not exists orphan_dedupe_key text;

alter table public.bank_sync_audit
  drop constraint if exists bank_sync_audit_status_check;
alter table public.bank_sync_audit
  add constraint bank_sync_audit_status_check
  check (status in ('running', 'succeeded', 'deferred', 'failed'));

create unique index if not exists idx_plaid_offboarding_jobs_orphan_dedupe
  on public.plaid_offboarding_jobs (orphan_dedupe_key);

create index if not exists idx_plaid_offboarding_jobs_token_expiry
  on public.plaid_offboarding_jobs (token_expires_at)
  where token_expires_at is not null;

create or replace function public.set_plaid_offboarding_token_expiry_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.access_token_encrypted is not null
    or new.plaid_access_token_encrypted is not null
  ) and new.token_expires_at is null then
    new.token_expires_at := now() + interval '30 days';
  end if;
  return new;
end;
$$;

drop trigger if exists set_plaid_offboarding_token_expiry_v1
  on public.plaid_offboarding_jobs;
create trigger set_plaid_offboarding_token_expiry_v1
before insert or update of access_token_encrypted,
  plaid_access_token_encrypted
on public.plaid_offboarding_jobs
for each row
execute function public.set_plaid_offboarding_token_expiry_v1();

create or replace function public.claim_pending_plaid_offboarding_jobs(
  p_batch_size integer default 20
)
returns setof public.plaid_offboarding_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with claimed as (
    select job.id
    from public.plaid_offboarding_jobs job
    where (
        (
          job.status = 'pending'
          and (job.next_attempt_at is null or job.next_attempt_at <= now())
        )
        or (
          job.status = 'processing'
          and job.processing_started_at is not null
          and job.processing_started_at < now() - interval '15 minutes'
        )
      )
      and (job.token_expires_at is null or job.token_expires_at > now())
    order by coalesce(job.next_attempt_at, job.created_at), job.created_at
    limit greatest(coalesce(p_batch_size, 20), 1)
    for update skip locked
  )
  update public.plaid_offboarding_jobs job
  set status = 'processing',
      processing_started_at = now(),
      updated_at = now()
  from claimed
  where job.id = claimed.id
  returning job.*;
end;
$$;

revoke all on function public.claim_pending_plaid_offboarding_jobs(integer)
  from public, anon, authenticated;
grant execute on function public.claim_pending_plaid_offboarding_jobs(integer)
  to service_role;

create index if not exists idx_bank_connections_plaid_recurring_pending
  on public.bank_connections (updated_at)
  where provider = 'plaid'
    and plaid_recurring_refresh_pending = true
    and removed_at is null;

create or replace function public.prevent_duplicate_plaid_persistent_account_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_institution_id text;
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

  v_identity_key := case
    when new.provider_persistent_account_id is not null then
      'persistent:' || new.provider_persistent_account_id
    when nullif(trim(coalesce(new.name, '')), '') is not null
      or nullif(trim(coalesce(new.mask, '')), '') is not null then
      'signature:' || coalesce(v_institution_id, '') || ':' ||
      lower(trim(coalesce(new.name, ''))) || ':' ||
      lower(trim(coalesce(new.mask, ''))) || ':' ||
      lower(trim(coalesce(new.type, ''))) || ':' ||
      lower(trim(coalesce(new.subtype, '')))
    else null
  end;

  if v_identity_key is null then
    return new;
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
      and connection.status is distinct from 'disabled'
      and (
        (
          new.provider_persistent_account_id is not null
          and account.provider_persistent_account_id =
            new.provider_persistent_account_id
        )
        or (
          new.provider_persistent_account_id is null
          and account.provider_persistent_account_id is null
          and account.bank_connection_id is distinct from new.bank_connection_id
          and coalesce(nullif(trim(connection.metadata ->> 'institution_id'), ''), '') =
            coalesce(v_institution_id, '')
          and lower(trim(coalesce(account.name, ''))) =
            lower(trim(coalesce(new.name, '')))
          and lower(trim(coalesce(account.mask, ''))) =
            lower(trim(coalesce(new.mask, '')))
          and lower(trim(coalesce(account.type, ''))) =
            lower(trim(coalesce(new.type, '')))
          and lower(trim(coalesce(account.subtype, ''))) =
            lower(trim(coalesce(new.subtype, '')))
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
  bank_connection_id
on public.bank_accounts
for each row
execute function public.prevent_duplicate_plaid_persistent_account_v1();

create or replace function public.apply_plaid_sync_batch_v2(
  p_user_id uuid,
  p_bank_connection_id uuid,
  p_expected_cursor_generation integer,
  p_next_cursor text,
  p_expense_inserts jsonb,
  p_expense_updates jsonb,
  p_removed_provider_transaction_ids text[],
  p_removed_bank_account_ids uuid[],
  p_processed_bank_account_ids uuid[],
  p_account_upserts jsonb,
  p_inactive_bank_account_ids uuid[],
  p_raw_transactions jsonb,
  p_sync_status jsonb,
  p_is_ready boolean,
  p_recurring_refresh_required boolean,
  p_lock_token uuid,
  p_audit_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.bank_connections%rowtype;
  v_result jsonb;
  v_now timestamptz := now();
  v_initial_complete boolean;
  v_historical_complete boolean;
begin
  if jsonb_typeof(coalesce(p_account_upserts, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_raw_transactions, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_sync_status, '{}'::jsonb)) <> 'object' then
    raise exception 'Plaid account, raw transaction, and status payloads are invalid'
      using errcode = '22023';
  end if;

  select * into v_connection
  from public.bank_connections
  where id = p_bank_connection_id
    and user_id = p_user_id
    and provider = 'plaid'
    and removed_at is null
    and status <> 'disabled'
    and coalesce(item_status, '') not in ('removed', 'pending_removal')
  for update;

  if v_connection.id is null then
    raise exception 'Plaid connection not found' using errcode = 'P0002';
  end if;
  if coalesce(v_connection.cursor_generation, 0) <>
      coalesce(p_expected_cursor_generation, 0) then
    raise exception 'Plaid cursor generation changed during sync'
      using errcode = '40001';
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
    select 1
    from jsonb_populate_recordset(
      null::public.bank_accounts,
      coalesce(p_account_upserts, '[]'::jsonb)
    ) incoming
    where incoming.user_id is distinct from p_user_id
      or incoming.bank_connection_id is distinct from p_bank_connection_id
      or incoming.provider is distinct from 'plaid'
      or incoming.provider_account_id is null
      or exists (
        select 1
        from public.bank_accounts existing
        where existing.id = incoming.id
          and (
            existing.user_id is distinct from p_user_id
            or existing.bank_connection_id is distinct from p_bank_connection_id
            or existing.provider is distinct from 'plaid'
          )
      )
  ) then
    raise exception 'Plaid account payload is outside the connection scope'
      using errcode = '42501';
  end if;

  insert into public.bank_accounts (
    id, user_id, bank_connection_id, provider, plaid_account_id,
    provider_account_id, provider_persistent_account_id, name, official_name,
    mask, currency, type, subtype, status, provider_balance_current_cents,
    provider_balance_available_cents, provider_balance_limit_cents,
    provider_balance_updated_at, raw_provider_payload
  )
  select
    incoming.id, incoming.user_id, incoming.bank_connection_id,
    incoming.provider, incoming.plaid_account_id,
    incoming.provider_account_id, incoming.provider_persistent_account_id,
    incoming.name, incoming.official_name, incoming.mask, incoming.currency,
    incoming.type, incoming.subtype, incoming.status,
    incoming.provider_balance_current_cents,
    incoming.provider_balance_available_cents,
    incoming.provider_balance_limit_cents,
    incoming.provider_balance_updated_at, incoming.raw_provider_payload
  from jsonb_populate_recordset(
    null::public.bank_accounts,
    coalesce(p_account_upserts, '[]'::jsonb)
  ) incoming
  on conflict (id) do update set
    plaid_account_id = excluded.plaid_account_id,
    provider_account_id = excluded.provider_account_id,
    provider_persistent_account_id = excluded.provider_persistent_account_id,
    name = excluded.name,
    official_name = excluded.official_name,
    mask = excluded.mask,
    currency = excluded.currency,
    type = excluded.type,
    subtype = excluded.subtype,
    status = excluded.status,
    provider_balance_current_cents = excluded.provider_balance_current_cents,
    provider_balance_available_cents = excluded.provider_balance_available_cents,
    provider_balance_limit_cents = excluded.provider_balance_limit_cents,
    provider_balance_updated_at = excluded.provider_balance_updated_at,
    raw_provider_payload = excluded.raw_provider_payload,
    updated_at = v_now;

  if exists (
    select 1
    from unnest(coalesce(p_inactive_bank_account_ids, '{}'::uuid[])) account_id
    where not exists (
      select 1
      from public.bank_accounts account
      where account.id = account_id
        and account.user_id = p_user_id
        and account.bank_connection_id = p_bank_connection_id
        and account.provider = 'plaid'
    )
  ) then
    raise exception 'Plaid inactive account payload is outside the connection scope'
      using errcode = '42501';
  end if;

  update public.bank_accounts
  set status = 'inactive', updated_at = v_now
  where id = any(coalesce(p_inactive_bank_account_ids, '{}'::uuid[]))
    and user_id = p_user_id
    and bank_connection_id = p_bank_connection_id
    and provider = 'plaid'
    and status is distinct from 'disabled';

  update public.expenses expense
  set deleted_at = null,
      deleted_reason = null,
      updated_at = v_now
  where expense.user_id = p_user_id
    and expense.provider = 'plaid'
    and expense.deleted_reason = 'bank_account_inactive'
    and expense.bank_account_id in (
      select account.id
      from public.bank_accounts account
      where account.id = any(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
        and account.status = 'active'
        and account.bank_connection_id = p_bank_connection_id
    );

  if exists (
    select 1
    from jsonb_populate_recordset(
      null::public.bank_transaction_raw,
      coalesce(p_raw_transactions, '[]'::jsonb)
    ) raw
    where raw.bank_connection_id is distinct from p_bank_connection_id
      or raw.provider is distinct from 'plaid'
      or raw.bank_account_id is null
      or raw.provider_transaction_id is null
      or raw.bank_account_id <> all(coalesce(p_processed_bank_account_ids, '{}'::uuid[]))
      or not exists (
        select 1
        from public.bank_accounts account
        where account.id = raw.bank_account_id
          and account.user_id = p_user_id
          and account.bank_connection_id = p_bank_connection_id
          and account.provider = 'plaid'
      )
  ) then
    raise exception 'Plaid raw transaction payload is outside the connection scope'
      using errcode = '42501';
  end if;

  v_initial_complete :=
    coalesce((v_connection.metadata -> 'plaid_sync_status' ->>
      'initial_update_complete')::boolean, false)
    or coalesce((p_sync_status ->> 'initial_update_complete')::boolean, false);
  v_historical_complete :=
    coalesce((v_connection.metadata -> 'plaid_sync_status' ->>
      'historical_update_complete')::boolean, false)
    or coalesce((p_sync_status ->> 'historical_update_complete')::boolean, false);

  if not coalesce(p_is_ready, false) then
    if jsonb_array_length(coalesce(p_expense_inserts, '[]'::jsonb)) > 0
      or jsonb_array_length(coalesce(p_expense_updates, '[]'::jsonb)) > 0
      or jsonb_array_length(coalesce(p_raw_transactions, '[]'::jsonb)) > 0
      or cardinality(coalesce(
        p_removed_provider_transaction_ids,
        '{}'::text[]
      )) > 0 then
      raise exception 'Plaid returned mutations while transactions were not ready'
        using errcode = '40001';
    end if;

    update public.bank_connections
    set metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'initial_update_complete', v_initial_complete,
            'historical_update_complete', v_historical_complete,
            'sync_status_updated_at', v_now
          )
          || jsonb_build_object(
            'plaid_sync_status',
            coalesce(metadata -> 'plaid_sync_status', '{}'::jsonb)
              || jsonb_build_object(
                'initial_update_complete', v_initial_complete,
                'historical_update_complete', v_historical_complete,
                'transactions_update_status',
                  p_sync_status ->> 'transactions_update_status',
                'updated_at', v_now
              )
          ),
        last_sync_attempt_at = v_now,
        status = 'pending',
        item_status = 'initial_sync_in_progress',
        updated_at = v_now
    where id = p_bank_connection_id
      and user_id = p_user_id;

    if p_audit_id is not null then
      update public.bank_sync_audit
      set status = 'deferred',
          synced_accounts = 0,
          inserted_transactions = 0,
          updated_transactions = 0,
          finished_at = v_now,
          error_message = null
      where id = p_audit_id
        and bank_connection_id = p_bank_connection_id;
    end if;

    insert into public.plaid_sync_events (
      bank_connection_id, bank_sync_audit_id, event_type, payload
    ) values (
      p_bank_connection_id,
      p_audit_id,
      'batch_not_ready',
      jsonb_build_object(
        'cursor_generation', coalesce(p_expected_cursor_generation, 0),
        'transactions_update_status',
          p_sync_status ->> 'transactions_update_status'
      )
    );

    return jsonb_build_object(
      'inserted', 0,
      'updated', 0,
      'removed', 0,
      'accounts_processed', 0,
      'inserted_records', '[]'::jsonb,
      'cursor_generation', coalesce(p_expected_cursor_generation, 0),
      'is_ready', false,
      'recurring_refresh_required', false
    );
  end if;

  insert into public.bank_transaction_raw (
    bank_connection_id, bank_account_id, provider,
    provider_transaction_id, payload
  )
  select
    raw.bank_connection_id, raw.bank_account_id, raw.provider,
    raw.provider_transaction_id, raw.payload
  from jsonb_populate_recordset(
    null::public.bank_transaction_raw,
    coalesce(p_raw_transactions, '[]'::jsonb)
  ) raw
  on conflict (bank_account_id, provider, provider_transaction_id)
  do update set payload = excluded.payload;

  delete from public.bank_transaction_raw raw
  where raw.bank_connection_id = p_bank_connection_id
    and raw.provider = 'plaid'
    and raw.bank_account_id = any(coalesce(p_removed_bank_account_ids, '{}'::uuid[]))
    and raw.provider_transaction_id = any(
      coalesce(p_removed_provider_transaction_ids, '{}'::text[])
    );

  v_result := public.apply_plaid_sync_batch_v1(
    p_user_id,
    p_bank_connection_id,
    p_expected_cursor_generation,
    p_next_cursor,
    p_expense_inserts,
    p_expense_updates,
    p_removed_provider_transaction_ids,
    p_removed_bank_account_ids,
    p_processed_bank_account_ids,
    p_lock_token,
    p_audit_id
  );

  update public.bank_connections
  set metadata = case
        when coalesce(p_sync_status, '{}'::jsonb) = '{}'::jsonb then metadata
        else coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'initial_update_complete', v_initial_complete,
            'historical_update_complete', v_historical_complete,
            'sync_status_updated_at', v_now
          )
          || jsonb_build_object(
            'plaid_sync_status',
            coalesce(metadata -> 'plaid_sync_status', '{}'::jsonb)
              || jsonb_build_object(
                'initial_update_complete', v_initial_complete,
                'historical_update_complete', v_historical_complete,
                'transactions_update_status',
                  p_sync_status ->> 'transactions_update_status',
                'updated_at', v_now
              )
          )
      end,
      last_sync_attempt_at = v_now,
      plaid_recurring_refresh_pending =
        plaid_recurring_refresh_pending
          or coalesce(p_recurring_refresh_required, false),
      updated_at = v_now
  where id = p_bank_connection_id
    and user_id = p_user_id;

  return v_result || jsonb_build_object(
    'is_ready', p_is_ready,
    'recurring_refresh_required', p_recurring_refresh_required
  );
end;
$$;

revoke all on function public.apply_plaid_sync_batch_v2(
  uuid, uuid, integer, text, jsonb, jsonb, text[], uuid[], uuid[], jsonb,
  uuid[], jsonb, jsonb, boolean, boolean, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.apply_plaid_sync_batch_v2(
  uuid, uuid, integer, text, jsonb, jsonb, text[], uuid[], uuid[], jsonb,
  uuid[], jsonb, jsonb, boolean, boolean, uuid, uuid
) to service_role;

update public.plaid_offboarding_jobs
set token_expires_at = coalesce(token_expires_at, now() + interval '30 days'),
    updated_at = now()
where token_expires_at is null
  and (
    access_token_encrypted is not null
    or plaid_access_token_encrypted is not null
  );

update public.bank_connections connection
set access_token_encrypted = null,
    plaid_access_token_encrypted = null,
    updated_at = now()
from public.plaid_offboarding_jobs job
where job.connection_id = connection.id
  and job.status = 'failed'
  and (
    connection.access_token_encrypted is not null
    or connection.plaid_access_token_encrypted is not null
  );

delete from public.bank_connection_tokens token
using public.plaid_offboarding_jobs job
where job.connection_id = token.bank_connection_id
  and job.status = 'failed';

create or replace function public.sanitize_failed_plaid_offboarding_secrets_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'failed' then
    new.token_expires_at := coalesce(
      new.token_expires_at,
      now() + interval '30 days'
    );

    if new.connection_id is not null then
      update public.bank_connections
      set access_token_encrypted = null,
          plaid_access_token_encrypted = null,
          updated_at = now()
      where id = new.connection_id;

      delete from public.bank_connection_tokens
      where bank_connection_id = new.connection_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sanitize_failed_plaid_offboarding_secrets_v1
  on public.plaid_offboarding_jobs;
create trigger sanitize_failed_plaid_offboarding_secrets_v1
before insert or update
on public.plaid_offboarding_jobs
for each row
when (new.status = 'failed')
execute function public.sanitize_failed_plaid_offboarding_secrets_v1();

create or replace function public.preserve_terminal_plaid_connection_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.provider = 'plaid' and (
    old.removed_at is not null
    or old.status = 'disabled'
    or old.item_status in ('removed', 'pending_removal')
  ) then
    if new.status = 'disabled'
      and new.item_status = 'removed'
      and new.removed_at is not null then
      new.item_health_state := 'removed';
      new.relink_state := null;
      new.access_token_encrypted := null;
      new.plaid_access_token_encrypted := null;
      return new;
    end if;
    if old.item_status = 'pending_removal'
      and new.status = 'disabled'
      and new.item_status = 'removed' then
      return new;
    end if;

    new.status := old.status;
    new.item_status := old.item_status;
    new.item_health_state := old.item_health_state;
    new.relink_state := old.relink_state;
    new.removed_at := old.removed_at;
    new.access_token_encrypted := case
      when new.access_token_encrypted is null then null
      else old.access_token_encrypted
    end;
    new.plaid_access_token_encrypted := case
      when new.plaid_access_token_encrypted is null then null
      else old.plaid_access_token_encrypted
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_terminal_plaid_connection_v1
  on public.bank_connections;
create trigger preserve_terminal_plaid_connection_v1
before update
on public.bank_connections
for each row
execute function public.preserve_terminal_plaid_connection_v1();

create or replace function public.reject_terminal_plaid_sync_job_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.bank_connections%rowtype;
begin
  if new.provider is distinct from 'plaid' then
    return new;
  end if;

  select * into v_connection
  from public.bank_connections
  where id = new.bank_connection_id
  for update;

  if v_connection.id is null
    or v_connection.removed_at is not null
    or v_connection.status = 'disabled'
    or v_connection.item_status in ('removed', 'pending_removal') then
    new.status := 'failed';
    new.processed_at := now();
    new.updated_at := now();
    new.payload := coalesce(new.payload, '{}'::jsonb)
      || jsonb_build_object('error', 'terminal_plaid_connection');
  end if;
  return new;
end;
$$;

drop trigger if exists reject_terminal_plaid_sync_job_v1
  on public.bank_sync_jobs;
create trigger reject_terminal_plaid_sync_job_v1
before insert
on public.bank_sync_jobs
for each row
execute function public.reject_terminal_plaid_sync_job_v1();

create or replace function public.get_projected_scoped_recurring_expenses_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid default null,
  p_currency text default null,
  p_range_start date default null,
  p_range_end date default null
) returns table (
  id text,
  recurring_id uuid,
  date date,
  amount_cents bigint,
  currency text,
  category text,
  household_id uuid,
  user_id uuid,
  split_group_id uuid,
  raw_text text,
  created_at timestamptz,
  updated_at timestamptz,
  type text,
  is_recurring boolean,
  account_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with recurring_scope as (
    select
      e.id as recurring_id,
      greatest(
        coalesce(nullif(e.recurrence_rule ->> 'anchor_date', '')::date, e.date),
        e.date
      ) as anchor_date,
      lower(coalesce(e.recurrence_rule ->> 'frequency', 'monthly')) as frequency,
      greatest(
        coalesce(nullif(e.recurrence_rule ->> 'interval', '')::integer, 1), 1
      ) as interval_value,
      case
        when jsonb_typeof(e.recurrence_rule -> 'excluded_dates') = 'array' then
          array(
            select value::date
            from jsonb_array_elements_text(
              e.recurrence_rule -> 'excluded_dates'
            ) value
          )
        else '{}'::date[]
      end as excluded_dates,
      nullif(e.recurrence_rule ->> 'end_date', '')::date as end_date,
      abs(e.amount_cents)::bigint as amount_cents,
      upper(coalesce(e.currency, '')) as currency,
      e.category,
      e.household_id,
      e.user_id,
      e.split_group_id,
      e.raw_text,
      e.created_at,
      e.updated_at,
      lower(coalesce(e.type::text, 'expense')) as type,
      e.account_id
    from public.expenses e
    where coalesce(e.is_recurring, false) = true
      and e.deleted_at is null
      and e.provider is null
      and e.bank_account_id is null
      and lower(coalesce(e.recurrence_rule ->> 'projection_enabled', 'true')) <> 'false'
      and (
        (lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'personal'
          and e.user_id = p_user_id and e.household_id is null)
        or (lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'portfolio'
          and e.user_id = p_user_id and e.household_id = p_household_id)
        or (lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'household'
          and e.household_id = p_household_id)
      )
      and (p_currency is null or upper(coalesce(e.currency, '')) = upper(p_currency))
  ),
  projected as (
    select
      public.build_projected_recurring_expense_id_v1(
        rs.recurring_id::text, occurrence_date
      ) as id,
      rs.recurring_id,
      occurrence_date as date,
      rs.amount_cents,
      rs.currency,
      rs.category,
      rs.household_id,
      rs.user_id,
      rs.split_group_id,
      rs.raw_text,
      rs.created_at,
      rs.updated_at,
      rs.type,
      false as is_recurring,
      rs.account_id
    from recurring_scope rs
    cross join lateral public.project_recurring_occurrence_dates_v1(
      p_anchor_date => rs.anchor_date,
      p_frequency => rs.frequency,
      p_interval => rs.interval_value,
      p_range_start => p_range_start,
      p_range_end => p_range_end,
      p_end_date => rs.end_date,
      p_excluded_dates => rs.excluded_dates
    ) occurrence_date
  )
  select
    p.id, p.recurring_id, p.date, p.amount_cents, p.currency, p.category,
    p.household_id, p.user_id, p.split_group_id, p.raw_text, p.created_at,
    p.updated_at, p.type, p.is_recurring, p.account_id
  from projected p
  where not exists (
    select 1
    from public.expenses actual
    where coalesce(actual.is_recurring, false) = false
      and actual.deleted_at is null
      and actual.date = p.date
      and upper(coalesce(actual.currency, '')) = p.currency
      and lower(trim(coalesce(actual.category, ''))) =
          lower(trim(coalesce(p.category, '')))
      and abs(actual.amount_cents)::bigint = p.amount_cents
      and coalesce(actual.household_id::text, '') =
          coalesce(p.household_id::text, '')
      and coalesce(actual.user_id::text, '') = coalesce(p.user_id::text, '')
      and coalesce(actual.split_group_id::text, '') =
          coalesce(p.split_group_id::text, '')
      and coalesce(actual.account_id::text, '') =
          coalesce(p.account_id::text, '')
      and lower(trim(coalesce(actual.raw_text, ''))) =
          lower(trim(coalesce(p.raw_text, '')))
      and lower(coalesce(actual.type::text, 'expense')) = p.type
  );
$$;
