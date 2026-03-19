-- Add wallet_capture_enabled flag to user_contacts.
--
-- Why:
-- The iOS Pay Integration feature (Apple Shortcuts + App Intents) must respect the
-- user's in-app toggle at the backend level. Without a server-side flag the
-- save-wallet-transaction Edge Function would accept captures even after the
-- user disables the feature in the app.

alter table public.user_contacts
  add column if not exists wallet_capture_enabled boolean not null default false;

comment on column public.user_contacts.wallet_capture_enabled is
  'When false the save-wallet-transaction Edge Function rejects capture requests for this user with a 403 WALLET_CAPTURE_DISABLED error.';
