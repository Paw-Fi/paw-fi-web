drop trigger if exists trigger_create_default_spending_account_for_new_user
  on auth.users;
drop trigger if exists trigger_create_default_spending_account_for_new_household
  on public.households;

drop function if exists public.create_default_spending_account_for_new_user();
drop function if exists public.create_default_spending_account_for_new_household();

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

  if p_household_id is not null and not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_user_id
  ) then
    return null;
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

  select a.id into v_account_id
  from public.accounts a
  where a.currency = v_currency
    and a.is_archived = false
    and a.is_default = true
    and (
      (p_household_id is null and a.user_id = p_user_id and a.household_id is null)
      or (p_household_id is not null and a.household_id = p_household_id)
    )
  limit 1;

  return v_account_id;
end;
$$;

revoke execute on function public.resolve_default_account(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.resolve_default_account(uuid, uuid, text)
  to service_role;

create or replace function public.resolve_default_account(
  p_user_id uuid,
  p_household_id uuid default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.resolve_default_account(p_user_id, p_household_id, null::text);
$$;

revoke execute on function public.resolve_default_account(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_default_account(uuid, uuid)
  to service_role;

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
begin
  return public.resolve_default_account(
    p_user_id,
    p_household_id,
    p_currency
  );
end;
$$;

revoke execute on function public.ensure_spending_account_for_currency(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.ensure_spending_account_for_currency(uuid, uuid, text)
  to service_role;

comment on function public.ensure_spending_account_for_currency(uuid, uuid, text) is
  'Compatibility resolver for an existing default wallet. It never creates a wallet.';

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

  if tg_op = 'UPDATE'
     and old.is_default
     and old.is_archived = false
     and new.is_archived = true then
    if not old.is_system then
      raise exception 'Default account cannot be archived';
    end if;
    new.is_default := false;
  end if;

  if old.is_system and (
    new.user_id is distinct from old.user_id
    or new.household_id is distinct from old.household_id
    or new.currency is distinct from old.currency
    or new.is_system is distinct from old.is_system
    or new.linked_bank_account_id is distinct from old.linked_bank_account_id
  ) then
    raise exception 'System account scope cannot be modified';
  end if;

  return new;
end;
$$;

comment on function public.prevent_system_account_mutation() is
  'Protects system wallet identity and deletion while allowing archive and restore updates.';

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

comment on function public.ensure_expense_account_id() is
  'Normalizes currency and validates explicit wallet bindings without assigning unbound expenses.';
