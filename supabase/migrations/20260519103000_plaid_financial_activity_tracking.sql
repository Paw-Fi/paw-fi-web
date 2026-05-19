create or replace function public.mark_mobile_plaid_financial_feature_used()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  update public.bank_connections bc
  set
    last_financial_feature_used_at = now(),
    billing_keep_reason = 'active_paid_use',
    updated_at = now()
  where bc.user_id = v_user_id
    and bc.provider = 'plaid'
    and bc.status = 'active'
    and bc.removed_at is null
    and exists (
      select 1
      from public.subscriptions s
      where s.user_id = v_user_id
        and s.status = 'active'
        and (
          s.current_period_end is null
          or s.current_period_end > now()
        )
    );
end;
$$;

revoke all on function public.mark_mobile_plaid_financial_feature_used() from public, anon, authenticated;
grant execute on function public.mark_mobile_plaid_financial_feature_used() to authenticated;

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
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.mark_mobile_plaid_financial_feature_used();

  return query
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
end;
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
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.mark_mobile_plaid_financial_feature_used();

  return query
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
    and bc.removed_at is null
    and coalesce(ba.status, 'active') = 'active';
end;
$$;

revoke all on function public.list_mobile_bank_connections() from public, anon, authenticated;
revoke all on function public.list_mobile_bank_accounts() from public, anon, authenticated;

grant execute on function public.list_mobile_bank_connections() to authenticated;
grant execute on function public.list_mobile_bank_accounts() to authenticated;
