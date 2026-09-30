-- A provider stream can contain more than one genuine payment in a cycle.
-- Distinct provider payment IDs are not an identity equivalence, even inside
-- one stream. Preserve the linked payment and leave the extra actual unlinked.
do $$
declare
  v_definition text;
  v_target text := '      v_target := coalesce(v_occurrence.actual_transaction_id, v_bank.id);';
  v_scope text := 'or v_actual.currency is distinct from v_bank.currency or v_actual.type is distinct from v_bank.type';
begin
  v_definition := pg_get_functiondef(
    'public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure);
  if position(v_target in v_definition) = 0 or position(v_scope in v_definition) = 0 then
    raise exception 'Unexpected bank occurrence reconciliation definition';
  end if;
  v_definition := replace(v_definition, v_target, $guard$
      if v_occurrence.status = 'confirmed' and v_occurrence.actual_transaction_id <> v_bank.id then
        select * into strict v_actual from public.expenses
          where id = v_occurrence.actual_transaction_id for update;
        -- Do not choose the first of multiple stream payments for a manual
        -- confirmation. That relationship needs explicit payment review.
        if v_actual.provider is null and (
          select count(*) from public.expenses e
          where e.user_id = p_user_id
            and e.household_id is not distinct from v_template.household_id
            and e.provider = 'plaid' and e.is_recurring is false and e.deleted_at is null
            and coalesce(e.bank_account_id::text, nullif(e.provider_fields ->> 'bank_account_id', ''))
              = v_template.provider_fields ->> 'bank_account_id'
            and (e.parent_recurring_id = v_template.id or v_ids ? e.provider_transaction_id
              or v_ids ? e.provider_pending_transaction_id or v_ids ? e.provider_posted_from_pending_transaction_id)
            and case when e.parent_recurring_id = v_template.id and e.scheduled_occurrence_date is not null
              then e.scheduled_occurrence_date else public.bank_recurring_cycle_date_v1(v_template.recurrence_rule, e.date) end = v_cycle
        ) > 1 then
          raise exception 'OCCURRENCE_RECONCILIATION_CONFLICT';
        end if;
        if v_actual.provider = 'plaid' and v_actual.deleted_at is null
          and v_actual.user_id = v_bank.user_id
          and v_actual.household_id is not distinct from v_bank.household_id
          and v_actual.account_id is not distinct from v_bank.account_id
          and v_actual.currency = v_bank.currency and v_actual.type = v_bank.type
          and coalesce(v_actual.bank_account_id::text, v_actual.provider_fields ->> 'bank_account_id')
            = coalesce(v_bank.bank_account_id::text, v_bank.provider_fields ->> 'bank_account_id')
          and v_actual.provider_transaction_id is not null and v_bank.provider_transaction_id is not null
          and not (array_remove(array[v_actual.provider_transaction_id,
              v_actual.provider_pending_transaction_id,
              v_actual.provider_posted_from_pending_transaction_id], null)
            && array_remove(array[v_bank.provider_transaction_id,
              v_bank.provider_pending_transaction_id,
              v_bank.provider_posted_from_pending_transaction_id], null)) then
          continue;
        end if;
      end if;
$guard$ || v_target);
  v_definition := replace(v_definition, v_scope,
    v_scope || E'\n          or v_actual.account_id is distinct from v_bank.account_id');
  execute v_definition;
end;
$$;

notify pgrst, 'reload schema';
