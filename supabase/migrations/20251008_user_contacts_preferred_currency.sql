-- Add preferred_currency to user_contacts for storing per-contact currency preference
alter table if exists public.user_contacts
  add column if not exists preferred_currency text;

comment on column public.user_contacts.preferred_currency is 'ISO currency preferred by this contact (e.g., USD, EUR, GBP).';

-- Make phone_e164 nullable to support contacts created via userId without phone
-- Drop the NOT NULL constraint
alter table if exists public.user_contacts
  alter column phone_e164 drop not null;

comment on column public.user_contacts.phone_e164 is 'E.164 formatted phone number (optional, can be null for web-only and mobile app users)';
