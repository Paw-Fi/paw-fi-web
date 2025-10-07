-- Add preferred_currency to user_contacts for storing per-contact currency preference
alter table if exists public.user_contacts
  add column if not exists preferred_currency text;

comment on column public.user_contacts.preferred_currency is 'ISO currency preferred by this contact (e.g., USD, EUR, GBP).';
