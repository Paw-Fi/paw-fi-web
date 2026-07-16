begin;

create extension if not exists pgtap;

select plan(133);

-- Public compatibility and permissions -------------------------------------------------

select has_function(
  'public',
  'households_get_settlement_breakdown_v2',
  array['uuid', 'uuid', 'text'],
  'V2 settlement breakdown keeps its production identity signature'
);

select has_function(
  'public',
  'households_get_settlement_calculation_v3',
  array['uuid', 'uuid', 'text'],
  'V3 atomic settlement calculation is available'
);

select has_function(
  'public',
  'households_settle_amount_and_notify',
  array['uuid', 'uuid', 'text', 'bigint', 'text', 'text'],
  'partial settlement RPC keeps its production identity signature'
);

select has_function(
  'public',
  'households_settle_amount_and_notify_v2',
  array['uuid', 'uuid', 'text', 'bigint', 'text', 'text', 'text', 'text'],
  'strict idempotent settlement RPC is available without replacing the legacy RPC'
);

select is(
  pg_get_function_result(
    'public.households_get_settlement_breakdown_v2(uuid,uuid,text)'::regprocedure
  ),
  'TABLE(direction text, expense_id uuid, split_group_id uuid, split_line_id uuid, expense_date timestamp with time zone, expense_description text, expense_category text, expense_raw_text text, expense_type text, total_amount_cents bigint, remaining_amount_cents bigint)',
  'V2 settlement breakdown keeps its exact return columns and types'
);

select is(
  pg_get_function_result(
    'public.households_get_settlement_calculation_v3(uuid,uuid,text)'::regprocedure
  ),
  'jsonb',
  'V3 settlement calculation returns one JSONB snapshot'
);

select is(
  pg_get_function_result(
    'public.households_settle_amount_and_notify_v2(uuid,uuid,text,bigint,text,text,text,text)'::regprocedure
  ),
  'jsonb',
  'strict idempotent settlement RPC returns a structured JSONB result'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.households_get_settlement_breakdown_v2(uuid,uuid,text)',
    'EXECUTE'
  ),
  'authenticated users can execute the compatible V2 breakdown RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.households_get_settlement_breakdown_v2(uuid,uuid,text)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the V2 breakdown RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.households_get_settlement_calculation_v3(uuid,uuid,text)',
    'EXECUTE'
  ),
  'authenticated users can execute the V3 settlement calculation RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.households_get_settlement_calculation_v3(uuid,uuid,text)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the V3 settlement calculation RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.households_settle_amount_and_notify(uuid,uuid,text,bigint,text,text)',
    'EXECUTE'
  ),
  'authenticated users retain access to the partial settlement RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.households_settle_amount_and_notify(uuid,uuid,text,bigint,text,text)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the partial settlement RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.households_settle_amount_and_notify_v2(uuid,uuid,text,bigint,text,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.households_settle_amount_and_notify_v2(uuid,uuid,text,bigint,text,text,text,text)',
    'EXECUTE'
  ),
  'only authenticated application users can execute the strict settlement RPC'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.households_commit_expense_split_write_v3(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.households_commit_expense_split_write_v3(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,uuid)',
    'EXECUTE'
  ),
  'the atomic split commit RPC is service-only'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.households_commit_expense_split_write_with_patch_v3(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,uuid,jsonb)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.households_commit_expense_split_write_with_patch_v3(uuid,uuid,uuid,uuid,uuid,text,text,bigint,text,jsonb,jsonb,uuid,uuid,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.households_remove_expense_split_with_patch_v3(uuid,uuid,uuid,uuid,text,bigint,uuid,jsonb,jsonb)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.households_remove_expense_split_with_patch_v3(uuid,uuid,uuid,uuid,text,bigint,uuid,jsonb,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'service_role',
    'public.households_apply_expense_patch_v3(uuid,jsonb)',
    'EXECUTE'
  ),
  'atomic expense-patch wrappers are service-only and their patch helper is private'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.households_finalize_expense_split_write_v3(uuid)',
    'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.households_finalize_expense_split_write_v3(uuid)',
    'EXECUTE'
  ),
  'the private split finalizer is service-only'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.household_settlement_finalized_split_groups',
    'INSERT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_finalized_split_groups',
    'UPDATE'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_finalized_split_groups',
    'DELETE'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_finalized_split_groups',
    'TRUNCATE'
  ),
  'authenticated users cannot forge or remove private finalized split state'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.household_settlement_requests_v2',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_requests_v2',
    'INSERT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_requests_v2',
    'UPDATE'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_requests_v2',
    'DELETE'
  ),
  'authenticated users cannot inspect or mutate private idempotency records'
);

select has_table(
  'public',
  'household_settlement_legacy_cutovers_v3',
  'legacy pair/currency cutovers are persisted explicitly'
);

select has_table(
  'public',
  'household_settlement_legacy_cutover_lines_v3',
  'legacy cutovers retain immutable line snapshots'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.household_settlement_legacy_cutovers_v3',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_legacy_cutovers_v3',
    'INSERT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_legacy_cutover_lines_v3',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.household_settlement_legacy_cutover_lines_v3',
    'UPDATE'
  )
  and not has_table_privilege(
    'service_role',
    'public.household_settlement_legacy_cutovers_v3',
    'INSERT'
  )
  and not has_table_privilege(
    'service_role',
    'public.household_settlement_legacy_cutovers_v3',
    'UPDATE'
  )
  and not has_table_privilege(
    'service_role',
    'public.household_settlement_legacy_cutovers_v3',
    'DELETE'
  )
  and not has_table_privilege(
    'service_role',
    'public.household_settlement_legacy_cutover_lines_v3',
    'INSERT'
  )
  and not has_table_privilege(
    'service_role',
    'public.household_settlement_legacy_cutover_lines_v3',
    'UPDATE'
  )
  and not has_table_privilege(
    'service_role',
    'public.household_settlement_legacy_cutover_lines_v3',
    'DELETE'
  )
  and not has_sequence_privilege(
    'authenticated',
    'public.household_settlement_ledger_seq',
    'USAGE'
  )
  and not has_sequence_privilege(
    'service_role',
    'public.household_settlement_ledger_seq',
    'UPDATE'
  ),
  'application roles cannot rewrite private cutover state or causal sequence'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.households_get_settlement_breakdown_legacy_projection_v2(uuid,uuid,text)',
    'EXECUTE'
  ),
  'the compressed legacy projection remains private rollback diagnostics only'
);

select ok(
  position(
    'households_get_settlement_breakdown_legacy_projection_v2'
    in pg_get_functiondef(
      'public.households_get_settlement_breakdown_v2(uuid,uuid,text)'::regprocedure
    )
  ) = 0,
  'the production V2 projection has no branch back to compressed FIFO history'
);

-- Deterministic fixture helpers ---------------------------------------------------------

create function pg_temp.expected_parent_snapshot(p_expense_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'household_id', expense.household_id,
    'currency', upper(expense.currency),
    'amount_cents', expense.amount_cents,
    'split_group_id', expense.split_group_id,
    'account_id', expense.account_id
  )
  from public.expenses expense
  where expense.id = p_expense_id;
$$;

create function pg_temp.try_delete_boundary_event(p_event_id uuid)
returns text
language plpgsql
as $$
begin
  delete from public.household_settlement_events
  where id = p_event_id;
  set constraints household_settlement_events_cycle_boundary_event_id_fkey immediate;
  set constraints expense_split_lines_cycle_boundary_event_id_fkey immediate;
  return null;
exception when others then
  return sqlstate;
end;
$$;

create function pg_temp.delete_household_with_boundary_rows(
  p_household_id uuid
)
returns boolean
language plpgsql
as $$
begin
  delete from public.households
  where id = p_household_id;
  set constraints household_settlement_events_cycle_boundary_event_id_fkey immediate;
  set constraints expense_split_lines_cycle_boundary_event_id_fkey immediate;
  set constraints household_settlement_events_cycle_boundary_event_id_fkey deferred;
  set constraints expense_split_lines_cycle_boundary_event_id_fkey deferred;
  return not exists (
    select 1
    from public.households household
    where household.id = p_household_id
  );
exception when others then
  return false;
end;
$$;

create function pg_temp.add_settlement_obligation(
  p_household_id uuid,
  p_payer_user_id uuid,
  p_participant_user_id uuid,
  p_currency text,
  p_amount_cents bigint,
  p_description text,
  p_expense_date date,
  p_group_total_cents bigint default null,
  p_line_amount_cents bigint default null
)
returns jsonb
language plpgsql
as $$
declare
  v_expense_id uuid := gen_random_uuid();
  v_split_group_id uuid := gen_random_uuid();
  v_split_line_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_group_total_cents bigint := coalesce(
    p_group_total_cents,
    p_amount_cents
  );
  v_participant_amount_cents bigint := coalesce(
    p_line_amount_cents,
    p_amount_cents
  );
  v_lines jsonb;
  v_previous_role text;
begin
  v_account_id := public.ensure_spending_account_for_currency(
    p_payer_user_id,
    p_household_id,
    p_currency
  );

  insert into public.expenses (
    id,
    user_id,
    household_id,
    account_id,
    date,
    amount_cents,
    currency,
    category,
    raw_text,
    type
  ) values (
    v_expense_id,
    p_payer_user_id,
    p_household_id,
    v_account_id,
    p_expense_date,
    p_amount_cents,
    upper(p_currency),
    'other',
    p_description,
    'expense'
  );

  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id = p_participant_user_id
          then v_participant_amount_cents
        else 0
      end,
      'percentage', null,
      'shares', null
    )
    order by membership.user_id
  )
  into strict v_lines
  from public.household_members membership
  where membership.household_id = p_household_id;

  if v_group_total_cents = abs(p_amount_cents)
    and v_participant_amount_cents = v_group_total_cents
  then
    -- Production Edge Functions invoke this service-only RPC. The fixture
    -- temporarily assumes the same JWT claim and restores it even on failure.
    v_previous_role := current_setting('request.jwt.claim.role', true);
    begin
      perform set_config(
        'request.jwt.claim.role',
        'service_role',
        false
      );
      perform public.households_commit_expense_split_write_v3(
        current_setting('test.settlement_v3_owner_id')::uuid,
        v_expense_id,
        v_split_group_id,
        p_household_id,
        p_payer_user_id,
        'amount',
        upper(p_currency),
        v_group_total_cents,
        p_description,
        v_lines,
        pg_temp.expected_parent_snapshot(v_expense_id),
        null
      );
      perform set_config(
        'request.jwt.claim.role',
        coalesce(v_previous_role, ''),
        false
      );
    exception when others then
      perform set_config(
        'request.jwt.claim.role',
        coalesce(v_previous_role, ''),
        false
      );
      raise;
    end;
  else
    -- The one malformed fixture is intentionally made structurally active
    -- without publishing private finalized state, reproducing an interrupted
    -- legacy/multi-statement writer for fail-closed coverage.
    insert into public.expense_split_groups (
      id,
      household_id,
      expense_id,
      payer_user_id,
      split_type,
      currency,
      total_amount_cents,
      description
    ) values (
      v_split_group_id,
      p_household_id,
      v_expense_id,
      p_payer_user_id,
      'amount',
      upper(p_currency),
      v_group_total_cents,
      p_description
    );

    insert into public.expense_split_lines (
      id,
      split_group_id,
      user_id,
      amount_cents,
      is_settled,
      settled_at
    )
    select
      case
        when line.user_id = p_participant_user_id then v_split_line_id
        else gen_random_uuid()
      end,
      v_split_group_id,
      line.user_id,
      line.amount_cents,
      false,
      null
    from jsonb_to_recordset(v_lines) as line(
      user_id uuid,
      amount_cents bigint
    );

    perform set_config(
      'moneko.settlement_split_write_expense_id',
      v_expense_id::text,
      true
    );
    update public.expenses
    set split_group_id = v_split_group_id
    where id = v_expense_id;
    perform set_config(
      'moneko.settlement_split_write_expense_id',
      '',
      true
    );
  end if;

  select split_line.id
  into strict v_split_line_id
  from public.expense_split_lines split_line
  where split_line.split_group_id = v_split_group_id
    and split_line.user_id = p_participant_user_id;

  return jsonb_build_object(
    'expense_id', v_expense_id,
    'split_group_id', v_split_group_id,
    'split_line_id', v_split_line_id
  );
end;
$$;

do $$
declare
  v_owner_id uuid := gen_random_uuid();
  v_member_id uuid := gen_random_uuid();
  v_third_member_id uuid := gen_random_uuid();
  v_household_id uuid := gen_random_uuid();
  v_other_household_id uuid := gen_random_uuid();
