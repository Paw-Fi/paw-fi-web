-- Provider updates may correct a historical expense without assigning it to a
-- new wallet. New or changed archived-wallet bindings remain invalid.
do $$
declare
  v_definition text;
  v_original text := '  if v_account.id is null or v_account.is_archived then';
  v_replacement text := $patch$  if v_account.id is null or (v_account.is_archived and (
    tg_op <> 'UPDATE'
    or (new.account_id, new.user_id, new.household_id, new.currency)
      is distinct from (old.account_id, old.user_id, old.household_id, old.currency)
  )) then$patch$;
begin
  v_definition := pg_get_functiondef('public.ensure_expense_account_id()'::regprocedure);
  if position(v_replacement in v_definition) > 0 then
    return;
  end if;
  if position(v_original in v_definition) = 0 then
    raise exception 'Unexpected expense wallet availability definition';
  end if;
  execute replace(v_definition, v_original, v_replacement);
end;
$$;

notify pgrst, 'reload schema';
