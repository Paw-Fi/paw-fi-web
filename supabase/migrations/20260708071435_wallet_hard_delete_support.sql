alter table public.expenses
  alter column account_id drop not null;

create or replace function public.ensure_expense_account_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_currency text;
  v_spending_account_id uuid;
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

  if new.deleted_at is not null and new.account_id is null then
    return new;
  end if;

  v_spending_account_id := public.ensure_spending_account_for_currency(
    v_user_id,
    new.household_id,
    v_currency
  );

  if new.account_id is null then
    new.account_id := v_spending_account_id;
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
  'Assigns and validates wallet bindings for active expenses. Deleted expense rows may clear account_id so wallets can be hard-deleted without losing mobile delta tombstones.';
