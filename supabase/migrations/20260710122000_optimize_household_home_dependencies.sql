set lock_timeout = '5s';
set statement_timeout = '2min';

-- Match the household Home queries that remain after transaction snapshots
-- are hydrated. These indexes do not change predicates or row visibility.
create index if not exists idx_shared_budgets_household_active_created
  on public.shared_budgets (household_id, created_at desc)
  where is_active = true;

create index if not exists idx_split_groups_household_created_home
  on public.expense_split_groups (household_id, created_at desc, id);

create index if not exists idx_settlement_events_household_participant_home
  on public.household_settlement_events (
    household_id,
    participant_user_id,
    created_at desc
  );

-- The previous mobile path fetched member rows and then fetched profiles in a
-- second request. SECURITY INVOKER keeps the same RLS policies in force while
-- returning the same nested `users` shape in one round trip.
create or replace function public.get_household_home_members_v1(
  p_household_id uuid
) returns table (
  id uuid,
  household_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  users jsonb
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_auth_user_id uuid := (select auth.uid());
begin
  if v_auth_user_id is null or not exists (
    select 1
    from public.household_members membership
    where membership.household_id = p_household_id
      and membership.user_id = v_auth_user_id
  ) then
    raise exception 'Unauthorized household member access'
      using errcode = '42501';
  end if;

  return query
  select
    member.id,
    member.household_id,
    member.user_id,
    member.role::text,
    member.joined_at,
    member.created_at,
    member.updated_at,
    case
      when profile.id is null then null
      else jsonb_build_object(
        'id', profile.id,
        'email', profile.email,
        'full_name', nullif(trim(coalesce(profile.full_name, '')), ''),
        'avatar_url', profile.avatar_url
      )
    end
  from public.household_members member
  left join public.users profile on profile.id = member.user_id
  where member.household_id = p_household_id;
end;
$$;

-- Date predicates belong to expenses, not split-group creation timestamps.
-- Flutter sends only split-group IDs referenced by the already date-filtered
-- Home transactions, preserving the existing split calculation exactly while
-- avoiding the previous 10,000-group payload.
create or replace function public.get_household_home_split_groups_v1(
  p_household_id uuid,
  p_split_group_ids uuid[]
) returns setof jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_auth_user_id uuid := (select auth.uid());
begin
  if v_auth_user_id is null or not exists (
    select 1
    from public.household_members membership
    where membership.household_id = p_household_id
      and membership.user_id = v_auth_user_id
  ) then
    raise exception 'Unauthorized household split access'
      using errcode = '42501';
  end if;

  if p_split_group_ids is null or cardinality(p_split_group_ids) = 0 then
    return;
  end if;

  return query
  select
    to_jsonb(split_group) || jsonb_build_object(
      'expense_split_lines',
      coalesce(
        (
          select jsonb_agg(to_jsonb(split_line))
          from public.expense_split_lines split_line
          where split_line.split_group_id = split_group.id
        ),
        '[]'::jsonb
      )
    )
  from public.expense_split_groups split_group
  where split_group.household_id = p_household_id
    and split_group.id = any(p_split_group_ids)
  order by split_group.created_at desc;
end;
$$;

comment on function public.get_household_home_members_v1(uuid)
  is 'Returns household member rows and visible user profiles for Home in one RLS-protected request.';

comment on function public.get_household_home_split_groups_v1(uuid, uuid[])
  is 'Returns only split groups referenced by date-filtered household Home transactions.';

revoke all on function public.get_household_home_members_v1(uuid)
  from public, anon;
grant execute on function public.get_household_home_members_v1(uuid)
  to authenticated;

revoke all on function public.get_household_home_split_groups_v1(uuid, uuid[])
  from public, anon;
grant execute on function public.get_household_home_split_groups_v1(uuid, uuid[])
  to authenticated;

notify pgrst, 'reload schema';

reset statement_timeout;
reset lock_timeout;

-- Rollback:
-- drop function if exists public.get_household_home_split_groups_v1(uuid, uuid[]);
-- drop function if exists public.get_household_home_members_v1(uuid);
-- drop index if exists public.idx_settlement_events_household_participant_home;
-- drop index if exists public.idx_split_groups_household_created_home;
-- drop index if exists public.idx_shared_budgets_household_active_created;
