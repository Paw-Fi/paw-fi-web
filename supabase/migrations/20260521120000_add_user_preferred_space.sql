alter table if exists public.users
  drop column if exists preferred_space_id;

alter table if exists public.user_contacts
  add column if not exists preferred_space_id uuid
  references public.households(id) on delete set null;

comment on column public.user_contacts.preferred_space_id is
  'Default space for AI bot-created records for this contact/channel. Null means default to the personal account.';

create index if not exists idx_user_contacts_preferred_space_id
  on public.user_contacts(preferred_space_id)
  where preferred_space_id is not null;
