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
stable
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
  left join public.household_members hm
    on hm.household_id = bc.household_id
    and hm.user_id = auth.uid()
  where bc.removed_at is null
    and coalesce(ba.status, 'active') = 'active'
    and (
      (bc.household_id is null and bc.user_id = auth.uid())
      or (bc.household_id is not null and hm.user_id is not null)
    );
end;
$$;

revoke all on function public.list_mobile_bank_accounts()
  from public, anon, authenticated;
grant execute on function public.list_mobile_bank_accounts() to authenticated;
