do $$
declare
  v_scope record;
begin
  for v_scope in
    select distinct scoped.user_id, scoped.household_id, scoped.currency
    from (
      select
        coalesce(h.owner_id, a.user_id) as user_id,
        a.household_id,
        a.currency
      from public.accounts a
      left join public.households h on h.id = a.household_id
      where a.is_archived = false
        and a.currency ~ '^[A-Z]{3}$'

      union all

      select
        coalesce(h.owner_id, e.user_id, uc.user_id, a.user_id) as user_id,
        e.household_id,
        upper(nullif(trim(e.currency), '')) as currency
      from public.expenses e
      left join public.user_contacts uc on uc.id = e.contact_id
      left join public.households h on h.id = e.household_id
      left join public.accounts a on a.id = e.account_id
      where upper(nullif(trim(coalesce(e.currency, '')), '')) ~ '^[A-Z]{3}$'
    ) scoped
    where scoped.user_id is not null
      and scoped.currency ~ '^[A-Z]{3}$'
  loop
    perform public.ensure_spending_account_for_currency(
      v_scope.user_id,
      v_scope.household_id,
      v_scope.currency
    );
  end loop;
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

revoke execute on function public.ensure_expense_account_id() from public, anon, authenticated;
grant execute on function public.ensure_expense_account_id() to service_role;
