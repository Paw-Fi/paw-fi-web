-- Add platform to user_contacts for capturing the user's mobile platform.

alter table public.user_contacts
  add column if not exists platform text;

comment on column public.user_contacts.platform is
  'Mobile platform reported by the app. Allowed values: IOS, Android.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_platform_check'
  ) then
    alter table public.user_contacts
      add constraint user_contacts_platform_check
      check (platform is null or platform in ('IOS', 'Android'));
  end if;
end $$;
