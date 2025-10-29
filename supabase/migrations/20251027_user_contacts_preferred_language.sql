-- Add preferred_language to user_contacts for storing per-contact language preference
alter table if exists public.user_contacts
  add column if not exists preferred_language text;

comment on column public.user_contacts.preferred_language is 'Preferred language code (e.g., en, zh). Used by clients to personalize UI and communications.';
