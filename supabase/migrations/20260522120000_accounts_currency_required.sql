alter table public.accounts
  add column if not exists currency text;

create or replace function public.resolve_account_currency(
  p_user_id uuid,
  p_household_id uuid default null
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case
      when p_household_id is not null then (
        select upper(nullif(trim(h.currency), ''))
        from public.households h
        where h.id = p_household_id
          and upper(nullif(trim(h.currency), '')) ~ '^[A-Z]{3}$'
        limit 1
      )
      else null
    end,
    (
      select upper(nullif(trim(uc.preferred_currency), ''))
      from public.user_contacts uc
      where uc.user_id = p_user_id
        and upper(nullif(trim(uc.preferred_currency), '')) ~ '^[A-Z]{3}$'
      order by uc.updated_at desc nulls last, uc.created_at desc nulls last, uc.id desc
      limit 1
    ),
    'USD'
  );
$$;

with inferred_account_currency as (
  select
    a.id,
    coalesce(
      (
        select upper(nullif(trim(activity.currency), ''))
        from (
          select e.currency, e.date, e.created_at
          from public.expenses e
          where e.account_id = a.id
            and nullif(trim(coalesce(e.currency, '')), '') is not null
          union all
          select t.currency, t.date, t.created_at
          from public.account_transfers t
          where t.from_account_id = a.id
             or t.to_account_id = a.id
        ) activity
        where upper(nullif(trim(activity.currency), '')) ~ '^[A-Z]{3}$'
        order by activity.date desc nulls last, activity.created_at desc nulls last
        limit 1
      ),
      public.resolve_account_currency(a.user_id, a.household_id),
      'USD'
    ) as currency
  from public.accounts a
)
update public.accounts a
set
  currency = inferred.currency,
  updated_at = now()
from inferred_account_currency inferred
where a.id = inferred.id
  and (
    a.currency is null
    or nullif(trim(a.currency), '') is null
    or upper(trim(a.currency)) is distinct from inferred.currency
  );

update public.accounts
set currency = upper(trim(currency))
where currency is not null;

alter table public.accounts
  alter column currency set default 'USD';

alter table public.accounts
  alter column currency set not null;

alter table public.accounts
  drop constraint if exists accounts_currency_format;

alter table public.accounts
  add constraint accounts_currency_format
  check (currency ~ '^[A-Z]{3}$');

create index if not exists idx_accounts_scope_currency
  on public.accounts (user_id, household_id, currency, is_archived);

create or replace function public.normalize_account_currency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.currency := coalesce(
    upper(nullif(trim(new.currency), '')),
    public.resolve_account_currency(new.user_id, new.household_id),
    'USD'
  );

  if new.currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid account currency: %', new.currency
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_normalize_account_currency on public.accounts;

create trigger trigger_normalize_account_currency
before insert or update of currency, user_id, household_id on public.accounts
for each row execute function public.normalize_account_currency();

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

