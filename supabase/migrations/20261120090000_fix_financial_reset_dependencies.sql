-- Delete the selected personal wallets before their bank-account parents.
-- Otherwise ON DELETE SET NULL rewrites a linked system wallet's identity and
-- prevent_system_account_mutation rejects the entire reset. Keep that guard,
-- expense/recurring cleanup, offboarding escrow and every scope predicate intact.
do $migration$
declare
  v_target regprocedure := 'public.perform_user_financial_data_reset()'::regprocedure;
  v_definition text;
  v_bank_delete text := $old$  if array_length(v_plaid_bank_account_ids, 1) is not null then
    delete from public.bank_accounts ba
    where ba.id = any(v_plaid_bank_account_ids);
  end if;

$old$;
  v_return text := $old$  return jsonb_build_object(
    'success', true,
    'message', 'Financial data reset successfully',$old$;
begin
  -- After the jobs migration, the no-arg function only supplies auth.uid().
  -- Follow that specific delegator, not just a similarly named function.
  if (select btrim(prosrc) from pg_proc where oid = v_target) =
     'begin return public.perform_user_financial_data_reset_for_actor(auth.uid()); end;' then
    v_target := 'public.perform_user_financial_data_reset_for_actor(uuid)'::regprocedure;
  end if;
  v_definition := pg_get_functiondef(v_target);
  if position('-- financial_reset_bank_accounts_after_wallets' in v_definition) > 0 then
    return;
  end if;
  if position(v_bank_delete in v_definition) = 0
    or position(v_return in v_definition) = 0 then
    raise exception 'Unexpected financial reset dependency boundaries in %', v_target
      using hint = format('Inspect the installed definition: SELECT pg_get_functiondef(%L::regprocedure);', v_target::text);
  end if;
  v_definition := replace(v_definition, v_bank_delete, '');
  v_definition := replace(v_definition, v_return,
    E'  -- financial_reset_bank_accounts_after_wallets\n' || v_bank_delete || v_return);
  execute v_definition;
end;
$migration$;

-- RI triggers probe each removed expense/group separately. Scope-, status- and
-- descriptor-led indexes cannot satisfy these generic UUID-only equality probes.
create index if not exists notification_capture_classifications_expense_id_idx
  on public.notification_capture_classifications(expense_id)
  where expense_id is not null;

-- The cross-source duplicate index covers status='duplicate' only, not the FK.
create index if not exists wallet_capture_events_duplicate_of_expense_id_idx
  on public.wallet_capture_events(duplicate_of_expense_id)
  where duplicate_of_expense_id is not null;

create index if not exists settlement_allocations_expense_id_idx
  on public.household_settlement_event_allocations_v2(expense_id)
  where expense_id is not null;

create index if not exists settlement_allocations_split_group_id_idx
  on public.household_settlement_event_allocations_v2(split_group_id)
  where split_group_id is not null;

-- replacement_recurring_id is already the PK; canonical has a separate cascade.
create index if not exists recurring_series_associations_canonical_recurring_id_idx
  on public.recurring_series_associations(canonical_recurring_id);
