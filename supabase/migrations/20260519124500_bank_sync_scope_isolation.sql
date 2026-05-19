alter table public.bank_accounts
  drop constraint if exists bank_accounts_provider_account_unique;

drop index if exists public.idx_bank_accounts_provider_account;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bank_accounts_connection_provider_account_unique'
  ) then
    alter table public.bank_accounts
      add constraint bank_accounts_connection_provider_account_unique
      unique (bank_connection_id, provider, provider_account_id);
  end if;
end $$;

alter table public.expenses
  drop constraint if exists expenses_provider_transaction_unique;

drop index if exists public.idx_expenses_provider_transaction;

create unique index if not exists idx_expenses_provider_bank_account_transaction
  on public.expenses(user_id, provider, bank_account_id, provider_transaction_id)
  where provider is not null
    and bank_account_id is not null
    and provider_transaction_id is not null;

create or replace function public.upsert_bank_connection_with_household(
  p_user_id uuid,
  p_provider text,
  p_provider_item_id text,
  p_access_token_encrypted text,
  p_refresh_token_encrypted text default null,
  p_expires_at timestamptz default null,
  p_country_code text default null,
  p_idempotency_key text default null,
  p_institution_name text default 'Bank Account',
  p_institution_logo text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  connection_id uuid,
  household_id uuid,
  is_new_connection boolean
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_connection_id uuid;
  v_household_id uuid;
  v_is_new boolean := false;
  v_lock_key bigint;
begin
  v_lock_key := hashtext(p_user_id::text || '|' || p_provider || '|' || p_provider_item_id);
  perform pg_advisory_xact_lock(v_lock_key);

  select bc.id, bc.household_id
    into v_connection_id, v_household_id
  from public.bank_connections bc
  where bc.user_id = p_user_id
    and bc.provider = p_provider
    and bc.provider_item_id = p_provider_item_id
  for update;

  if v_connection_id is not null then
    update public.bank_connections
    set access_token_encrypted = p_access_token_encrypted,
        plaid_access_token_encrypted = p_access_token_encrypted,
        refresh_token_encrypted = coalesce(p_refresh_token_encrypted, refresh_token_encrypted),
        expires_at = coalesce(p_expires_at, expires_at),
        status = 'active',
        country_code = coalesce(p_country_code, country_code),
        idempotency_key = coalesce(p_idempotency_key, idempotency_key),
        metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
        updated_at = now()
    where id = v_connection_id;
  else
    v_is_new := true;

    insert into public.bank_connections (
      user_id,
      provider,
      provider_item_id,
      plaid_item_id,
      access_token_encrypted,
      plaid_access_token_encrypted,
      refresh_token_encrypted,
      expires_at,
      status,
      country_code,
      idempotency_key,
      household_id,
      metadata
    ) values (
      p_user_id,
      p_provider,
      p_provider_item_id,
      p_provider_item_id,
      p_access_token_encrypted,
      p_access_token_encrypted,
      p_refresh_token_encrypted,
      p_expires_at,
      'active',
      p_country_code,
      p_idempotency_key,
      null,
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning id, household_id into v_connection_id, v_household_id;
  end if;

  return query select v_connection_id, v_household_id, v_is_new;

exception
  when unique_violation then
    select bc.id, bc.household_id
      into v_connection_id, v_household_id
    from public.bank_connections bc
    where bc.user_id = p_user_id
      and bc.provider = p_provider
      and bc.provider_item_id = p_provider_item_id;

    if v_connection_id is not null then
      return query select v_connection_id, v_household_id, false;
    end if;

    raise;
end;
$$;
