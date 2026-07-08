create or replace function public.user_has_plus_entitlement(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and coalesce(s.plan, 'free') <> 'free'
      and (
        (s.plan = 'lifetime' and s.status = 'active')
        or (
          s.status in ('trialing', 'active', 'past_due')
          and s.current_period_end is not null
          and s.current_period_end > now()
        )
      )
  );
$$;

create or replace function public.enforce_free_plan_owned_space_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
begin
  if new.owner_id is null then
    return new;
  end if;

  if public.user_has_plus_entitlement(new.owner_id) then
    return new;
  end if;

  select count(*)
    into existing_count
  from public.households h
  where h.owner_id = new.owner_id
    and h.is_portfolio = new.is_portfolio;

  if existing_count >= 1 then
    if new.is_portfolio then
      raise exception 'Moneko Plus is required to create more than one private space.'
        using errcode = 'P0001';
    end if;

    raise exception 'Moneko Plus is required to create more than one shared space.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists households_enforce_free_plan_owned_space_limit
  on public.households;

create trigger households_enforce_free_plan_owned_space_limit
before insert on public.households
for each row
execute function public.enforce_free_plan_owned_space_limit();

revoke execute on function public.user_has_plus_entitlement(uuid)
  from public, anon, authenticated;
revoke execute on function public.enforce_free_plan_owned_space_limit()
  from public, anon, authenticated;
grant execute on function public.user_has_plus_entitlement(uuid)
  to service_role;
grant execute on function public.enforce_free_plan_owned_space_limit()
  to service_role;
