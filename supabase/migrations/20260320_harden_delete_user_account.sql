-- Harden account deletion for current schema.
--
-- Why:
-- - The original delete_user_account() only deleted from auth.users.
-- - Most tables now cascade correctly via auth.users/public.users FKs, but
--   public.user_contacts.user_id uses ON DELETE SET NULL by design.
-- - For full account erasure, we must explicitly delete user_contacts rows
--   linked to the current user before deleting auth.users.

-- If an existing function has a different return type, CREATE OR REPLACE
-- cannot change it. Drop first, then recreate.
drop function if exists public.delete_user_account();

create or replace function public.delete_user_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  deleted_contacts_count int := 0;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  end if;

  -- Explicitly remove contact rows tied to this user.
  -- This prevents ON DELETE SET NULL retention in user_contacts and ensures
  -- dependent contact data (daily_budgets, expense_categories, expenses, etc.)
  -- is fully removed through existing ON DELETE CASCADE chains.
  with deleted_contacts as (
    delete from public.user_contacts
    where user_id = current_user_id
    returning id
  )
  select count(*) into deleted_contacts_count from deleted_contacts;

  -- Delete from auth.users (this triggers public.handle_delete_auth_user,
  -- which deletes public.users and cascades the remaining user-owned data).
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
  'Deletes the authenticated user account and all linked data for the current schema. Includes explicit user_contacts deletion to avoid ON DELETE SET NULL retention, then deletes auth.users to trigger cascade cleanup.';
