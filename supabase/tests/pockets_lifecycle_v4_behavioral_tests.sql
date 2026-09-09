-- Run after 20260908200000_close_pockets_lifecycle_p0_p1_findings.sql.
-- These exercise the canonical calendar primitive used by every v4 comparison.

begin;
create extension if not exists pgtap;
select plan(31);

select is(public.financial_cycle_start_for_month(date '2026-04-03', 1), date '2026-04-01', 'day 1 anchors the calendar month');
select is(public.previous_financial_cycle_start(date '2026-04-15', 15), date '2026-03-15', 'day 15 compares dates before its cycle boundary to the prior anchor');
select is(public.previous_financial_cycle_start(date '2026-02-28', 29), date '2026-01-29', 'day 29 reaches the prior canonical cycle before February closes');
select is(public.previous_financial_cycle_start(date '2026-02-28', 30), date '2026-01-30', 'day 30 reaches the prior canonical cycle before February closes');
select is(public.previous_financial_cycle_start(date '2026-02-28', 31), date '2026-01-31', 'day 31 reaches the prior canonical cycle before February closes');
select is(public.next_financial_cycle_start(date '2026-01-31', 31), date '2026-02-28', 'day 31 advances through February canonically');
select has_function('public', 'update_pocket_lineage_v1', array['uuid', 'text', 'uuid', 'uuid', 'integer', 'text', 'text', 'text', 'boolean', 'boolean', 'bigint'], 'lineage metadata update RPC persists lifecycle edits');
select has_column('public', 'pocket_lineage_retirements', 'disposition', 'retirement persists the required disposition');
select has_column('public', 'pocket_lineage_retirements', 'target_lineage_id', 'retirement persists the disposition target when applicable');
select like(pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure), '%''previous_allocations''%', 'v4 review includes previous lineage allocations');
select like(pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure), '%''contract_version'', 4%', 'v4 response declares its exact metadata contract');
select like(pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure), '%scope_key = coalesce(p_household_id, p_user_id)%', 'household reviews are not joined through the creator');
select like(pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure), '%delete from public.envelope_allocations%', 'confirmation replaces the complete allocation snapshot including zeros');
select has_function('public', 'save_pocket_lineage_lifecycle_v1', array['uuid', 'text', 'uuid', 'uuid', 'integer', 'date', 'text', 'uuid', 'text', 'text', 'text', 'text', 'boolean', 'boolean', 'bigint', 'text', 'bigint', 'text[]', 'bigint'], 'one revisioned lifecycle snapshot RPC creates and updates pockets');
select has_function('public', 'preview_pocket_lineage_retirement_v1', array['uuid', 'text', 'uuid', 'uuid', 'date'], 'retirement balance preview is available before a destructive lifecycle action');
select has_function('public', 'pocket_lineage_retirement_balance_v1', array['uuid', 'text', 'uuid', 'uuid', 'date'], 'retirement finalization uses one authoritative balance calculation');
select like(pg_get_functiondef('public.save_pocket_lineage_lifecycle_v1(uuid,text,uuid,uuid,integer,date,text,uuid,text,text,text,text,boolean,boolean,bigint,text,bigint,text[],bigint)'::regprocedure), '%pocket_lineage_lifecycle_operations%', 'lifecycle replay returns its persisted idempotent response');
select like(pg_get_functiondef('public.retire_pocket_lineage_v1(uuid,text,uuid,uuid,date,integer,text,text,uuid)'::regprocedure), '%pocket_lineage_retirement_balance_v1%', 'retirement finalization uses the same authoritative preview calculation');
select like(pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure), '%''has_active_pockets''%', 'v4 explicitly represents a zero-active-pocket month');
select like(pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure), '%''spent_by_envelope'', v_spent%', 'v4 filters materialized related facts alongside envelope rows');

