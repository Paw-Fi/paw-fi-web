-- Keep manual-confirmation eligibility distinct from forecast inclusion.
-- Existing actor/scope authorization and pagination remain owned by v1.
create or replace function public.list_recurring_series_summary_v2(
  p_actor_user_id uuid,
  p_household_id uuid default null,
  p_currencies text[] default null,
  p_after_next_occurrence_date date default null,
  p_after_id uuid default null,
  p_limit integer default 50
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb; v_items jsonb;
begin
  v_payload := public.list_recurring_series_summary_v1(
    p_actor_user_id, p_household_id, p_currencies,
    p_after_next_occurrence_date, p_after_id, p_limit
  );
  select coalesce(jsonb_agg(
    item.value || jsonb_build_object(
      'provider_recurring', coalesce(
        template.provider_fields ->> 'source' = 'plaid_recurring_template', false
      )
    ) order by item.ordinality
  ), '[]'::jsonb) into v_items
  from jsonb_array_elements(v_payload -> 'items') with ordinality item(value, ordinality)
  left join public.expenses template on template.id = (item.value ->> 'id')::uuid;
  v_items := public.enrich_merchant_identity_items(v_items);
  return jsonb_set(v_payload, '{items}', v_items, true);
end;
$$;

create or replace function public.get_recurring_series_detail_v2(
  p_actor_user_id uuid,
  p_recurring_id uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_payload jsonb;
begin
  v_payload := public.get_recurring_series_detail_v1(p_actor_user_id, p_recurring_id);
  v_payload := v_payload || jsonb_build_object(
    'provider_recurring', coalesce(
      v_payload -> 'provider_fields' ->> 'source' = 'plaid_recurring_template', false
    )
  );
  return public.enrich_merchant_identity_items(jsonb_build_array(v_payload)) -> 0;
end;
$$;

notify pgrst, 'reload schema';
