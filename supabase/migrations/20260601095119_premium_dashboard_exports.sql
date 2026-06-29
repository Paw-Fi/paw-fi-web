insert into storage.buckets (id, name, public)
values
  ('email-import-attachments', 'email-import-attachments', false),
  ('premium-exports', 'premium-exports', false)
on conflict (id) do nothing;

drop policy if exists "Service role can manage premium private files" on storage.objects;
create policy "Service role can manage premium private files"
  on storage.objects
  for all
  to service_role
  using (bucket_id in ('email-import-attachments', 'premium-exports'))
  with check (bucket_id in ('email-import-attachments', 'premium-exports'));

create table if not exists public.email_import_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email_import_event_id uuid not null references public.email_import_events(id) on delete cascade,
  provider text not null default 'resend',
  provider_email_id text null,
  storage_bucket text not null default 'email-import-attachments',
  storage_path text not null,
  filename text not null,
  content_type text null,
  size_bytes bigint null,
  sha256 text null,
  status text not null default 'stored' check (status in ('stored', 'linked', 'orphaned', 'deleted')),
  transaction_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email_import_event_id, sha256)
);

create index if not exists email_import_attachments_user_created_idx
  on public.email_import_attachments (user_id, created_at desc);

create index if not exists email_import_attachments_event_idx
  on public.email_import_attachments (email_import_event_id);

alter table public.email_import_attachments enable row level security;

drop policy if exists "Users can view their own email import attachments" on public.email_import_attachments;
create policy "Users can view their own email import attachments"
  on public.email_import_attachments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.email_import_attachments to authenticated;

drop trigger if exists email_import_attachments_set_updated_at on public.email_import_attachments;
create trigger email_import_attachments_set_updated_at
before update on public.email_import_attachments
for each row execute function public.update_updated_at_column();

create table if not exists public.premium_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'preparing', 'collecting_files', 'generating', 'ready', 'failed', 'expired')),
  export_type text not null check (export_type in ('transactions_csv', 'reports_csv', 'tax_package_zip', 'files_zip', 'account_history_csv', 'category_data_csv', 'everything_zip')),
  filters jsonb not null default '{}'::jsonb,
  storage_bucket text not null default 'premium-exports',
  storage_path text null,
  file_name text null,
  mime_type text null,
  size_bytes bigint null,
  error_text text null,
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  expires_at timestamptz null
);

create index if not exists premium_export_jobs_user_created_idx
  on public.premium_export_jobs (user_id, created_at desc);

create index if not exists premium_export_jobs_user_status_idx
  on public.premium_export_jobs (user_id, status, created_at desc);

alter table public.premium_export_jobs enable row level security;

drop policy if exists "Users can view their own premium export jobs" on public.premium_export_jobs;
create policy "Users can view their own premium export jobs"
  on public.premium_export_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.premium_export_jobs to authenticated;

drop trigger if exists premium_export_jobs_set_updated_at on public.premium_export_jobs;
create trigger premium_export_jobs_set_updated_at
before update on public.premium_export_jobs
for each row execute function public.update_updated_at_column();
