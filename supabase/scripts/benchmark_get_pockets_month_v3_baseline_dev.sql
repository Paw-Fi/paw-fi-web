-- DEV DATABASE ONLY. Read-only; rolls back session state.
-- Run before 20260912120000_optimize_pockets_month_v3.sql and paste its one
-- JSON result. Run the separate plan script for EXPLAIN output.

begin;

select set_config('request.jwt.claim.sub', '4f42e85a-4637-41fb-8fc5-f81933c83861', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- The SQL editor displays only the final result set. Keep inventory and the
-- complete JSON payload in one result so no baseline data is hidden.
with visible_budgets as materialized (
  select
    case
      when b.household_id is null then 'personal'
      when b.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid then 'portfolio'
      else 'household'
    end as scope,
    b.household_id,
    b.period_month as budget_month,
    upper(b.currency) as currency,
    b.total_budget_cents,
    count(e.id) as envelope_count,
    count(e.id) filter (where e.rollover_enabled) as rollover_envelope_count
  from public.budgets b
  left join public.budget_envelopes e on e.budget_id = b.id
  where b.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid
     or exists (
       select 1 from public.household_members hm
       where hm.household_id = b.household_id
         and hm.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid
     )
  group by b.id, scope, b.household_id, b.period_month, b.currency, b.total_budget_cents
), latest_personal as (
  select b.period_month, upper(b.currency) as currency
  from public.budgets b
  where b.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid
    and b.household_id is null
  order by b.period_month desc, b.updated_at desc nulls last, b.created_at desc nulls last
  limit 1
), baseline as (
  select lp.period_month as budget_month, lp.currency,
    public.get_pockets_month_v3(
      '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid,
      'personal', lp.period_month, null, lp.currency, true, false
    ) as payload
  from latest_personal lp
)
select jsonb_build_object(
  'scenarios', coalesce((
    select jsonb_agg(to_jsonb(vb) order by vb.budget_month desc, vb.scope, vb.currency)
    from visible_budgets vb
  ), '[]'::jsonb),
  'baseline_personal', coalesce((
    select jsonb_build_object(
      'scope', 'personal', 'household_id', null,
      'budget_month', b.budget_month, 'currency', b.currency,
      'include_projected_recurring', true,
      'allow_currency_fallback', false,
      'payload', b.payload
    ) from baseline b
  ), 'null'::jsonb)
) as baseline_capture;

rollback;
