do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.get_wallets_month_snapshot_v1(uuid,uuid,text,date,boolean)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    'coalesce(fe.account_id, (select wallet_id from legacy_wallet)) as wallet_id',
    'fe.account_id as wallet_id'
  );
  if v_updated = v_definition then
    raise exception 'Expected null-account fallback was not found in get_wallets_month_snapshot_v1';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.get_wallets_history_v1(uuid,uuid,text,date)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    'coalesce(fe.account_id, (select wallet_id from legacy_wallet)) as wallet_id',
    'fe.account_id as wallet_id'
  );
  if v_updated = v_definition then
    raise exception 'Expected null-account fallback was not found in get_wallets_history_v1';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.get_wallets_month_snapshot_v2(uuid,uuid,text,date,boolean)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    'coalesce(pr.account_id, (select wallet_id from legacy_wallet)) as wallet_id',
    'pr.account_id as wallet_id'
  );
  if v_updated = v_definition then
    raise exception 'Expected null-account fallback was not found in get_wallets_month_snapshot_v2';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.get_wallets_history_v2(uuid,uuid,text,date)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    E'    from projected_rows pr\n    group by 1',
    E'    from projected_rows pr\n    where pr.account_id is not null\n    group by 1'
  );
  if v_updated = v_definition then
    raise exception 'Expected projected-account fallback was not found in get_wallets_history_v2';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.get_wallets_month_snapshot_v3_legacy(uuid,uuid,text,date,boolean,integer)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    'coalesce(e.account_id, (select wallet_id from legacy_wallet)) as wallet_id',
    'e.account_id as wallet_id'
  );
  if v_updated = v_definition then
    raise exception 'Expected deleted-account fallback was not found in get_wallets_month_snapshot_v3_legacy';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.claim_android_wallet_capture_event_v2(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz,text,text,boolean)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    E'account_id = coalesce(\n              p_account_id,\n              public.ensure_spending_account_for_currency(\n                v_duplicate.expense_user_id,\n                v_duplicate.expense_household_id,\n                v_currency\n              )\n            )',
    'account_id = p_account_id'
  );
  if v_updated = v_definition then
    raise exception 'Expected Android capture account fallback was not found';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.prepare_household_delete_wallet_cleanup()'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    'account_id = ta.account_id,',
    'account_id = case when e.account_id is null then null else ta.account_id end,'
  );
  if v_updated = v_definition then
    raise exception 'Expected household cleanup account rebinding was not found';
  end if;
  execute v_updated;
end;
$$;

comment on function public.get_wallets_month_snapshot_v1(uuid, uuid, text, date, boolean) is
  'Wallet snapshot excluding intentionally unassigned transactions from wallet balances.';
comment on function public.get_wallets_history_v1(uuid, uuid, text, date) is
  'Wallet history excluding intentionally unassigned transactions from wallet balances.';
