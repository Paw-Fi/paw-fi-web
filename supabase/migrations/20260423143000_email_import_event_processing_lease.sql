-- Harden inbound email import idempotency for webhook retries and long-running executions.

alter table public.email_import_events
  add column if not exists lock_expires_at timestamptz null,
  add column if not exists processing_attempt_count integer not null default 0,
  add column if not exists last_svix_id text null,
  add column if not exists last_svix_timestamp text null;

update public.email_import_events
set processing_attempt_count = 1
where processing_attempt_count < 1;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.email_import_events'::regclass
      and conname = 'email_import_events_status_check'
  ) then
    alter table public.email_import_events
      drop constraint email_import_events_status_check;
  end if;
end $$;

alter table public.email_import_events
  add constraint email_import_events_status_check
  check (status in ('received', 'processing', 'ignored', 'processed', 'failed'));

create index if not exists email_import_events_status_lock_idx
  on public.email_import_events (status, lock_expires_at, created_at desc);
