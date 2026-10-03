-- Confirmed canonical parent/occurrence identity outranks another template's
-- advertised provider aliases. Do not retarget payments or guess new links.
create or replace function public.is_confirmed_bank_recurring_link_v1(p_transaction_id uuid)
returns boolean language sql volatile set search_path = '' as $$
  select exists (
    select 1 from public.expenses bank_row
    join public.expenses parent on parent.id = bank_row.parent_recurring_id
    join public.recurring_occurrences occurrence on occurrence.recurring_id = parent.id
      and occurrence.actual_transaction_id = bank_row.id
      and occurrence.scheduled_occurrence_date = bank_row.scheduled_occurrence_date
      and occurrence.status = 'confirmed'
    where bank_row.id = p_transaction_id and bank_row.provider = 'plaid'
      and bank_row.deleted_at is null and bank_row.is_recurring is false and bank_row.amount_cents > 0
      and parent.is_recurring is true and parent.user_id = bank_row.user_id
      and parent.household_id is not distinct from bank_row.household_id
      and parent.privacy_scope is not distinct from bank_row.privacy_scope
      and upper(parent.currency) = upper(bank_row.currency) and parent.type = bank_row.type
      and parent.provider_fields ->> 'source' in ('plaid_recurring_template', 'bank_recurring_template')
      and coalesce(parent.provider_fields ->> 'provider',
        case when parent.provider_fields ->> 'source' = 'plaid_recurring_template' then 'plaid' end) = 'plaid'
      and parent.provider_fields ->> 'bank_account_id' = coalesce(bank_row.bank_account_id::text,
        nullif(bank_row.provider_fields ->> 'bank_account_id', ''))
      and (bank_row.account_id is null or exists (
        select 1 from public.accounts wallet where wallet.id = bank_row.account_id
          and wallet.household_id is not distinct from bank_row.household_id
          and (bank_row.household_id is not null or wallet.user_id = bank_row.user_id)
          and upper(wallet.currency) = upper(bank_row.currency)
      ))
      and (
        (bank_row.bank_account_id is not null and exists (
          select 1 from public.bank_accounts account
          join public.bank_connections connection on connection.id = account.bank_connection_id
          where account.id = bank_row.bank_account_id and account.user_id = bank_row.user_id
            and connection.user_id = bank_row.user_id
            and connection.household_id is not distinct from bank_row.household_id
        ))
        or (bank_row.bank_account_id is null and exists (
          select 1 from public.accounts wallet where wallet.id = bank_row.account_id
            and wallet.user_id = bank_row.user_id
            and wallet.household_id is not distinct from bank_row.household_id
            and upper(wallet.currency) = upper(bank_row.currency)
        ))
      )
  );
$$;
revoke all on function public.is_confirmed_bank_recurring_link_v1(uuid) from public, anon, authenticated;
grant execute on function public.is_confirmed_bank_recurring_link_v1(uuid) to service_role;

do $$
declare
  v_definition text;
  v_original text;
  v_replacement text;
begin
  v_definition := pg_get_functiondef(
    'public.reconcile_bank_recurring_occurrences_v1(uuid,uuid[],uuid[])'::regprocedure);
  if position('v_confirmed_link_verified boolean' in v_definition) > 0
    and position('unverified_existing_link' in v_definition) > 0 then return; end if;

  v_original := '  v_occurrence public.recurring_occurrences%rowtype;';
  v_replacement := v_original || E'\n  v_confirmed_link_verified boolean := false;';
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring occurrence declaration'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  -- Verify the actual stored relationship, not merchant/amount/cadence similarity.
  -- Read-only verification adds no inverted template locks to the sync ordering.
  v_original := $old$    loop
      if v_bank.amount_cents is null or v_bank.amount_cents < 0 then$old$;
  v_replacement := $new$    loop
      v_confirmed_link_verified := false;
      if current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on'
        and v_bank.parent_recurring_id is not null then
        v_confirmed_link_verified := public.is_confirmed_bank_recurring_link_v1(v_bank.id);
        if v_confirmed_link_verified and v_bank.parent_recurring_id <> v_template.id then
          -- Another stream's alias cannot steal a confirmed historical payment,
          -- including when its canonical parent has since been retired.
          continue;
        end if;
      end if;
      if v_bank.amount_cents is null or v_bank.amount_cents < 0 then$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring bank-row validation boundary'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  -- Candidate enumeration and competing-payment counts must agree: another
  -- series's verified payment is not a choice for this manual occurrence.
  v_original := $old$            and e.user_id = p_user_id
            and e.household_id is not distinct from v_template.household_id$old$;
  v_replacement := $new$            and (current_setting('moneko.defer_ambiguous_bank_cycles', true) is distinct from 'on'
              or e.parent_recurring_id is null or e.parent_recurring_id = v_template.id
              or not public.is_confirmed_bank_recurring_link_v1(e.id))
            and e.user_id = p_user_id
            and e.household_id is not distinct from v_template.household_id$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected competing-payment relationship boundary'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  v_original := '      select count(*) into v_matches from public.expenses t';
  v_replacement := $new$      if v_confirmed_link_verified and v_bank.parent_recurring_id = v_template.id then
        v_matches := 1;
      else
      select count(*) into v_matches from public.expenses t$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring candidate-count boundary'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);
  v_original := $old$            v_bank.provider_pending_transaction_id, v_bank.provider_posted_from_pending_transaction_id], null));$old$;
  v_replacement := v_original || E'\n      end if;';
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring candidate-count closure'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);

  v_original := $old$        raise exception 'OCCURRENCE_AMBIGUOUS_BANK_SERIES';$old$;
  v_replacement := $new$        raise exception 'OCCURRENCE_AMBIGUOUS_BANK_SERIES' using detail = jsonb_build_object(
          'recurring_reconciliation_reason', case
            when v_bank.parent_recurring_id is not null
              and current_setting('moneko.defer_ambiguous_bank_cycles', true) = 'on'
              then 'unverified_existing_link'
            else 'multiple_template_candidates' end)::text;$new$;
  if position(v_original in v_definition) = 0 then raise exception 'Unexpected recurring series identity guard'; end if;
  v_definition := replace(v_definition, v_original, v_replacement);
  execute v_definition;
end;
$$;
notify pgrst, 'reload schema';
