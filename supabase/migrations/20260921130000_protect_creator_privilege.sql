create or replace function public.prevent_client_creator_privilege_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' and coalesce(new.is_creator, false) then
    raise exception 'Creator access cannot be granted by a client'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.is_creator is distinct from old.is_creator then
    raise exception 'Creator access cannot be changed by a client'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.prevent_client_creator_privilege_change()
  from public, anon, authenticated;

drop trigger if exists protect_creator_privilege on public.users;
create trigger protect_creator_privilege
before insert or update of is_creator on public.users
for each row execute function public.prevent_client_creator_privilege_change();

comment on function public.prevent_client_creator_privilege_change() is
  'Prevents authenticated clients from granting or changing users.is_creator while allowing trusted service-role and database operations.';
