create or replace function public.prevent_system_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      if old.user_id::text = any(
        string_to_array(
          coalesce(current_setting('moneko.deleting_user_ids', true), ''),
          ','
        )
      ) then
        return old;
      end if;

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

create or replace function public.delete_user_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  deleted_contacts_count int := 0;
  v_existing_deleting_user_ids text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  end if;

  v_existing_deleting_user_ids := current_setting(
    'moneko.deleting_user_ids',
    true
  );

  perform set_config(
    'moneko.deleting_user_ids',
    case
      when nullif(v_existing_deleting_user_ids, '') is null then current_user_id::text
      else v_existing_deleting_user_ids || ',' || current_user_id::text
    end,
    true
  );

  delete from public.account_transfers t
  where t.created_by_user_id = current_user_id
     or exists (
       select 1
       from public.accounts a
       where a.user_id = current_user_id
         and (a.id = t.from_account_id or a.id = t.to_account_id)
     );

  delete from public.expenses e
  where e.user_id = current_user_id;

  update public.expenses e
  set
    account_id = null,
    updated_at = now()
  where exists (
    select 1
    from public.accounts a
    where a.user_id = current_user_id
      and a.id = e.account_id
  );

  with deleted_contacts as (
    delete from public.user_contacts
    where user_id = current_user_id
    returning id
  )
  select count(*) into deleted_contacts_count from deleted_contacts;

  delete from auth.users where id = current_user_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Account deleted successfully',
    'deleted_contacts', deleted_contacts_count
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
end;
$$;

revoke all on function public.delete_user_account() from public;
revoke all on function public.delete_user_account() from anon;
grant execute on function public.delete_user_account() to authenticated;
grant execute on function public.delete_user_account() to service_role;

comment on function public.delete_user_account() is
  'Deletes the authenticated user account and all linked data for the current schema. Marks the user deletion transaction so protected system accounts can be removed only during full account erasure.';
