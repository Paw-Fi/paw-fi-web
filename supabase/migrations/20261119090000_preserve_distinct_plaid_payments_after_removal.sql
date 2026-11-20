-- A stream may still advertise a distinct payment for a cycle whose confirmed
-- actual Plaid removed. Keep the historical link and the live import separate.
do $$
declare
  v_definition text := pg_get_functiondef(
    'public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure);
  v_original text := $old$if v_actual.provider = 'plaid' and v_actual.deleted_at is null$old$;
  v_replacement text := $new$if v_actual.provider = 'plaid' and (v_actual.deleted_at is null or (
            current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on'
            and v_actual.deleted_reason = 'provider_removed'
            and v_actual.is_recurring is false
            and v_occurrence.confirmation_source = 'system'
            and v_actual.recurring_confirmation_source = 'system'
            and v_actual.parent_recurring_id = v_template.id
            and v_actual.scheduled_occurrence_date = v_cycle
            and v_actual.bank_account_id = v_bank.bank_account_id
            and v_actual.privacy_scope is not distinct from v_bank.privacy_scope
            and v_bank.parent_recurring_id is null and v_bank.scheduled_occurrence_date is null
            and v_bank.recurring_confirmed_at is null and v_bank.recurring_confirmation_source is null
            and v_occurrence.split_group_id is null and v_template.split_group_id is null
            and v_actual.split_group_id is null and v_bank.split_group_id is null
            and coalesce(v_actual.user_overrides, '{}') = '{}'::jsonb
            and coalesce(v_bank.user_overrides, '{}') = '{}'::jsonb
            and not exists (select 1 from public.recurring_occurrences other
              where other.actual_transaction_id = v_bank.id)
          ))$new$;
begin
  if position(v_replacement in v_definition) > 0 then return; end if;
  if position(v_original in v_definition) = 0 then
    raise exception 'Unexpected distinct Plaid payment guard';
  end if;
  -- Its existing scope and disjoint provider/pending/posted ID tests still apply.
  execute replace(v_definition, v_original, v_replacement);
end;
$$;
