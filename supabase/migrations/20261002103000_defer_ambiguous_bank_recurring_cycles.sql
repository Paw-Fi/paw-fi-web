-- Defer ambiguous recurring-cycle links only at the bank-sync boundary.
-- Strict date mapping and manual occurrence confirmation must still reject ties.
create or replace function public.bank_recurring_cycle_date_for_reconciliation_v1(
  p_rule jsonb, p_paid_date date
) returns date language plpgsql stable set search_path = '' as $$
begin
  return public.bank_recurring_cycle_date_v1(p_rule, p_paid_date);
exception when raise_exception then
  if sqlerrm = 'OCCURRENCE_AMBIGUOUS_BANK_CYCLE'
    and current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on' then
    return null;
  end if;
  raise;
end;
$$;
revoke all on function public.bank_recurring_cycle_date_for_reconciliation_v1(jsonb, date)
  from public, anon, authenticated;
grant execute on function public.bank_recurring_cycle_date_for_reconciliation_v1(jsonb, date)
  to service_role;

do $$
declare
  v_definition text;
  v_nested_original text := 'else public.bank_recurring_cycle_date_v1(v_template.recurrence_rule, e.date) end = v_cycle';
  v_nested_replacement text := 'else public.bank_recurring_cycle_date_for_reconciliation_v1(v_template.recurrence_rule, e.date) end = v_cycle';
  v_original text := $original$      v_cycle := case when v_bank.parent_recurring_id = v_template.id
        and v_bank.scheduled_occurrence_date is not null then v_bank.scheduled_occurrence_date
        else public.bank_recurring_cycle_date_v1(v_template.recurrence_rule, v_bank.date) end;$original$;
  v_replacement text := $replacement$      begin
        v_cycle := case when v_bank.parent_recurring_id = v_template.id
          and v_bank.scheduled_occurrence_date is not null then v_bank.scheduled_occurrence_date
          else public.bank_recurring_cycle_date_v1(v_template.recurrence_rule, v_bank.date) end;
      exception when raise_exception then
        if sqlerrm = 'OCCURRENCE_AMBIGUOUS_BANK_CYCLE'
          and current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on' then
          -- Keep the bank payment and its native financial fields unchanged.
          -- A cycle tie is not authority to create an occurrence or merge a manual payment.
          update public.expenses
          set provider_fields = jsonb_set(coalesce(provider_fields, '{}'::jsonb),
                '{recurring_reconciliation}', jsonb_build_object(
                  'status', 'needs_review', 'reason', 'ambiguous_bank_cycle',
                  'recurring_id', v_template.id), true),
              updated_at = clock_timestamp()
          where id = v_bank.id and provider_fields -> 'recurring_reconciliation'
            is distinct from jsonb_build_object(
              'status', 'needs_review', 'reason', 'ambiguous_bank_cycle',
              'recurring_id', v_template.id);
          continue;
        end if;
        raise;
      end;
      if v_bank.provider_fields #>> '{recurring_reconciliation,reason}' = 'ambiguous_bank_cycle'
        and v_bank.provider_fields #>> '{recurring_reconciliation,recurring_id}' = v_template.id::text then
        v_bank.provider_fields := v_bank.provider_fields - 'recurring_reconciliation';
        update public.expenses set provider_fields = v_bank.provider_fields,
          updated_at = clock_timestamp() where id = v_bank.id;
      end if;$replacement$;
begin
  v_definition := pg_get_functiondef(
    'public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure);
  if position(v_replacement in v_definition) = 0 then
    if position(v_original in v_definition) = 0 then
      raise exception 'Unexpected bank occurrence cycle mapping definition';
    end if;
    v_definition := replace(v_definition, v_original, v_replacement);
  end if;
  if position(v_nested_replacement in v_definition) = 0 then
    if position(v_nested_original in v_definition) = 0 then
      raise exception 'Unexpected bank occurrence competing-payment definition';
    end if;
    v_definition := replace(v_definition, v_nested_original, v_nested_replacement);
  end if;
  execute v_definition;
end;
$$;

create or replace function public.reconcile_bank_recurring_occurrences_for_sync_v1(
  p_user_id uuid, p_recurring_ids uuid[] default null, p_bank_account_ids uuid[] default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_previous text := coalesce(current_setting('moneko.defer_ambiguous_bank_cycles', true), '');
  v_result integer;
begin
  perform set_config('moneko.defer_ambiguous_bank_cycles', 'on', true);
  begin
    v_result := public.reconcile_bank_recurring_occurrences_v1(
      p_user_id, p_recurring_ids, p_bank_account_ids);
  exception when others then
    perform set_config('moneko.defer_ambiguous_bank_cycles', v_previous, true);
    raise;
  end;
  perform set_config('moneko.defer_ambiguous_bank_cycles', v_previous, true);
  return v_result;
end;
$$;
revoke all on function public.reconcile_bank_recurring_occurrences_for_sync_v1(uuid, uuid[], uuid[])
  from public, anon, authenticated;
grant execute on function public.reconcile_bank_recurring_occurrences_for_sync_v1(uuid, uuid[], uuid[])
  to service_role;

-- Preserve the complete cursor-owning wrapper and every previously deployed guard.
do $$
declare
  v_definition text;
  v_original text := 'perform public.reconcile_bank_recurring_occurrences_v1(p_user_id, null, p_processed_bank_account_ids);';
  v_replacement text := 'perform public.reconcile_bank_recurring_occurrences_for_sync_v1(p_user_id, null, p_processed_bank_account_ids);';
begin
  v_definition := pg_get_functiondef(
    'public.apply_plaid_sync_batch_v2(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],jsonb,uuid[],jsonb,jsonb,boolean,boolean,uuid,uuid)'::regprocedure);
  if position(v_replacement in v_definition) = 0 then
    if position(v_original in v_definition) = 0 then
      raise exception 'Unexpected Plaid atomic recurring reconciliation definition';
    end if;
    execute replace(v_definition, v_original, v_replacement);
  end if;
end;
$$;

notify pgrst, 'reload schema';