-- Disposable fixture: execute the public lifecycle RPCs with a real budget,
-- envelope, allocation, and retirement instead of asserting implementation text.
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_budget_id uuid := gen_random_uuid();
  v_operation_id uuid := gen_random_uuid();
  v_response jsonb;
  v_replay jsonb;
  v_update jsonb;
  v_preview jsonb;
  v_retirement jsonb;
  v_retirement_replay jsonb;
  v_month_response jsonb;
  v_retired_month_response jsonb;
  v_lineage_id uuid;
  v_month date := date_trunc('month', current_date)::date;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_user_id, 'authenticated', 'authenticated',
    'pocket-lifecycle-' || v_user_id::text || '@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );
  insert into public.budgets (id, user_id, period_month, currency, total_budget_cents)
  values (v_budget_id, v_user_id, v_month, 'USD', 1000);
  perform set_config('request.jwt.claim.sub', v_user_id::text, false);
  perform set_config('request.jwt.claim.role', 'service_role', false);
  v_response := public.save_pocket_lineage_lifecycle_v1(
    v_user_id, 'personal', null, null, null, v_month, 'USD', v_operation_id,
    'Fixture pocket', 'wallet', '#112233', null, true, false, 900,
    'add_every_cycle', 500, array['food'], 500
  );
  v_lineage_id := (v_response ->> 'lineage_id')::uuid;
  v_replay := public.save_pocket_lineage_lifecycle_v1(
    v_user_id, 'personal', null, v_lineage_id, 0, v_month, 'USD', v_operation_id,
    'must not overwrite', 'wallet', '#112233', null, true, false, 900,
    'add_every_cycle', 500, array['food'], 999
  );
  v_update := public.save_pocket_lineage_lifecycle_v1(
    v_user_id, 'personal', null, v_lineage_id, 0, v_month, 'USD', gen_random_uuid(),
    'Updated fixture pocket', 'savings', '#445566', null, false, false, null,
    'decide_each_cycle', null, array['food', 'groceries'], 500
  );
  v_month_response := public.get_pockets_month_v4(
    v_user_id, 'personal', v_month, null, 'USD', true, false
  );
  v_preview := public.preview_pocket_lineage_retirement_v1(v_user_id, 'personal', null, v_lineage_id, v_month);
  v_retirement := public.retire_pocket_lineage_v1(v_user_id, 'personal', null, v_lineage_id, v_month, 1, 'fixture', 'release_positive', null);
  v_retirement_replay := public.retire_pocket_lineage_v1(v_user_id, 'personal', null, v_lineage_id, v_month, 1, 'fixture retry', 'release_positive', null);
  v_retired_month_response := public.get_pockets_month_v4(
    v_user_id, 'personal', v_month, null, 'USD', true, false
  );
  perform set_config('test.pockets_lifecycle_fixture_lineage_id', v_lineage_id::text, false);
  perform set_config('test.pockets_lifecycle_create', v_response::text, false);
  perform set_config('test.pockets_lifecycle_replay', v_replay::text, false);
  perform set_config('test.pockets_lifecycle_update', v_update::text, false);
  perform set_config('test.pockets_lifecycle_preview', v_preview::text, false);
  perform set_config('test.pockets_lifecycle_retirement', v_retirement::text, false);
  perform set_config('test.pockets_lifecycle_retirement_replay', v_retirement_replay::text, false);
  perform set_config('test.pockets_lifecycle_month_response', v_month_response::text, false);
  perform set_config('test.pockets_lifecycle_retired_month_response', v_retired_month_response::text, false);
end;
$$;

select is(
  (current_setting('test.pockets_lifecycle_replay')::jsonb ->> 'lineage_id')::uuid,
  (current_setting('test.pockets_lifecycle_create')::jsonb ->> 'lineage_id')::uuid,
  'replaying one operation returns its original lifecycle response'
);
select is(
  (select name from public.pocket_lineages where id = current_setting('test.pockets_lifecycle_fixture_lineage_id')::uuid),
  'Updated fixture pocket',
  'one revisioned snapshot updates lifecycle metadata'
);
select is(
  (select amount_cents from public.envelope_allocations allocation join public.budget_envelopes envelope on envelope.id = allocation.envelope_id where envelope.rollover_group_id = current_setting('test.pockets_lifecycle_fixture_lineage_id')::uuid),
  500::bigint,
  'one lifecycle snapshot persists the current envelope allocation'
);
select is(
  (current_setting('test.pockets_lifecycle_preview')::jsonb ->> 'balance_cents')::bigint,
  500::bigint,
  'retirement preview includes current-cycle authoritative funding'
);
select is(
  (current_setting('test.pockets_lifecycle_retirement')::jsonb ->> 'balance_cents')::bigint,
  500::bigint,
  'retirement finalization uses the previewed authoritative balance'
);
select is(
  (select status from public.pocket_lineages where id = current_setting('test.pockets_lifecycle_fixture_lineage_id')::uuid),
  'retired',
  'retirement finalizes the fixture lineage'
);
select is(
  (select rollover_cap_cents from public.pocket_lineages where id = current_setting('test.pockets_lifecycle_fixture_lineage_id')::uuid),
  null::bigint,
  'a lifecycle update can intentionally clear a nullable rollover cap'
);
select is(
  (current_setting('test.pockets_lifecycle_create')::jsonb -> 'lineage' ->> 'activation_reason'),
  'user_created',
  'new lifecycle pockets identify the user-created origin'
);
select ok(
  current_setting('test.pockets_lifecycle_month_response')::jsonb #> '{envelopes,0,lineage}' ? 'logo_url'
  and current_setting('test.pockets_lifecycle_month_response')::jsonb #> '{envelopes,0,effective_categories}' = '["food","groceries"]'::jsonb,
  'materialized pockets expose lineage metadata and effective categories'
);
select ok(
  (current_setting('test.pockets_lifecycle_retirement_replay')::jsonb ->> 'idempotent_replay')::boolean,
  'a retirement retry returns an idempotent response instead of duplicating adjustments'
);
select is(
  jsonb_array_length(current_setting('test.pockets_lifecycle_retired_month_response')::jsonb -> 'envelopes'),
  0,
  'a retirement filters its materialized envelope from the v4 month payload'
);
select * from finish();
rollback;
