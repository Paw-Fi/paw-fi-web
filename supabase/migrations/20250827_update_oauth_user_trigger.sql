-- Update the trigger to handle OAuth users with metadata
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(
      excluded.full_name,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(excluded.email, '@', 1)
    ),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;