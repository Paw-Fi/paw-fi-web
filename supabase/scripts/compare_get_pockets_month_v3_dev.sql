-- DEV DATABASE ONLY. Run after the optimization migration. The baseline must
-- have been preserved by prepare_get_pockets_month_v3_baseline_dev.sql first.
-- This is read-only and proves complete JSONB equality for representative live
-- personal, portfolio, and household scenarios.

begin;

select set_config('request.jwt.claim.sub', '4f42e85a-4637-41fb-8fc5-f81933c83861', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with scenarios as (
  select 'personal'::text as scope, null::uuid as household_id,
    b.period_month as budget_month, upper(b.currency) as currency
  from public.budgets b
  where b.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid
    and b.household_id is null

  union

  select 'portfolio', b.household_id, b.period_month, upper(b.currency)
  from public.budgets b
  where b.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid
    and b.household_id is not null

  union

  select 'household', b.household_id, b.period_month, upper(b.currency)
  from public.budgets b
  where b.household_id is not null
    and exists (
      select 1 from public.household_members hm
      where hm.household_id = b.household_id
        and hm.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid
    )
), ranked_scenarios as (
  select *, row_number() over (
    partition by scope, household_id, currency order by budget_month desc
  ) as month_rank
  from scenarios
), selected_scenarios as (
  select * from ranked_scenarios
  where month_rank <= 3
), comparisons as (
  select
    s.*,
    settings.include_projected_recurring,
    public.get_pockets_month_v3_baseline(
      '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid,
      s.scope, s.budget_month, s.household_id, s.currency,
      settings.include_projected_recurring, false
    ) as baseline_payload,
    public.get_pockets_month_v3(
      '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid,
      s.scope, s.budget_month, s.household_id, s.currency,
      settings.include_projected_recurring, false
    ) as optimized_payload
  from selected_scenarios s
  cross join (values (true), (false)) settings(include_projected_recurring)
)
select
  scope,
  household_id,
  budget_month,
  currency,
  include_projected_recurring,
  baseline_payload = optimized_payload as exact_json_match,
  md5(baseline_payload::text) as baseline_payload_md5,
  md5(optimized_payload::text) as optimized_payload_md5
from comparisons
order by scope, household_id nulls first, currency, budget_month desc,
  include_projected_recurring desc;

rollback;
