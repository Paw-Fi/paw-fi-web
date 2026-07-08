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

create or replace function public.delete_wallet_hard(
  p_account_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account record;
  v_replacement_account_id uuid;
  v_transaction_ids uuid[] := '{}'::uuid[];
  v_transfer_ids uuid[] := '{}'::uuid[];
  v_linked_bank_account_id uuid;
  v_bank_connection_id uuid;
  v_bank_provider text;
  v_bank_account_status text;
begin
  if p_account_id is null or p_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Valid accountId and userId are required',
      'code', 'VALIDATION_ERROR'
    );
  end if;

  select a.*
  into v_account
  from public.accounts a
  where a.id = p_account_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Account not found',
      'code', 'NOT_FOUND'
    );
  end if;

  if v_account.is_system then
    return jsonb_build_object(
      'success', false,
      'error', 'System wallet cannot be deleted',
      'code', 'VALIDATION_ERROR'
    );
  end if;

  if v_account.household_id is null then
    if v_account.user_id is distinct from p_user_id then
      return jsonb_build_object(
        'success', false,
        'error', 'Forbidden',
        'code', 'UNAUTHORIZED'
      );
    end if;
  elsif not exists (
    select 1
    from public.household_members hm
    where hm.household_id = v_account.household_id
      and hm.user_id = p_user_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Forbidden',
      'code', 'UNAUTHORIZED'
    );
  end if;

  if v_account.is_default then
    select a.id
    into v_replacement_account_id
    from public.accounts a
    where a.user_id = v_account.user_id
      and a.household_id is not distinct from v_account.household_id
      and a.currency = v_account.currency
      and a.is_archived = false
      and a.id <> p_account_id
    order by a.is_system desc, lower(a.name) asc, a.id asc
    limit 1;

    if v_replacement_account_id is null then
      return jsonb_build_object(
        'success', false,
        'error', 'Add another wallet before deleting the default wallet',
        'code', 'VALIDATION_ERROR'
      );
    end if;
  end if;

  select coalesce(array_agg(e.id order by e.created_at, e.id), '{}'::uuid[])
  into v_transaction_ids
  from public.expenses e
  where e.account_id = p_account_id;

  select coalesce(array_agg(t.id order by t.created_at, t.id), '{}'::uuid[])
  into v_transfer_ids
  from public.account_transfers t
  where t.from_account_id = p_account_id
     or t.to_account_id = p_account_id;

  v_linked_bank_account_id := v_account.linked_bank_account_id;
  if v_linked_bank_account_id is not null then
    select ba.bank_connection_id, ba.provider
    into v_bank_connection_id, v_bank_provider
    from public.bank_accounts ba
    where ba.id = v_linked_bank_account_id
    for update;

    if v_bank_connection_id is null then
      v_bank_account_status := 'missing';
    elsif exists (
      select 1
      from public.accounts a
      where a.id <> p_account_id
        and a.linked_bank_account_id = v_linked_bank_account_id
        and a.is_archived = false
    ) then
      v_bank_account_status := 'kept_shared_wallet';
    else
      update public.bank_accounts
      set
        status = 'disabled',
        updated_at = now()
      where id = v_linked_bank_account_id;

      v_bank_account_status := 'disabled';
    end if;
  end if;

  update public.expenses
  set
    deleted_at = now(),
    deleted_reason = 'user_deleted',
    account_id = null,
    bank_account_id = null,
    raw_provider_payload = null,
    updated_at = now()
  where id = any(v_transaction_ids);

  delete from public.account_transfers t
  where t.id = any(v_transfer_ids);

  delete from public.accounts a
  where a.id = p_account_id;

  if v_replacement_account_id is not null then
    update public.accounts
    set
      is_default = true,
      updated_at = now()
    where id = v_replacement_account_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', p_account_id,
      'deleted', true,
      'transactionIds', to_jsonb(v_transaction_ids),
      'transactionCount', cardinality(v_transaction_ids),
      'transferIds', to_jsonb(v_transfer_ids),
      'transferCount', cardinality(v_transfer_ids),
      'replacementDefaultAccountId', v_replacement_account_id,
      'bank', jsonb_build_object(
        'linkedBankAccountId', v_linked_bank_account_id,
        'bankConnectionId', v_bank_connection_id,
        'provider', v_bank_provider,
        'bankAccountStatus', v_bank_account_status,
        'bankConnectionStatus', null
      )
    )
  );
end;
$$;

revoke all on function public.delete_wallet_hard(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_wallet_hard(uuid, uuid) to service_role;

comment on function public.delete_wallet_hard(uuid, uuid) is
  'Atomically hard-deletes a non-system wallet, soft-deletes wallet transactions for mobile sync tombstones, removes wallet transfers, promotes a replacement default wallet, and disables an unshared linked bank account.';