begin
  perform set_config('test.settlement_v3_owner_id', v_owner_id::text, false);
  perform set_config('test.settlement_v3_member_id', v_member_id::text, false);
  perform set_config(
    'test.settlement_v3_third_member_id',
    v_third_member_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_household_id',
    v_household_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_other_household_id',
    v_other_household_id::text,
    false
  );

  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values
    (
      v_owner_id,
      'authenticated',
      'authenticated',
      'settlement-v3-owner-' || v_owner_id::text || '@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      v_member_id,
      'authenticated',
      'authenticated',
      'settlement-v3-member-' || v_member_id::text || '@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      v_third_member_id,
      'authenticated',
      'authenticated',
      'settlement-v3-third-' || v_third_member_id::text || '@example.com',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

  insert into public.households (id, name, owner_id, currency)
  values
    (v_household_id, 'Settlement V3 household', v_owner_id, 'USD'),
    (
      v_other_household_id,
      'Settlement V3 isolated household',
      v_owner_id,
      'USD'
    );

  insert into public.household_members (household_id, user_id, role)
  values
    (v_household_id, v_owner_id, 'owner'),
    (v_household_id, v_member_id, 'member'),
    (v_household_id, v_third_member_id, 'member'),
    (v_other_household_id, v_owner_id, 'owner'),
    (v_other_household_id, v_member_id, 'member')
  on conflict (household_id, user_id) do update
  set role = excluded.role;

  perform set_config('request.jwt.claim.sub', v_owner_id::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
end;
$$;

-- Audited legacy markers preserve existing ledger facts without weakening new writes. ---

do $$
declare
  v_owner_id uuid := current_setting('test.settlement_v3_owner_id')::uuid;
  v_member_id uuid := current_setting('test.settlement_v3_member_id')::uuid;
  v_third_id uuid := current_setting('test.settlement_v3_third_member_id')::uuid;
  v_household_id uuid := current_setting('test.settlement_v3_household_id')::uuid;
  v_drift_expense_id uuid := gen_random_uuid();
  v_drift_group_id uuid := gen_random_uuid();
  v_rounding_expense_id uuid := gen_random_uuid();
  v_rounding_group_id uuid := gen_random_uuid();
  v_jpy_account_id uuid;
  v_nok_account_id uuid;
begin
  v_jpy_account_id := public.ensure_spending_account_for_currency(
    v_owner_id,
    v_household_id,
    'JPY'
  );
  v_nok_account_id := public.ensure_spending_account_for_currency(
    v_owner_id,
    v_household_id,
    'NOK'
  );

  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values
    (
      v_drift_expense_id, v_owner_id, v_household_id, v_jpy_account_id,
      current_date, 999, 'JPY', 'other',
      'Legacy parent amount drift fixture', 'expense'
    ),
    (
      v_rounding_expense_id, v_owner_id, v_household_id, v_nok_account_id,
      current_date, 999, 'NOK', 'other',
      'Legacy bounded rounding fixture', 'expense'
    );

  insert into public.expense_split_groups (
    id, household_id, expense_id, payer_user_id, split_type,
    currency, total_amount_cents, description
  ) values
    (
      v_drift_group_id, v_household_id, v_drift_expense_id, v_owner_id,
      'amount', 'JPY', 1001, 'Legacy parent amount drift fixture'
    ),
    (
      v_rounding_group_id, v_household_id, v_rounding_expense_id, v_owner_id,
      'amount', 'NOK', 999, 'Legacy bounded rounding fixture'
    );

  insert into public.expense_split_lines (
    id, split_group_id, user_id, amount_cents, is_settled, settled_at
  ) values
    (gen_random_uuid(), v_drift_group_id, v_owner_id, 0, false, null),
    (gen_random_uuid(), v_drift_group_id, v_member_id, 1001, false, null),
    (gen_random_uuid(), v_drift_group_id, v_third_id, 0, false, null),
    (gen_random_uuid(), v_rounding_group_id, v_owner_id, 500, false, null),
    (gen_random_uuid(), v_rounding_group_id, v_member_id, 500, false, null),
    (gen_random_uuid(), v_rounding_group_id, v_third_id, 0, false, null);

  perform set_config(
    'moneko.settlement_split_write_expense_id',
    v_drift_expense_id::text,
    true
  );
  update public.expenses
  set split_group_id = v_drift_group_id
  where id = v_drift_expense_id;
  perform set_config('moneko.settlement_split_write_expense_id', '', true);

  perform set_config(
    'moneko.settlement_split_write_expense_id',
    v_rounding_expense_id::text,
    true
  );
  update public.expenses
  set split_group_id = v_rounding_group_id
  where id = v_rounding_expense_id;
  perform set_config('moneko.settlement_split_write_expense_id', '', true);

  insert into public.household_settlement_finalized_split_groups (
    split_group_id,
    validation_profile,
    legacy_parent_amount_mismatch,
    legacy_rounding_delta_cents
  ) values
    (v_drift_group_id, 'legacy_structural', true, 0),
    (v_rounding_group_id, 'legacy_structural', false, 1);

  perform set_config(
    'test.settlement_v3_legacy_drift_group_id',
    v_drift_group_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_legacy_rounding_group_id',
    v_rounding_group_id::text,
    false
  );
end;
$$;

select ok(
  exists (
    select 1
    from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id =
        current_setting('test.settlement_v3_legacy_drift_group_id')::uuid
      and finalized.validation_profile = 'legacy_structural'
      and finalized.legacy_parent_amount_mismatch
      and not finalized.legacy_parent_household_mismatch
      and not finalized.legacy_parent_currency_mismatch
      and finalized.legacy_rounding_delta_cents = 0
  ),
  'legacy parent drift is recorded explicitly without rewriting ledger amounts'
);

select is(
  (
    select breakdown.total_amount_cents
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'JPY'
    ) breakdown
    where breakdown.split_group_id =
      current_setting('test.settlement_v3_legacy_drift_group_id')::uuid
  ),
  1001::bigint,
  'legacy parent drift keeps the split ledger amount as the settlement source of truth'
);

select ok(
  exists (
    select 1
    from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id =
        current_setting('test.settlement_v3_legacy_rounding_group_id')::uuid
      and finalized.validation_profile = 'legacy_structural'
      and finalized.legacy_rounding_delta_cents = 1
      and not finalized.legacy_parent_amount_mismatch
  ),
  'bounded legacy rounding is recorded without reallocating any participant'
);

select is(
  (
    select breakdown.total_amount_cents
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'NOK'
    ) breakdown
    where breakdown.split_group_id =
      current_setting('test.settlement_v3_legacy_rounding_group_id')::uuid
  ),
  500::bigint,
  'bounded legacy rounding keeps the participant native split amount'
);

-- Database-first rollout compatibility for the currently released writer. -----------

do $$
declare
  v_expense_id uuid := gen_random_uuid();
  v_group_id uuid := gen_random_uuid();
  v_member_line_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_previous_role text;
begin
  v_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    'USD'
  );

  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values (
    v_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    v_account_id,
    current_date,
    900,
    'USD',
    'other',
    'Released writer rollout split',
    'expense'
  );

  insert into public.expense_split_groups (
    id, household_id, expense_id, payer_user_id, split_type,
    currency, total_amount_cents, description
  ) values (
    v_group_id,
    current_setting('test.settlement_v3_household_id')::uuid,
    v_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'amount',
    'USD',
    900,
    'Released writer rollout split'
  );

  insert into public.expense_split_lines (
    id, split_group_id, user_id, amount_cents, is_settled, settled_at
  ) values
    (
      gen_random_uuid(),
      v_group_id,
      current_setting('test.settlement_v3_owner_id')::uuid,
      0,
      false,
      null
    ),
    (
      v_member_line_id,
      v_group_id,
      current_setting('test.settlement_v3_member_id')::uuid,
      450,
      false,
      null
    ),
    (
      gen_random_uuid(),
      v_group_id,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      450,
      false,
      null
    );

  v_previous_role := current_setting('request.jwt.claim.role', true);
  begin
    perform set_config('request.jwt.claim.role', 'service_role', false);
    update public.expenses expense
    set split_group_id = v_group_id
    where expense.id = v_expense_id;
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
  exception when others then
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
    raise;
  end;

  perform set_config(
    'test.settlement_v3_released_writer_expense_id',
    v_expense_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_released_writer_group_id',
    v_group_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_released_writer_member_line_id',
    v_member_line_id::text,
    false
  );
end;
$$;

select ok(
  exists (
    select 1
    from public.expenses expense
    join public.household_settlement_finalized_split_groups finalized
      on finalized.split_group_id = expense.split_group_id
    where expense.id =
      current_setting('test.settlement_v3_released_writer_expense_id')::uuid
      and expense.split_group_id =
        current_setting('test.settlement_v3_released_writer_group_id')::uuid
      and finalized.validation_profile = 'strict_current'
      and not finalized.legacy_parent_household_mismatch
      and not finalized.legacy_parent_currency_mismatch
      and not finalized.legacy_parent_amount_mismatch
      and finalized.legacy_rounding_delta_cents = 0
  ),
  'database-first rollout lets the released writer finalize a brand-new valid split'
);

select throws_ok(
  format(
    'update public.expense_split_lines set amount_cents = 451 where id = %L::uuid',
    current_setting('test.settlement_v3_released_writer_member_line_id')
  ),
  'settlement_split_lines_require_atomic_write',
  'released raw writers cannot rewrite an already-finalized split'
);

do $$
declare
  v_same_scope_account_id uuid := gen_random_uuid();
  v_personal_account_id uuid;
begin
  insert into public.accounts (
    id,
    user_id,
    household_id,
    name,
    icon,
    color,
    currency,
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  ) values (
    v_same_scope_account_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    'Released writer replacement wallet',
    'wallet',
    '#6B7280',
    'USD',
    0,
    false,
    false,
    false
  );
  v_personal_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    null,
    'USD'
  );
  perform set_config(
    'test.settlement_v3_same_scope_account_id',
    v_same_scope_account_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_wrong_scope_account_id',
    v_personal_account_id::text,
    false
  );
end;
$$;

select lives_ok(
  format(
    'update public.expenses set account_id = %L::uuid where id = %L::uuid',
    current_setting('test.settlement_v3_same_scope_account_id'),
    current_setting('test.settlement_v3_released_writer_expense_id')
  ),
  'same-scope wallet edits remain compatible for finalized split expenses'
);

select throws_ok(
  format(
    'update public.expenses set account_id = %L::uuid where id = %L::uuid',
    current_setting('test.settlement_v3_wrong_scope_account_id'),
    current_setting('test.settlement_v3_released_writer_expense_id')
  ),
  'settlement_split_parent_account_scope_mismatch',
  'raw wallet edits cannot move a finalized split expense outside its household scope'
);

do $$
declare
  v_personal_account_id uuid;
  v_previous_role text;
begin
  v_personal_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    null,
    'USD'
  );
  v_previous_role := current_setting('request.jwt.claim.role', true);
  begin
    perform set_config('request.jwt.claim.role', 'service_role', false);
    update public.expenses expense
    set split_group_id = null,
        household_id = null,
        account_id = v_personal_account_id
    where expense.id =
      current_setting('test.settlement_v3_released_writer_expense_id')::uuid;
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
  exception when others then
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
    raise;
  end;
end;
$$;

select ok(
  not exists (
    select 1
    from public.expense_split_groups split_group
    where split_group.id =
      current_setting('test.settlement_v3_released_writer_group_id')::uuid
  )
  and exists (
    select 1
    from public.expenses expense
    where expense.id =
      current_setting('test.settlement_v3_released_writer_expense_id')::uuid
      and expense.split_group_id is null
      and expense.household_id is null
  ),
  'released scope moves atomically clean the detached old group after parent unlink'
);

do $$
declare
  v_expense_id uuid := gen_random_uuid();
  v_group_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_lines jsonb;
  v_previous_role text;
begin
  v_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    'USD'
  );
  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values (
    v_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    v_account_id,
    current_date,
    600,
    'USD',
    'income',
    'Household income split compatibility',
    'income'
  );

  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id =
          current_setting('test.settlement_v3_owner_id')::uuid
          then 0
        else 300
      end
    )
    order by membership.user_id
  )
  into strict v_lines
  from public.household_members membership
  where membership.household_id =
    current_setting('test.settlement_v3_household_id')::uuid;

  v_previous_role := current_setting('request.jwt.claim.role', true);
  begin
    perform set_config('request.jwt.claim.role', 'service_role', false);
    perform public.households_commit_expense_split_write_v3(
      current_setting('test.settlement_v3_owner_id')::uuid,
      v_expense_id,
      v_group_id,
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_owner_id')::uuid,
      'amount',
      'USD',
      600,
      'Household income split compatibility',
      v_lines,
      pg_temp.expected_parent_snapshot(v_expense_id),
      null,
      v_account_id
    );
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
  exception when others then
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
    raise;
  end;

  perform set_config(
    'test.settlement_v3_income_expense_id',
    v_expense_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_income_group_id',
    v_group_id::text,
    false
  );
