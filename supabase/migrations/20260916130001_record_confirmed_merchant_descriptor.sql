-- User-confirmed merchant picks teach only that user's future resolution.
-- The descriptor is normalized by the existing locale/Unicode-aware resolver;
-- the optional canonical-name mapping is allowed only after server-side
-- ambiguity checks in merchant-user-search.
create or replace function public.record_confirmed_merchant_descriptor(
  p_user_id uuid,
  p_merchant_id uuid,
  p_descriptor text,
  p_allow_structured_learning boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descriptor_key text;
  v_canonical_key text;
  v_existing_merchant_id uuid;
begin
  v_descriptor_key := public.merchant_resolution_descriptor_key(
    p_descriptor, null, false
  );
  if v_descriptor_key is null then
    raise exception 'Merchant descriptor is invalid';
  end if;

  select public.merchant_resolution_descriptor_key(
    canonical_name, null, false
  ) into v_canonical_key
  from public.merchants
  where id = p_merchant_id;
  if v_canonical_key is null then
    raise exception 'Merchant not found';
  end if;

  insert into public.merchant_user_overrides (
    user_id, merchant_id, normalized_pattern, evidence_context_key,
    evidence_type, action, updated_at
  ) values (
    p_user_id, p_merchant_id, v_descriptor_key, 'merchant_text',
    'user_confirmed_transaction', 'map', now()
  ) on conflict (user_id, normalized_pattern, evidence_context_key) do update
  set merchant_id = excluded.merchant_id,
      evidence_type = excluded.evidence_type,
      action = excluded.action,
      updated_at = excluded.updated_at;

  if not p_allow_structured_learning then
    return;
  end if;

  select merchant_id into v_existing_merchant_id
  from public.merchant_user_overrides
  where user_id = p_user_id
    and normalized_pattern = v_canonical_key
    and evidence_context_key = 'structured_merchant_name'
    and action = 'map';

  if v_existing_merchant_id is null then
    insert into public.merchant_user_overrides (
      user_id, merchant_id, normalized_pattern, evidence_context_key,
      evidence_type, action, updated_at
    ) values (
      p_user_id, p_merchant_id, v_canonical_key, 'structured_merchant_name',
      'user_confirmed_structured_merchant', 'map', now()
    ) on conflict (user_id, normalized_pattern, evidence_context_key) do nothing;
  elsif v_existing_merchant_id <> p_merchant_id then
    -- Conflicting user history means this label is ambiguous for this user.
    delete from public.merchant_user_overrides
    where user_id = p_user_id
      and normalized_pattern = v_canonical_key
      and evidence_context_key = 'structured_merchant_name';
  end if;
end;
$$;

revoke all on function public.record_confirmed_merchant_descriptor(uuid, uuid, text, boolean) from public, anon, authenticated;
