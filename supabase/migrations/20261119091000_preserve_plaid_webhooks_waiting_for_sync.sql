-- The webhook handler requests this retry after the enqueue RPC finds an
-- active transaction job. Keep the event until it can hand off its own sync.
do $$
declare
  v_definition text := pg_get_functiondef(
    'public.complete_bank_webhook_event_v2(uuid,uuid,text,text,integer)'::regprocedure);
  v_before_exhaustion text := '  if v_event.recovery_attempt_count >= v_event.recovery_max_attempts then';
  v_deferral text := $new$  if v_event.provider = 'plaid' and v_event.event_type = 'TRANSACTIONS'
    and v_event.bank_connection_id is not null and p_error = 'deferred_active_sync' then
    -- The existing claim and outcome checks run before this branch. Return
    -- only the attempt consumed by this claim; past failures still count.
    update public.bank_webhook_events event
    set recovery_status = 'pending',
        recovery_attempt_count = greatest(v_event.recovery_attempt_count - 1, 0),
        processing_started_at = null,
        processing_lock_token = null,
        processing_error = p_error,
        next_attempt_at = greatest(now() + interval '5 minutes', (
          select least(job.next_attempt_at, now() + interval '1 hour')
          from public.bank_sync_jobs job
          where job.bank_connection_id = v_event.bank_connection_id
            and job.job_type = 'transactions_sync' and job.provider = 'plaid'
            and job.status in ('pending', 'processing') and job.next_attempt_at is not null
        ))
    where event.id = p_event_id;
    return 'pending';
  end if;

$new$;
begin
  if position(v_deferral in v_definition) > 0 then return; end if;
  if position(v_before_exhaustion in v_definition) = 0 then
    raise exception 'Unexpected webhook retry transition';
  end if;
  execute replace(v_definition, v_before_exhaustion, v_deferral || v_before_exhaustion);

  -- A past transaction notification still needs a handoff only while its
  -- original connection is outstanding. Never replay historical ITEM actions.
  update public.bank_webhook_events event
  set recovery_status = 'pending',
      recovery_attempt_count = greatest(event.recovery_max_attempts - 1, 0),
      next_attempt_at = now(),
      dead_lettered_at = null,
      dead_letter_alerted_at = null
  from public.bank_connections connection
  where event.provider = 'plaid' and event.event_type = 'TRANSACTIONS'
    and event.recovery_status = 'dead_letter' and event.processed_at is null
    and event.processing_error = 'deferred_active_sync'
    and event.bank_connection_id = connection.id and connection.provider = 'plaid'
    and event.provider_item_id = connection.provider_item_id
    and connection.removed_at is null and connection.needs_resync is true
    and connection.status in ('active', 'pending', 'error')
    and (connection.item_status is null or connection.item_status not in ('pending_relink', 'pending_removal', 'removed'))
    and (connection.last_successful_sync_at is null or connection.last_successful_sync_at < event.received_at);
end;
$$;
