-- Align default wallet uniqueness with multi-currency scopes.
-- Rule: one active default wallet per (scope, currency).

-- Remove legacy scope-only uniqueness.
drop index if exists public.idx_accounts_default_personal;
drop index if exists public.idx_accounts_default_household;

-- Also remove any prior currency-scoped indexes so this migration is idempotent.
drop index if exists public.idx_accounts_default_personal_currency;
drop index if exists public.idx_accounts_default_household_currency;

-- Keep at most one default wallet per personal scope + currency.
with ranked_personal as (
  select
    a.id,
    row_number() over (
      partition by a.user_id, upper(trim(a.currency))
      order by
        case when a.is_default then 0 else 1 end,
        case when a.is_system then 0 else 1 end,
        a.created_at asc,
        a.id
    ) as rn
  from public.accounts a
  where a.household_id is null
    and a.is_archived = false
)
update public.accounts a
set
  is_default = ranked_personal.rn = 1,
  updated_at = now()
from ranked_personal
where a.id = ranked_personal.id
  and a.is_default is distinct from (ranked_personal.rn = 1);

-- Keep at most one default wallet per household scope + currency.
with ranked_household as (
  select
    a.id,
    row_number() over (
      partition by a.household_id, upper(trim(a.currency))
      order by
        case when a.is_default then 0 else 1 end,
        case when a.is_system then 0 else 1 end,
        a.created_at asc,
        a.id
    ) as rn
  from public.accounts a
  where a.household_id is not null
    and a.is_archived = false
)
update public.accounts a
set
  is_default = ranked_household.rn = 1,
  updated_at = now()
from ranked_household
where a.id = ranked_household.id
  and a.is_default is distinct from (ranked_household.rn = 1);

-- Enforce the new multi-currency uniqueness.
create unique index idx_accounts_default_personal_currency
  on public.accounts (user_id, (upper(trim(currency))))
  where household_id is null
    and is_default = true
    and is_archived = false;

create unique index idx_accounts_default_household_currency
  on public.accounts (household_id, (upper(trim(currency))))
  where household_id is not null
    and is_default = true
    and is_archived = false;

-- Ensure newly created system Spending wallets become default when there is no
-- active default for the same scope + currency.
create or replace function public.ensure_spending_account_for_currency(
  p_user_id uuid,
  p_household_id uuid default null,
  p_currency text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_currency text;
  v_account_id uuid;
begin
  v_user_id := p_user_id;
  if p_household_id is not null then
    select h.owner_id into v_user_id
    from public.households h
    where h.id = p_household_id
    limit 1;
  end if;

  if v_user_id is null then
    return null;
  end if;

  v_currency := coalesce(
    upper(nullif(trim(p_currency), '')),
    public.resolve_account_currency(v_user_id, p_household_id),
    'USD'
  );

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid account currency: %', v_currency
      using errcode = '23514';
  end if;

  select a.id into v_account_id
  from public.accounts a
  where a.currency = v_currency
    and a.is_archived = false
    and a.is_system = true
    and lower(trim(a.name)) = 'spending'
    and (
      (p_household_id is null and a.user_id = v_user_id and a.household_id is null)
      or (p_household_id is not null and a.household_id = p_household_id)
    )
  order by a.created_at asc
  limit 1;

  if v_account_id is not null then
    return v_account_id;
  end if;

  v_account_id := gen_random_uuid();

  insert into public.accounts (
    id,
    user_id,
    household_id,
    name,
    icon,
    color,
    currency,
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  )
  values (
    v_account_id,
    v_user_id,
    p_household_id,
    'Spending',
    'wallet',
    '#6B7280',
    v_currency,
    0,
    not exists (
      select 1
      from public.accounts a
      where a.is_archived = false
        and a.is_default = true
        and a.currency = v_currency
        and (
          (p_household_id is null and a.user_id = v_user_id and a.household_id is null)
          or (p_household_id is not null and a.household_id = p_household_id)
        )
    ),
    true,
    false
  );

  return v_account_id;
end;
$$;

revoke execute on function public.ensure_spending_account_for_currency(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.ensure_spending_account_for_currency(uuid, uuid, text) to service_role;
