-- A missing destination wallet must not reuse a wallet from the old Space or
-- currency. Preserve the historical omitted-wallet behavior for same-scope
-- split callers, which still rely on retaining their existing wallet.
do $migration$
declare
  v_signature text;
  v_definition text;
  v_updated text;
  v_scope_parameter text;
  v_currency_parameter text;
  v_resolved_account text;
begin
  foreach v_signature in array array[
    'public.households_commit_expense_split_write_v3(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,uuid)',
    'public.households_remove_expense_split_v3(uuid,uuid,uuid,uuid,text,bigint,uuid,jsonb)'
  ] loop
    v_definition := pg_get_functiondef(v_signature::regprocedure);
    if position('coalesce(p_target_account_id, v_expense.account_id)' in v_definition) = 0
      or position('coalesce(p_target_account_id, expense.account_id)' in v_definition) = 0
    then
      raise exception 'Expected split wallet fallback was not found in %', v_signature;
    end if;

    if position('households_remove_expense_split_v3(' in v_signature) > 0 then
      v_scope_parameter := 'p_target_household_id';
      v_currency_parameter := 'p_target_currency';
    else
      v_scope_parameter := 'p_household_id';
      v_currency_parameter := 'p_currency';
    end if;

    -- Resolve against the locked original row, before structural fields change.
    v_resolved_account := format(
      '(case when v_expense.household_id is not distinct from %s and upper(v_expense.currency) = upper(btrim(%s)) then coalesce(p_target_account_id, v_expense.account_id) else p_target_account_id end)',
      v_scope_parameter,
      v_currency_parameter
    );
    v_updated := replace(v_definition,
      'coalesce(p_target_account_id, v_expense.account_id)', v_resolved_account);
    v_updated := replace(v_updated,
      'coalesce(p_target_account_id, expense.account_id)', v_resolved_account);
    execute v_updated;
  end loop;
end;
$migration$;
