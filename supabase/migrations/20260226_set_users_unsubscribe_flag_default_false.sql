-- Ensure unsubscribe flag exists and defaults to false
alter table if exists public.users
  add column if not exists unsubscribed_from_newsletter boolean default false;

-- Backfill any existing nulls to false for consistency
update public.users
  set unsubscribed_from_newsletter = false
  where unsubscribed_from_newsletter is null;

comment on column public.users.unsubscribed_from_newsletter is 'False by default. Set to true when the user unsubscribes from emails/newsletter.';
