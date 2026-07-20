set lock_timeout = '5s';
set statement_timeout = '10min';

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
  v_signature text;
  v_lock_key text;
  v_scope_key text;
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

  if not found then
    raise exception 'Plaid bank account owner does not match its connection'
      using errcode = '23503';
  end if;

  v_scope_key := case
    when v_household_id is null then 'user:' || new.user_id::text
    else 'household:' || v_household_id::text
  end;

  v_persistent_id := nullif(
    trim(coalesce(new.provider_persistent_account_id, '')),
    ''
  );
  v_provider_account_id := nullif(
    trim(coalesce(new.provider_account_id, '')),
    ''
  );
  v_currency := nullif(upper(trim(coalesce(new.currency, ''))), '');
  v_name := nullif(lower(trim(coalesce(new.name, ''))), '');
  v_mask := nullif(lower(trim(coalesce(new.mask, ''))), '');
  v_type := nullif(lower(trim(coalesce(new.type, ''))), '');
  v_subtype := nullif(lower(trim(coalesce(new.subtype, ''))), '');

  if v_institution_id is not null
    and v_currency is not null
    and v_name is not null
    and v_mask is not null
    and v_type is not null
    and v_subtype is not null then
    v_signature := v_institution_id || ':' || v_currency || ':' ||
      v_name || ':' || v_mask || ':' || v_type || ':' || v_subtype;
  end if;

  for v_lock_key in
    select lock_key
    from unnest(array[
      case when v_provider_account_id is not null
        then 'provider:' || v_provider_account_id end,
      case when v_persistent_id is not null
        then 'persistent:' || v_persistent_id end,
      case when v_signature is not null
        then 'signature:' || v_signature end
    ]) as lock_keys(lock_key)
    where lock_key is not null
    order by lock_key
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      v_scope_key || ':' || v_lock_key,
      0
    ));
  end loop;

  if exists (
    select 1
    from public.bank_accounts account
    join public.bank_connections connection
      on connection.id = account.bank_connection_id
    where account.id <> new.id
      and account.provider = 'plaid'
      and connection.provider = 'plaid'
      and connection.household_id is not distinct from v_household_id
      and (
        v_household_id is not null
        or account.user_id = new.user_id
      )
      and connection.removed_at is null
      and connection.status in ('pending', 'active', 'needs_reauth', 'error')
      and (
        case
          when v_persistent_id is not null
            and nullif(trim(coalesce(
              account.provider_persistent_account_id,
              ''
            )), '') is not null then
            nullif(trim(coalesce(
              account.provider_persistent_account_id,
              ''
            )), '') = v_persistent_id
          else
            (
              v_provider_account_id is not null
              and nullif(trim(coalesce(account.provider_account_id, '')), '') =
                v_provider_account_id
            )
            or (
              account.bank_connection_id is distinct from
                new.bank_connection_id
              and v_signature is not null
              and nullif(trim(connection.metadata ->> 'institution_id'), '') =
                v_institution_id
              and nullif(upper(trim(coalesce(account.currency, ''))), '') =
                v_currency
              and nullif(lower(trim(coalesce(account.name, ''))), '') = v_name
              and nullif(lower(trim(coalesce(account.mask, ''))), '') = v_mask
              and nullif(lower(trim(coalesce(account.type, ''))), '') = v_type
              and nullif(lower(trim(coalesce(account.subtype, ''))), '') =
                v_subtype
            )
        end
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
before insert or update of user_id, provider, provider_account_id,
  provider_persistent_account_id, bank_connection_id, currency, name, mask,
  type, subtype
on public.bank_accounts
for each row
execute function public.prevent_duplicate_plaid_persistent_account_v1();

create or replace function public.get_plaid_duplicate_inventory_v1()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with active_accounts as (
    select
      account.id as bank_account_id,
      account.user_id,
      account.bank_connection_id,
      connection.household_id,
      case
        when connection.household_id is null
          then 'user:' || account.user_id::text
        else 'household:' || connection.household_id::text
      end as scope_key,
      nullif(trim(connection.metadata ->> 'institution_id'), '') as
        institution_id,
      nullif(trim(coalesce(account.provider_persistent_account_id, '')), '') as
        persistent_account_id,
      nullif(trim(coalesce(account.provider_account_id, '')), '') as
        provider_account_id,
      nullif(upper(trim(coalesce(account.currency, ''))), '') as currency,
      nullif(lower(trim(coalesce(account.name, ''))), '') as name,
      nullif(lower(trim(coalesce(account.mask, ''))), '') as mask,
      nullif(lower(trim(coalesce(account.type, ''))), '') as type,
      nullif(lower(trim(coalesce(account.subtype, ''))), '') as subtype
    from public.bank_accounts account
    join public.bank_connections connection
      on connection.id = account.bank_connection_id
    where account.provider = 'plaid'
      and connection.provider = 'plaid'
      and connection.removed_at is null
      and connection.status in ('pending', 'active', 'needs_reauth', 'error')
  ), duplicate_pairs as (
    select
      left_account.user_id,
      left_account.household_id,
      left_account.scope_key,
      left_account.bank_account_id as left_bank_account_id,
      right_account.bank_account_id as right_bank_account_id,
      case
        when left_account.persistent_account_id is not null
          and right_account.persistent_account_id is not null then
          'persistent_account_id'
        when left_account.provider_account_id is not null
          and left_account.provider_account_id =
            right_account.provider_account_id then
          'provider_account_id_incomplete_persistent_identity'
        else 'account_signature_incomplete_persistent_identity'
      end as match_basis
    from active_accounts left_account
    join active_accounts right_account
      on right_account.scope_key = left_account.scope_key
      and right_account.bank_connection_id is distinct from
        left_account.bank_connection_id
      and right_account.bank_account_id > left_account.bank_account_id
    where
      case
        when left_account.persistent_account_id is not null
          and right_account.persistent_account_id is not null then
          left_account.persistent_account_id =
            right_account.persistent_account_id
        else
          (
            left_account.provider_account_id is not null
            and left_account.provider_account_id =
              right_account.provider_account_id
          )
          or (
            left_account.institution_id is not null
            and left_account.institution_id = right_account.institution_id
            and left_account.currency is not null
            and left_account.currency = right_account.currency
            and left_account.name is not null
            and left_account.name = right_account.name
            and left_account.mask is not null
            and left_account.mask = right_account.mask
            and left_account.type is not null
            and left_account.type = right_account.type
            and left_account.subtype is not null
            and left_account.subtype = right_account.subtype
          )
      end
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', duplicate_pair.user_id,
    'household_id', duplicate_pair.household_id,
    'scope_key', duplicate_pair.scope_key,
    'match_basis', duplicate_pair.match_basis,
    'identity_resolution', case
      when duplicate_pair.match_basis = 'persistent_account_id'
        then 'confirmed'
      else 'incomplete'
    end,
    'accounts', jsonb_build_array(
      to_jsonb(left_account),
      to_jsonb(right_account)
    )
  ) order by duplicate_pair.user_id, duplicate_pair.left_bank_account_id,
    duplicate_pair.right_bank_account_id), '[]'::jsonb)
  from duplicate_pairs duplicate_pair
  join active_accounts left_account
    on left_account.bank_account_id = duplicate_pair.left_bank_account_id
  join active_accounts right_account
    on right_account.bank_account_id = duplicate_pair.right_bank_account_id;
$$;

revoke all on function public.get_plaid_duplicate_inventory_v1()
  from public, anon, authenticated;
grant execute on function public.get_plaid_duplicate_inventory_v1()
  to service_role;
