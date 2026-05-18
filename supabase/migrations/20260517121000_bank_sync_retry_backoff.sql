-- Make stuck job release use the same bounded retry semantics as the processor.

create or replace function public.release_stuck_sync_jobs(
  p_ttl_minutes int default 5
)
returns int
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  affected_count int;
begin
  if p_ttl_minutes < 1 or p_ttl_minutes > 60 then
    raise exception 'invalid sync job ttl minutes';
  end if;

  with expired_jobs as (
    select
      id,
      attempt_count + 1 as next_attempt_count
    from public.bank_sync_jobs
    where status = 'processing'
      and processing_started_at is not null
      and processing_started_at < now() - (p_ttl_minutes || ' minutes')::interval
    for update skip locked
  )
  update public.bank_sync_jobs jobs
  set
    status = case
      when expired_jobs.next_attempt_count >= 5 then 'failed'
      else 'pending'
    end,
    attempt_count = expired_jobs.next_attempt_count,
    next_attempt_at = case
      when expired_jobs.next_attempt_count >= 5 then null
      when expired_jobs.next_attempt_count = 1 then now() + interval '5 minutes'
      when expired_jobs.next_attempt_count = 2 then now() + interval '15 minutes'
      when expired_jobs.next_attempt_count = 3 then now() + interval '1 hour'
      else now() + interval '6 hours'
    end,
    processing_started_at = null,
    processed_at = case
      when expired_jobs.next_attempt_count >= 5 then now()
      else jobs.processed_at
    end,
    last_error_code = coalesce(jobs.last_error_code, 'stuck_processing_timeout'),
    last_error_at = now(),
    updated_at = now()
  from expired_jobs
  where jobs.id = expired_jobs.id;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

comment on function public.release_stuck_sync_jobs is 'Releases expired processing sync jobs with bounded retry/backoff metadata.';

revoke all on function public.release_stuck_sync_jobs(int) from public, anon, authenticated;
grant execute on function public.release_stuck_sync_jobs(int) to service_role;
