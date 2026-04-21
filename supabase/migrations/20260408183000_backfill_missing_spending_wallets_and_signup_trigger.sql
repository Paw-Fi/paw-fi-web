lock table auth.users in share row exclusive mode;
lock table public.households in share row exclusive mode;
lock table public.accounts in share row exclusive mode;

create or replace function public.create_default_spending_account_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (
    user_id,
    household_id,
    name,
    icon,
    color,
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  )
  select
    new.id,
    null,
    'Spending',
    'wallet',
    '#6B7280',
    0,
    not exists (
      select 1
      from public.accounts a
      where a.user_id = new.id
        and a.household_id is null
        and a.is_archived = false
        and a.is_default = true
    ),
    true,
    false
  where not exists (
    select 1
    from public.accounts a
    where a.user_id = new.id
      and a.household_id is null
      and a.is_system = true
      and a.is_archived = false
      and lower(trim(a.name)) = 'spending'
  );

  return new;
end;
$$;

create or replace function public.create_default_spending_account_for_new_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (
    user_id,
    household_id,
    name,
    icon,
    color,
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  )
  select
    new.owner_id,
    new.id,
    'Spending',
    'wallet',
    '#6B7280',
    0,
    not exists (
      select 1
      from public.accounts a
      where a.household_id = new.id
        and a.is_archived = false
        and a.is_default = true
    ),
    true,
    false
  where not exists (
    select 1
    from public.accounts a
    where a.household_id = new.id
      and a.is_system = true
      and a.is_archived = false
      and lower(trim(a.name)) = 'spending'
  );

  return new;
end;
$$;

insert into public.accounts (
  user_id,
  household_id,
  name,
  icon,
  color,
  opening_balance_cents,
  is_default,
  is_system,
  is_archived
)
select
  u.id,
  null,
  'Spending',
  'wallet',
  '#6B7280',
  0,
  not exists (
    select 1
    from public.accounts a
    where a.user_id = u.id
      and a.household_id is null
      and a.is_archived = false
      and a.is_default = true
  ),
  true,
  false
from auth.users u
where not exists (
  select 1
  from public.accounts a
  where a.user_id = u.id
    and a.household_id is null
    and a.is_system = true
    and a.is_archived = false
    and lower(trim(a.name)) = 'spending'
);

insert into public.accounts (
  user_id,
  household_id,
  name,
  icon,
  color,
  opening_balance_cents,
  is_default,
  is_system,
  is_archived
)
select
  h.owner_id,
  h.id,
  'Spending',
  'wallet',
  '#6B7280',
  0,
  not exists (
    select 1
    from public.accounts a
    where a.household_id = h.id
      and a.is_archived = false
      and a.is_default = true
  ),
  true,
  false
from public.households h
where not exists (
  select 1
  from public.accounts a
  where a.household_id = h.id
    and a.is_system = true
    and a.is_archived = false
    and lower(trim(a.name)) = 'spending'
);

drop trigger if exists trigger_create_default_spending_account_for_new_user on auth.users;

create trigger trigger_create_default_spending_account_for_new_user
after insert on auth.users
for each row execute function public.create_default_spending_account_for_new_user();

drop trigger if exists trigger_create_default_spending_account_for_new_household on public.households;

create trigger trigger_create_default_spending_account_for_new_household
after insert on public.households
for each row execute function public.create_default_spending_account_for_new_household();
