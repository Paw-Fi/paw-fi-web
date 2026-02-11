-- Make avatar cleanup trigger non-blocking during account deletion.
--
-- In some Supabase environments, direct DELETE on storage.objects is blocked
-- (must use Storage API), which can break account deletion if triggered inside
-- a BEFORE DELETE trigger on public.users.

create or replace function public.delete_user_avatar()
returns trigger
language plpgsql
security definer
as $$
begin
  begin
    delete from storage.objects
    where bucket_id = 'avatars'
      and (
        name = old.id::text || '/avatar.png'
        or name = old.id::text || '/avatar.jpg'
        or name = old.id::text || '/avatar.jpeg'
        or name = old.id::text || '/avatar.webp'
      );
  exception
    when others then
      null;
  end;

  return old;
end;
$$;
