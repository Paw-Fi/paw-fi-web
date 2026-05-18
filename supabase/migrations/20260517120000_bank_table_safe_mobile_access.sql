-- Lock down sensitive bank base tables and expose sanitized mobile read RPCs.

drop policy if exists "Users read own bank connections" on public.bank_connections;
drop policy if exists "Users insert own bank connections" on public.bank_connections;
drop policy if exists "Users update own bank connections" on public.bank_connections;
drop policy if exists "Users delete own bank connections" on public.bank_connections;

drop policy if exists "Users read own bank accounts" on public.bank_accounts;
drop policy if exists "Users insert own bank accounts" on public.bank_accounts;
drop policy if exists "Users update own bank accounts" on public.bank_accounts;
drop policy if exists "Users delete own bank accounts" on public.bank_accounts;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('bank_connections', 'bank_accounts')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

revoke all on table public.bank_connections from anon, authenticated;
revoke all on table public.bank_accounts from anon, authenticated;

create policy "Bank connections service role only"
  on public.bank_connections
  for all
  to service_role
  using (true)
  with check (true);

create policy "Bank accounts service role only"
  on public.bank_accounts
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.sanitize_bank_connection_metadata(
  p_metadata jsonb
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'institution_id', p_metadata -> 'institution_id',
      'institution_name', p_metadata -> 'institution_name',
      'institution_logo', p_metadata -> 'institution_logo',
      'plaid_sync_status', p_metadata -> 'plaid_sync_status'
    )
  );
$$;

create or replace function public.list_mobile_bank_connections()
returns table (
  id uuid,
  user_id uuid,
  household_id uuid,
  provider text,
  status text,
  metadata jsonb,
  item_status text,
  item_health_state text,
  relink_state text,
  last_synced_at timestamptz,
  last_successful_sync_at timestamptz,
  next_manual_refresh_eligible_at timestamptz,
  scheduled_removal_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    bc.id,
    bc.user_id,
    bc.household_id,
    bc.provider,
    bc.status,
    public.sanitize_bank_connection_metadata(coalesce(bc.metadata, '{}'::jsonb)) as metadata,
    bc.item_status,
    bc.item_health_state,
    bc.relink_state,
    bc.last_synced_at,
    bc.last_successful_sync_at,
    bc.next_manual_refresh_eligible_at,
    bc.scheduled_removal_at
  from public.bank_connections bc
  where bc.user_id = auth.uid()
    and bc.removed_at is null;
$$;

create or replace function public.list_mobile_bank_accounts()
returns table (
  id uuid,
  user_id uuid,
  bank_connection_id uuid,
  provider text,
  name text,
  mask text,
  currency text,
  type text,
  subtype text,
  balance_current numeric,
  balance_available numeric,
  balance_limit numeric,
  bank_connections jsonb
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    ba.id,
    ba.user_id,
    ba.bank_connection_id,
    ba.provider,
    ba.name,
    ba.mask,
    ba.currency,
    ba.type,
    ba.subtype,
    null::numeric as balance_current,
    null::numeric as balance_available,
    null::numeric as balance_limit,
    jsonb_build_object(
      'household_id', bc.household_id,
      'status', bc.status,
      'provider', bc.provider
    ) as bank_connections
  from public.bank_accounts ba
  join public.bank_connections bc on bc.id = ba.bank_connection_id
  where ba.user_id = auth.uid()
    and bc.user_id = auth.uid()
    and bc.removed_at is null;
$$;

create or replace function public.get_mobile_bank_connection_sync_snapshot(
  p_connection_id uuid
)
returns table (
  status text,
  item_status text,
  relink_state text,
  last_successful_sync_at timestamptz,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    bc.status,
    bc.item_status,
    bc.relink_state,
    bc.last_successful_sync_at,
    public.sanitize_bank_connection_metadata(coalesce(bc.metadata, '{}'::jsonb)) as metadata
  from public.bank_connections bc
  where bc.id = p_connection_id
    and bc.user_id = auth.uid()
    and bc.removed_at is null
  limit 1;
$$;

create or replace function public.get_latest_bank_connection_sync_at()
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select max(bc.last_synced_at)
  from public.bank_connections bc
  where bc.user_id = auth.uid()
    and bc.removed_at is null;
$$;

revoke all on function public.sanitize_bank_connection_metadata(jsonb) from public, anon, authenticated;
revoke all on function public.list_mobile_bank_connections() from public, anon, authenticated;
revoke all on function public.list_mobile_bank_accounts() from public, anon, authenticated;
revoke all on function public.get_mobile_bank_connection_sync_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.get_latest_bank_connection_sync_at() from public, anon, authenticated;
grant execute on function public.list_mobile_bank_connections() to authenticated;
grant execute on function public.list_mobile_bank_accounts() to authenticated;
grant execute on function public.get_mobile_bank_connection_sync_snapshot(uuid) to authenticated;
grant execute on function public.get_latest_bank_connection_sync_at() to authenticated;
