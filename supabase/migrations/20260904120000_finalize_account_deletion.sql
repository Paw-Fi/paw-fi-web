-- Account deletion must complete in one bounded database transaction. Reuse the
-- reset's dependency-safe financial cleanup, then remove the auth identity.
-- Storage cleanup remains queued because it must outlive the auth row.

alter table public.financial_storage_cleanup_jobs
  drop constraint if exists financial_storage_cleanup_jobs_user_id_fkey;

alter table public.support_tickets
  drop constraint if exists support_tickets_resolved_by_fkey;

alter table public.support_tickets
  add constraint support_tickets_resolved_by_fkey
  foreign key (resolved_by)
  references auth.users(id)
  on delete set null;

create or replace function public.delete_user_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  reset_result jsonb;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Not authenticated');
  end if;

  reset_result := public.reset_user_financial_data();
  if coalesce((reset_result ->> 'success')::boolean, false) is not true then
    return jsonb_build_object(
      'success', false,
      'message', coalesce(reset_result ->> 'message', 'Failed to delete account')
    );
  end if;

  delete from public.user_contacts
  where user_id = current_user_id;

  delete from auth.users
  where id = current_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'User not found');
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Account deleted successfully',
    'storage_cleanup_queued', true
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'message', 'Failed to delete account'
    );
end;
$$;

revoke all on function public.delete_user_account()
  from public, anon, authenticated;
grant execute on function public.delete_user_account() to authenticated;

comment on function public.delete_user_account() is
  'Deletes all authenticated-user data through the financial reset cleanup, queues Storage cleanup, and then permanently removes the auth account.';
