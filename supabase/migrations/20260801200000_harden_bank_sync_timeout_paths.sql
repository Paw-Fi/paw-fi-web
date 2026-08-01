set lock_timeout = '5s';
set statement_timeout = '2min';

-- The queue claim orders by this expression. The older
-- (status, next_attempt_at, created_at) index cannot satisfy that ordering and
-- degrades as completed and failed job history accumulates.
create index if not exists bank_sync_jobs_pending_claim_idx
  on public.bank_sync_jobs (
    (coalesce(next_attempt_at, created_at)),
    created_at,
    id
  )
  where status = 'pending';

-- Recurring inference reads finalized Plaid ledger rows for one connection's
-- account IDs, scope, and newest dates. Existing transfer and feed indexes put
-- unrelated columns before date and cannot efficiently serve this query.
create index if not exists expenses_plaid_recurring_detection_idx
  on public.expenses (
    user_id,
    household_id,
    bank_account_id,
    date desc
  )
  where provider = 'plaid'
    and deleted_at is null
    and provider_pending is false
    and analytics_is_final is true;

create or replace function public.claim_pending_sync_jobs(
  p_batch_size integer default 10,
  p_processor_id text default null
)
returns setof public.bank_sync_jobs
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return query
  with claimed as (
    select id
    from public.bank_sync_jobs
    where status = 'pending'
      and (next_attempt_at is null or next_attempt_at <= now())
    order by
      coalesce(next_attempt_at, created_at) asc,
      created_at asc,
      id asc
    limit p_batch_size
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
  'Atomically claims ready pending sync jobs in indexed retry order with deterministic tie-breaking.';

revoke all on function public.claim_pending_sync_jobs(integer, text)
  from public, anon, authenticated;
grant execute on function public.claim_pending_sync_jobs(integer, text)
  to service_role;

reset statement_timeout;
reset lock_timeout;
