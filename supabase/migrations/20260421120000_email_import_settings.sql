-- Shared inbox email import settings and sender whitelist support.

alter table public.user_contacts
  add column if not exists email_import_enabled boolean not null default false,
  add column if not exists email_import_household_id uuid null references public.households(id) on delete set null,
  add column if not exists email_import_is_portfolio boolean not null default false,
  add column if not exists email_import_account_id uuid null references public.accounts(id) on delete set null;

comment on column public.user_contacts.email_import_enabled is
  'When true, the user can import forwarded email attachments from the shared Moneko inbox.';

comment on column public.user_contacts.email_import_household_id is
  'Selected destination space for email imports. Null means personal space.';

comment on column public.user_contacts.email_import_is_portfolio is
  'When true and email_import_household_id is present, save forwarded imports into the user''s portfolio scope instead of shared household scope.';

comment on column public.user_contacts.email_import_account_id is
  'Selected destination wallet/account for forwarded email imports. Null falls back to the default scoped account.';

create table if not exists public.email_import_sender_whitelist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sender_email text not null,
  normalized_sender_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_import_sender_whitelist_email_unique unique (normalized_sender_email)
);

comment on table public.email_import_sender_whitelist is
  'Additional sender emails allowed to import forwarded files into a user''s account via the shared inbound mailbox.';

create index if not exists email_import_sender_whitelist_normalized_idx
  on public.email_import_sender_whitelist (normalized_sender_email, created_at desc);

create index if not exists email_import_sender_whitelist_user_idx
  on public.email_import_sender_whitelist (user_id, created_at desc);

alter table public.email_import_sender_whitelist enable row level security;

drop policy if exists "Users can view their own email import whitelist" on public.email_import_sender_whitelist;
drop policy if exists "Users can insert their own email import whitelist" on public.email_import_sender_whitelist;
drop policy if exists "Users can update their own email import whitelist" on public.email_import_sender_whitelist;
drop policy if exists "Users can delete their own email import whitelist" on public.email_import_sender_whitelist;

create policy "Users can view their own email import whitelist"
  on public.email_import_sender_whitelist
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own email import whitelist"
  on public.email_import_sender_whitelist
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own email import whitelist"
  on public.email_import_sender_whitelist
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own email import whitelist"
  on public.email_import_sender_whitelist
  for delete
  using (auth.uid() = user_id);

create table if not exists public.email_import_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  provider_email_id text not null unique,
  sender_email text not null,
  normalized_sender_email text not null,
  user_id uuid null references public.users(id) on delete set null,
  status text not null default 'received' check (status in ('received', 'ignored', 'processed', 'failed')),
  error_text text null,
  result jsonb null,
  processed_at timestamptz null,
  created_at timestamptz not null default now()
);

comment on table public.email_import_events is
  'Inbound shared-mailbox deliveries for expense imports, used for idempotency and processing audit.';

create index if not exists email_import_events_user_idx
  on public.email_import_events (user_id, created_at desc);

alter table public.email_import_events enable row level security;