end;
$$;

select ok(
  exists (
    select 1
    from public.expenses expense
    join public.household_settlement_finalized_split_groups finalized
      on finalized.split_group_id = expense.split_group_id
    where expense.id =
      current_setting('test.settlement_v3_income_expense_id')::uuid
      and expense.type::text = 'income'
      and expense.split_group_id =
        current_setting('test.settlement_v3_income_group_id')::uuid
  ),
  'atomic writer preserves the released household income split path'
);

-- Historical participants survive membership drift; new/re-split writes are strict. ----

do $$
declare
  v_household_id uuid := gen_random_uuid();
  v_old jsonb;
  v_historical_lines jsonb;
  v_current_lines jsonb;
  v_new_expense_id uuid := gen_random_uuid();
  v_new_group_id uuid := gen_random_uuid();
  v_new_account_id uuid;
  v_new_historical_lines jsonb;
  v_new_current_lines jsonb;
begin
  insert into public.households (id, name, owner_id, currency)
  values (
    v_household_id,
    'Historical participant compatibility household',
    current_setting('test.settlement_v3_owner_id')::uuid,
    'SEK'
  );
  insert into public.household_members (household_id, user_id, role)
  values
    (
      v_household_id,
      current_setting('test.settlement_v3_owner_id')::uuid,
      'owner'
    ),
    (
      v_household_id,
      current_setting('test.settlement_v3_member_id')::uuid,
      'member'
    );

  v_old := pg_temp.add_settlement_obligation(
    v_household_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'SEK',
    1000,
    'Historical two-person split',
    current_date - 10
  );

  insert into public.household_members (household_id, user_id, role)
  values (
    v_household_id,
    current_setting('test.settlement_v3_third_member_id')::uuid,
    'member'
  );

  select jsonb_agg(
    jsonb_build_object(
      'user_id', split_line.user_id,
      'amount_cents', case
        when split_line.user_id =
          current_setting('test.settlement_v3_member_id')::uuid
          then 1200
        else 0
      end,
      'percentage', null,
      'shares', null
    )
    order by split_line.user_id
  )
  into strict v_historical_lines
  from public.expense_split_lines split_line
  where split_line.split_group_id = (v_old ->> 'split_group_id')::uuid;

  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id =
          current_setting('test.settlement_v3_member_id')::uuid
          then 600
        when membership.user_id =
          current_setting('test.settlement_v3_third_member_id')::uuid
          then 600
        else 0
      end,
      'percentage', null,
      'shares', null
    )
    order by membership.user_id
  )
  into strict v_current_lines
  from public.household_members membership
  where membership.household_id = v_household_id;

  v_new_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    v_household_id,
    'SEK'
  );
  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values (
    v_new_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    v_household_id,
    v_new_account_id,
    current_date,
    900,
    'SEK',
    'other',
    'New split after member joined',
    'expense'
  );

  v_new_historical_lines := jsonb_build_array(
    jsonb_build_object(
      'user_id', current_setting('test.settlement_v3_owner_id')::uuid,
      'amount_cents', 0
    ),
    jsonb_build_object(
      'user_id', current_setting('test.settlement_v3_member_id')::uuid,
      'amount_cents', 900
    )
  );
  v_new_current_lines := jsonb_build_array(
    jsonb_build_object(
      'user_id', current_setting('test.settlement_v3_owner_id')::uuid,
      'amount_cents', 0
    ),
    jsonb_build_object(
      'user_id', current_setting('test.settlement_v3_member_id')::uuid,
      'amount_cents', 450
    ),
    jsonb_build_object(
      'user_id', current_setting('test.settlement_v3_third_member_id')::uuid,
      'amount_cents', 450
    )
  );

  perform set_config('test.settlement_v3_drift_household_id', v_household_id::text, false);
  perform set_config('test.settlement_v3_drift_expense_id', v_old ->> 'expense_id', false);
  perform set_config('test.settlement_v3_drift_group_id', v_old ->> 'split_group_id', false);
  perform set_config('test.settlement_v3_drift_historical_lines', v_historical_lines::text, false);
  perform set_config('test.settlement_v3_drift_current_lines', v_current_lines::text, false);
  perform set_config('test.settlement_v3_new_after_join_expense_id', v_new_expense_id::text, false);
  perform set_config('test.settlement_v3_new_after_join_group_id', v_new_group_id::text, false);
  perform set_config('test.settlement_v3_new_after_join_account_id', v_new_account_id::text, false);
  perform set_config('test.settlement_v3_new_after_join_historical_lines', v_new_historical_lines::text, false);
  perform set_config('test.settlement_v3_new_after_join_current_lines', v_new_current_lines::text, false);
  perform set_config('request.jwt.claim.role', 'service_role', false);
end;
$$;

select lives_ok(
  format(
    $query$
      select public.households_commit_expense_split_write_v3(
        %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid,
        'amount', 'SEK', 1200, 'Implicit historical edit',
        %L::jsonb, pg_temp.expected_parent_snapshot(%L::uuid), %L::uuid
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_drift_expense_id'),
    current_setting('test.settlement_v3_drift_group_id'),
    current_setting('test.settlement_v3_drift_household_id'),
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_drift_historical_lines'),
    current_setting('test.settlement_v3_drift_expense_id'),
    current_setting('test.settlement_v3_drift_group_id')
  ),
  'implicit same-group edit accepts the exact historical participant set after a join'
);

select ok(
  (
    select count(*) = 2
      and coalesce(sum(split_line.amount_cents), 0) = 1200
      and bool_and(
        split_line.user_id <>
          current_setting('test.settlement_v3_third_member_id')::uuid
      )
    from public.expense_split_lines split_line
    where split_line.split_group_id =
      current_setting('test.settlement_v3_drift_group_id')::uuid
  )
  and exists (
    select 1
    from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id =
      current_setting('test.settlement_v3_drift_group_id')::uuid
  ),
  'implicit edit preserves two historical participants and republishes finalized state'
);

select lives_ok(
  format(
    $query$
      select public.households_commit_expense_split_write_v3(
        %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid,
        'amount', 'SEK', 1200, 'Explicit current-member re-split',
        %L::jsonb, pg_temp.expected_parent_snapshot(%L::uuid), %L::uuid
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_drift_expense_id'),
    current_setting('test.settlement_v3_drift_group_id'),
    current_setting('test.settlement_v3_drift_household_id'),
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_drift_current_lines'),
    current_setting('test.settlement_v3_drift_expense_id'),
    current_setting('test.settlement_v3_drift_group_id')
  ),
  'explicit re-split accepts the exact current household membership'
);

select is(
  (
    select count(*)::bigint
    from public.expense_split_lines split_line
    where split_line.split_group_id =
      current_setting('test.settlement_v3_drift_group_id')::uuid
  ),
  3::bigint,
  'explicit re-split adds the member who joined after the historical expense'
);

select throws_ok(
  format(
    $query$
      select public.households_commit_expense_split_write_v3(
        %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid,
        'amount', 'SEK', 900, 'Invalid new historical-only split',
        %L::jsonb, pg_temp.expected_parent_snapshot(%L::uuid),
        null::uuid, %L::uuid
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_new_after_join_expense_id'),
    current_setting('test.settlement_v3_new_after_join_group_id'),
    current_setting('test.settlement_v3_drift_household_id'),
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_new_after_join_historical_lines'),
    current_setting('test.settlement_v3_new_after_join_expense_id'),
    current_setting('test.settlement_v3_new_after_join_account_id')
  ),
  'settlement_split_group_member_set_mismatch',
  'a brand-new group cannot omit a member who already joined'
);

select lives_ok(
  format(
    $query$
      select public.households_commit_expense_split_write_v3(
        %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid,
        'amount', 'SEK', 900, 'Valid new current-member split',
        %L::jsonb, pg_temp.expected_parent_snapshot(%L::uuid),
        null::uuid, %L::uuid
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_new_after_join_expense_id'),
    current_setting('test.settlement_v3_new_after_join_group_id'),
    current_setting('test.settlement_v3_drift_household_id'),
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_new_after_join_current_lines'),
    current_setting('test.settlement_v3_new_after_join_expense_id'),
    current_setting('test.settlement_v3_new_after_join_account_id')
  ),
  'a brand-new group succeeds when it includes every current member'
);

select is(
  (
    select count(*)::bigint
    from public.expense_split_lines split_line
    where split_line.split_group_id =
      current_setting('test.settlement_v3_new_after_join_group_id')::uuid
  ),
  3::bigint,
  'new post-join split persists exactly the three current participants'
);

do $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', false);
end;
$$;

-- Reported regression: gross rows must not be clipped to the C$66.11 net. ---------------

do $$
declare
  v_you_owe jsonb;
  v_they_owe jsonb;
begin
  v_you_owe := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'USD',
    11223,
    'Wet and dry catfood',
    current_date - 2
  );
  v_they_owe := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'USD',
    4612,
    'Groceries',
    current_date - 1
  );

  perform set_config(
    'test.settlement_v3_gross_you_owe_expense_id',
    v_you_owe ->> 'expense_id',
    false
  );
  perform set_config(
    'test.settlement_v3_gross_they_owe_expense_id',
    v_they_owe ->> 'expense_id',
    false
  );
end;
$$;

select is(
  current_setting('request.jwt.claim.role'),
  'authenticated',
  'atomic split fixtures restore the caller JWT role after service-only commits'
);

select is(
  (
    select balance.net_cents
    from public.households_get_pairwise_settlement_balances_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      'USD'
    ) balance
    where balance.other_user_id =
      current_setting('test.settlement_v3_member_id')::uuid
  ),
  6611::bigint,
  'canonical pairwise balance is the C$66.11 net'
);

select is(
  (
    select count(*)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    )
  ),
  2::bigint,
  'V2 breakdown returns both gross transaction rows'
);

select results_eq(
  format(
    $query$
      select direction, total_amount_cents, remaining_amount_cents
      from public.households_get_settlement_breakdown_v2(
        %L::uuid,
        %L::uuid,
        'USD'
      )
      order by direction
    $query$,
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id')
  ),
  $expected$
    values
      ('they_owe_you'::text, 4612::bigint, 4612::bigint),
      ('you_owe'::text, 11223::bigint, 11223::bigint)
  $expected$,
  'V2 preserves C$112.23 and C$46.12 instead of clipping one row to C$66.11'
);

select is(
  (
    select count(*)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) breakdown
    where lower(breakdown.expense_type) = 'adjustment'
  ),
  0::bigint,
  'balanced gross rows do not need a synthetic adjustment'
);

select ok(
  (
    with calculation as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'USD'
      ) as payload
    )
    select jsonb_typeof(payload -> 'net_cents') = 'number'
      and jsonb_typeof(payload -> 'rows') = 'array'
    from calculation
  ),
  'V3 returns the documented numeric net and row array shape'
);

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  6611::bigint,
  'V3 returns the same authoritative C$66.11 net'
);

select is(
  jsonb_array_length(
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) -> 'rows'
  )::bigint,
  2::bigint,
  'V3 atomically returns both contributing rows'
);

select results_eq(
  format(
    $query$
      with calculation as (
        select public.households_get_settlement_calculation_v3(
          %L::uuid,
          %L::uuid,
          'USD'
        ) as payload
      )
      select
        breakdown_row.value ->> 'direction',
        (breakdown_row.value ->> 'total_amount_cents')::bigint,
        (breakdown_row.value ->> 'remaining_amount_cents')::bigint
      from calculation
      cross join lateral jsonb_array_elements(
        calculation.payload -> 'rows'
      ) breakdown_row(value)
      order by breakdown_row.value ->> 'direction'
    $query$,
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id')
  ),
  $expected$
    values
      ('they_owe_you'::text, 4612::bigint, 4612::bigint),
      ('you_owe'::text, 11223::bigint, 11223::bigint)
  $expected$,
  'V3 JSON preserves the same two un-clipped transaction rows as V2'
);

