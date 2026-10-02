-- A recurring template is not authority to rewrite or reject a valid unlinked
-- native bank row. Keep actual scope checks strict and diagnose their branches.
do $$
declare
  v_definition text;
  v_original text;
  v_replacement text;
begin
  v_definition := pg_get_functiondef(
    'public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure);
  if position('reconciliation_scope_reason' in v_definition) > 0
    and position('zero_amount_bank_row' in v_definition) > 0 then return; end if;

  v_original := $old$      if upper(v_bank.currency) <> upper(v_template.currency) or v_bank.type <> v_template.type
        or v_bank.amount_cents <= 0 then raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'; end if;$old$;
  v_replacement := $new$      if v_bank.amount_cents is null or v_bank.amount_cents < 0 then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'
          using detail = '{"reconciliation_scope_reason":"non_positive_amount"}';
      end if;$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring native-value guard'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  v_original := $old$        v_bank.privacy_scope::text is distinct from v_template.privacy_scope::text then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';$old$;
  v_replacement := $new$        v_bank.privacy_scope::text is distinct from v_template.privacy_scope::text then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'
          using detail = '{"reconciliation_scope_reason":"privacy_scope_mismatch"}';$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring privacy guard'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  v_original := $old$          and bc.household_id is not distinct from v_template.household_id
      ) then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';$old$;
  v_replacement := $new$          and bc.household_id is not distinct from v_template.household_id
      ) then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'
          using detail = '{"reconciliation_scope_reason":"bank_owner_or_space_mismatch"}';$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring bank-owner guard'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  v_original := $old$          and upper(a.currency) = upper(v_bank.currency)
      ) then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';$old$;
  v_replacement := $new$          and upper(a.currency) = upper(v_bank.currency)
      ) then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'
          using detail = '{"reconciliation_scope_reason":"disconnected_wallet_mismatch"}';$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected disconnected recurring wallet guard'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  -- All ownership/privacy checks above execute before optional template review.
  -- Previously linked rows and manual confirmation remain strict.
  v_original := '      select count(*) into v_matches from public.expenses t';
  v_replacement := $new$      if v_bank.amount_cents = 0
        or upper(v_bank.currency) is distinct from upper(v_template.currency)
        or v_bank.type is distinct from v_template.type then
        if current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on'
          and v_bank.parent_recurring_id is null then
          update public.expenses set provider_fields = jsonb_set(coalesce(provider_fields, '{}'::jsonb),
              '{recurring_reconciliation}', jsonb_build_object('status', 'needs_review',
                'reason', case when v_bank.amount_cents = 0 then 'zero_amount_bank_row'
                  when upper(v_bank.currency) is distinct from upper(v_template.currency)
                  then 'native_currency_mismatch' else 'transaction_direction_mismatch' end,
                'recurring_id', v_template.id), true), updated_at = clock_timestamp()
          where id = v_bank.id and provider_fields -> 'recurring_reconciliation' is distinct from
            jsonb_build_object('status', 'needs_review',
              'reason', case when v_bank.amount_cents = 0 then 'zero_amount_bank_row'
                when upper(v_bank.currency) is distinct from upper(v_template.currency)
                then 'native_currency_mismatch' else 'transaction_direction_mismatch' end,
              'recurring_id', v_template.id);
          continue;
        end if;
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH' using detail = jsonb_build_object(
          'reconciliation_scope_reason', case when v_bank.amount_cents = 0 then 'non_positive_amount'
            when upper(v_bank.currency) is distinct from upper(v_template.currency)
            then 'native_currency_mismatch' else 'transaction_direction_mismatch' end)::text;
      end if;
      select count(*) into v_matches from public.expenses t$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring candidate-count boundary'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  -- Multiple matching template identities still do not authorize choosing one.
  v_original := $old$      if v_matches <> 1 or (v_bank.parent_recurring_id is not null
        and v_bank.parent_recurring_id <> v_template.id) then$old$;
  v_replacement := $new$      if v_matches <> 1 and v_bank.parent_recurring_id is null
        and current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on' then
        update public.expenses set provider_fields = jsonb_set(coalesce(provider_fields, '{}'::jsonb),
            '{recurring_reconciliation}', jsonb_build_object('status', 'needs_review',
              'reason', 'ambiguous_bank_series', 'recurring_id', v_template.id), true),
            updated_at = clock_timestamp()
        where id = v_bank.id and provider_fields -> 'recurring_reconciliation' is distinct from
          jsonb_build_object('status', 'needs_review', 'reason', 'ambiguous_bank_series', 'recurring_id', v_template.id);
        continue;
      end if;
      if v_matches <> 1 or (v_bank.parent_recurring_id is not null
        and v_bank.parent_recurring_id <> v_template.id) then$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring identity guard'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  -- A deferred direction/currency row is not a competing compatible payment.
  v_original := $old$          select count(*) from public.expenses e
          where e.user_id = p_user_id$old$;
  v_replacement := $new$          select count(*) from public.expenses e
          where (current_setting('moneko.defer_ambiguous_bank_cycles', true) is distinct from 'on'
            or (upper(e.currency) = upper(v_template.currency) and e.type = v_template.type and e.amount_cents > 0))
            and e.user_id = p_user_id$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected competing-payment native-value guard'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  v_original := $old$      if v_bank.provider_fields #>> '{recurring_reconciliation,reason}' = 'ambiguous_bank_cycle'
        and v_bank.provider_fields #>> '{recurring_reconciliation,recurring_id}' = v_template.id::text then$old$;
  v_replacement := $new$      if v_bank.provider_fields #>> '{recurring_reconciliation,reason}' in (
        'ambiguous_bank_cycle', 'native_currency_mismatch', 'transaction_direction_mismatch', 'ambiguous_bank_series', 'zero_amount_bank_row') then$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring review cleanup'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);
  execute v_definition;
end;
$$;
notify pgrst, 'reload schema';
