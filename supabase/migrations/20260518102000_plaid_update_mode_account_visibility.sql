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
    and bc.removed_at is null
    and coalesce(ba.status, 'active') = 'active';
$$;

revoke all on function public.list_mobile_bank_accounts() from public, anon, authenticated;
grant execute on function public.list_mobile_bank_accounts() to authenticated;