select is(
  (
    with calculation as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'USD'
      ) as payload
    )
    select coalesce(sum(
      case breakdown_row.value ->> 'direction'
        when 'you_owe' then
          (breakdown_row.value ->> 'remaining_amount_cents')::bigint
        else -(breakdown_row.value ->> 'remaining_amount_cents')::bigint
      end
    ), 0)::bigint
    from calculation
    cross join lateral jsonb_array_elements(
      calculation.payload -> 'rows'
    ) breakdown_row(value)
  ),
  6611::bigint,
  'V3 row directions reconcile exactly to its authoritative net'
);

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'USD'
      ) as payload
    )
    select (payload ->> 'snapshot_version')::integer = 1
      and payload ->> 'snapshot_token' ~ '^v1:[0-9a-f]{64}$'
      and payload ->> 'household_id' =
        current_setting('test.settlement_v3_household_id')
      and payload ->> 'member_user_id' =
        current_setting('test.settlement_v3_member_id')
      and payload ->> 'currency' = 'USD'
      and (payload ->> 'split_to_cents')::bigint = 11223
      and (payload ->> 'split_from_cents')::bigint = 4612
      and (payload ->> 'paid_to_cents')::bigint = 0
      and (payload ->> 'paid_from_cents')::bigint = 0
    from snapshot
  ),
  'V3 returns complete pair-scoped cryptographic snapshot metadata and components'
);

select is(
  public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'USD'
  ) ->> 'snapshot_token',
  public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'USD'
  ) ->> 'snapshot_token',
  'unchanged pair state produces a stable snapshot token'
);

-- A changed pre-boundary source is shown at its current native amount, not delta. -------

do $$
declare
  v_you_owe jsonb;
  v_they_owe jsonb;
begin
  v_you_owe := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'NOK',
    1500,
    'Pre-boundary larger direction',
    current_date - 20
  );
  v_they_owe := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'NOK',
    500,
    'Pre-boundary editable opposite direction',
    current_date - 19
  );

  perform set_config(
    'test.settlement_v3_native_edit_expense_id',
    v_they_owe ->> 'expense_id',
    false
  );
  perform set_config(
    'test.settlement_v3_native_edit_group_id',
    v_they_owe ->> 'split_group_id',
    false
  );
end;
$$;

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    999999,
    'NOK',
    'Full boundary before native-amount edit'
  ),
  1,
  'the native-amount edit fixture first establishes a proven full boundary'
);

do $$
declare
  v_expense_id uuid :=
    current_setting('test.settlement_v3_native_edit_expense_id')::uuid;
  v_group_id uuid :=
    current_setting('test.settlement_v3_native_edit_group_id')::uuid;
  v_group public.expense_split_groups%rowtype;
  v_lines jsonb;
  v_previous_role text;
begin
  select split_group.*
  into strict v_group
  from public.expense_split_groups split_group
  where split_group.id = v_group_id;

  select jsonb_agg(
    jsonb_build_object(
      'user_id', split_line.user_id,
      'amount_cents', case
        when split_line.user_id =
          current_setting('test.settlement_v3_member_id')::uuid
          then 700
        else 0
      end,
      'percentage', null,
      'shares', null
    )
    order by split_line.user_id
  )
  into strict v_lines
  from public.expense_split_lines split_line
  where split_line.split_group_id = v_group_id;

  v_previous_role := current_setting('request.jwt.claim.role', true);
  begin
    perform set_config('request.jwt.claim.role', 'service_role', false);
    perform public.households_commit_expense_split_write_v3(
      current_setting('test.settlement_v3_owner_id')::uuid,
      v_expense_id,
      v_group_id,
      current_setting('test.settlement_v3_household_id')::uuid,
      v_group.payer_user_id,
      'amount',
      'NOK',
      700,
      'Edited after full boundary',
      v_lines,
      pg_temp.expected_parent_snapshot(v_expense_id),
      v_group_id,
      null
    );
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
  exception when others then
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
    raise;
  end;
end;
$$;

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'NOK'
    ) ->> 'net_cents'
  )::bigint,
  (-200)::bigint,
  'editing the unallocated opposite row changes the canonical net by C$2.00'
);

select results_eq(
  format(
    $query$
      select
        expense_type,
        direction,
        total_amount_cents,
        remaining_amount_cents
      from public.households_get_settlement_breakdown_v2(
        %L::uuid,
        %L::uuid,
        'NOK'
      )
      order by expense_type, direction
    $query$,
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id')
  ),
  $expected$
    values
      ('adjustment'::text, 'you_owe'::text, 500::bigint, 500::bigint),
      ('expense'::text, 'they_owe_you'::text, 700::bigint, 700::bigint)
  $expected$,
  'a changed pre-boundary transaction keeps its real C$7.00 amount instead of a C$2.00 delta'
);

-- Ambiguous legacy history becomes one carryover plus post-cutover gross rows. ----------

do $$
declare
  v_pre jsonb;
  v_post_you_owe jsonb;
  v_post_they_owe jsonb;
  v_ambiguous_event_id uuid;
  v_ambiguous_event_seq bigint;
  v_cutover_id uuid := gen_random_uuid();
  v_cutover_seq bigint;
  v_owner_id uuid := current_setting('test.settlement_v3_owner_id')::uuid;
  v_member_id uuid := current_setting('test.settlement_v3_member_id')::uuid;
  v_user_a_id uuid;
  v_user_b_id uuid;
begin
  v_pre := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    v_member_id,
    v_owner_id,
    'LKR',
    1000,
    'Unprovable pre-cutover obligation',
    current_date - 100
  );

  insert into public.household_settlement_events (
    household_id,
    actor_user_id,
    payer_user_id,
    participant_user_id,
    currency,
    amount_cents,
    mode,
    is_express_netting,
    settlement_note
  ) values (
    current_setting('test.settlement_v3_household_id')::uuid,
    v_owner_id,
    v_member_id,
    v_owner_id,
    'LKR',
    200,
    'both',
    true,
    'Ambiguous legacy event fixture'
  ) returning id, settlement_ledger_seq
    into v_ambiguous_event_id, v_ambiguous_event_seq;

  if v_owner_id::text < v_member_id::text then
    v_user_a_id := v_owner_id;
    v_user_b_id := v_member_id;
  else
    v_user_a_id := v_member_id;
    v_user_b_id := v_owner_id;
  end if;
  v_cutover_seq := nextval('public.household_settlement_ledger_seq');

  insert into public.household_settlement_legacy_cutovers_v3 (
    id,
    household_id,
    user_a_id,
    user_b_id,
    currency,
    cutover_ledger_seq,
    carryover_net_user_a_cents,
    latest_preceding_full_event_id,
    latest_preceding_full_ledger_seq,
    latest_ambiguous_event_id,
    latest_ambiguous_event_ledger_seq
  ) values (
    v_cutover_id,
    current_setting('test.settlement_v3_household_id')::uuid,
    v_user_a_id,
    v_user_b_id,
    'LKR',
    v_cutover_seq,
    case when v_user_a_id = v_owner_id then 800 else -800 end,
    null,
    null,
    v_ambiguous_event_id,
    v_ambiguous_event_seq
  );

  insert into public.household_settlement_legacy_cutover_lines_v3 (
    cutover_id,
    household_id,
    split_line_id,
    split_group_id,
    expense_id,
    payer_user_id,
    participant_user_id,
    currency,
    amount_cents,
    signed_for_user_a_cents,
    settlement_ledger_seq,
    expense_date,
    expense_description,
    expense_category,
    expense_raw_text,
    expense_type
  )
  select
    v_cutover_id,
    current_setting('test.settlement_v3_household_id')::uuid,
    split_line.id,
    split_group.id,
    expense.id,
    split_group.payer_user_id,
    split_line.user_id,
    'LKR',
    abs(split_line.amount_cents),
    case when v_user_a_id = v_owner_id then 1000 else -1000 end,
    split_line.settlement_ledger_seq,
    expense.date::timestamp at time zone 'UTC',
    split_group.description,
    expense.category::text,
    expense.raw_text,
    expense.type::text
  from public.expense_split_lines split_line
  join public.expense_split_groups split_group
    on split_group.id = split_line.split_group_id
  join public.expenses expense
    on expense.id = split_group.expense_id
  where split_line.id = (v_pre ->> 'split_line_id')::uuid;

  v_post_you_owe := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    v_member_id,
    v_owner_id,
    'LKR',
    700,
    'Post-cutover you owe',
    current_date - 1000
  );
  v_post_they_owe := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    v_owner_id,
    v_member_id,
    'LKR',
    200,
    'Post-cutover they owe',
    current_date
  );

  perform set_config('test.settlement_v3_cutover_id', v_cutover_id::text, false);
  perform set_config('test.settlement_v3_cutover_pre_expense_id', v_pre ->> 'expense_id', false);
  perform set_config('test.settlement_v3_cutover_post_you_owe_id', v_post_you_owe ->> 'expense_id', false);
  perform set_config('test.settlement_v3_cutover_post_they_owe_id', v_post_they_owe ->> 'expense_id', false);
  perform set_config(
    'test.settlement_v3_cutover_initial_token',
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      v_member_id,
      'LKR'
    ) ->> 'snapshot_token',
    false
  );
end;
$$;

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'LKR'
      ) as payload
    )
    select payload ->> 'effective_boundary_kind' = 'legacy_cutover'
      and payload ->> 'cutover_id' =
        current_setting('test.settlement_v3_cutover_id')
      and (payload ->> 'cutover_carryover_net_cents')::bigint = 800
      and (payload ->> 'net_cents')::bigint = 1300
      and payload ->> 'snapshot_token' ~ '^v1:[0-9a-f]{64}$'
    from snapshot
  ),
  'V3 selects the cutover and exposes its actor-oriented C$8.00 carryover'
);

select is(
  (
    select count(*)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'LKR'
    ) breakdown
    where breakdown.expense_type = 'legacy_carryover'
      and breakdown.expense_id is null
      and breakdown.split_group_id is null
      and breakdown.split_line_id is null
      and breakdown.direction = 'you_owe'
      and breakdown.total_amount_cents = 800
      and breakdown.remaining_amount_cents = 800
  ),
  1::bigint,
  'ambiguous pre-cutover history is exactly one source-free carryover row'
);

select ok(
  (
    select count(*) = 2
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'LKR'
    ) breakdown
    where (
      breakdown.expense_id =
        current_setting('test.settlement_v3_cutover_post_you_owe_id')::uuid
      and breakdown.direction = 'you_owe'
      and breakdown.total_amount_cents = 700
      and breakdown.remaining_amount_cents = 700
    ) or (
      breakdown.expense_id =
        current_setting('test.settlement_v3_cutover_post_they_owe_id')::uuid
      and breakdown.direction = 'they_owe_you'
      and breakdown.total_amount_cents = 200
      and breakdown.remaining_amount_cents = 200
    )
  ),
  'every post-cutover transaction is present in both directions at its real amount'
);

select is(
  (
    select coalesce(sum(
      case breakdown.direction
        when 'you_owe' then breakdown.remaining_amount_cents
        else -breakdown.remaining_amount_cents
      end
    ), 0)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'LKR'
    ) breakdown
  ),
  1300::bigint,
  'carryover and post-cutover gross rows reconcile exactly to canonical net'
);

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    300,
    'LKR',
    'Partial settlement after legacy cutover'
  ),
  1,
  'a partial post-cutover settlement succeeds without creating a boundary'
);

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'LKR'
      ) as payload
    )
    select payload ->> 'effective_boundary_kind' = 'legacy_cutover'
      and (payload ->> 'net_cents')::bigint = 1000
      and (
        select event.cleared_pair_balance is false
        from public.household_settlement_events event
        where event.household_id =
            current_setting('test.settlement_v3_household_id')::uuid
          and event.currency = 'LKR'
        order by event.settlement_ledger_seq desc
        limit 1
      )
    from snapshot
  ),
  'partial settlement reduces canonical net while the cutover remains effective'
);

select ok(
  (
    select count(*) = 1
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'LKR'
    ) breakdown
    where breakdown.expense_type = 'legacy_carryover'
      and breakdown.remaining_amount_cents = 500
  )
  and (
    select count(*) = 2
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'LKR'
    ) breakdown
    where breakdown.expense_id in (
      current_setting('test.settlement_v3_cutover_post_you_owe_id')::uuid,
      current_setting('test.settlement_v3_cutover_post_they_owe_id')::uuid
    )
      and breakdown.total_amount_cents = breakdown.remaining_amount_cents
  ),
  'partial payment adjusts only reconciliation while retaining both gross transactions'
);

select ok(
  public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'LKR'
  ) ->> 'snapshot_token'
    <> current_setting('test.settlement_v3_cutover_initial_token'),
  'carryover/event state changes invalidate the pair-scoped snapshot token'
);

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    999999,
    'LKR',
    'Full settlement supersedes legacy cutover'
  ),
  1,
  'a proven full settlement after cutover succeeds with legacy clamp compatibility'
);

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'LKR'
      ) as payload
    )
    select payload ->> 'effective_boundary_kind' = 'full'
      and payload ->> 'boundary_event_id' is not null
      and (payload ->> 'net_cents')::bigint = 0
      and jsonb_array_length(payload -> 'rows') = 0
    from snapshot
  ),
  'new proven full boundary supersedes cutover and clears the breakdown'
);

