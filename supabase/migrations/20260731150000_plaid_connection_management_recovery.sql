-- Authoritative, wallet-independent Plaid management contract. The manually
-- executed incident diagnostics and support repair are intentionally excluded.
set lock_timeout = '5s';
set statement_timeout = '10min';

alter table public.plaid_link_update_sessions
  add column if not exists target_household_id uuid references public.households(id) on delete set null,
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists review_completed_at timestamptz,
  add column if not exists selected_account_ids jsonb not null default '[]'::jsonb;

update public.plaid_link_update_sessions session
set actor_user_id = session.user_id
where session.actor_user_id is null
  and exists (
    select 1
    from auth.users auth_user
    where auth_user.id = session.user_id
  );

create index if not exists idx_plaid_link_update_sessions_recovery
  on public.plaid_link_update_sessions(user_id, target_household_id, created_at desc)
  where consumed_at is null;

create or replace function public.complete_plaid_update_mode_v2(
  p_actor_user_id uuid,
  p_connection_id uuid,
  p_link_session_id uuid,
  p_mode text,
  p_household_id uuid,
  p_account_upserts jsonb,
  p_disabled_provider_account_ids text[],
  p_metadata jsonb,
  p_item_status text,
  p_link_request_id text,
  p_plaid_link_session_id text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_owner_user_id uuid;
begin
  if jsonb_typeof(coalesce(p_account_upserts, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid Plaid update-mode payload'
      using errcode = '22023';
  end if;

  select connection.user_id
  into v_connection_owner_user_id
  from public.bank_connections connection
  where connection.id = p_connection_id
    and connection.provider = 'plaid'
    and connection.household_id is not distinct from p_household_id
    and connection.removed_at is null
    and connection.status is distinct from 'disabled'
    and coalesce(connection.item_status, '') not in ('removed', 'pending_removal')
  for update;

  if v_connection_owner_user_id is null then
    raise exception 'Plaid connection not found' using errcode = 'P0002';
  end if;

  if p_household_id is null then
    if v_connection_owner_user_id is distinct from p_actor_user_id then
      raise exception 'Plaid connection access denied' using errcode = '42501';
    end if;
  elsif not exists (
    select 1
    from public.household_members member
    where member.household_id = p_household_id
      and member.user_id = p_actor_user_id
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'Plaid connection access denied' using errcode = '42501';
  end if;

  perform 1
  from public.plaid_link_update_sessions session
  where session.id = p_link_session_id
    and session.connection_id = p_connection_id
    and session.user_id = p_actor_user_id
    and coalesce(session.actor_user_id, session.user_id) = p_actor_user_id
    and session.target_household_id is not distinct from p_household_id
    and session.mode = p_mode
    and p_mode in ('update', 'reconnect')
    and session.processing_started_at is not null
    and session.consumed_at is null
    and session.expires_at > now()
  for update;

  if not found then
    raise exception 'Plaid update session is not claimable'
      using errcode = '40001';
  end if;

  if exists (
    select 1
    from jsonb_populate_recordset(
      null::public.bank_accounts,
      coalesce(p_account_upserts, '[]'::jsonb)
    ) incoming
    where incoming.user_id is distinct from v_connection_owner_user_id
      or incoming.bank_connection_id is distinct from p_connection_id
      or incoming.provider is distinct from 'plaid'
  ) then
    raise exception 'Plaid account payload is outside the connection scope'
      using errcode = '42501';
  end if;

  update public.plaid_link_update_sessions
  set user_id = v_connection_owner_user_id,
      actor_user_id = p_actor_user_id,
      updated_at = now()
  where id = p_link_session_id;

  return public.complete_plaid_update_mode_v1(
    p_user_id => v_connection_owner_user_id,
    p_connection_id => p_connection_id,
    p_link_session_id => p_link_session_id,
    p_mode => p_mode,
    p_household_id => p_household_id,
    p_account_upserts => p_account_upserts,
    p_disabled_provider_account_ids => p_disabled_provider_account_ids,
    p_metadata => p_metadata,
    p_item_status => p_item_status,
    p_link_request_id => p_link_request_id,
    p_plaid_link_session_id => p_plaid_link_session_id
  );
end;
$$;

revoke all on function public.complete_plaid_update_mode_v2(
  uuid, uuid, uuid, text, uuid, jsonb, text[], jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.complete_plaid_update_mode_v2(
  uuid, uuid, uuid, text, uuid, jsonb, text[], jsonb, text, text, text
) to service_role;

drop function if exists public.list_mobile_bank_connections();

create function public.list_mobile_bank_connections()
returns table (
  id uuid, user_id uuid, household_id uuid, provider text, status text,
  metadata jsonb, item_status text, item_health_state text, relink_state text,
  last_synced_at timestamptz, last_successful_sync_at timestamptz,
  next_manual_refresh_eligible_at timestamptz, scheduled_removal_at timestamptz,
  linked_bank_account_count bigint, linked_wallet_count bigint,
  can_reconnect boolean, can_disconnect boolean, can_review_accounts boolean,
  role_guidance text, latest_error_code text, review_completed_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.mark_mobile_plaid_financial_feature_used();
  return query
  with visible_connections as (
    select bc.*, hm.role as caller_role
    from public.bank_connections bc
    left join public.household_members hm
      on hm.household_id = bc.household_id and hm.user_id = auth.uid()
    where bc.removed_at is null
      and (
        (bc.household_id is null and bc.user_id = auth.uid())
        or (bc.household_id is not null and hm.user_id is not null)
      )
  ), counts as (
    select ba.bank_connection_id,
      count(*) filter (where coalesce(ba.status, 'active') = 'active') as bank_account_count,
      count(a.id) filter (where a.is_archived = false) as wallet_count
    from public.bank_accounts ba
    left join public.accounts a on a.linked_bank_account_id = ba.id
    group by ba.bank_connection_id
  )
  select vc.id, vc.user_id, vc.household_id, vc.provider, vc.status,
    public.sanitize_bank_connection_metadata(coalesce(vc.metadata, '{}'::jsonb)),
    vc.item_status, vc.item_health_state, vc.relink_state, vc.last_synced_at,
    vc.last_successful_sync_at, vc.next_manual_refresh_eligible_at, vc.scheduled_removal_at,
    coalesce(counts.bank_account_count, 0), coalesce(counts.wallet_count, 0),
    vc.provider = 'plaid'
      and (
        (vc.household_id is null and vc.user_id = auth.uid())
        or vc.caller_role in ('owner', 'admin')
      )
      and coalesce(vc.item_status, '') not in ('removed', 'pending_removal') as can_reconnect,
    vc.provider = 'plaid'
      and (
        (vc.household_id is null and vc.user_id = auth.uid())
        or vc.caller_role in ('owner', 'admin')
      )
      and coalesce(vc.item_status, '') not in ('removed', 'pending_removal') as can_disconnect,
    vc.provider = 'plaid'
      and (
        (vc.household_id is null and vc.user_id = auth.uid())
        or vc.caller_role in ('owner', 'admin')
      )
      and coalesce(vc.item_status, '') not in ('removed', 'pending_removal') as can_review_accounts,
    case when vc.household_id is null then null
         when vc.caller_role in ('owner', 'admin') then null
         else 'A household owner or admin must manage this bank connection.' end,
    vc.error_code,
    coalesce(session.review_completed_at, session.completed_at)
  from visible_connections vc
  left join counts on counts.bank_connection_id = vc.id
  left join lateral (
    select s.review_completed_at, s.completed_at
    from public.plaid_link_update_sessions s
    where s.connection_id = vc.id order by s.created_at desc limit 1
  ) session on true;
end;
$$;

revoke all on function public.list_mobile_bank_connections() from public, anon, authenticated;
grant execute on function public.list_mobile_bank_connections() to authenticated;

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
      and coalesce(connection.item_status, '') not in ('removed', 'pending_removal')
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

drop index if exists public.idx_bank_connections_user_duplicate_group_key;
drop index if exists public.idx_bank_connections_scope_duplicate_group_key;

do $$
begin
  if exists (
    select 1
    from public.bank_connections connection
    where connection.provider = 'plaid'
      and connection.duplicate_group_key is not null
      and connection.removed_at is null
      and connection.status in ('pending', 'active', 'needs_reauth', 'error')
      and coalesce(connection.item_status, '') not in ('removed', 'pending_removal')
    group by
      case
        when connection.household_id is null
          then 'user:' || connection.user_id::text
        else 'household:' || connection.household_id::text
      end,
      connection.duplicate_group_key
    having count(*) > 1
  ) then
    raise exception 'Active duplicate Plaid connection groups must be repaired before migration';
  end if;
end;
$$;

create unique index idx_bank_connections_scope_duplicate_group_key
  on public.bank_connections (
    (
      case
        when household_id is null then 'user:' || user_id::text
        else 'household:' || household_id::text
      end
    ),
    duplicate_group_key
  )
  where provider = 'plaid'
    and duplicate_group_key is not null
    and removed_at is null
    and status in ('pending', 'active', 'needs_reauth', 'error')
    and coalesce(item_status, '') not in ('removed', 'pending_removal');

create or replace function public.reactivate_plaid_connection_v1(
  p_actor_user_id uuid,
  p_connection_id uuid,
  p_household_id uuid,
  p_access_token_encrypted text,
  p_refresh_token_encrypted text,
  p_expires_at timestamptz,
  p_country_code text,
  p_duplicate_group_key text,
  p_idempotency_key text,
  p_metadata jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.bank_connections%rowtype;
begin
  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid Plaid connection metadata' using errcode = '22023';
  end if;

  select *
  into v_connection
  from public.bank_connections connection
  where connection.id = p_connection_id
    and connection.provider = 'plaid'
    and connection.household_id is not distinct from p_household_id
    and connection.removed_at is null
    and connection.status is distinct from 'disabled'
    and coalesce(connection.item_status, '') not in ('removed', 'pending_removal')
  for update;

  if v_connection.id is null then
    return false;
  end if;

  if p_household_id is null then
    if v_connection.user_id is distinct from p_actor_user_id then
      raise exception 'Plaid connection access denied' using errcode = '42501';
    end if;
  elsif not exists (
    select 1
    from public.household_members member
    where member.household_id = p_household_id
      and member.user_id = p_actor_user_id
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'Plaid connection access denied' using errcode = '42501';
  end if;

  update public.bank_connections
  set access_token_encrypted = p_access_token_encrypted,
      plaid_access_token_encrypted = p_access_token_encrypted,
      refresh_token_encrypted = p_refresh_token_encrypted,
      expires_at = p_expires_at,
      country_code = p_country_code,
      duplicate_group_key = p_duplicate_group_key,
      idempotency_key = p_idempotency_key,
      status = 'active',
      metadata = coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where id = p_connection_id;

  return true;
end;
$$;

revoke all on function public.reactivate_plaid_connection_v1(
  uuid, uuid, uuid, text, text, timestamptz, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.reactivate_plaid_connection_v1(
  uuid, uuid, uuid, text, text, timestamptz, text, text, text, jsonb
) to service_role;

create or replace function public.enforce_plaid_connection_limit_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_converted_paid boolean := false;
begin
  if new.provider is distinct from 'plaid'
    or new.removed_at is not null
    or new.status not in ('pending', 'active', 'needs_reauth', 'error')
    or coalesce(new.item_status, '') in ('removed', 'pending_removal') then
    return new;
  end if;

  if new.household_id is not null and not exists (
    select 1
    from public.household_members member
    where member.household_id = new.household_id
      and member.user_id = new.user_id
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'PLAID_HOUSEHOLD_MANAGEMENT_REQUIRED'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'plaid-connection-limit:' || new.user_id::text,
    0
  ));

  select
    subscription.status = 'active'
      and lower(trim(subscription.plan)) <> 'free'
      and (
        lower(trim(subscription.plan)) = 'lifetime'
        or coalesce(
          subscription.current_period_end,
          subscription.trial_end
        ) > now()
      )
  into v_is_converted_paid
  from public.subscriptions subscription
  where subscription.user_id = new.user_id
  order by subscription.created_at desc
  limit 1;

  if coalesce(v_is_converted_paid, false) then
    return new;
  end if;

  if exists (
    select 1
    from public.bank_connections connection
    where connection.user_id = new.user_id
      and connection.provider = 'plaid'
      and connection.removed_at is null
      and connection.status in ('pending', 'active', 'needs_reauth', 'error')
      and coalesce(connection.item_status, '') not in ('removed', 'pending_removal')
  ) then
    raise exception 'PLAID_CONNECTION_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_plaid_connection_limit_v1
  on public.bank_connections;
create trigger enforce_plaid_connection_limit_v1
before insert on public.bank_connections
for each row
execute function public.enforce_plaid_connection_limit_v1();

create or replace function public.queue_plaid_connection_removal_v2(
  p_actor_user_id uuid,
  p_connection_id uuid,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection public.bank_connections%rowtype;
begin
  select *
  into v_connection
  from public.bank_connections connection
  where connection.id = p_connection_id
    and connection.provider = 'plaid'
  for update;

  if v_connection.id is null then
    return false;
  end if;

  if v_connection.household_id is null then
    if v_connection.user_id is distinct from p_actor_user_id then
      raise exception 'Plaid connection access denied' using errcode = '42501';
    end if;
  elsif not exists (
    select 1
    from public.household_members member
    where member.household_id = v_connection.household_id
      and member.user_id = p_actor_user_id
      and member.role in ('owner', 'admin')
  ) then
    raise exception 'Plaid connection access denied' using errcode = '42501';
  end if;

  return public.queue_plaid_connection_removal_v1(
    p_connection_id => p_connection_id,
    p_reason => p_reason
  );
end;
$$;

revoke all on function public.queue_plaid_connection_removal_v2(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.queue_plaid_connection_removal_v2(uuid, uuid, text)
  to service_role;

notify pgrst, 'reload schema';
