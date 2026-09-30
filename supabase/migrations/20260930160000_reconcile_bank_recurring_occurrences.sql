-- No historical backfill is executed. Workers reconcile explicit provider IDs
-- during sync; manual confirmation uses the same template lock and actual row.
create or replace function public.bank_recurring_cycle_date_v1(p_rule jsonb, p_paid_date date)
returns date language plpgsql immutable set search_path = '' as $$
declare
  v_anchor date := (p_rule ->> 'anchor_date')::date;
  v_frequency text := p_rule ->> 'frequency';
  v_interval integer := greatest(coalesce((p_rule ->> 'interval')::integer, 1), 1);
  v_step integer; v_offset integer; v_base date; v_candidate date;
  v_best date; v_distance integer; v_best_distance integer; v_tied boolean := false;
begin
  if v_anchor is null or p_paid_date is null then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;
  if v_frequency in ('monthly', 'yearly') then
    v_step := v_interval * case when v_frequency = 'yearly' then 12 else 1 end;
    v_offset := floor(((extract(year from p_paid_date) - extract(year from v_anchor)) * 12
      + extract(month from p_paid_date) - extract(month from v_anchor)) / v_step)::integer;
    for i in v_offset - 1..v_offset + 1 loop
      v_base := (date_trunc('month', v_anchor)::date + make_interval(months => i * v_step))::date;
      v_candidate := v_base + least(extract(day from v_anchor)::integer,
        extract(day from v_base + interval '1 month - 1 day')::integer) - 1;
      v_distance := abs(v_candidate - p_paid_date);
      if v_best_distance is null or v_distance < v_best_distance then
        v_best := v_candidate; v_best_distance := v_distance; v_tied := false;
      elsif v_distance = v_best_distance then v_tied := true;
      end if;
    end loop;
  elsif v_frequency in ('daily', 'weekly', 'biweekly', 'semi_monthly') then
    -- Match the existing normalized Plaid schedule's 15-day cadence.
    v_step := v_interval * case v_frequency
      when 'daily' then 1 when 'weekly' then 7 when 'biweekly' then 14 else 15 end;
    v_offset := floor((p_paid_date - v_anchor)::numeric / v_step)::integer;
    for i in v_offset..v_offset + 1 loop
      v_candidate := v_anchor + i * v_step;
      v_distance := abs(v_candidate - p_paid_date);
      if v_best_distance is null or v_distance < v_best_distance then
        v_best := v_candidate; v_best_distance := v_distance; v_tied := false;
      elsif v_distance = v_best_distance then v_tied := true;
      end if;
    end loop;
  else raise exception 'OCCURRENCE_UNSUPPORTED_BANK_SCHEDULE';
  end if;
  if v_tied then raise exception 'OCCURRENCE_AMBIGUOUS_BANK_CYCLE'; end if;
  if nullif(p_rule ->> 'end_date', '')::date < v_best then
    raise exception 'OCCURRENCE_NOT_SCHEDULED';
  end if;
  return v_best;
end;
$$;

