-- Index the two Plaid cleanup foreign keys reached by financial reset.
-- ON DELETE SET NULL checks each deleted parent separately. Without these
-- indexes, deleting old jobs/audit rows repeatedly scans other users' history.
-- Equality FK lookups imply IS NOT NULL, including generic prepared plans.
-- Standard builds block table writes until the migration commits. For an
-- online rollout, prebuild these same indexes CONCURRENTLY outside a transaction
-- and verify they are valid before applying this transaction-compatible delta.
create index if not exists bank_sync_jobs_superseded_by_job_idx
  on public.bank_sync_jobs (superseded_by_job_id)
  where superseded_by_job_id is not null;

create index if not exists plaid_sync_events_bank_sync_audit_idx
  on public.plaid_sync_events (bank_sync_audit_id)
  where bank_sync_audit_id is not null;