do $$
declare
  v_created jsonb;
begin
  v_created := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'LKR',
    450,
    'Backdated row after cutover full settlement',
    current_date - 2000
  );
  perform set_config(
    'test.settlement_v3_cutover_post_full_expense_id',
    v_created ->> 'expense_id',
    false
  );
end;
$$;

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'LKR'
      ) as payload
    )
    select (payload ->> 'net_cents')::bigint = 450
      and jsonb_array_length(payload -> 'rows') = 1
      and payload -> 'rows' -> 0 ->> 'expense_id' =
        current_setting('test.settlement_v3_cutover_post_full_expense_id')
    from snapshot
  ),
  'backdated transaction created after the full boundary is selected by ledger sequence'
);

update public.expenses
set deleted_at = clock_timestamp(),
    deleted_reason = 'user_deleted',
    updated_at = clock_timestamp()
where id =
  current_setting('test.settlement_v3_cutover_post_full_expense_id')::uuid;

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'LKR'
      ) as payload
    )
    select (payload ->> 'net_cents')::bigint = 0
      and jsonb_array_length(payload -> 'rows') = 0
    from snapshot
  ),
  'soft-deleted post-boundary transaction is excluded from net, rows, and snapshot'
);

update public.expenses
set deleted_at = clock_timestamp(),
    deleted_reason = 'user_deleted',
    updated_at = clock_timestamp()
where id =
  current_setting('test.settlement_v3_cutover_pre_expense_id')::uuid;

select ok(
  exists (
    select 1
    from public.household_settlement_legacy_cutover_lines_v3 baseline
    where baseline.cutover_id =
        current_setting('test.settlement_v3_cutover_id')::uuid
      and baseline.expense_id =
        current_setting('test.settlement_v3_cutover_pre_expense_id')::uuid
  ),
  'immutable cutover snapshot preserves source identifiers independently of live rows'
);

-- Tokens are pair/currency scoped but include row identity and cycle identity. -----------

do $$
declare
  v_token text;
begin
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'XAF',
    800,
    'Pair-scoped token anchor',
    current_date
  );
  v_token := public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'XAF'
  ) ->> 'snapshot_token';
  perform set_config('test.settlement_v3_pair_scope_token', v_token, false);

  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_third_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'XAF',
    500,
    'Unrelated member activity',
    current_date
  );
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'JPY',
    700,
    'Unrelated currency activity',
    current_date
  );
end;
$$;

select is(
  public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'XAF'
  ) ->> 'snapshot_token',
  current_setting('test.settlement_v3_pair_scope_token'),
  'unrelated member and currency activity cannot invalidate a pair snapshot token'
);

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'XAF'
    ) ->> 'net_cents'
  )::bigint,
  800::bigint,
  'unrelated activity also leaves the pair net unchanged'
);

do $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  v_old := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'NOK',
    1200,
    'Equal-value row before replacement',
    current_date
  );
  perform set_config(
    'test.settlement_v3_equal_row_old_token',
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'NOK'
    ) ->> 'snapshot_token',
    false
  );

  update public.expenses
  set deleted_at = clock_timestamp(),
      deleted_reason = 'user_deleted',
      updated_at = clock_timestamp()
  where id = (v_old ->> 'expense_id')::uuid;

  v_new := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'NOK',
    1200,
    'Equal-value row after replacement',
    current_date
  );
  perform set_config(
    'test.settlement_v3_equal_row_new_expense_id',
    v_new ->> 'expense_id',
    false
  );
end;
$$;

select ok(
  public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'NOK'
  ) ->> 'snapshot_token'
    <> current_setting('test.settlement_v3_equal_row_old_token'),
  'equal-value row replacement changes the token even though the net is unchanged'
);

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'NOK'
      ) as payload
    )
    select (payload ->> 'net_cents')::bigint = 1200
      and jsonb_array_length(payload -> 'rows') = 1
      and payload -> 'rows' -> 0 ->> 'expense_id' =
        current_setting('test.settlement_v3_equal_row_new_expense_id')
    from snapshot
  ),
  'equal-value replacement exposes only the new canonical transaction row'
);

do $$
declare
  v_boundary_event_id uuid;
begin
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'DKK',
    1300,
    'Cycle identity before settlement',
    current_date
  );
  perform set_config(
    'test.settlement_v3_cycle_old_token',
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'DKK'
    ) ->> 'snapshot_token',
    false
  );
  perform public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    1300,
    'DKK',
    'Close token replacement cycle'
  );
  select event.id
  into strict v_boundary_event_id
  from public.household_settlement_events event
  where event.household_id =
      current_setting('test.settlement_v3_household_id')::uuid
    and event.currency = 'DKK'
  order by event.settlement_ledger_seq desc
  limit 1;
  perform set_config(
    'test.settlement_v3_cycle_boundary_event_id',
    v_boundary_event_id::text,
    false
  );

  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'DKK',
    1300,
    'Same-value obligation in new cycle',
    current_date
  );
end;
$$;

select ok(
  (
    with snapshot as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'DKK'
      ) as payload
    )
    select payload ->> 'snapshot_token'
        <> current_setting('test.settlement_v3_cycle_old_token')
      and (payload ->> 'net_cents')::bigint = 1300
      and payload ->> 'boundary_event_id' =
        current_setting('test.settlement_v3_cycle_boundary_event_id')
    from snapshot
  ),
  'same-value activity in a new cycle has a different boundary-bound token'
);

select is(
  pg_temp.try_delete_boundary_event(
    current_setting('test.settlement_v3_cycle_boundary_event_id')::uuid
  ),
  '23503',
  'an individual boundary event cannot be deleted while current-cycle rows reference it'
);

-- Strict settlement requests are token-bound and exactly-once. --------------------------

do $$
declare
  v_result jsonb;
begin
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'NZD',
    1000,
    'Strict idempotency obligation',
    current_date
  );
  perform set_config(
    'test.settlement_v3_strict_initial_token',
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'NZD'
    ) ->> 'snapshot_token',
    false
  );
  v_result := public.households_settle_amount_and_notify_v2(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'to_member',
    400,
    'NZD',
    current_setting('test.settlement_v3_strict_initial_token'),
    'pgtap:settlement:applied',
    'Strict partial settlement'
  );
  perform set_config(
    'test.settlement_v3_strict_applied_result',
    v_result::text,
    false
  );
end;
$$;

select ok(
  (
    with result as (
      select current_setting(
        'test.settlement_v3_strict_applied_result'
      )::jsonb as payload
    )
    select payload ->> 'status' = 'applied'
      and (payload ->> 'replayed')::boolean is false
      and payload ->> 'client_mutation_id' = 'pgtap:settlement:applied'
      and payload ->> 'settlement_event_id' is not null
      and (payload ->> 'requested_amount_cents')::bigint = 400
      and (payload ->> 'applied_amount_cents')::bigint = 400
      and (payload ->> 'pair_balance_before_cents')::bigint = 1000
      and (payload ->> 'pair_balance_after_cents')::bigint = 600
      and payload ->> 'result_snapshot_token' ~ '^v1:[0-9a-f]{64}$'
    from result
  ),
  'strict settlement applies the exact confirmed amount and returns a new snapshot'
);

select ok(
  (
    with replay as (
      select public.households_settle_amount_and_notify_v2(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'to_member',
        400,
        'NZD',
        current_setting('test.settlement_v3_strict_initial_token'),
        'pgtap:settlement:applied',
        'Strict partial settlement'
      ) as payload
    )
    select (payload ->> 'replayed')::boolean is true
      and payload - 'replayed' =
        current_setting('test.settlement_v3_strict_applied_result')::jsonb
          - 'replayed'
    from replay
  ),
  'replaying the identical mutation returns the exact stored applied result'
);

select ok(
  (
    select count(*) = 1
    from public.household_settlement_events event
    where event.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and event.currency = 'NZD'
  )
  and (
    select count(*) = 1
    from public.notification_events notification
    where notification.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and notification.user_id =
        current_setting('test.settlement_v3_member_id')::uuid
      and notification.event_type = 'split_settled'
      and notification.payload ->> 'currency' = 'NZD'
  )
  and (
    select count(*) = 1
    from public.household_settlement_requests_v2 request
    where request.actor_user_id =
        current_setting('test.settlement_v3_owner_id')::uuid
      and request.client_mutation_id = 'pgtap:settlement:applied'
  ),
  'an applied replay creates exactly one event, notification, and request record'
);

select throws_ok(
  format(
    $query$
      select public.households_settle_amount_and_notify_v2(
        %L::uuid,
        %L::uuid,
        'to_member',
        401,
        'NZD',
        %L,
        'pgtap:settlement:applied',
        'Strict partial settlement'
      )
    $query$,
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id'),
    current_setting('test.settlement_v3_strict_initial_token')
  ),
  'settlement_idempotency_key_reused',
  'the same mutation ID cannot be rebound to a different amount'
);

select ok(
  (
    with conflict as (
      select public.households_settle_amount_and_notify_v2(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'to_member',
        100,
        'NZD',
        current_setting('test.settlement_v3_strict_initial_token'),
        'pgtap:settlement:conflict',
        null
      ) as payload
    )
    select payload ->> 'status' = 'snapshot_conflict'
      and (payload ->> 'replayed')::boolean is false
      and payload ->> 'settlement_event_id' is null
      and (payload ->> 'applied_amount_cents')::bigint = 0
      and (payload ->> 'pair_balance_before_cents')::bigint = 600
    from conflict
  ),
  'a stale token is persisted as a terminal conflict without applying money'
);

select ok(
  (
    with replay as (
      select public.households_settle_amount_and_notify_v2(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'to_member',
        100,
        'NZD',
        current_setting('test.settlement_v3_strict_initial_token'),
        'pgtap:settlement:conflict',
        null
      ) as payload
    )
    select payload ->> 'status' = 'snapshot_conflict'
      and (payload ->> 'replayed')::boolean is true
      and (
        select request.terminal_status = 'snapshot_conflict'
        from public.household_settlement_requests_v2 request
        where request.actor_user_id =
            current_setting('test.settlement_v3_owner_id')::uuid
          and request.client_mutation_id = 'pgtap:settlement:conflict'
      )
    from replay
  ),
  'a lost conflict response replays as conflict permanently'
);

select ok(
  (
    select count(*) = 1
    from public.household_settlement_events event
    where event.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and event.currency = 'NZD'
  )
  and (
    select count(*) = 1
    from public.notification_events notification
    where notification.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and notification.payload ->> 'currency' = 'NZD'
  ),
  'stale-token conflict and replay create no extra event or notification'
);

select ok(
  (
    with result as (
      select public.households_settle_amount_and_notify_v2(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'from_member',
        100,
        'NZD',
        current_setting('test.settlement_v3_strict_applied_result')::jsonb
          ->> 'result_snapshot_token',
        'pgtap:settlement:nothing',
        null
      ) as payload
    )
    select payload ->> 'status' = 'nothing_to_settle'
      and payload ->> 'settlement_event_id' is null
      and (payload ->> 'applied_amount_cents')::bigint = 0
    from result
  ),
  'strict wrong-direction intent is a terminal no-op rather than a direction flip'
);

do $$
begin
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'PLN',
    1000,
    'Direction before race',
    current_date
  );
  perform set_config(
    'test.settlement_v3_direction_token',
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'PLN'
    ) ->> 'snapshot_token',
    false
  );
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'PLN',
    2000,
    'Direction after race',
    current_date
  );
end;
$$;

select ok(
  (
    with result as (
      select public.households_settle_amount_and_notify_v2(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'both',
        500,
        'PLN',
        current_setting('test.settlement_v3_direction_token'),
        'pgtap:settlement:direction-flip',
        null
      ) as payload
    )
    select payload ->> 'status' = 'snapshot_conflict'
      and not exists (
        select 1
        from public.household_settlement_events event
        where event.household_id =
            current_setting('test.settlement_v3_household_id')::uuid
          and event.currency = 'PLN'
      )
    from result
  ),
  'a stale mode=both request cannot settle after the pair direction flips'
);

-- Deferred boundary FKs permit a complete household cascade. ---------------------------

do $$
declare
  v_household_id uuid := gen_random_uuid();
