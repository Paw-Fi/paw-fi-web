-- Add preferred_timezone to user_contacts for capturing the user's local timezone.
-- Store an IANA timezone where possible (e.g., 'Asia/Singapore'); allow UTC offsets as fallback (e.g., 'UTC+08:00').

alter table if exists public.user_contacts
  add column if not exists preferred_timezone text;

comment on column public.user_contacts.preferred_timezone is
  'Preferred timezone for this contact (IANA like Asia/Singapore or UTC offset like UTC+08:00). Used to localize dates in bots and apps.';
