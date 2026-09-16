-- Preserve the optional structured merchant label alongside canonical identity
-- for every JSON RPC already enriched through this helper.  It is display data
-- only and does not replace expenses.merchant, which remains raw user evidence.
create or replace function public.enrich_merchant_identity_items(p_items jsonb)
returns jsonb language sql stable set search_path = public as $$
  with items as (
    select value, ordinality,
      case when value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (value ->> 'id')::uuid end as expense_id
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality
  )
  select coalesce(jsonb_agg(items.value || jsonb_build_object(
    'merchant_id', expense.merchant_id,
    'merchant_domain', merchant.domain,
    'merchant_structured_name', expense.merchant_structured_name
  ) order by items.ordinality), '[]'::jsonb)
  from items
  left join public.expenses expense on expense.id = items.expense_id
  left join public.merchants merchant on merchant.id = expense.merchant_id;
$$;