begin
  insert into public.households (id, name, owner_id, currency)
  values (
    v_household_id,
    'Disposable boundary cascade household',
    current_setting('test.settlement_v3_owner_id')::uuid,
    'JPY'
  );
  insert into public.household_members (household_id, user_id, role)
  values
    (
      v_household_id,
      current_setting('test.settlement_v3_owner_id')::uuid,
      'owner'
    ),
    (
      v_household_id,
      current_setting('test.settlement_v3_member_id')::uuid,
      'member'
    )
  on conflict (household_id, user_id) do update
  set role = excluded.role;

  perform pg_temp.add_settlement_obligation(
    v_household_id,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'JPY',
    900,
    'Disposable pre-boundary row',
    current_date
  );
  perform public.households_settle_amount_and_notify(
    v_household_id,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    900,
    'JPY',
    'Disposable full boundary'
  );
  perform pg_temp.add_settlement_obligation(
    v_household_id,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'JPY',
    200,
    'Disposable post-boundary row',
    current_date
  );
  perform set_config(
    'test.settlement_v3_disposable_household_id',
    v_household_id::text,
    false
  );
end;
$$;

select ok(
  pg_temp.delete_household_with_boundary_rows(
    current_setting('test.settlement_v3_disposable_household_id')::uuid
  ),
  'a complete household cascade removes both sides of the deferred boundary references'
);

-- A new authoritative partial event is current-cycle history before any full boundary. --

do $$
declare
  v_created jsonb;
begin
  v_created := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'CHF',
    2000,
    'Partial before first full boundary',
    current_date
  );

  perform set_config(
    'test.settlement_v3_preboundary_partial_expense_id',
    v_created ->> 'expense_id',
    false
  );
end;
$$;

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    500,
    'CHF',
    'Partial before first full boundary'
  ),
  1,
  'a partial payment succeeds before the pair has any full CHF boundary'
);

select ok(
  (
    select event.cleared_pair_balance is false
      and event.cycle_boundary_event_id is null
      and abs(event.pair_balance_before_cents) = 2000
      and abs(event.pair_balance_after_cents) = 1500
    from public.household_settlement_events event
    where event.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and event.currency = 'CHF'
    order by event.settlement_ledger_seq desc
    limit 1
  ),
  'the first partial event remains in the open cycle with authoritative before/after balances'
);

select ok(
  (
    with calculation as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'CHF'
      ) as payload
    )
    select (calculation.payload ->> 'net_cents')::bigint = 1500
      and jsonb_array_length(calculation.payload -> 'rows') = 2
      and exists (
        select 1
        from jsonb_array_elements(calculation.payload -> 'rows') row(value)
        where row.value ->> 'expense_id' =
            current_setting('test.settlement_v3_preboundary_partial_expense_id')
          and row.value ->> 'direction' = 'you_owe'
          and (row.value ->> 'total_amount_cents')::bigint = 2000
          and (row.value ->> 'remaining_amount_cents')::bigint = 2000
      )
      and exists (
        select 1
        from jsonb_array_elements(calculation.payload -> 'rows') row(value)
        where row.value ->> 'expense_id' is null
          and row.value ->> 'expense_type' = 'adjustment'
          and row.value ->> 'direction' = 'they_owe_you'
          and (row.value ->> 'remaining_amount_cents')::bigint = 500
      )
    from calculation
  ),
  'a pre-full partial keeps the C$20.00 gross row and reconciles C$5.00 separately without a boundary'
);

-- A full settlement is the only cycle boundary. ----------------------------------------

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    999999,
    'USD',
    'Full reported-case settlement'
  ),
  1,
  'settling more than the balance clamps to and records the full balance'
);

do $$
declare
  v_event_id uuid;
begin
  select event.id
  into strict v_event_id
  from public.household_settlement_events event
  where event.household_id =
      current_setting('test.settlement_v3_household_id')::uuid
    and event.actor_user_id =
      current_setting('test.settlement_v3_owner_id')::uuid
    and event.currency = 'USD'
    and (
      event.payer_user_id =
        current_setting('test.settlement_v3_member_id')::uuid
      or event.participant_user_id =
        current_setting('test.settlement_v3_member_id')::uuid
    )
  order by event.settlement_ledger_seq desc
  limit 1;

  perform set_config(
    'test.settlement_v3_full_boundary_event_id',
    v_event_id::text,
    false
  );
end;
$$;

select is(
  (
    select event.amount_cents
    from public.household_settlement_events event
    where event.id =
      current_setting('test.settlement_v3_full_boundary_event_id')::uuid
  ),
  6611::bigint,
  'full event stores the real C$66.11 payment, not the oversized request'
);

select ok(
  (
    select event.cleared_pair_balance is true
      and event.pair_balance_after_cents = 0
      and abs(event.pair_balance_before_cents) = 6611
    from public.household_settlement_events event
    where event.id =
      current_setting('test.settlement_v3_full_boundary_event_id')::uuid
  ),
  'server-proven zero balance marks the event as a full cycle boundary'
);

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  0::bigint,
  'V3 net is zero immediately after the full settlement'
);

select is(
  jsonb_array_length(
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) -> 'rows'
  )::bigint,
  0::bigint,
  'the fully settled cycle has no current-cycle rows'
);

-- A partial mode=both event stays inside the cycle without clipping gross rows. ----------

do $$
declare
  v_oldest jsonb;
  v_second jsonb;
  v_reverse jsonb;
begin
  v_oldest := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'USD',
    1000,
    'Partial oldest',
    current_date
  );
  v_second := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'USD',
    4000,
    'Partial second',
    current_date
  );
  v_reverse := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'USD',
    500,
    'Partial reverse',
    current_date
  );

  perform set_config(
    'test.settlement_v3_partial_oldest_expense_id',
    v_oldest ->> 'expense_id',
    false
  );
  perform set_config(
    'test.settlement_v3_partial_second_expense_id',
    v_second ->> 'expense_id',
    false
  );
  perform set_config(
    'test.settlement_v3_partial_second_line_id',
    v_second ->> 'split_line_id',
    false
  );
  perform set_config(
    'test.settlement_v3_partial_reverse_expense_id',
    v_reverse ->> 'expense_id',
    false
  );
end;
$$;

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  4500::bigint,
  'post-boundary bidirectional activity starts at a C$45.00 net'
);

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    1500,
    'USD',
    'Partial both-direction settlement'
  ),
  1,
  'a partial mode=both settlement succeeds'
);

do $$
declare
  v_event_id uuid;
begin
  select event.id
  into strict v_event_id
  from public.household_settlement_events event
  where event.household_id =
      current_setting('test.settlement_v3_household_id')::uuid
    and event.currency = 'USD'
    and event.amount_cents = 1500
  order by event.settlement_ledger_seq desc
  limit 1;

  perform set_config(
    'test.settlement_v3_partial_event_id',
    v_event_id::text,
    false
  );
end;
$$;

select ok(
  (
    select event.cleared_pair_balance is false
      and event.pair_balance_after_cents <> 0
      and event.cycle_boundary_event_id =
        current_setting('test.settlement_v3_full_boundary_event_id')::uuid
    from public.household_settlement_events event
    where event.id = current_setting('test.settlement_v3_partial_event_id')::uuid
  ),
  'partial mode=both event does not reset and remains attached to the full boundary'
);

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  3000::bigint,
  'partial payment reduces the net without closing the cycle'
);

select results_eq(
  format(
    $query$
      select
        expense_description,
        direction,
        total_amount_cents,
        remaining_amount_cents
      from public.households_get_settlement_breakdown_v2(
        %L::uuid,
        %L::uuid,
        'USD'
      )
      order by expense_description
    $query$,
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id')
  ),
  $expected$
    values
      ('Partial oldest'::text, 'you_owe'::text, 1000::bigint, 1000::bigint),
      ('Partial reverse'::text, 'they_owe_you'::text, 500::bigint, 500::bigint),
      ('Partial second'::text, 'you_owe'::text, 4000::bigint, 4000::bigint),
      ('Settlement adjustment'::text, 'they_owe_you'::text, 1500::bigint, 1500::bigint)
  $expected$,
  'partial settlement preserves every gross transaction and reconciles its effect separately'
);

select is(
  (
    select count(*)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    )
  ),
  4::bigint,
  'partial settlement keeps three gross rows plus one source-free reconciliation row'
);

select is(
  (
    with calculation as (
      select public.households_get_settlement_calculation_v3(
        current_setting('test.settlement_v3_household_id')::uuid,
        current_setting('test.settlement_v3_member_id')::uuid,
        'USD'
      ) as payload
    )
    select coalesce(sum(
      case breakdown_row.value ->> 'direction'
        when 'you_owe' then
          (breakdown_row.value ->> 'remaining_amount_cents')::bigint
        else -(breakdown_row.value ->> 'remaining_amount_cents')::bigint
      end
    ), 0)::bigint
    from calculation
    cross join lateral jsonb_array_elements(
      calculation.payload -> 'rows'
    ) breakdown_row(value)
  ),
  3000::bigint,
  'post-partial V3 rows still reconcile exactly to the authoritative net'
);

do $$
declare
  v_old_seq bigint;
  v_old_boundary uuid;
begin
  select split_line.settlement_ledger_seq, split_line.cycle_boundary_event_id
  into strict v_old_seq, v_old_boundary
  from public.expense_split_lines split_line
  where split_line.id =
    current_setting('test.settlement_v3_partial_second_line_id')::uuid;

  perform set_config(
    'test.settlement_v3_idempotent_old_seq',
    v_old_seq::text,
    false
  );
  perform set_config(
    'test.settlement_v3_idempotent_old_boundary',
    v_old_boundary::text,
    false
  );
end;
$$;

update public.expense_split_lines split_line
set amount_cents = split_line.amount_cents,
    is_settled = split_line.is_settled
where split_line.id =
  current_setting('test.settlement_v3_partial_second_line_id')::uuid;

select ok(
  (
    select split_line.settlement_ledger_seq =
        current_setting('test.settlement_v3_idempotent_old_seq')::bigint
      and split_line.cycle_boundary_event_id =
        current_setting('test.settlement_v3_idempotent_old_boundary')::uuid
    from public.expense_split_lines split_line
    where split_line.id =
      current_setting('test.settlement_v3_partial_second_line_id')::uuid
  ),
  'an idempotent split-line update does not invent a new causal event'
);

select throws_ok(
  format(
    $query$
      update public.expense_split_lines
      set settlement_ledger_seq = settlement_ledger_seq + 1000
      where id = %L::uuid
    $query$,
    current_setting('test.settlement_v3_partial_second_line_id')
  ),
  'settlement_split_line_causal_fields_are_server_managed',
  'a direct split-line causal sequence rewrite is rejected'
);

do $$
declare
  v_allocation_id uuid := gen_random_uuid();
  v_token_before text;
  v_token_after text;
begin
  update public.expenses
  set deleted_at = clock_timestamp(),
      deleted_reason = 'provider_removed',
      updated_at = clock_timestamp()
  where id =
    current_setting('test.settlement_v3_partial_oldest_expense_id')::uuid;

  v_token_before := public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'USD'
  ) ->> 'snapshot_token';

  insert into public.household_settlement_event_allocations_v2 (
    id,
    household_id,
    settlement_event_id,
    split_group_id,
    split_line_id,
    expense_id,
    currency,
    payer_user_id,
    participant_user_id,
    allocated_amount_cents,
    allocation_order,
    allocation_source
  )
  select
    v_allocation_id,
    event.household_id,
    event.id,
    null,
    null,
    current_setting('test.settlement_v3_partial_oldest_expense_id')::uuid,
    event.currency,
    event.payer_user_id,
    event.participant_user_id,
    1,
    999,
    'test_deleted_source'
  from public.household_settlement_events event
  where event.id = current_setting('test.settlement_v3_partial_event_id')::uuid;

  v_token_after := public.households_get_settlement_calculation_v3(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'USD'
  ) ->> 'snapshot_token';

  perform set_config(
    'test.settlement_v3_deleted_allocation_filtered',
    (v_token_before = v_token_after)::text,
    false
  );

  delete from public.household_settlement_event_allocations_v2 allocation
  where allocation.id = v_allocation_id;

  update public.expenses
  set deleted_at = null,
      deleted_reason = null,
      updated_at = clock_timestamp()
  where id =
    current_setting('test.settlement_v3_partial_oldest_expense_id')::uuid;
end;
$$;

select is(
  current_setting('test.settlement_v3_deleted_allocation_filtered'),
  'true',
  'allocations whose source expense is soft-deleted are excluded from the pair snapshot token'
);

-- Mutating a pre-boundary row produces only its current-cycle correction. ----------------

do $$
declare
  v_created jsonb;
begin
  v_created := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_third_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'USD',
    3000,
    'Mutable pre-boundary transaction',
    current_date - 30
  );

  perform set_config(
    'test.settlement_v3_mutable_expense_id',
    v_created ->> 'expense_id',
    false
  );
  perform set_config(
    'test.settlement_v3_mutable_group_id',
    v_created ->> 'split_group_id',
    false
  );
  perform set_config(
    'test.settlement_v3_mutable_line_id',
    v_created ->> 'split_line_id',
    false
  );
