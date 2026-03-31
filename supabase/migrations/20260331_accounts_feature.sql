-- Accounts feature schema: first-class scope-owned financial accounts.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  opening_balance_cents bigint not null default 0,
  goal_amount_cents bigint null,
  is_default boolean not null default false,
  is_system boolean not null default false,
  is_archived boolean not null default false,
  linked_bank_account_id uuid null references public.bank_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_not_empty check (length(trim(name)) > 0)
);

create index if not exists idx_accounts_scope
  on public.accounts (user_id, household_id, is_archived);

create unique index if not exists idx_accounts_default_personal
  on public.accounts (user_id)
  where household_id is null and is_default = true and is_archived = false;

create unique index if not exists idx_accounts_default_household
  on public.accounts (household_id)
  where household_id is not null and is_default = true and is_archived = false;

alter table public.expenses
  add column if not exists account_id uuid null references public.accounts(id) on delete set null;

create index if not exists idx_expenses_account_id
  on public.expenses (account_id)
  where account_id is not null;

create table if not exists public.account_transfers (
  id uuid primary key default gen_random_uuid(),
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount_cents bigint not null,
  currency text not null,
  date date not null,
  note text null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid null references public.households(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_transfers_positive_amount check (amount_cents > 0),
  constraint account_transfers_distinct_accounts check (from_account_id <> to_account_id)
);

create index if not exists idx_account_transfers_from_date
  on public.account_transfers (from_account_id, date desc);

create index if not exists idx_account_transfers_to_date
  on public.account_transfers (to_account_id, date desc);

create or replace function public.resolve_default_account(
  p_user_id uuid,
  p_household_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  if p_household_id is null then
    select a.id into v_account_id
    from public.accounts a
    where a.user_id = p_user_id
      and a.household_id is null
      and a.is_archived = false
      and a.is_default = true
    limit 1;

    if v_account_id is null then
      select a.id into v_account_id
      from public.accounts a
      where a.user_id = p_user_id
        and a.household_id is null
        and a.is_archived = false
        and a.is_system = true
      order by a.created_at asc
      limit 1;
    end if;
  else
    select a.id into v_account_id
    from public.accounts a
    where a.household_id = p_household_id
      and a.is_archived = false
      and a.is_default = true
    limit 1;

    if v_account_id is null then
      select a.id into v_account_id
      from public.accounts a
      where a.household_id = p_household_id
        and a.is_archived = false
        and a.is_system = true
      order by a.created_at asc
      limit 1;
    end if;
  end if;

  return v_account_id;
end;
$$;

-- Provision one non-deletable system spending account for every scope.
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
  true,
  true,
  false
from auth.users u
where not exists (
  select 1
  from public.accounts a
  where a.user_id = u.id
    and a.household_id is null
    and a.is_system = true
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
  true,
  true,
  false
from public.households h
where not exists (
  select 1
  from public.accounts a
  where a.household_id = h.id
    and a.is_system = true
);

-- Ensure one default account per scope after provisioning.
update public.accounts a
set is_default = false
where a.is_archived = false
  and a.is_default = true
  and a.id not in (
    select distinct on (coalesce(household_id::text, user_id::text)) id
    from public.accounts
    where is_archived = false
      and is_default = true
    order by coalesce(household_id::text, user_id::text), is_system desc, created_at asc
  );

update public.expenses e
set account_id = public.resolve_default_account(e.user_id, e.household_id)
where e.account_id is null
  and e.user_id is not null;

alter table public.accounts enable row level security;
alter table public.account_transfers enable row level security;

drop policy if exists "Accounts readable by scope" on public.accounts;
create policy "Accounts readable by scope"
on public.accounts for select
using (
  (
    household_id is null and user_id = auth.uid()
  )
  or (
    household_id is not null and exists (
      select 1
      from public.household_members hm
      where hm.household_id = accounts.household_id
        and hm.user_id = auth.uid()
    )
  )
);

drop policy if exists "Accounts insert by scope" on public.accounts;
create policy "Accounts insert by scope"
on public.accounts for insert
with check (
  (
    household_id is null and user_id = auth.uid()
  )
  or (
    household_id is not null and exists (
      select 1
      from public.household_members hm
      where hm.household_id = accounts.household_id
        and hm.user_id = auth.uid()
    )
  )
);

drop policy if exists "Accounts update by scope" on public.accounts;
create policy "Accounts update by scope"
on public.accounts for update
using (
  (
    household_id is null and user_id = auth.uid()
  )
  or (
    household_id is not null and exists (
      select 1
      from public.household_members hm
      where hm.household_id = accounts.household_id
        and hm.user_id = auth.uid()
    )
  )
)
with check (
  (
    household_id is null and user_id = auth.uid()
  )
  or (
    household_id is not null and exists (
      select 1
      from public.household_members hm
      where hm.household_id = accounts.household_id
        and hm.user_id = auth.uid()
    )
  )
);

drop policy if exists "Accounts delete by scope" on public.accounts;
create policy "Accounts delete by scope"
on public.accounts for delete
using (
  (
    household_id is null and user_id = auth.uid()
  )
  or (
    household_id is not null and exists (
      select 1
      from public.household_members hm
      where hm.household_id = accounts.household_id
        and hm.user_id = auth.uid()
    )
  )
);

drop policy if exists "Transfers readable by scope" on public.account_transfers;
create policy "Transfers readable by scope"
on public.account_transfers for select
using (
  (
    household_id is null and created_by_user_id = auth.uid()
  )
  or (
    household_id is not null and exists (
      select 1
      from public.household_members hm
      where hm.household_id = account_transfers.household_id
        and hm.user_id = auth.uid()
    )
  )
);

drop policy if exists "Transfers insert by scope" on public.account_transfers;
create policy "Transfers insert by scope"
on public.account_transfers for insert
with check (
  created_by_user_id = auth.uid()
  and (
    (household_id is null)
    or exists (
      select 1
      from public.household_members hm
      where hm.household_id = account_transfers.household_id
        and hm.user_id = auth.uid()
    )
  )
  and exists (
    select 1
    from public.accounts fa
    join public.accounts ta on ta.id = account_transfers.to_account_id
    where fa.id = account_transfers.from_account_id
      and (
        (fa.household_id is null and ta.household_id is null and fa.user_id = auth.uid() and ta.user_id = auth.uid())
        or (fa.household_id is not null and ta.household_id = fa.household_id)
      )
  )
);

drop policy if exists "Transfers update by creator" on public.account_transfers;
create policy "Transfers update by creator"
on public.account_transfers for update
using (created_by_user_id = auth.uid())
with check (created_by_user_id = auth.uid());

drop policy if exists "Transfers delete by creator" on public.account_transfers;
create policy "Transfers delete by creator"
on public.account_transfers for delete
using (created_by_user_id = auth.uid());

drop trigger if exists accounts_updated_at on public.accounts;
create trigger accounts_updated_at
before update on public.accounts
for each row execute function update_updated_at_column();

drop trigger if exists account_transfers_updated_at on public.account_transfers;
create trigger account_transfers_updated_at
before update on public.account_transfers
for each row execute function update_updated_at_column();
