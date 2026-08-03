set lock_timeout = '5s';
set statement_timeout = '2min';

-- Recovery scans run every two minutes. Keep their ordered candidate lookup
-- independent of the total number of inactive or terminal connections.
create index if not exists bank_connections_plaid_recovery_scan_idx
  on public.bank_connections (last_successful_sync_at asc nulls first, id)
  include (
    status,
    item_status,
    needs_resync,
    plaid_recurring_refresh_pending,
    error_code,
    plaid_not_ready_retry_at,
    last_webhook_received_at
  )
  where provider = 'plaid'
    and removed_at is null
    and status in ('active', 'pending', 'error');

create or replace function public.claim_pending_sync_jobs(
  p_batch_size integer default 3,
  p_processor_id text default null
)
returns setof public.bank_sync_jobs
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Serialize the claim decision. A committed processing row is the durable
  -- lease for the Edge invocation, so later cron runs do not amplify database
  -- load while the current worker is still active.
  perform pg_advisory_xact_lock(
    hashtextextended('bank_sync_jobs_single_worker', 0)
  );

  if exists (
    select 1
    from public.bank_sync_jobs active_job
    where active_job.status = 'processing'
      and active_job.processing_started_at >= now() - interval '60 minutes'
  ) then
    return;
  end if;

  return query
  with claimed as (
    select job.id
    from public.bank_sync_jobs job
    where job.status = 'pending'
      and (job.next_attempt_at is null or job.next_attempt_at <= now())
    order by
      coalesce(job.next_attempt_at, job.created_at) asc,
      job.created_at asc,
      job.id asc
    limit least(greatest(coalesce(p_batch_size, 3), 1), 3)
    for update skip locked
  )
  update public.bank_sync_jobs job
  set status = 'processing',
      processing_started_at = now(),
      updated_at = now(),
      payload = case
        when p_processor_id is not null then
          coalesce(job.payload, '{}'::jsonb)
            || jsonb_build_object('processor_id', p_processor_id)
        else job.payload
      end
  from claimed
  where job.id = claimed.id
  returning job.*;
end;
$$;

comment on function public.claim_pending_sync_jobs(integer, text) is
  'Atomically claims at most three ready jobs while preventing overlapping bank-sync processor batches.';

revoke all on function public.claim_pending_sync_jobs(integer, text)
  from public, anon, authenticated;
grant execute on function public.claim_pending_sync_jobs(integer, text)
  to service_role;

reset statement_timeout;
reset lock_timeout;
