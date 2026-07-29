do $migration$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.confirm_recurring_occurrence_v1(uuid,uuid,date,date,bigint,uuid,text,text,jsonb,uuid,boolean,uuid,text)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    E'  if p_account_id is null then raise exception ''OCCURRENCE_ACCOUNT_REQUIRED''; end if;\n  select * into v_account from public.accounts where id = p_account_id for key share;\n  if not found or v_account.is_archived or upper(v_account.currency) <> upper(v_template.currency)\n    or (v_template.household_id is null and (v_account.user_id is distinct from p_actor_user_id or v_account.household_id is not null))\n    or (v_template.household_id is not null and v_account.household_id is distinct from v_template.household_id) then\n    raise exception ''OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'';\n  end if;',
    E'  if p_account_id is not null then\n    select * into v_account from public.accounts where id = p_account_id for key share;\n    if not found or v_account.is_archived or upper(v_account.currency) <> upper(v_template.currency)\n      or (v_template.household_id is null and (v_account.user_id is distinct from p_actor_user_id or v_account.household_id is not null))\n      or (v_template.household_id is not null and v_account.household_id is distinct from v_template.household_id) then\n      raise exception ''OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'';\n    end if;\n  end if;'
  );
  if v_updated = v_definition then
    raise exception 'Expected recurring account requirement was not found';
  end if;
  execute v_updated;

  select pg_get_functiondef(
    'public.update_recurring_occurrence_v1(uuid,uuid,date,date,bigint,uuid,text,text,boolean)'::regprocedure
  ) into v_definition;
  v_updated := replace(
    v_definition,
    E'  if v_account_id is null then raise exception ''OCCURRENCE_ACCOUNT_REQUIRED''; end if;\n  select * into v_account from public.accounts where id = v_account_id for key share;\n  if not found or v_account.is_archived or upper(v_account.currency) <> upper(v_template.currency)\n    or (v_template.household_id is null and (v_account.user_id is distinct from p_actor_user_id or v_account.household_id is not null))\n    or (v_template.household_id is not null and v_account.household_id is distinct from v_template.household_id) then raise exception ''OCCURRENCE_ACCOUNT_SCOPE_MISMATCH''; end if;',
    E'  if v_account_id is not null then\n    select * into v_account from public.accounts where id = v_account_id for key share;\n    if not found or v_account.is_archived or upper(v_account.currency) <> upper(v_template.currency)\n      or (v_template.household_id is null and (v_account.user_id is distinct from p_actor_user_id or v_account.household_id is not null))\n      or (v_template.household_id is not null and v_account.household_id is distinct from v_template.household_id) then raise exception ''OCCURRENCE_ACCOUNT_SCOPE_MISMATCH''; end if;\n  end if;'
  );
  if v_updated = v_definition then
    raise exception 'Expected recurring update account requirement was not found';
  end if;
  execute v_updated;
end;
$migration$;
