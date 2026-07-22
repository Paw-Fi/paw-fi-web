-- PRODUCTION-PRIMARY-SAFE: lightweight Phase 0/1 monitoring only.
-- This file contains no EXPLAIN ANALYZE and no reconciliation self-join.
-- Run the BASELINE SNAPSHOT sections twice, 15-30 minutes apart, and compare
-- counter deltas. Do not reset statistics between snapshots.

-- BASELINE SNAPSHOT: timestamp and database-wide pressure counters.
select
  clock_timestamp() as captured_at,
  datname,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  temp_files,
  temp_bytes,
  deadlocks
from pg_stat_database
where datname = current_database();

-- BASELINE/MONITORING: calls, execution, blocks, temp I/O, and WAL per call.
select
  clock_timestamp() as captured_at,
  queryid,
  calls,
  round(total_exec_time::numeric, 2) as total_exec_ms,
  round(mean_exec_time::numeric, 2) as mean_exec_ms,
  round(max_exec_time::numeric, 2) as max_exec_ms,
  shared_blks_read,
  shared_blks_hit,
  shared_blks_dirtied,
  shared_blks_written,
  temp_blks_read,
  temp_blks_written,
  wal_bytes,
  round(shared_blks_read::numeric / nullif(calls, 0), 2) as blocks_read_per_call,
  round(wal_bytes::numeric / nullif(calls, 0), 2) as wal_bytes_per_call,
  left(regexp_replace(query, '\\s+', ' ', 'g'), 500) as query
from extensions.pg_stat_statements
where query ilike '%apply_plaid_sync_batch_v2%'
order by calls desc;

-- BASELINE/MONITORING: reconciliation index amplification.
select
  clock_timestamp() as captured_at,
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
from pg_stat_user_indexes
where schemaname = 'public'
  and indexrelname = 'expenses_plaid_transfer_reconciliation_idx';

-- BASELINE: expenses write churn and dead tuples.
select
  clock_timestamp() as captured_at,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  last_autovacuum,
  autovacuum_count
from pg_stat_user_tables
where schemaname = 'public' and relname = 'expenses';

-- BASELINE/MONITORING: Plaid audit outcomes and timeout text.
select
  audit.status,
  count(*) as sync_count,
  count(*) filter (
    where coalesce(audit.error_message, '')
      ~* 'timeout|statement timeout|canceling statement'
  ) as timeout_count,
  round(avg(extract(epoch from (audit.finished_at - audit.started_at)))::numeric, 3)
    as average_seconds,
  round(max(extract(epoch from (audit.finished_at - audit.started_at)))::numeric, 3)
    as maximum_seconds
from public.bank_sync_audit audit
join public.bank_connections connection
  on connection.id = audit.bank_connection_id
where connection.provider = 'plaid'
  and audit.started_at >= now() - interval '30 minutes'
group by audit.status
order by audit.status;

-- BASELINE/MONITORING: failures, deferrals, and recurring supersession.
select
  event_type,
  severity,
  count(*) as event_count
from public.plaid_sync_events
where created_at >= now() - interval '30 minutes'
  and event_type in (
    'sync_failed',
    'batch_not_ready',
    'recurring_deferred',
    'recurring_refresh_deferred',
    'recurring_refresh_superseded'
  )
group by event_type, severity
order by event_type, severity;

-- BASELINE/MONITORING: retries and terminal queue failures.
select
  status,
  count(*) as job_count,
  count(*) filter (where coalesce(attempt_count, 0) > 1) as retried_jobs,
  max(coalesce(attempt_count, 0)) as maximum_attempt_count,
  count(*) filter (
    where coalesce(last_error_code, '') ~* 'timeout|statement timeout'
  ) as timeout_jobs
from public.bank_sync_jobs
where provider = 'plaid'
  and created_at >= now() - interval '30 minutes'
group by status
order by status;

-- CONTRACT CHECK: capture before and after deployment; rows must be identical.
select
  p.oid::regprocedure::text as function_signature,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  p.proacl as acl,
  coalesce((
    select bool_or(expanded.grantee = 0 and expanded.privilege_type = 'EXECUTE')
    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) expanded
  ), false) as public_can_execute,
  has_function_privilege(
    'anon', p.oid, 'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated', p.oid, 'EXECUTE'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role', p.oid, 'EXECUTE'
  ) as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'apply_plaid_sync_batch_v1',
    'apply_plaid_sync_batch_v2',
    'apply_plaid_sync_batch_v2_legacy'
  )
order by p.proname, p.oid::regprocedure::text;
