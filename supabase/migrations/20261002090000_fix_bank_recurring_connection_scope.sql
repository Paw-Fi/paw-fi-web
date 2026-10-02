-- bank_accounts has no household_id; its owning connection carries the Space.
-- Patch the deployed function so later payment-identity guards remain intact.
do $$
declare
  v_definition text;
  v_old text := $old$select 1 from public.bank_accounts b where b.id = v_bank.bank_account_id
          and b.user_id = p_user_id and b.household_id is not distinct from v_template.household_id$old$;
  v_new text := $new$select 1 from public.bank_accounts b
        join public.bank_connections bc on bc.id = b.bank_connection_id
        where b.id = v_bank.bank_account_id and b.user_id = p_user_id
          and bc.user_id = p_user_id
          and bc.household_id is not distinct from v_template.household_id$new$;
begin
  v_definition := pg_get_functiondef(
    'public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure);
  if position(v_old in v_definition) > 0 then
    execute replace(v_definition, v_old, v_new);
  elsif position(v_new in v_definition) = 0 then
    raise exception 'Unexpected bank occurrence reconciliation scope definition';
  end if;
end;
$$;

notify pgrst, 'reload schema';
