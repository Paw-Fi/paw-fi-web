-- Preserve private/shared space metadata in the startup payload. The mobile
-- app hydrates its household provider from this RPC and does not immediately
-- refetch rows that were preloaded successfully.
create or replace function public.initialize_app_v2(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result json;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise exception 'initialize_app_v2 may only load the authenticated user'
      using errcode = '42501';
  end if;

  select json_build_object(
    'user_contact', (
      select row_to_json(c.*)
      from (
        select uc.*
        from public.user_contacts uc
        where uc.user_id = p_user_id
        order by uc.updated_at desc nulls last, uc.created_at desc nulls last
        limit 1
      ) c
    ),
    'subscription', (
      select row_to_json(s.*)
      from (
        select sub.*
        from public.subscriptions sub
        where sub.user_id = p_user_id
        order by sub.updated_at desc nulls last
        limit 1
      ) s
    ),
    'whatsapp_binding', (
      select json_build_object(
        'is_bound', uc.id is not null,
        'phone_e164', uc.phone_e164,
        'verified', uc.verified,
        'user_id', p_user_id
      )
      from (
        select contact.id, contact.phone_e164, contact.verified
        from public.user_contacts contact
        where contact.user_id = p_user_id
        order by contact.updated_at desc nulls last,
          contact.created_at desc nulls last
        limit 1
      ) uc
    ),
    'households', coalesce((
      select json_agg(h_data.*)
      from (
        select
          h.id,
          h.name,
          h.owner_id,
          h.currency,
          h.cover_image_url,
          h.theme_color,
          h.is_portfolio,
          h.ai_use_default_split,
          h.ai_default_split_config,
          h.created_at,
          h.updated_at,
          hm.role,
          hm.joined_at
        from public.households h
        inner join public.household_members hm on hm.household_id = h.id
        where hm.user_id = p_user_id
        order by h.name asc
      ) h_data
    ), '[]'::json),
    'metadata', json_build_object(
      'fetched_at', now(),
      'user_id', p_user_id,
      'version', '2.1'
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.initialize_app_v2(uuid) from public, anon;
grant execute on function public.initialize_app_v2(uuid) to authenticated;

comment on function public.initialize_app_v2(uuid) is
  'Loads authenticated mobile startup data, including private/shared space metadata.';