create or replace function public.reconcile_bank_recurring_occurrences_v1(
  p_user_id uuid, p_recurring_ids uuid[] default null, p_bank_account_ids uuid[] default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_template public.expenses%rowtype;
  v_bank public.expenses%rowtype;
  v_actual public.expenses%rowtype;
  v_occurrence public.recurring_occurrences%rowtype;
  v_ids jsonb; v_cycle date; v_target uuid; v_matches integer; v_count integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  if p_user_id is null then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;
  for v_template in
    select t.* from public.expenses t where t.user_id = p_user_id
      and t.is_recurring is true and t.deleted_at is null
      and t.provider_fields ->> 'source' = 'plaid_recurring_template'
      and (p_recurring_ids is null or t.id = any(p_recurring_ids))
      and (p_bank_account_ids is null or t.provider_fields ->> 'bank_account_id' = any(
        select id::text from unnest(p_bank_account_ids) id))
    order by t.id for update
  loop
    v_ids := case when jsonb_typeof(v_template.provider_fields -> 'transaction_ids') = 'array'
      then v_template.provider_fields -> 'transaction_ids' else '[]'::jsonb end
      || case when jsonb_typeof(v_template.recurrence_rule #> '{provider_hint,transaction_ids}') = 'array'
      then v_template.recurrence_rule #> '{provider_hint,transaction_ids}' else '[]'::jsonb end;
    for v_bank in
      select e.* from public.expenses e where e.user_id = p_user_id
        and e.household_id is not distinct from v_template.household_id
        and e.provider = 'plaid' and e.is_recurring is false and e.deleted_at is null
        and coalesce(e.bank_account_id::text, nullif(e.provider_fields ->> 'bank_account_id', ''))
          = v_template.provider_fields ->> 'bank_account_id'
        and (e.parent_recurring_id = v_template.id or v_ids ? e.provider_transaction_id
          or v_ids ? e.provider_pending_transaction_id or v_ids ? e.provider_posted_from_pending_transaction_id)
      order by e.date, e.id for update
    loop
      if upper(v_bank.currency) <> upper(v_template.currency) or v_bank.type <> v_template.type
        or v_bank.amount_cents <= 0 then raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH'; end if;
      if v_template.household_id is not null and
        v_bank.privacy_scope::text is distinct from v_template.privacy_scope::text then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';
      end if;
      if v_bank.bank_account_id is not null and not exists (
        select 1 from public.bank_accounts b where b.id = v_bank.bank_account_id
          and b.user_id = p_user_id and b.household_id is not distinct from v_template.household_id
      ) then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';
      end if;
      -- Disconnect clears the foreign key, not the imported provider identity.
      -- Retained metadata is usable only within the same owner/Space and a valid wallet.
      if v_bank.bank_account_id is null and not exists (
        select 1 from public.accounts a where a.id = v_bank.account_id
          and a.user_id = p_user_id and a.household_id is not distinct from v_template.household_id
          and upper(a.currency) = upper(v_bank.currency)
      ) then
        raise exception 'OCCURRENCE_ACCOUNT_SCOPE_MISMATCH';
      end if;
      select count(*) into v_matches from public.expenses t
      where t.user_id = p_user_id and t.household_id is not distinct from v_template.household_id
        and t.is_recurring is true and t.deleted_at is null
        and t.provider_fields ->> 'source' = 'plaid_recurring_template'
        and t.provider_fields ->> 'bank_account_id' = coalesce(v_bank.bank_account_id::text,
          nullif(v_bank.provider_fields ->> 'bank_account_id', ''))
        and (t.id = v_bank.parent_recurring_id or (
          case when jsonb_typeof(t.provider_fields -> 'transaction_ids') = 'array'
            then t.provider_fields -> 'transaction_ids' else '[]'::jsonb end
          || case when jsonb_typeof(t.recurrence_rule #> '{provider_hint,transaction_ids}') = 'array'
            then t.recurrence_rule #> '{provider_hint,transaction_ids}' else '[]'::jsonb end
          ) ?| array_remove(array[v_bank.provider_transaction_id,
            v_bank.provider_pending_transaction_id, v_bank.provider_posted_from_pending_transaction_id], null));
      if v_matches <> 1 or (v_bank.parent_recurring_id is not null
        and v_bank.parent_recurring_id <> v_template.id) then
        raise exception 'OCCURRENCE_AMBIGUOUS_BANK_SERIES';
      end if;
      v_cycle := case when v_bank.parent_recurring_id = v_template.id
        and v_bank.scheduled_occurrence_date is not null then v_bank.scheduled_occurrence_date
        else public.bank_recurring_cycle_date_v1(v_template.recurrence_rule, v_bank.date) end;
      select * into v_occurrence from public.recurring_occurrences
        where recurring_id = v_template.id and scheduled_occurrence_date = v_cycle for update;
      if v_occurrence.status = 'confirmed' and v_occurrence.actual_transaction_id = v_bank.id
        and v_bank.parent_recurring_id = v_template.id and v_bank.scheduled_occurrence_date = v_cycle
        and v_bank.recurring_confirmed_at is not null and v_bank.recurring_confirmation_source is not null
        and v_bank.analytics_is_final is true
        and (v_occurrence.paid_date, v_occurrence.amount_cents, v_occurrence.currency)
          is not distinct from (v_bank.date, v_bank.amount_cents, upper(v_bank.currency)) then
        continue;
      end if;
      v_target := coalesce(v_occurrence.actual_transaction_id, v_bank.id);
      if v_target <> v_bank.id then
        select * into strict v_actual from public.expenses where id = v_target for update;
        if v_actual.deleted_at is not null or v_actual.user_id is distinct from p_user_id
          or v_actual.household_id is distinct from v_bank.household_id
          or v_actual.currency is distinct from v_bank.currency or v_actual.type is distinct from v_bank.type
          or v_actual.provider is not null or v_bank.split_group_id is not null
          or coalesce(v_bank.user_overrides, '{}') <> '{}'::jsonb
          or exists (select 1 from public.recurring_occurrences o
            where o.actual_transaction_id = v_bank.id and o.id <> v_occurrence.id)
          or (v_actual.split_group_id is not null and
            (v_actual.amount_cents, v_actual.date, v_actual.account_id) is distinct from
            (v_bank.amount_cents, v_bank.date, v_bank.account_id)) then
          raise exception 'OCCURRENCE_RECONCILIATION_CONFLICT';
        end if;
        -- Release the provider unique key before attaching it to the stable manual ID.
        -- The discarded import remains an auditable tombstone for mobile delta.
        update public.expenses set provider_transaction_id = null,
          deleted_at = clock_timestamp(), deleted_reason = 'recurring_reconciled',
          updated_at = clock_timestamp() where id = v_bank.id;
      else v_actual := v_bank;
      end if;
      if v_template.split_group_id is not null and v_actual.split_group_id is null then
        raise exception 'OCCURRENCE_SHARED_SPLIT_REVIEW_REQUIRED';
      end if;
      insert into public.recurring_occurrences(recurring_id, scheduled_occurrence_date, status,
        confirmation_source, actual_transaction_id, paid_date, amount_cents, currency,
        confirmed_at, confirmed_by_user_id, split_group_id)
      values (v_template.id, v_cycle, 'confirmed', 'system', v_target, v_bank.date,
        v_bank.amount_cents, upper(v_bank.currency), clock_timestamp(), null, v_actual.split_group_id)
      on conflict (recurring_id, scheduled_occurrence_date) do update set status = 'confirmed',
        confirmation_source = case when recurring_occurrences.status = 'confirmed'
          then coalesce(recurring_occurrences.confirmation_source, 'system') else 'system' end,
        confirmed_by_user_id = case when recurring_occurrences.status = 'confirmed'
          then recurring_occurrences.confirmed_by_user_id else null end,
        actual_transaction_id = excluded.actual_transaction_id, paid_date = excluded.paid_date,
        amount_cents = excluded.amount_cents, currency = excluded.currency,
        confirmed_at = coalesce(recurring_occurrences.confirmed_at, excluded.confirmed_at),
        updated_at = clock_timestamp();
      update public.expenses set parent_recurring_id = v_template.id,
        scheduled_occurrence_date = v_cycle,
        recurring_confirmed_at = coalesce(v_actual.recurring_confirmed_at, clock_timestamp()),
        recurring_confirmation_source = coalesce(v_actual.recurring_confirmation_source, 'system'),
        provider = 'plaid', bank_account_id = v_bank.bank_account_id,
        provider_transaction_id = v_bank.provider_transaction_id,
        provider_pending_transaction_id = v_bank.provider_pending_transaction_id,
        provider_posted_from_pending_transaction_id = v_bank.provider_posted_from_pending_transaction_id,
        provider_pending = v_bank.provider_pending, raw_provider_payload = v_bank.raw_provider_payload,
        provider_fields = v_bank.provider_fields,
        date = v_bank.date, amount_cents = v_bank.amount_cents, account_id = v_bank.account_id,
        analytics_is_final = true, updated_at = clock_timestamp()
      where id = v_target;
      delete from public.recurring_transaction_reminders_sent
        where expense_id = v_template.id and occurrence_date = v_cycle;
      delete from public.notification_events where event_type = 'recurring_reminder' and is_sent is false
        and payload ->> 'expense_id' = v_template.id::text and payload ->> 'occurrence_date' = v_cycle::text;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.bank_recurring_cycle_date_v1(jsonb, date) from public, anon, authenticated;
revoke all on function public.reconcile_bank_recurring_occurrences_v1(uuid, uuid[], uuid[])
  from public, anon, authenticated;
grant execute on function public.reconcile_bank_recurring_occurrences_v1(uuid, uuid[], uuid[]) to service_role;

-- Preserve the deployed confirmation function's scheduling, scope, split and
-- idempotency guards; change only provenance eligibility and bank reconciliation.
do $$
declare v_definition text;
  v_guard text := E'\n    or v_template.provider_fields ->> ''source'' = ''plaid_recurring_template''';
  v_fingerprint text := '  v_fingerprint := md5';
  v_copy text := '''deleted_at'', null, ''deleted_reason'', null';
  v_visibility text := 'elsif not public.is_member_of_household(v_template.household_id, p_actor_user_id) then';
begin
  v_definition := pg_get_functiondef(
    'public.confirm_recurring_occurrence_v1(uuid,uuid,date,date,bigint,uuid,text,text,jsonb,uuid,boolean,uuid,text)'::regprocedure);
  if position(v_guard in v_definition) = 0 or position(v_fingerprint in v_definition) = 0
    or position(v_copy in v_definition) = 0 or position(v_visibility in v_definition) = 0
    then raise exception 'Unexpected recurring confirmation definition'; end if;
  v_definition := replace(v_definition, v_guard, '');
  v_definition := replace(v_definition, v_fingerprint,
    E'  if v_template.provider_fields ->> ''source'' = ''plaid_recurring_template'' then\n'
    || E'    perform public.reconcile_bank_recurring_occurrences_v1(v_template.user_id, array[p_recurring_id], null);\n  end if;\n' || v_fingerprint);
  v_definition := replace(v_definition, v_visibility,
    'elsif not public.is_member_of_household(v_template.household_id, p_actor_user_id) '
    || 'or (v_template.user_id is distinct from p_actor_user_id and v_template.privacy_scope::text is distinct from ''full'') then');
  v_definition := replace(v_definition, 'if v_occurrence.request_fingerprint = v_fingerprint then',
    'if v_occurrence.request_fingerprint = v_fingerprint or v_occurrence.confirmation_source = ''system'' then');
  v_definition := replace(v_definition, v_copy, v_copy ||
    ', ''created_at'', clock_timestamp(), ''updated_at'', clock_timestamp(), ''provider'', null, ''bank_account_id'', null, ''provider_transaction_id'', null, ''provider_pending_transaction_id'', null, ''provider_posted_from_pending_transaction_id'', null, ''provider_pending'', false, ''provider_fields'', ''{}''::jsonb, ''raw_provider_payload'', null, ''user_overrides'', ''{}''::jsonb');
  execute v_definition;
end;
$$;

-- A confirmed bank occurrence counts provisionally, while the bank pending flag
-- remains visible. Classification and transfer exclusions remain unchanged.
do $$
declare v_definition text;
  v_declaration text := E'  v_classification record;\nbegin';
  v_anchor text := '  if new.classification_source = ''user_override'' then';
begin
  v_definition := pg_get_functiondef('public.set_expense_analytics_classification_v1()'::regprocedure);
  if position(v_declaration in v_definition) = 0 or position(v_anchor in v_definition) = 0 then
    raise exception 'Unexpected bank analytics classification definition'; end if;
  v_definition := replace(v_definition, v_declaration,
    E'  v_classification record;\n  v_bank_pending boolean;\nbegin');
  v_definition := replace(v_definition, v_anchor, E'  v_bank_pending := new.provider_pending;\n'
    || '  if new.provider = ''plaid'' and new.parent_recurring_id is not null and exists ('
    || 'select 1 from public.recurring_occurrences o where o.actual_transaction_id = new.id '
    || 'and o.recurring_id = new.parent_recurring_id and o.status = ''confirmed'') '
    || E'then new.provider_pending := false; end if;\n' || v_anchor);
  v_definition := replace(v_definition, 'return new;', 'new.provider_pending := v_bank_pending; return new;');
  execute v_definition;
end;
$$;

-- Keep reconciliation in the cursor-owning transaction. Template-first lock
-- ordering matches manual confirmation and prevents a bank/manual lock inversion.
create or replace function public.apply_plaid_sync_batch_v2(
  p_user_id uuid, p_bank_connection_id uuid, p_expected_cursor_generation integer,
  p_next_cursor text, p_expense_inserts jsonb, p_expense_updates jsonb,
  p_removed_provider_transaction_ids text[], p_removed_bank_account_ids uuid[],
  p_processed_bank_account_ids uuid[], p_account_upserts jsonb,
  p_inactive_bank_account_ids uuid[], p_raw_transactions jsonb, p_sync_status jsonb,
  p_is_ready boolean, p_recurring_refresh_required boolean, p_lock_token uuid,
  p_audit_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' set statement_timeout = '60s' as $$
declare v_result jsonb; v_records jsonb;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'OCCURRENCE_UNAUTHORIZED'; end if;
  perform t.id from public.expenses t where t.user_id = p_user_id
    and t.is_recurring is true and t.deleted_at is null
    and t.provider_fields ->> 'source' = 'plaid_recurring_template'
    order by t.id for update;
  v_result := public.apply_plaid_sync_batch_v2_legacy(
    p_user_id, p_bank_connection_id, p_expected_cursor_generation, p_next_cursor,
    p_expense_inserts, p_expense_updates, p_removed_provider_transaction_ids,
    case when coalesce(p_is_ready, false) then p_removed_bank_account_ids else '{}'::uuid[] end,
    case when coalesce(p_is_ready, false) then p_processed_bank_account_ids else '{}'::uuid[] end,
    case when coalesce(p_is_ready, false) then p_account_upserts else '[]'::jsonb end,
    case when coalesce(p_is_ready, false) then p_inactive_bank_account_ids else '{}'::uuid[] end,
    p_raw_transactions, p_sync_status, p_is_ready, p_recurring_refresh_required, p_lock_token, p_audit_id
  );
  if coalesce(p_is_ready, false) and cardinality(p_processed_bank_account_ids) > 0 then
    perform public.reconcile_bank_recurring_occurrences_v1(p_user_id, null, p_processed_bank_account_ids);
    -- A reconciliation tombstone must not be published as a new payment preview.
    select coalesce(jsonb_agg((select jsonb_object_agg(keys.key, coalesce(to_jsonb(actual), to_jsonb(original)) -> keys.key)
      from jsonb_object_keys(item.value) as keys(key)) || jsonb_build_object(
        'parent_recurring_id', coalesce(actual.parent_recurring_id, original.parent_recurring_id),
        'scheduled_occurrence_date', coalesce(actual.scheduled_occurrence_date, original.scheduled_occurrence_date),
        'recurring_confirmed_at', coalesce(actual.recurring_confirmed_at, original.recurring_confirmed_at),
        'recurring_confirmation_source', coalesce(actual.recurring_confirmation_source, original.recurring_confirmation_source))
      order by item.ordinality), '[]'::jsonb) into v_records
    from jsonb_array_elements(coalesce(v_result -> 'inserted_records', '[]')) with ordinality item(value, ordinality)
    join public.expenses original on original.id = (item.value ->> 'id')::uuid
    left join public.expenses actual on original.deleted_reason = 'recurring_reconciled'
      and actual.user_id = original.user_id and actual.provider = 'plaid'
      and actual.bank_account_id = original.bank_account_id
      and actual.provider_transaction_id = original.raw_provider_payload ->> 'transaction_id'
      and actual.deleted_at is null
    where original.deleted_at is null or actual.id is not null;
    v_result := jsonb_set(v_result, '{inserted_records}', v_records, true);
  end if;
  return v_result;
end;
$$;
revoke all on function public.apply_plaid_sync_batch_v2(
  uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],jsonb,uuid[],jsonb,jsonb,boolean,boolean,uuid,uuid
) from public, anon, authenticated;
grant execute on function public.apply_plaid_sync_batch_v2(
  uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],jsonb,uuid[],jsonb,jsonb,boolean,boolean,uuid,uuid
) to service_role;

notify pgrst, 'reload schema';