create or replace function public.resolve_default_account(
  p_user_id uuid,
  p_household_id uuid,
  p_currency text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text;
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

  v_currency := coalesce(
    upper(nullif(trim(p_currency), '')),
    public.resolve_account_currency(p_user_id, p_household_id),
    'USD'
  );

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid account currency: %', v_currency
      using errcode = '23514';
  end if;

  if p_household_id is null then
    select a.id into v_account_id
    from public.accounts a
    where a.user_id = p_user_id
      and a.household_id is null
      and a.currency = v_currency
      and a.is_archived = false
      and a.is_default = true
    limit 1;

    if v_account_id is null then
      select a.id into v_account_id
      from public.accounts a
      where a.user_id = p_user_id
        and a.household_id is null
        and a.currency = v_currency
        and a.is_archived = false
        and a.is_system = true
      order by a.created_at asc
      limit 1;
    end if;
  else
    select a.id into v_account_id
    from public.accounts a
    where a.household_id = p_household_id
      and a.currency = v_currency
      and a.is_archived = false
      and a.is_default = true
    limit 1;

    if v_account_id is null then
      select a.id into v_account_id
      from public.accounts a
      where a.household_id = p_household_id
        and a.currency = v_currency
        and a.is_archived = false
        and a.is_system = true
      order by a.created_at asc
      limit 1;
    end if;
  end if;

  return v_account_id;
end;
$$;

revoke execute on function public.resolve_account_currency(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.ensure_spending_account_for_currency(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.resolve_default_account(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.resolve_default_account(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_account_currency(uuid, uuid) to service_role;
grant execute on function public.ensure_spending_account_for_currency(uuid, uuid, text) to service_role;
grant execute on function public.resolve_default_account(uuid, uuid) to service_role;
grant execute on function public.resolve_default_account(uuid, uuid, text) to service_role;

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

  v_account_id := public.ensure_spending_account_for_currency(
    p_user_id,
    null,
    public.resolve_account_currency(p_user_id, null)
  );

  return v_account_id;
end;
$$;

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
    currency,
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
    public.resolve_account_currency(new.id, null),
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
    currency,
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
    public.resolve_account_currency(new.owner_id, new.id),
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

update public.expenses e
set
  account_id = public.ensure_spending_account_for_currency(
    coalesce(
      e.user_id,
      (
        select uc.user_id
        from public.user_contacts uc
        where uc.id = e.contact_id
        limit 1
      ),
      a.user_id
    ),
    e.household_id,
    e.currency
  ),
  updated_at = now()
from public.accounts a
where e.account_id = a.id
  and upper(nullif(trim(coalesce(e.currency, '')), '')) ~ '^[A-Z]{3}$'
  and upper(trim(e.currency)) <> a.currency;

update public.expenses e
set
  account_id = public.ensure_spending_account_for_currency(
    coalesce(
      e.user_id,
      (
        select uc.user_id
        from public.user_contacts uc
        where uc.id = e.contact_id
        limit 1
      )
    ),
    e.household_id,
    e.currency
  ),
  updated_at = now()
where e.account_id is null
  and upper(nullif(trim(coalesce(e.currency, '')), '')) ~ '^[A-Z]{3}$';

do $$
declare
  v_mismatched_transfer_count integer;
begin
  select count(*) into v_mismatched_transfer_count
  from public.account_transfers t
  join public.accounts from_account on from_account.id = t.from_account_id
  join public.accounts to_account on to_account.id = t.to_account_id
  where upper(nullif(trim(coalesce(t.currency, '')), '')) ~ '^[A-Z]{3}$'
    and (
      from_account.currency <> upper(trim(t.currency))
      or to_account.currency <> upper(trim(t.currency))
    );

  if v_mismatched_transfer_count > 0 then
    raise exception 'Found % account transfers whose currency does not match both wallets; repair these rows before applying accounts.currency enforcement', v_mismatched_transfer_count
      using errcode = '23514';
  end if;
end $$;

create or replace function public.ensure_expense_account_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_currency text;
  v_account record;
begin
  v_user_id := new.user_id;
  if v_user_id is null and new.contact_id is not null then
    select uc.user_id into v_user_id
    from public.user_contacts uc
    where uc.id = new.contact_id
    limit 1;
  end if;

  if v_user_id is null and new.household_id is not null then
    select h.owner_id into v_user_id
    from public.households h
    where h.id = new.household_id
    limit 1;
  end if;

  v_currency := coalesce(
    upper(nullif(trim(new.currency), '')),
    public.resolve_account_currency(v_user_id, new.household_id),
    'USD'
  );
  new.currency := v_currency;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid expense currency: %', v_currency
      using errcode = '23514';
  end if;

  if new.account_id is null then
    new.account_id := public.ensure_spending_account_for_currency(
      v_user_id,
      new.household_id,
      v_currency
    );
    return new;
  end if;

  select a.* into v_account
  from public.accounts a
  where a.id = new.account_id
  limit 1;

  if v_account.id is null or v_account.is_archived then
    raise exception 'Expense account is not available'
      using errcode = '23503';
  end if;

  if v_account.currency <> v_currency then
    raise exception 'Expense currency % does not match wallet currency %', v_currency, v_account.currency
      using errcode = '23514';
  end if;

  if new.household_id is null then
    if v_account.household_id is not null or v_account.user_id <> v_user_id then
      raise exception 'Expense account is outside the personal scope'
        using errcode = '23503';
    end if;
  elsif v_account.household_id is distinct from new.household_id then
    raise exception 'Expense account is outside the household scope'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

drop trigger if exists expenses_account_id_defaults on public.expenses;

create trigger expenses_account_id_defaults
before insert or update of user_id, household_id, account_id, currency on public.expenses
for each row execute function public.ensure_expense_account_id();

create or replace function public.ensure_account_transfer_currency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_currency text;
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
begin
  v_currency := upper(nullif(trim(new.currency), ''));
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid transfer currency: %', new.currency
      using errcode = '23514';
  end if;
  new.currency := v_currency;

  select * into v_from from public.accounts where id = new.from_account_id;
  select * into v_to from public.accounts where id = new.to_account_id;

  if v_from.id is null or v_to.id is null or v_from.is_archived or v_to.is_archived then
    raise exception 'Transfer wallet is not available'
      using errcode = '23503';
  end if;

  if v_from.currency <> v_currency or v_to.currency <> v_currency then
    raise exception 'Transfer currency % must match both wallet currencies', v_currency
      using errcode = '23514';
  end if;

  if v_from.household_id is distinct from v_to.household_id then
    raise exception 'Transfers cannot cross wallet spaces'
      using errcode = '23514';
  end if;

  if v_from.household_id is null and v_from.user_id <> v_to.user_id then
    raise exception 'Transfers cannot cross personal wallet owners'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_ensure_account_transfer_currency on public.account_transfers;

create trigger trigger_ensure_account_transfer_currency
before insert or update of from_account_id, to_account_id, currency on public.account_transfers
for each row execute function public.ensure_account_transfer_currency();

create or replace function public.prevent_system_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      if old.user_id::text = any(
        string_to_array(
          coalesce(current_setting('moneko.deleting_user_ids', true), ''),
          ','
        )
      ) then
        return old;
      end if;

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
    or new.currency is distinct from old.currency
    or new.is_system is distinct from old.is_system
    or new.is_archived is distinct from old.is_archived
    or new.linked_bank_account_id is distinct from old.linked_bank_account_id
  ) then
    raise exception 'System account scope cannot be modified';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_account_currency_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.currency = old.currency then
    return new;
  end if;

  if exists (
    select 1
    from public.expenses e
    where e.account_id = new.id
      and upper(nullif(trim(coalesce(e.currency, '')), '')) <> new.currency
  ) then
    raise exception 'Cannot change wallet currency while transactions use another currency'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.account_transfers t
    where (t.from_account_id = new.id or t.to_account_id = new.id)
      and upper(nullif(trim(coalesce(t.currency, '')), '')) <> new.currency
  ) then
    raise exception 'Cannot change wallet currency while transfers use another currency'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_prevent_account_currency_conflicts on public.accounts;

create trigger trigger_prevent_account_currency_conflicts
before update of currency on public.accounts
for each row execute function public.prevent_account_currency_conflicts();