end;
$$;

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_third_member_id')::uuid,
    'both',
    3000,
    'USD',
    'Full boundary before mutation'
  ),
  1,
  'independent pair is fully settled before mutation testing'
);

do $$
declare
  v_lines jsonb;
  v_previous_role text := current_setting(
    'request.jwt.claim.role',
    true
  );
begin
  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id =
          current_setting('test.settlement_v3_owner_id')::uuid
          then 3500
        else 0
      end,
      'percentage', null,
      'shares', null
    )
    order by membership.user_id
  )
  into strict v_lines
  from public.household_members membership
  where membership.household_id =
    current_setting('test.settlement_v3_household_id')::uuid;

  begin
    perform set_config('request.jwt.claim.role', 'service_role', false);
    perform public.households_commit_expense_split_write_v3(
      current_setting('test.settlement_v3_owner_id')::uuid,
      current_setting('test.settlement_v3_mutable_expense_id')::uuid,
      current_setting('test.settlement_v3_mutable_group_id')::uuid,
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'amount',
      'USD',
      3500,
      'Mutable pre-boundary transaction',
      v_lines,
      pg_temp.expected_parent_snapshot(
        current_setting('test.settlement_v3_mutable_expense_id')::uuid
      ),
      current_setting('test.settlement_v3_mutable_group_id')::uuid
    );
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
  exception when others then
    perform set_config(
      'request.jwt.claim.role',
      coalesce(v_previous_role, ''),
      false
    );
    raise;
  end;
end;
$$;

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  500::bigint,
  'editing a pre-boundary transaction exposes only its C$5.00 delta'
);

select ok(
  exists (
    select 1
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'USD'
    ) breakdown
    where breakdown.expense_id =
        current_setting('test.settlement_v3_mutable_expense_id')::uuid
      and breakdown.direction = 'you_owe'
      and breakdown.remaining_amount_cents = 500
  ),
  'V2 attributes the edit delta to the real transaction instead of replaying its old gross amount'
);

update public.expenses
set deleted_at = clock_timestamp(),
    deleted_reason = 'provider_removed',
    updated_at = clock_timestamp()
where id = current_setting('test.settlement_v3_mutable_expense_id')::uuid;

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  -3000::bigint,
  'deleting a pre-boundary transaction preserves canonical live balance semantics'
);

select ok(
  exists (
    select 1
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'USD'
    ) breakdown
    where breakdown.direction = 'they_owe_you'
      and lower(breakdown.expense_type) = 'adjustment'
      and breakdown.remaining_amount_cents = 3000
  ),
  'deleted baseline-only obligation is represented as one reversed correction'
);

select is(
  (
    select coalesce(sum(
      case breakdown.direction
        when 'you_owe' then breakdown.remaining_amount_cents
        else -breakdown.remaining_amount_cents
      end
    ), 0)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'USD'
    ) breakdown
  ),
  -3000::bigint,
  'pre-boundary delete correction reconciles exactly to canonical net'
);

update public.expenses
set deleted_at = null,
    deleted_reason = null,
    updated_at = clock_timestamp()
where id = current_setting('test.settlement_v3_mutable_expense_id')::uuid;

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  500::bigint,
  'restoring the edited transaction restores only its current C$5.00 delta'
);

select is(
  (
    select count(*)::bigint
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'USD'
    ) breakdown
    where lower(breakdown.expense_type) = 'adjustment'
  ),
  0::bigint,
  'restored real transaction replaces the temporary deletion adjustment'
);

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  3000::bigint,
  'third-member mutations cannot leak into the reported user pair'
);

-- Causal sequence, rather than transaction date, defines the cycle. ---------------------

do $$
begin
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'CAD',
    1000,
    'CAD pre-boundary transaction',
    current_date - 10
  );
end;
$$;

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    1000,
    'CAD',
    'CAD full boundary'
  ),
  1,
  'CAD pair can be fully settled independently'
);

do $$
declare
  v_created jsonb;
begin
  v_created := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'CAD',
    700,
    'Created later with an old date',
    current_date - 730
  );

  perform set_config(
    'test.settlement_v3_backdated_expense_id',
    v_created ->> 'expense_id',
    false
  );
end;
$$;

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'CAD'
    ) ->> 'net_cents'
  )::bigint,
  700::bigint,
  'future-created backdated transaction remains in the new cycle'
);

select ok(
  exists (
    select 1
    from public.households_get_settlement_breakdown_v2(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'CAD'
    ) breakdown
    where breakdown.expense_id =
      current_setting('test.settlement_v3_backdated_expense_id')::uuid
  ),
  'backdated transaction is selected by causal ledger sequence, not its old expense date'
);

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  3000::bigint,
  'CAD settlement activity cannot affect the USD cycle'
);

-- Household scope is part of the settlement identity. ----------------------------------

do $$
begin
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_other_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'USD',
    9000,
    'Other household transaction',
    current_date
  );
end;
$$;

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_other_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  9000::bigint,
  'same user pair has an independent balance in another household'
);

select is(
  (
    public.households_get_settlement_calculation_v3(
      current_setting('test.settlement_v3_household_id')::uuid,
      current_setting('test.settlement_v3_member_id')::uuid,
      'USD'
    ) ->> 'net_cents'
  )::bigint,
  3000::bigint,
  'other-household activity cannot leak into the original household cycle'
);

-- Settlement events and their allocation audits are immutable and append-only. -----------

do $$
declare
  v_first jsonb;
begin
  v_first := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'GBP',
    1000,
    'Reprocessing first row',
    current_date
  );
  perform set_config(
    'test.settlement_v3_paid_expense_id',
    v_first ->> 'expense_id',
    false
  );
  perform set_config(
    'test.settlement_v3_paid_group_id',
    v_first ->> 'split_group_id',
    false
  );
  perform pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'GBP',
    1000,
    'Reprocessing second row',
    current_date
  );
end;
$$;

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    500,
    'GBP',
    'Older partial event'
  ),
  1,
  'first GBP partial event is recorded'
);

do $$
declare
  v_event_id uuid;
begin
  select event.id
  into strict v_event_id
  from public.household_settlement_events event
  where event.household_id =
      current_setting('test.settlement_v3_household_id')::uuid
    and event.currency = 'GBP'
  order by event.settlement_ledger_seq desc
  limit 1;

  perform set_config(
    'test.settlement_v3_reprocess_earlier_event_id',
    v_event_id::text,
    false
  );
end;
$$;

select is(
  public.households_settle_amount_and_notify(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    'both',
    500,
    'GBP',
    'Later partial event'
  ),
  1,
  'second GBP partial event is recorded'
);

do $$
declare
  v_audit_fingerprint text;
begin
  select jsonb_build_object(
    'allocations', coalesce(
      (
        select jsonb_agg(
          to_jsonb(allocation)
          order by allocation.allocation_order, allocation.id
        )
        from public.household_settlement_event_allocations_v2 allocation
        where allocation.settlement_event_id =
          current_setting(
            'test.settlement_v3_reprocess_earlier_event_id'
          )::uuid
      ),
      '[]'::jsonb
    ),
    'status', coalesce(
      (
        select to_jsonb(status)
        from public.household_settlement_event_allocation_status_v2 status
        where status.settlement_event_id =
          current_setting(
            'test.settlement_v3_reprocess_earlier_event_id'
          )::uuid
      ),
      'null'::jsonb
    )
  )::text
  into strict v_audit_fingerprint;

  perform set_config(
    'test.settlement_v3_reprocess_audit_fingerprint',
    v_audit_fingerprint,
    false
  );
end;
$$;

select throws_ok(
  format(
    $query$
      update public.household_settlement_events
      set amount_cents = 1000
      where id = %L::uuid
    $query$,
    current_setting('test.settlement_v3_reprocess_earlier_event_id')
  ),
  'settlement_event_accounting_fields_are_immutable',
  'an existing settlement event amount cannot be rewritten'
);

select ok(
  public.households_allocate_settlement_event_v2(
    current_setting('test.settlement_v3_reprocess_earlier_event_id')::uuid,
    'pgtap_reprocess'
  ) = 500
  and (
    select event.amount_cents = 500
    from public.household_settlement_events event
    where event.id =
      current_setting('test.settlement_v3_reprocess_earlier_event_id')::uuid
  )
  and (
    select jsonb_build_object(
      'allocations', coalesce(
        (
          select jsonb_agg(
            to_jsonb(allocation)
            order by allocation.allocation_order, allocation.id
          )
          from public.household_settlement_event_allocations_v2 allocation
          where allocation.settlement_event_id =
            current_setting(
              'test.settlement_v3_reprocess_earlier_event_id'
            )::uuid
        ),
        '[]'::jsonb
      ),
      'status', coalesce(
        (
          select to_jsonb(status)
          from public.household_settlement_event_allocation_status_v2 status
          where status.settlement_event_id =
            current_setting(
              'test.settlement_v3_reprocess_earlier_event_id'
            )::uuid
        ),
        'null'::jsonb
      )
    )::text = current_setting(
      'test.settlement_v3_reprocess_audit_fingerprint'
    )
  )
  and not exists (
    select 1
    from public.household_settlement_event_allocations_v2 allocation
    join public.household_settlement_events event
      on event.id = allocation.settlement_event_id
    join public.expense_split_lines split_line
      on split_line.id = allocation.split_line_id
    where event.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and event.currency = 'GBP'
    group by allocation.split_line_id
    having sum(allocation.allocated_amount_cents)
      > max(abs(split_line.amount_cents))
  ),
  're-running an older allocation returns its original amount without rewriting or overlapping audit rows'
);

do $$
begin
  perform set_config('request.jwt.claim.role', 'service_role', false);
end;
$$;

select throws_ok(
  format(
    $query$
      select public.households_remove_expense_split_with_patch_v3(
        %L::uuid,
        %L::uuid,
        %L::uuid,
        %L::uuid,
        'GBP',
        1000,
        null::uuid,
        pg_temp.expected_parent_snapshot(%L::uuid),
        %L::jsonb
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_paid_expense_id'),
    current_setting('test.settlement_v3_paid_group_id'),
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_paid_expense_id'),
    jsonb_build_object(
      'category', 'travel',
      'raw_text', 'Removal patch must roll back',
      'updated_at', clock_timestamp()
    )::text
  ),
  'settlement_split_group_with_payments_cannot_be_removed',
  'a split with immutable payment allocations cannot be removed, rebound, or cosmetically patched'
);

do $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', false);
end;
$$;

select ok(
  (
    select expense.split_group_id =
        current_setting('test.settlement_v3_paid_group_id')::uuid
      and expense.category = 'other'
      and expense.raw_text = 'Reprocessing first row'
    from public.expenses expense
    where expense.id =
      current_setting('test.settlement_v3_paid_expense_id')::uuid
  ),
  'a rejected atomic split removal rolls back its cosmetic expense patch'
);

-- Split commits reject stale parents, income rows, and portfolio targets. ----------------

do $$
declare
  v_cas_expense_id uuid := gen_random_uuid();
  v_cas_group_id uuid := gen_random_uuid();
  v_cas_account_id uuid;
  v_cas_expected jsonb;
  v_cas_lines jsonb;
  v_portfolio_id uuid := gen_random_uuid();
  v_portfolio_expense_id uuid := gen_random_uuid();
  v_portfolio_group_id uuid := gen_random_uuid();
  v_portfolio_account_id uuid;
  v_portfolio_lines jsonb;
begin
  v_cas_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    'SGD'
  );
  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values (
    v_cas_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    v_cas_account_id,
    current_date,
    1000,
    'SGD',
    'other',
    'Parent CAS fixture',
    'expense'
  );
  v_cas_expected := pg_temp.expected_parent_snapshot(v_cas_expense_id);
  update public.expenses
  set amount_cents = 1100
  where id = v_cas_expense_id;
  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id =
          current_setting('test.settlement_v3_member_id')::uuid
          then 1100
        else 0
      end
    )
    order by membership.user_id
  )
  into strict v_cas_lines
  from public.household_members membership
  where membership.household_id =
    current_setting('test.settlement_v3_household_id')::uuid;

  insert into public.households (
    id, name, owner_id, currency, is_portfolio
  ) values (
    v_portfolio_id,
    'Settlement portfolio rejection fixture',
    current_setting('test.settlement_v3_owner_id')::uuid,
    'SGD',
    true
  );
  insert into public.household_members (household_id, user_id, role)
  values
    (
      v_portfolio_id,
      current_setting('test.settlement_v3_owner_id')::uuid,
      'owner'
    ),
    (
      v_portfolio_id,
      current_setting('test.settlement_v3_member_id')::uuid,
      'member'
    )
  on conflict (household_id, user_id) do update
  set role = excluded.role;
  v_portfolio_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    v_portfolio_id,
    'SGD'
  );
  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values (
    v_portfolio_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    v_portfolio_id,
    v_portfolio_account_id,
    current_date,
    700,
    'SGD',
    'other',
    'Portfolio split rejection fixture',
    'expense'
  );
  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id =
          current_setting('test.settlement_v3_member_id')::uuid
          then 700
        else 0
      end
    )
    order by membership.user_id
  )
  into strict v_portfolio_lines
  from public.household_members membership
  where membership.household_id = v_portfolio_id;

  perform set_config('test.settlement_v3_cas_expense_id', v_cas_expense_id::text, false);
  perform set_config('test.settlement_v3_cas_group_id', v_cas_group_id::text, false);
  perform set_config('test.settlement_v3_cas_account_id', v_cas_account_id::text, false);
  perform set_config('test.settlement_v3_cas_expected', v_cas_expected::text, false);
  perform set_config('test.settlement_v3_cas_lines', v_cas_lines::text, false);
  perform set_config('test.settlement_v3_portfolio_id', v_portfolio_id::text, false);
  perform set_config('test.settlement_v3_portfolio_expense_id', v_portfolio_expense_id::text, false);
  perform set_config('test.settlement_v3_portfolio_group_id', v_portfolio_group_id::text, false);
  perform set_config('test.settlement_v3_portfolio_account_id', v_portfolio_account_id::text, false);
  perform set_config('test.settlement_v3_portfolio_lines', v_portfolio_lines::text, false);
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.role', 'service_role', false);
end;
$$;

