create or replace function public.set_transaction_analytics_override_group_v1(
  p_user_id uuid,
  p_expense_id uuid,
  p_analytics_class text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seed public.expenses%rowtype;
  v_match_id uuid;
  v_updated_ids uuid[] := '{}'::uuid[];
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized grouped transaction classification override'
      using errcode = '42501';
  end if;

  select * into v_seed
  from public.expenses
  where id = p_expense_id
    and user_id = p_user_id
    and provider = 'plaid'
    and deleted_at is null;

  if v_seed.id is null then
    raise exception 'Transaction not found' using errcode = 'P0002';
  end if;

  if lower(trim(coalesce(p_analytics_class, ''))) = 'provider' then
    perform public.set_transaction_analytics_override_v1(
      p_user_id,
      p_expense_id,
      p_analytics_class
    );
    return jsonb_build_object(
      'updated_count', 1,
      'updated_ids', jsonb_build_array(p_expense_id)
    );
  end if;

  for v_match_id in
    select e.id
    from public.expenses e
    where e.user_id = p_user_id
      and e.provider = 'plaid'
      and e.deleted_at is null
      and e.classification_review_state = 'needs_review'
      and e.bank_account_id is not distinct from v_seed.bank_account_id
      and e.household_id is not distinct from v_seed.household_id
      and e.amount_cents = v_seed.amount_cents
      and upper(coalesce(e.currency, '')) =
        upper(coalesce(v_seed.currency, ''))
      and lower(coalesce(e.type::text, '')) =
        lower(coalesce(v_seed.type::text, ''))
      and lower(trim(coalesce(e.raw_text, ''))) =
        lower(trim(coalesce(v_seed.raw_text, '')))
      and lower(trim(coalesce(e.merchant, ''))) =
        lower(trim(coalesce(v_seed.merchant, '')))
      and e.provider_pfc_primary is not distinct from
        v_seed.provider_pfc_primary
      and e.provider_pfc_detailed is not distinct from
        v_seed.provider_pfc_detailed
      and e.provider_pfc_confidence is not distinct from
        v_seed.provider_pfc_confidence
      and e.provider_transaction_code is not distinct from
        v_seed.provider_transaction_code
      and e.provider_pending is not distinct from v_seed.provider_pending
      and coalesce(
        e.raw_provider_payload -> 'counterparty_types',
        '[]'::jsonb
      ) = coalesce(
        v_seed.raw_provider_payload -> 'counterparty_types',
        '[]'::jsonb
      )
    order by e.date, e.id
    limit 500
  loop
    perform public.set_transaction_analytics_override_v1(
      p_user_id,
      v_match_id,
      p_analytics_class
    );
    v_updated_ids := array_append(v_updated_ids, v_match_id);
  end loop;

  if cardinality(v_updated_ids) = 0 then
    raise exception 'No matching transactions require review'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'updated_count', cardinality(v_updated_ids),
    'updated_ids', to_jsonb(v_updated_ids)
  );
end;
$$;

revoke all on function public.set_transaction_analytics_override_group_v1(
  uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.set_transaction_analytics_override_group_v1(
  uuid, uuid, text
) to authenticated;

notify pgrst, 'reload schema';
