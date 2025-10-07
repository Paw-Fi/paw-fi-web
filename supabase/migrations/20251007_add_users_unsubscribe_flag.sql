-- Add a nullable flag to indicate if the user unsubscribed from emails/newsletter
alter table if exists public.users
  add column if not exists unsubscribed_from_newsletter boolean null;

comment on column public.users.unsubscribed_from_newsletter is 'Null by default. Set to true when the user unsubscribes from emails/newsletter.';