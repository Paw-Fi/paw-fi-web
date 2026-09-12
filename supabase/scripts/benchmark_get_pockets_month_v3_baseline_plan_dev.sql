-- DEV DATABASE ONLY. Read-only; rolls back session state.

begin;

select set_config('request.jwt.claim.sub', '4f42e85a-4637-41fb-8fc5-f81933c83861', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

explain (analyze, buffers, settings, summary, format text)
with latest_personal as (
  select b.period_month, upper(b.currency) as currency
  from public.budgets b
  where b.user_id = '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid
    and b.household_id is null
  order by b.period_month desc, b.updated_at desc nulls last, b.created_at desc nulls last
  limit 1
)
select public.get_pockets_month_v3(
  '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid,
  'personal', lp.period_month, null, lp.currency, true, false
)
from latest_personal lp;

rollback;
