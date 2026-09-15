-- DEV DATABASE ONLY. Run after prepare + optimized migration. It reports only
-- scenarios whose complete JSON payload differs from the preserved baseline.

begin;

select set_config('request.jwt.claim.sub', '4f42e85a-4637-41fb-8fc5-f81933c83861', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with scenarios as (
  values
    ('personal'::text, null::uuid, date '2026-08-01', 'USD'::text),
    ('household', 'af73615b-cce7-40d9-8f83-6c12fd54e904'::uuid, date '2026-01-01', 'AED'),
    ('household', 'af73615b-cce7-40d9-8f83-6c12fd54e904'::uuid, date '2026-05-01', 'EUR'),
    ('household', 'af73615b-cce7-40d9-8f83-6c12fd54e904'::uuid, date '2026-04-01', 'EUR'),
    ('household', 'af73615b-cce7-40d9-8f83-6c12fd54e904'::uuid, date '2026-04-01', 'VND')
), payloads as (
  select
    s.*, public.get_pockets_month_v3_baseline(
      '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid,
      s.column1, s.column3, s.column2, s.column4, false, false
    ) as baseline_payload,
    public.get_pockets_month_v3(
      '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid,
      s.column1, s.column3, s.column2, s.column4, false, false
    ) as optimized_payload
  from scenarios s
), differing_top_level_fields as (
  select
    p.*, jsonb_object_agg(
      k.key,
      jsonb_build_object(
        'baseline', p.baseline_payload -> k.key,
        'optimized', p.optimized_payload -> k.key
      )
    ) filter (
      where (p.baseline_payload -> k.key) is distinct from (p.optimized_payload -> k.key)
    ) as top_level_differences
  from payloads p
  cross join lateral (
    select jsonb_object_keys(p.baseline_payload) as key
    union
    select jsonb_object_keys(p.optimized_payload)
  ) k
  group by p.column1, p.column2, p.column3, p.column4, p.baseline_payload, p.optimized_payload
), envelope_differences as (
  select
    p.column1 as scope, p.column2 as household_id, p.column3 as budget_month, p.column4 as currency,
    jsonb_agg(jsonb_build_object(
      'envelope_id', ids.id,
      'baseline', b.row,
      'optimized', o.row
    ) order by ids.id) as rows
  from payloads p
  cross join lateral (
    select row ->> 'id' as id
    from jsonb_array_elements(coalesce(p.baseline_payload -> 'envelopes', '[]'::jsonb)) row
    union
    select row ->> 'id'
    from jsonb_array_elements(coalesce(p.optimized_payload -> 'envelopes', '[]'::jsonb)) row
  ) ids
  left join lateral (
    select row
    from jsonb_array_elements(coalesce(p.baseline_payload -> 'envelopes', '[]'::jsonb)) row
    where row ->> 'id' = ids.id
  ) b on true
  left join lateral (
    select row
    from jsonb_array_elements(coalesce(p.optimized_payload -> 'envelopes', '[]'::jsonb)) row
    where row ->> 'id' = ids.id
  ) o on true
  where b.row is distinct from o.row
  group by p.column1, p.column2, p.column3, p.column4
)
select
  d.column1 as scope,
  d.column2 as household_id,
  d.column3 as budget_month,
  d.column4 as currency,
  d.top_level_differences,
  e.rows as envelope_differences
from differing_top_level_fields d
left join envelope_differences e
  on e.scope = d.column1
  and e.household_id is not distinct from d.column2
  and e.budget_month = d.column3
  and e.currency = d.column4
where d.baseline_payload is distinct from d.optimized_payload
order by d.column1, d.column2 nulls first, d.column4, d.column3;

rollback;
