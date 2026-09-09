-- Run after 20260908120000_pockets_lifecycle_v4_foundation.sql.

begin;

create extension if not exists pgtap;

select plan(42);

select has_table('public', 'pocket_lineages', 'pocket lineages are persisted');
select has_table('public', 'pocket_lineage_category_assignments', 'effective category assignments are persisted');
select has_table('public', 'pocket_month_reviews', 'monthly setup reviews are persisted');
select has_table('public', 'pocket_lineage_balance_adjustments', 'lineage balance adjustments are persisted');
select has_table('public', 'pocket_lineage_retirements', 'lineage retirements are persisted');

select is(
  (select cmd from pg_policies where schemaname = 'public' and tablename = 'pocket_lineages' and policyname = 'pocket_lineages_scope_access'),
  'SELECT',
  'lineages expose a scoped read-only policy'
);
select is(
  (select cmd from pg_policies where schemaname = 'public' and tablename = 'pocket_lineage_category_assignments' and policyname = 'pocket_lineage_categories_scope_access'),
  'SELECT',
  'category assignments expose a scoped read-only policy'
);
select is(
  (select cmd from pg_policies where schemaname = 'public' and tablename = 'pocket_month_reviews' and policyname = 'pocket_month_reviews_scope_access'),
  'SELECT',
  'monthly reviews expose a scoped read-only policy'
);
select is(
  (select cmd from pg_policies where schemaname = 'public' and tablename = 'pocket_lineage_balance_adjustments' and policyname = 'pocket_lineage_adjustments_scope_access'),
  'SELECT',
  'balance adjustments expose a scoped read-only policy'
);
select is(
  (select cmd from pg_policies where schemaname = 'public' and tablename = 'pocket_lineage_retirements' and policyname = 'pocket_lineage_retirements_scope_access'),
  'SELECT',
  'retirements expose a scoped read-only policy'
);

select ok(has_table_privilege('authenticated', 'public.pocket_lineages', 'SELECT'), 'authenticated can read lineages through RLS');
select ok(not has_table_privilege('authenticated', 'public.pocket_lineages', 'INSERT'), 'authenticated cannot insert lineages directly');
select ok(not has_table_privilege('authenticated', 'public.pocket_lineages', 'UPDATE'), 'authenticated cannot update lineages directly');
select ok(not has_table_privilege('authenticated', 'public.pocket_lineages', 'DELETE'), 'authenticated cannot delete lineages directly');
select ok(not has_table_privilege('authenticated', 'public.pocket_month_reviews', 'INSERT'), 'authenticated cannot insert reviews directly');
select ok(not has_table_privilege('authenticated', 'public.pocket_lineage_category_assignments', 'INSERT'), 'authenticated cannot insert category assignments directly');
select ok(not has_table_privilege('authenticated', 'public.pocket_lineage_balance_adjustments', 'INSERT'), 'authenticated cannot insert adjustments directly');
select ok(not has_table_privilege('authenticated', 'public.pocket_lineage_retirements', 'INSERT'), 'authenticated cannot insert retirements directly');

select has_function('public', 'get_pockets_month_v4', array['uuid', 'text', 'date', 'uuid', 'text', 'boolean', 'boolean'], 'v4 monthly pockets RPC exists');
select has_function('public', 'calculate_pocket_cycle_carry_v3', array['uuid', 'text', 'uuid', 'text', 'uuid', 'date'], 'lineage carry RPC exists');
select has_function('public', 'confirm_pockets_month_setup_v1', array['uuid', 'text', 'date', 'uuid', 'text', 'integer', 'jsonb'], 'revision-safe setup RPC exists');
select has_function('public', 'retire_pocket_lineage_v1', array['uuid', 'text', 'uuid', 'uuid', 'date', 'integer', 'text', 'text', 'uuid'], 'lineage retirement RPC exists');
select has_function('public', 'update_pocket_lineage_funding_policy_v1', array['uuid', 'text', 'uuid', 'uuid', 'integer', 'text', 'bigint'], 'editor funding-policy RPC exists');
select has_function('public', 'set_pocket_lineage_categories_v1', array['uuid', 'text', 'uuid', 'uuid', 'integer', 'date', 'text[]'], 'effective-dated category RPC exists');
select ok(
  has_function_privilege('authenticated', 'public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)', 'EXECUTE'),
  'authenticated can mutate setup only through the RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.retire_pocket_lineage_v1(uuid,text,uuid,uuid,date,integer,text,text,uuid)', 'EXECUTE'),
  'authenticated can retire a lineage only through the RPC'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%for update%',
  'setup locks the authoritative monthly budget and review before mutation'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%v_amount_cents < 0%',
  'setup rejects negative allocation amounts'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%lineage.status = ''active''%',
  'setup accepts only active lineages in the current budget cycle'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%v_final_allocated_cents > v_budget_total_cents%',
  'setup enforces the authoritative total-budget allocation ceiling'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%POCKET_SETUP_STALE_REVISION%',
  'setup exposes a recognizable stale-revision conflict response'
);
select like(
  pg_get_functiondef('public.calculate_pocket_cycle_carry_v3(uuid,text,uuid,text,uuid,date)'::regprocedure),
  '%analytics_spending_multiplier <> 0%',
  'carry counts only authoritative analytics spending rows'
);
select unlike(
  pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure),
  '%insert into public.pocket_month_reviews%',
  'month reads do not create review state'
);
select like(
  pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure),
  '%''can_edit'', v_can_edit%',
  'month reads return authoritative edit permission'
);
select like(
  pg_get_functiondef('public.get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean)'::regprocedure),
  '%''is_current_period'', v_is_current_period%',
  'month reads return authoritative current-cycle eligibility'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%insert into public.pocket_month_reviews%',
  'confirmation safely initializes the review row before locking it'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%v_month is distinct from%',
  'setup can confirm only the current financial cycle'
);
select like(
  pg_get_functiondef('public.confirm_pockets_month_setup_v1(uuid,text,date,uuid,text,integer,jsonb)'::regprocedure),
  '%Missing active pocket lineage%',
  'setup requires a complete active-lineage snapshot'
);
select like(
  pg_get_functiondef('public.retire_pocket_lineage_v1(uuid,text,uuid,uuid,date,integer,text,text,uuid)'::regprocedure),
  '%p_disposition%',
  'retirement requires an explicit balance disposition'
);
select like(
  pg_get_functiondef('public.update_pocket_lineage_funding_policy_v1(uuid,text,uuid,uuid,integer,text,bigint)'::regprocedure),
  '%can_edit_pocket_scope_v1%',
  'funding policy configuration requires editor permission'
);
select ok(
  has_function_privilege('authenticated', 'public.update_pocket_lineage_funding_policy_v1(uuid,text,uuid,uuid,integer,text,bigint)', 'EXECUTE'),
  'authenticated editors update funding policy only through its RPC'
);
select like(
  pg_get_functiondef('public.set_pocket_lineage_categories_v1(uuid,text,uuid,uuid,integer,date,text[])'::regprocedure),
  '%effective_until = (v_month - interval ''1 day'')%',
  'category changes close the prior interval without rewriting history'
);

select * from finish();

rollback;