select throws_ok(
  format(
    $query$
      select public.households_commit_expense_split_write_v3(
        %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid,
        'amount', 'SGD', 1100, 'Parent CAS attempt',
        %L::jsonb, %L::jsonb, null::uuid, %L::uuid
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_cas_expense_id'),
    current_setting('test.settlement_v3_cas_group_id'),
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_cas_lines'),
    current_setting('test.settlement_v3_cas_expected'),
    current_setting('test.settlement_v3_cas_account_id')
  ),
  'settlement_split_parent_changed_retry',
  'atomic split commit rejects a same-household parent changed after its expected snapshot'
);

do $$
declare
  v_expense_id uuid := gen_random_uuid();
  v_group_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_lines jsonb;
  v_expected jsonb;
begin
  v_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    'SGD'
  );
  insert into public.expenses (
    id, user_id, household_id, account_id, date, amount_cents,
    currency, category, raw_text, type
  ) values (
    v_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    v_account_id,
    current_date,
    800,
    'SGD',
    'other',
    'Removal CAS fixture',
    'expense'
  );

  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id =
          current_setting('test.settlement_v3_member_id')::uuid
          then 800
        else 0
      end
    )
    order by membership.user_id
  )
  into strict v_lines
  from public.household_members membership
  where membership.household_id =
    current_setting('test.settlement_v3_household_id')::uuid;

  perform public.households_commit_expense_split_write_v3(
    current_setting('test.settlement_v3_owner_id')::uuid,
    v_expense_id,
    v_group_id,
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'amount',
    'SGD',
    800,
    'Removal CAS fixture',
    v_lines,
    pg_temp.expected_parent_snapshot(v_expense_id),
    null,
    v_account_id
  );
  v_expected := pg_temp.expected_parent_snapshot(v_expense_id);

  select jsonb_agg(
    jsonb_build_object(
      'user_id', membership.user_id,
      'amount_cents', case
        when membership.user_id =
          current_setting('test.settlement_v3_member_id')::uuid
          then 850
        else 0
      end
    )
    order by membership.user_id
  )
  into strict v_lines
  from public.household_members membership
  where membership.household_id =
    current_setting('test.settlement_v3_household_id')::uuid;

  perform public.households_commit_expense_split_write_v3(
    current_setting('test.settlement_v3_owner_id')::uuid,
    v_expense_id,
    v_group_id,
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'amount',
    'SGD',
    850,
    'Removal CAS fixture updated',
    v_lines,
    pg_temp.expected_parent_snapshot(v_expense_id),
    v_group_id,
    v_account_id
  );

  perform set_config(
    'test.settlement_v3_remove_cas_expense_id',
    v_expense_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_remove_cas_group_id',
    v_group_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_remove_cas_account_id',
    v_account_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_remove_cas_expected',
    v_expected::text,
    false
  );
end;
$$;

select throws_ok(
  format(
    $query$
      select public.households_remove_expense_split_with_patch_v3(
        %L::uuid, %L::uuid, %L::uuid, %L::uuid, 'SGD', 850,
        %L::uuid, %L::jsonb, '{}'::jsonb
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_remove_cas_expense_id'),
    current_setting('test.settlement_v3_remove_cas_group_id'),
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_remove_cas_account_id'),
    current_setting('test.settlement_v3_remove_cas_expected')
  ),
  'settlement_split_parent_changed_retry',
  'atomic split removal rejects a parent changed after its expected snapshot'
);

select throws_ok(
  format(
    $query$
      select public.households_commit_expense_split_write_v3(
        %L::uuid, %L::uuid, %L::uuid, %L::uuid, %L::uuid,
        'amount', 'SGD', 700, 'Portfolio split attempt',
        %L::jsonb, %L::jsonb, null::uuid, %L::uuid
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_portfolio_expense_id'),
    current_setting('test.settlement_v3_portfolio_group_id'),
    current_setting('test.settlement_v3_portfolio_id'),
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_portfolio_lines'),
    pg_temp.expected_parent_snapshot(
      current_setting('test.settlement_v3_portfolio_expense_id')::uuid
    )::text,
    current_setting('test.settlement_v3_portfolio_account_id')
  ),
  'households_commit_expense_split_write_v3: portfolio households cannot have settlement splits',
  'portfolio transactions cannot become settlement split obligations'
);

do $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', false);
end;
$$;

-- Invalid atomic commits roll back parent fields, group rows, and private state. ----------

do $$
declare
  v_expense_id uuid := gen_random_uuid();
  v_split_group_id uuid := gen_random_uuid();
  v_account_id uuid;
  v_target_account_id uuid;
  v_invalid_lines jsonb;
  v_previous_role text := current_setting(
    'request.jwt.claim.role',
    true
  );
begin
  v_account_id := public.ensure_spending_account_for_currency(
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    'AUD'
  );
  v_target_account_id := gen_random_uuid();
  insert into public.accounts (
    id,
    user_id,
    household_id,
    name,
    icon,
    color,
    currency,
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  ) values (
    v_target_account_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    'Atomic rollback target wallet',
    'wallet',
    '#6B7280',
    'AUD',
    0,
    false,
    false,
    false
  );

  insert into public.expenses (
    id,
    user_id,
    household_id,
    account_id,
    date,
    amount_cents,
    currency,
    category,
    raw_text,
    type
  ) values (
    v_expense_id,
    current_setting('test.settlement_v3_owner_id')::uuid,
    current_setting('test.settlement_v3_household_id')::uuid,
    v_account_id,
    current_date,
    1200,
    'AUD',
    'other',
    'Atomic invalid-line rollback fixture',
    'expense'
  );

  v_invalid_lines := jsonb_build_array(
    jsonb_build_object(
      'user_id', current_setting('test.settlement_v3_owner_id')::uuid,
      'amount_cents', 0
    ),
    jsonb_build_object(
      'user_id', current_setting('test.settlement_v3_member_id')::uuid,
      'amount_cents', 1400
    ),
    jsonb_build_object(
      'user_id',
      current_setting('test.settlement_v3_third_member_id')::uuid,
      'amount_cents', 0
    )
  );

  perform set_config(
    'test.settlement_v3_atomic_rollback_expense_id',
    v_expense_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_atomic_rollback_group_id',
    v_split_group_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_atomic_rollback_account_id',
    v_account_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_atomic_rollback_target_account_id',
    v_target_account_id::text,
    false
  );
  perform set_config(
    'test.settlement_v3_atomic_rollback_lines',
    v_invalid_lines::text,
    false
  );
  perform set_config(
    'test.settlement_v3_atomic_rollback_previous_role',
    coalesce(v_previous_role, ''),
    false
  );
  perform set_config('request.jwt.claim.role', 'service_role', false);
end;
$$;

select throws_ok(
  format(
    $query$
      select public.households_commit_expense_split_write_with_patch_v3(
        %L::uuid,
        %L::uuid,
        %L::uuid,
        %L::uuid,
        %L::uuid,
        'amount',
        'AUD',
        1500,
        'Atomic invalid-line rollback attempt',
        %L::jsonb,
        %L::jsonb,
        null::uuid,
        %L::uuid,
        %L::jsonb
      )
    $query$,
    current_setting('test.settlement_v3_owner_id'),
    current_setting('test.settlement_v3_atomic_rollback_expense_id'),
    current_setting('test.settlement_v3_atomic_rollback_group_id'),
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id'),
    current_setting('test.settlement_v3_atomic_rollback_lines'),
    pg_temp.expected_parent_snapshot(
      current_setting('test.settlement_v3_atomic_rollback_expense_id')::uuid
    )::text,
    current_setting('test.settlement_v3_atomic_rollback_target_account_id'),
    jsonb_build_object(
      'category', 'travel',
      'raw_text', 'Cosmetic patch must roll back',
      'updated_at', clock_timestamp()
    )::text
  ),
  'settlement_data_incomplete_split_group',
  'an invalid line total aborts the atomic split-and-patch commit'
);

do $$
begin
  perform set_config(
    'request.jwt.claim.role',
    current_setting('test.settlement_v3_atomic_rollback_previous_role'),
    false
  );
end;
$$;

select ok(
  (
    select expense.amount_cents = 1200
      and expense.currency = 'AUD'
      and expense.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and expense.account_id =
        current_setting('test.settlement_v3_atomic_rollback_account_id')::uuid
      and expense.split_group_id is null
      and expense.category = 'other'
      and expense.raw_text = 'Atomic invalid-line rollback fixture'
    from public.expenses expense
    where expense.id =
      current_setting('test.settlement_v3_atomic_rollback_expense_id')::uuid
  )
  and not exists (
    select 1
    from public.expense_split_groups split_group
    where split_group.id =
      current_setting('test.settlement_v3_atomic_rollback_group_id')::uuid
  )
  and not exists (
    select 1
    from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id =
      current_setting('test.settlement_v3_atomic_rollback_group_id')::uuid
  ),
  'the rejected atomic commit rolls back its cosmetic patch and leaves no group or private finalized state'
);

-- A partially written split must fail closed and must not record a payment. ---------------

do $$
declare
  v_created jsonb;
begin
  v_created := pg_temp.add_settlement_obligation(
    current_setting('test.settlement_v3_household_id')::uuid,
    current_setting('test.settlement_v3_member_id')::uuid,
    current_setting('test.settlement_v3_owner_id')::uuid,
    'EUR',
    1000,
    'Intentionally incomplete split group',
    current_date,
    1000,
    900
  );

  perform set_config(
    'test.settlement_v3_incomplete_group_id',
    v_created ->> 'split_group_id',
    false
  );
end;
$$;

select throws_ok(
  format(
    $query$
      select public.households_settle_amount_and_notify(
        %L::uuid,
        %L::uuid,
        'both',
        900,
        'EUR',
        'Must fail closed'
      )
    $query$,
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id')
  ),
  'settlement_data_incomplete_split_group',
  'settlement fails closed while a split group is incomplete'
);

select ok(
  (
    select count(*)::bigint
    from public.household_settlement_events event
    where event.household_id =
        current_setting('test.settlement_v3_household_id')::uuid
      and event.currency = 'EUR'
  ) = 0
  and not exists (
    select 1
    from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id =
      current_setting('test.settlement_v3_incomplete_group_id')::uuid
  ),
  'failed incomplete-group settlement records no event or private finalized state'
);

select throws_ok(
  format(
    $query$
      select *
      from public.households_get_pairwise_settlement_balances_v2(
        %L::uuid,
        'EUR'
      )
    $query$,
    current_setting('test.settlement_v3_household_id')
  ),
  'settlement_data_incomplete_split_group',
  'canonical pairwise balance reads fail closed for an active unfinalized group'
);

select throws_ok(
  format(
    $query$
      select public.households_get_settlement_calculation_v3(
        %L::uuid,
        %L::uuid,
        'EUR'
      )
    $query$,
    current_setting('test.settlement_v3_household_id'),
    current_setting('test.settlement_v3_member_id')
  ),
  'settlement_data_incomplete_split_group',
  'atomic settlement reads also fail closed while a split group is incomplete'
);

select * from finish();
rollback;
