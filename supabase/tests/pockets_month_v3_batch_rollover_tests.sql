-- ISOLATED DATABASE ONLY. Run with `supabase test db` after all migrations.
-- The fixture compares the batch helper with the released scalar implementation
-- for personal, portfolio, and household pocket lineages.

begin;

create extension if not exists pgtap;

select plan(11);

do $$
declare
  v_actor uuid := gen_random_uuid();
  v_household uuid := gen_random_uuid();
  v_personal_group uuid := gen_random_uuid();
  v_portfolio_group uuid := gen_random_uuid();
  v_household_group uuid := gen_random_uuid();
  v_personal_target uuid;
  v_portfolio_target uuid;
  v_household_target uuid;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_actor, 'authenticated', 'authenticated', 'pocket-rollover@example.test',
    '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, now(), now()
  );

  insert into public.households (id, name, owner_id, currency)
  values (v_household, 'Pocket rollover fixture', v_actor, 'USD');
  insert into public.household_members (household_id, user_id, role)
  values (v_household, v_actor, 'owner');

  perform set_config('request.jwt.claim.sub', v_actor::text, false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('test.pocket_actor_id', v_actor::text, false);
  perform set_config('test.pocket_household_id', v_household::text, false);

  -- Three histories exercise positive carry, disabled-reset, cap, and negative carry.
  with rows(scope, household_id, currency, month, name, group_id, base, enabled, negative, cap, opening) as (
    values
      ('personal', null::uuid, 'USD', date '2026-01-01', 'Groceries', v_personal_group, 1000::bigint, true, false, 2500::bigint, 0::bigint),
      ('personal', null::uuid, 'USD', date '2026-02-01', 'Renamed food', v_personal_group, 1000::bigint, true, false, 2500::bigint, 100::bigint),
      ('personal', null::uuid, 'USD', date '2026-03-01', 'Renamed food', v_personal_group, 1000::bigint, true, false, 2500::bigint, 0::bigint),
      ('personal', null::uuid, 'USD', date '2026-04-01', 'Renamed food', v_personal_group, 1000::bigint, true, false, 2500::bigint, 0::bigint),
      ('portfolio', v_household, 'USD', date '2026-01-01', 'Travel', v_portfolio_group, 1000::bigint, true, true, null::bigint, 0::bigint),
      ('portfolio', v_household, 'USD', date '2026-02-01', 'Travel', v_portfolio_group, 1000::bigint, false, false, null::bigint, 0::bigint),
      ('portfolio', v_household, 'USD', date '2026-03-01', 'Travel', v_portfolio_group, 1000::bigint, true, true, null::bigint, 0::bigint),
      ('portfolio', v_household, 'USD', date '2026-04-01', 'Travel', v_portfolio_group, 1000::bigint, true, true, null::bigint, 0::bigint),
      ('household', v_household, 'USD', date '2026-01-01', 'Household food', v_household_group, 1000::bigint, true, true, null::bigint, 0::bigint),
      ('household', v_household, 'USD', date '2026-02-01', 'Household food', v_household_group, 1000::bigint, true, true, null::bigint, 0::bigint),
      ('household', v_household, 'USD', date '2026-03-01', 'Household food', v_household_group, 1000::bigint, true, true, null::bigint, 0::bigint),
      ('household', v_household, 'USD', date '2026-04-01', 'Household food', v_household_group, 1000::bigint, true, true, null::bigint, 0::bigint)
  ), budgets as (
    insert into public.budgets (user_id, household_id, period_month, currency, total_budget_cents)
    select v_actor, r.household_id, r.month, r.currency, 4000 from rows r
    on conflict do nothing
    returning id, household_id, period_month, currency
  )
  insert into public.budget_envelopes (
    budget_id, user_id, household_id, name, budget_percentage, budget_amount_cents,
    currency, rollover_enabled, rollover_negative, rollover_cap_cents,
    opening_rollover_cents, rollover_group_id
  )
  select b.id, v_actor, r.household_id, r.name, 0, r.base, r.currency,
    r.enabled, r.negative, r.cap, r.opening, r.group_id
  from rows r
  join budgets b on b.household_id is not distinct from r.household_id
    and b.period_month = r.month and b.currency = r.currency;

  insert into public.envelope_category_links (envelope_id, category)
  select e.id, 'groceries'
  from public.budget_envelopes e
  where e.user_id = v_actor
    and e.rollover_group_id in (v_personal_group, v_portfolio_group, v_household_group);

  insert into public.expenses (
    user_id, household_id, date, amount_cents, currency, category, type,
    analytics_is_final, analytics_spending_multiplier
  ) values
    (v_actor, null, date '2026-01-15', 200, 'USD', 'groceries', 'expense', true, 1),
    (v_actor, null, date '2026-02-15', 300, 'USD', 'groceries', 'expense', true, 1),
    (v_actor, null, date '2026-03-15', 4000, 'USD', 'groceries', 'expense', true, 1),
    (v_actor, v_household, date '2026-01-15', 1200, 'USD', 'groceries', 'expense', true, 1),
    (v_actor, v_household, date '2026-02-15', 100, 'USD', 'groceries', 'expense', true, 1),
    (v_actor, v_household, date '2026-03-15', 100, 'USD', 'groceries', 'expense', true, 1),
    (v_actor, null, date '2026-03-20', 999, 'USD', 'groceries', 'expense', false, 1),
    (v_actor, null, date '2026-03-21', 999, 'USD', 'groceries', 'expense', true, 0);

  select id into v_personal_target from public.budget_envelopes
  where user_id = v_actor and household_id is null and rollover_group_id = v_personal_group
    and budget_id in (select id from public.budgets where period_month = date '2026-04-01' and household_id is null);
  select id into v_portfolio_target from public.budget_envelopes
  where user_id = v_actor and household_id = v_household and rollover_group_id = v_portfolio_group
    and budget_id in (select id from public.budgets where period_month = date '2026-04-01' and household_id = v_household);
  select id into v_household_target from public.budget_envelopes
  where user_id = v_actor and household_id = v_household and rollover_group_id = v_household_group
    and budget_id in (select id from public.budgets where period_month = date '2026-04-01' and household_id = v_household);

  perform set_config('test.pocket_personal_target', v_personal_target::text, false);
  perform set_config('test.pocket_portfolio_target', v_portfolio_target::text, false);
  perform set_config('test.pocket_household_target', v_household_target::text, false);
end;
$$;

select has_function('public', 'calculate_pocket_rollovers_batch_v1', array['uuid', 'text', 'uuid', 'text', 'date', 'uuid[]'], 'batch rollover helper exists');
select is(pg_get_function_result('public.calculate_pocket_rollovers_batch_v1(uuid,text,uuid,text,date,uuid[])'::regprocedure), 'TABLE(envelope_id uuid, incoming_rollover_cents bigint)', 'batch helper returns carry by envelope');
select ok(has_function_privilege('authenticated', 'public.calculate_pocket_rollovers_batch_v1(uuid,text,uuid,text,date,uuid[])', 'EXECUTE'), 'authenticated callers can execute batch rollover helper');

select is(
  (select incoming_rollover_cents from public.calculate_pocket_rollovers_batch_v1(current_setting('test.pocket_actor_id')::uuid, 'personal', null, 'USD', date '2026-04-01', array[current_setting('test.pocket_personal_target')::uuid])),
  public.calculate_pocket_rollover_carry_v2(current_setting('test.pocket_actor_id')::uuid, 'personal', null, 'USD', 'Renamed food', (select rollover_group_id from public.budget_envelopes where id = current_setting('test.pocket_personal_target')::uuid), date '2026-04-01'),
  'personal group continuity matches scalar after a pocket rename'
);
select is(
  (select incoming_rollover_cents from public.calculate_pocket_rollovers_batch_v1(current_setting('test.pocket_actor_id')::uuid, 'portfolio', current_setting('test.pocket_household_id')::uuid, 'USD', date '2026-04-01', array[current_setting('test.pocket_portfolio_target')::uuid])),
  public.calculate_pocket_rollover_carry_v2(current_setting('test.pocket_actor_id')::uuid, 'portfolio', current_setting('test.pocket_household_id')::uuid, 'USD', 'Travel', (select rollover_group_id from public.budget_envelopes where id = current_setting('test.pocket_portfolio_target')::uuid), date '2026-04-01'),
  'portfolio disabled rollover reset matches scalar'
);
select is(
  (select incoming_rollover_cents from public.calculate_pocket_rollovers_batch_v1(current_setting('test.pocket_actor_id')::uuid, 'household', current_setting('test.pocket_household_id')::uuid, 'USD', date '2026-04-01', array[current_setting('test.pocket_household_target')::uuid])),
  public.calculate_pocket_rollover_carry_v2(current_setting('test.pocket_actor_id')::uuid, 'household', current_setting('test.pocket_household_id')::uuid, 'USD', 'Household food', (select rollover_group_id from public.budget_envelopes where id = current_setting('test.pocket_household_target')::uuid), date '2026-04-01'),
  'household negative rollover matches scalar'
);
select is(
  (select count(*) from public.calculate_pocket_rollovers_batch_v1(current_setting('test.pocket_actor_id')::uuid, 'personal', null, 'USD', date '2026-04-01', array[current_setting('test.pocket_personal_target')::uuid, current_setting('test.pocket_portfolio_target')::uuid])),
  2::bigint,
  'batch helper returns every requested target envelope'
);
select is((select count(*) from public.calculate_pocket_rollovers_batch_v1(current_setting('test.pocket_actor_id')::uuid, 'personal', null, 'USD', date '2026-04-01', '{}'::uuid[])), 0::bigint, 'empty target list is a no-op');
select is((select public.get_pockets_month_v3(current_setting('test.pocket_actor_id')::uuid, 'personal', date '2026-04-01', null, 'USD', false, false) ->> 'budget_month'), '2026-04-01', 'v3 keeps the stable budget month');
select is((select (value ->> 'rollover_from_previous_cents')::bigint from jsonb_array_elements(public.get_pockets_month_v3(current_setting('test.pocket_actor_id')::uuid, 'personal', date '2026-04-01', null, 'USD', false, false) -> 'envelopes') value where (value ->> 'id')::uuid = current_setting('test.pocket_personal_target')::uuid), (select incoming_rollover_cents from public.calculate_pocket_rollovers_batch_v1(current_setting('test.pocket_actor_id')::uuid, 'personal', null, 'USD', date '2026-04-01', array[current_setting('test.pocket_personal_target')::uuid])), 'v3 exposes the batch carry unchanged');
select is((select public.get_pockets_month_v3(current_setting('test.pocket_actor_id')::uuid, 'personal', date '2026-04-01', null, 'EUR', false, true) ->> 'selected_currency'), 'USD', 'v3 preserves currency fallback');

select * from finish();
rollback;
