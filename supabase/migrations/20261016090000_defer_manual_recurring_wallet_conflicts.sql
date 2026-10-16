-- Optional recurring association must not block native bank synchronization.
-- Preserve both wallet assignments; this does not authorize merging the rows.
do $$
declare
  v_definition text;
  v_original text;
  v_replacement text;
begin
  v_definition := pg_get_functiondef(
    'public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure);
  if position('manual_wallet_mismatch' in v_definition) > 0 then return; end if;

  v_original := $old$            (v_bank.amount_cents, v_bank.date, v_bank.account_id)) then
          raise exception 'OCCURRENCE_RECONCILIATION_CONFLICT';
        end if;$old$;
  v_replacement := $new$            (v_bank.amount_cents, v_bank.date, v_bank.account_id)) then
          -- Only an otherwise compatible, unlinked bank row can be deferred.
          -- Manual commands, existing links, splits, overrides and scope conflicts
          -- still fail atomically through the original guard below.
          if current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on'
            and v_occurrence.status = 'confirmed'
            and v_occurrence.confirmation_source = 'user'
            and v_actual.deleted_at is null and v_actual.is_recurring is false
            and v_actual.user_id = p_user_id
            and v_actual.household_id is not distinct from v_bank.household_id
            and v_actual.privacy_scope is not distinct from v_bank.privacy_scope
            and v_actual.currency = v_bank.currency and v_actual.type = v_bank.type
            and v_actual.account_id is not null and v_bank.account_id is not null
            and v_actual.account_id <> v_bank.account_id
            and v_actual.provider is null and v_actual.split_group_id is null
            and v_template.split_group_id is null
            and v_actual.parent_recurring_id = v_template.id
            and v_actual.scheduled_occurrence_date = v_cycle
            and v_bank.parent_recurring_id is null
            and v_bank.scheduled_occurrence_date is null
            and v_bank.recurring_confirmed_at is null
            and v_bank.recurring_confirmation_source is null
            and v_bank.split_group_id is null
            and coalesce(v_bank.user_overrides, '{}') = '{}'::jsonb
            and not exists (select 1 from public.recurring_occurrences o
              where o.actual_transaction_id = v_bank.id) then
            update public.expenses set provider_fields = jsonb_set(coalesce(provider_fields, '{}'::jsonb),
                '{recurring_reconciliation}', jsonb_build_object('status', 'needs_review',
                  'reason', 'manual_wallet_mismatch', 'recurring_id', v_template.id,
                  'actual_transaction_id', v_actual.id), true), updated_at = clock_timestamp()
            where id = v_bank.id and provider_fields -> 'recurring_reconciliation' is distinct from
              jsonb_build_object('status', 'needs_review', 'reason', 'manual_wallet_mismatch',
                'recurring_id', v_template.id, 'actual_transaction_id', v_actual.id);
            continue;
          end if;
          raise exception 'OCCURRENCE_RECONCILIATION_CONFLICT';
        end if;$new$;
  if position(v_original in v_definition) = 0 then
    raise exception 'Unexpected recurring manual-adoption guard';
  end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  -- Clear this marker only after all adoption guards pass. Clearing it before
  -- the wallet check would rewrite the same review marker on every sync.
  v_original := $old$      if v_template.split_group_id is not null and v_actual.split_group_id is null then$old$;
  v_replacement := $new$      if v_bank.provider_fields #>> '{recurring_reconciliation,reason}' = 'manual_wallet_mismatch' then
        v_bank.provider_fields := v_bank.provider_fields - 'recurring_reconciliation';
        update public.expenses set provider_fields = v_bank.provider_fields,
          updated_at = clock_timestamp() where id = v_bank.id;
      end if;
      if v_template.split_group_id is not null and v_actual.split_group_id is null then$new$;
  if position(v_original in v_definition) = 0 then
    raise exception 'Unexpected recurring adoption review boundary';
  end if;
  v_definition := replace(v_definition, v_original, v_replacement);
  execute v_definition;
end;
$$;
notify pgrst, 'reload schema';
