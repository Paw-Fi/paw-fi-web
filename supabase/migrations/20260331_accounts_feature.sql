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
  if auth.uid() is not null then
    if p_household_id is null and auth.uid() <> p_user_id then
      return null;
    end if;

    if p_household_id is not null and not exists (
      select 1
      from public.household_members hm
      where hm.household_id = p_household_id
        and hm.user_id = auth.uid()
    ) then
      return null;
    end if;
  end if;

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

create or replace function public.resolve_spending_account(
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
  if auth.uid() is not null then
    if p_household_id is null and auth.uid() <> p_user_id then
      return null;
    end if;

    if p_household_id is not null and not exists (
      select 1
      from public.household_members hm
      where hm.household_id = p_household_id
        and hm.user_id = auth.uid()
    ) then
      return null;
    end if;
  end if;

  if p_household_id is null then
    select a.id into v_account_id
    from public.accounts a
    where a.user_id = p_user_id
      and a.household_id is null
      and a.is_archived = false
      and a.is_system = true
      and lower(trim(a.name)) = 'spending'
    order by a.created_at asc
    limit 1;
  else
    select a.id into v_account_id
    from public.accounts a
    where a.household_id = p_household_id
      and a.is_archived = false
      and a.is_system = true
      and lower(trim(a.name)) = 'spending'
    order by a.created_at asc
    limit 1;
  end if;

  return v_account_id;
end;
$$;

create or replace function public.ensure_personal_spending_account(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  v_account_id := (
    select a.id
    from public.accounts a
    where a.user_id = p_user_id
      and a.household_id is null
      and a.is_archived = false
      and a.is_default = true
    order by a.created_at asc
    limit 1
  );

  if v_account_id is not null then
    return v_account_id;
  end if;

  v_account_id := (
    select a.id
    from public.accounts a
    where a.user_id = p_user_id
      and a.household_id is null
      and a.is_archived = false
      and a.is_system = true
      and lower(trim(a.name)) = 'spending'
    order by a.created_at asc
    limit 1
  );

  if v_account_id is not null then
    update public.accounts
    set
      is_default = true,
      updated_at = now()
    where id = v_account_id
      and not exists (
        select 1
        from public.accounts a
        where a.user_id = p_user_id
          and a.household_id is null
          and a.is_archived = false
          and a.is_default = true
      );

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
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  )
  values (
    v_account_id,
    p_user_id,
    null,
    'Spending',
    'wallet',
    '#6B7280',
    0,
    not exists (
      select 1
      from public.accounts a
      where a.user_id = p_user_id
        and a.household_id is null
        and a.is_archived = false
        and a.is_default = true
    ),
    true,
    false
  );

  return v_account_id;
end;
$$;

create or replace function public.ensure_expense_account_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and new.account_id is null then
    new.account_id := public.resolve_default_account(new.user_id, new.household_id);
  end if;

  if new.account_id is not null and not exists (
    select 1
    from public.accounts a
    where a.id = new.account_id
      and a.is_archived = false
      and (
        (
          new.household_id is null
          and a.household_id is null
          and a.user_id = new.user_id
        )
        or (
          new.household_id is not null
          and a.household_id = new.household_id
        )
      )
  ) then
    raise exception 'account_id does not belong to expense scope';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_system_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      if old.household_id is not null
        and old.household_id::text = any(
          string_to_array(
            coalesce(current_setting('moneko.deleting_household_ids', true), ''),
            ','
          )
        ) then
        return old;
      end if;

      raise exception 'System account cannot be deleted';
    end if;

    return old;
  end if;

  if old.is_system and (
    new.user_id is distinct from old.user_id
    or new.household_id is distinct from old.household_id
    or new.name is distinct from old.name
    or new.icon is distinct from old.icon
    or new.color is distinct from old.color
    or new.opening_balance_cents is distinct from old.opening_balance_cents
    or new.goal_amount_cents is distinct from old.goal_amount_cents
    or new.is_system is distinct from old.is_system
    or new.is_archived is distinct from old.is_archived
    or new.linked_bank_account_id is distinct from old.linked_bank_account_id
  ) then
    raise exception 'System account cannot be modified';
  end if;

  return new;
end;
$$;

create or replace function public.prepare_household_delete_wallet_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_allowed text;
begin
  v_existing_allowed := current_setting(
    'moneko.deleting_household_ids',
    true
  );

  perform set_config(
    'moneko.deleting_household_ids',
    case
      when nullif(v_existing_allowed, '') is null then old.id::text
      else v_existing_allowed || ',' || old.id::text
    end,
    true
  );

  delete from public.account_transfers t
  where t.household_id = old.id
     or exists (
       select 1
       from public.accounts a
       where a.household_id = old.id
         and (a.id = t.from_account_id or a.id = t.to_account_id)
     );

  with target_expenses as (
    select
      e.id,
      coalesce(e.user_id, uc.user_id, old.owner_id) as target_user_id
    from public.expenses e
    left join public.user_contacts uc on uc.id = e.contact_id
    where e.household_id = old.id
  ),
  target_accounts as (
    select distinct
      target_user_id,
      public.ensure_personal_spending_account(target_user_id) as account_id
    from target_expenses
    where target_user_id is not null
  )
  update public.expenses e
  set
    user_id = te.target_user_id,
    household_id = null,
    account_id = ta.account_id,
    split_group_id = null,
    updated_at = now()
  from target_expenses te
  join target_accounts ta
    on ta.target_user_id = te.target_user_id
  where e.id = te.id;

  return old;
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
set account_id = public.resolve_spending_account(e.user_id, e.household_id)
where e.account_id is null
  and e.user_id is not null;

update public.expenses e
set account_id = public.resolve_spending_account(null, e.household_id)
where e.account_id is null
  and e.user_id is null
  and e.household_id is not null;

do $$
begin
  if to_regclass('public.user_contacts') is not null then
    update public.expenses e
    set account_id = public.resolve_spending_account(uc.user_id, null)
    from public.user_contacts uc
    where e.account_id is null
      and e.user_id is null
      and e.household_id is null
      and e.contact_id = uc.id
      and uc.user_id is not null;
  end if;
end;
$$;

update public.expenses e
set account_id = public.resolve_spending_account(e.user_id, e.household_id)
where e.user_id is not null
  and e.account_id is not null
  and not exists (
    select 1
    from public.accounts a
    where a.id = e.account_id
      and a.is_archived = false
      and (
        (
          e.household_id is null
          and a.household_id is null
          and a.user_id = e.user_id
        )
        or (
          e.household_id is not null
          and a.household_id = e.household_id
        )
      )
  );

update public.expenses e
set account_id = public.resolve_spending_account(null, e.household_id)
where e.user_id is null
  and e.household_id is not null
  and e.account_id is not null
  and not exists (
    select 1
    from public.accounts a
    where a.id = e.account_id
      and a.is_archived = false
      and a.household_id = e.household_id
  );

do $$
begin
  if to_regclass('public.user_contacts') is not null then
    update public.expenses e
    set account_id = public.resolve_spending_account(uc.user_id, null)
    from public.user_contacts uc
    where e.user_id is null
      and e.household_id is null
      and e.contact_id = uc.id
      and uc.user_id is not null
      and e.account_id is not null
      and not exists (
        select 1
        from public.accounts a
        where a.id = e.account_id
          and a.is_archived = false
          and a.household_id is null
          and a.user_id = uc.user_id
      );
  end if;
end;
$$;

alter table public.expenses
  drop constraint if exists expenses_account_id_fkey;

alter table public.expenses
  add constraint expenses_account_id_fkey
  foreign key (account_id) references public.accounts(id) on delete restrict;

drop trigger if exists expenses_account_id_defaults on public.expenses;
create trigger expenses_account_id_defaults
before insert or update of user_id, household_id, account_id on public.expenses
for each row execute function public.ensure_expense_account_id();

drop trigger if exists accounts_prevent_system_mutation on public.accounts;
create trigger accounts_prevent_system_mutation
before update or delete on public.accounts
for each row execute function public.prevent_system_account_mutation();

drop trigger if exists households_prepare_wallet_cleanup_before_delete
  on public.households;

create trigger households_prepare_wallet_cleanup_before_delete
before delete on public.households
for each row execute function public.prepare_household_delete_wallet_cleanup();

create or replace function public.delete_household(
  p_household_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'Not authenticated'
      using errcode = '28000';
  end if;

  delete from public.households h
  where h.id = p_household_id
    and h.owner_id = v_actor_id;

  if not found then
    if exists (
      select 1
      from public.households h
      where h.id = p_household_id
    ) then
      raise exception 'Only the space owner can delete this space'
        using errcode = '42501';
    end if;

    raise exception 'Space not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_household(uuid) from public;
revoke all on function public.delete_household(uuid) from anon;
grant execute on function public.delete_household(uuid) to authenticated;
grant execute on function public.delete_household(uuid) to service_role;

do $$
begin
  if exists (
    select 1
    from public.expenses e
    where e.account_id is null
  ) then
    raise exception 'Cannot enforce NOT NULL on public.expenses.account_id until all legacy rows can be mapped to a scope Spending wallet';
  end if;
end;
$$;

alter table public.expenses
  alter column account_id set not null;

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
  and exists (
    select 1
    from public.accounts fa
    join public.accounts ta on ta.id = account_transfers.to_account_id
    where fa.id = account_transfers.from_account_id
      and (
        (
          fa.household_id is null
          and ta.household_id is null
          and account_transfers.household_id is null
          and fa.user_id = auth.uid()
          and ta.user_id = auth.uid()
        )
        or (
          fa.household_id is not null
          and ta.household_id = fa.household_id
          and account_transfers.household_id = fa.household_id
          and exists (
            select 1
            from public.household_members hm
            where hm.household_id = fa.household_id
              and hm.user_id = auth.uid()
          )
        )
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
