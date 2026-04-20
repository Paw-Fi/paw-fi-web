create or replace function public.ensure_personal_spending_account(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  v_account_id := (
    select a.id
    from public.accounts a
    where a.user_id = p_user_id
      and a.household_id is null
      and a.is_archived = false
      and a.is_default = true
    order by a.created_at asc
    limit 1
  );

  if v_account_id is not null then
    return v_account_id;
  end if;

  v_account_id := (
    select a.id
    from public.accounts a
    where a.user_id = p_user_id
      and a.household_id is null
      and a.is_archived = false
      and a.is_system = true
      and lower(trim(a.name)) = 'spending'
    order by a.created_at asc
    limit 1
  );

  if v_account_id is not null then
    update public.accounts
    set
      is_default = true,
      updated_at = now()
    where id = v_account_id
      and not exists (
        select 1
        from public.accounts a
        where a.user_id = p_user_id
          and a.household_id is null
          and a.is_archived = false
          and a.is_default = true
      );

    return v_account_id;
  end if;

  v_account_id := gen_random_uuid();

  insert into public.accounts (
    id,
    user_id,
    household_id,
    name,
    icon,
    color,
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  )
  values (
    v_account_id,
    p_user_id,
    null,
    'Spending',
    'wallet',
    '#6B7280',
    0,
    not exists (
      select 1
      from public.accounts a
      where a.user_id = p_user_id
        and a.household_id is null
        and a.is_archived = false
        and a.is_default = true
    ),
    true,
    false
  );

  return v_account_id;
end;
$$;

create or replace function public.prepare_household_delete_wallet_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_allowed text;
begin
  v_existing_allowed := current_setting(
    'moneko.deleting_household_ids',
    true
  );

  perform set_config(
    'moneko.deleting_household_ids',
    case
      when nullif(v_existing_allowed, '') is null then old.id::text
      else v_existing_allowed || ',' || old.id::text
    end,
    true
  );

  delete from public.account_transfers t
  where t.household_id = old.id
     or exists (
       select 1
       from public.accounts a
       where a.household_id = old.id
         and (a.id = t.from_account_id or a.id = t.to_account_id)
     );

  with target_expenses as (
    select
      e.id,
      coalesce(e.user_id, uc.user_id, old.owner_id) as target_user_id
    from public.expenses e
    left join public.user_contacts uc on uc.id = e.contact_id
    where e.household_id = old.id
  ),
  target_accounts as (
    select distinct
      target_user_id,
      public.ensure_personal_spending_account(target_user_id) as account_id
    from target_expenses
    where target_user_id is not null
  )
  update public.expenses e
  set
    user_id = te.target_user_id,
    household_id = null,
    account_id = ta.account_id,
    split_group_id = null,
    updated_at = now()
  from target_expenses te
  join target_accounts ta
    on ta.target_user_id = te.target_user_id
  where e.id = te.id;

  return old;
end;
$$;

create or replace function public.prevent_system_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      if old.household_id is not null
        and old.household_id::text = any(
          string_to_array(
            coalesce(current_setting('moneko.deleting_household_ids', true), ''),
            ','
          )
        ) then
        return old;
      end if;

      raise exception 'System account cannot be deleted';
    end if;

    return old;
  end if;

  if old.is_system and (
    new.user_id is distinct from old.user_id
    or new.household_id is distinct from old.household_id
    or new.is_system is distinct from old.is_system
    or new.is_archived is distinct from old.is_archived
    or new.linked_bank_account_id is distinct from old.linked_bank_account_id
  ) then
    raise exception 'System account scope cannot be modified';
  end if;

  return new;
end;
$$;

drop trigger if exists households_prepare_wallet_cleanup_before_delete
  on public.households;

create trigger households_prepare_wallet_cleanup_before_delete
before delete on public.households
for each row execute function public.prepare_household_delete_wallet_cleanup();

create or replace function public.delete_household(
  p_household_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'Not authenticated'
      using errcode = '28000';
  end if;

  delete from public.households h
  where h.id = p_household_id
    and h.owner_id = v_actor_id;

  if not found then
    if exists (
      select 1
      from public.households h
      where h.id = p_household_id
    ) then
      raise exception 'Only the space owner can delete this space'
        using errcode = '42501';
    end if;

    raise exception 'Space not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_household(uuid) from public;
revoke all on function public.delete_household(uuid) from anon;
grant execute on function public.delete_household(uuid) to authenticated;
grant execute on function public.delete_household(uuid) to service_role;
