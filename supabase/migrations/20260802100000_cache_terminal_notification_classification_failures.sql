alter table public.notification_capture_classifications
  add column if not exists context_hash text,
  add column if not exists processing_token uuid;

alter table public.notification_capture_ai_attempts
  add column if not exists pipeline_version text,
  add column if not exists context_hash text;

create index if not exists idx_notification_capture_ai_attempts_event_pipeline_context
  on public.notification_capture_ai_attempts(event_id, pipeline_version, context_hash);

create or replace function public.claim_notification_capture_classification_v2(
  p_user_id uuid,
  p_event_key text,
  p_source_package text,
  p_source_app_label text,
  p_hourly_limit integer,
  p_pipeline_version text,
  p_context_hash text,
  p_max_event_attempts integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_existing public.notification_capture_classifications%rowtype;
  v_event_id uuid;
  v_processing_token uuid := gen_random_uuid();
  v_recent_count integer;
  v_event_attempt_count integer := 0;
  v_has_existing boolean := false;
  v_terminal_result jsonb;
begin
  if p_user_id is null
    or nullif(trim(coalesce(p_event_key, '')), '') is null
    or nullif(trim(coalesce(p_source_package, '')), '') is null
    or nullif(trim(coalesce(p_pipeline_version, '')), '') is null
    or p_context_hash is null
    or p_context_hash !~ '^[a-f0-9]{64}$'
  then
    raise exception 'Invalid notification classification claim';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('notification-classification|' || p_user_id::text)::bigint
  );

  select *
  into v_existing
  from public.notification_capture_classifications
  where user_id = p_user_id
    and event_key = p_event_key
  limit 1;

  v_has_existing := found;
  if v_has_existing then
    if v_existing.status = 'saved' and v_existing.result is not null then
      return jsonb_build_object(
        'status', 'cached',
        'result', v_existing.result
      );
    end if;

    if v_existing.status = 'ignored'
      and v_existing.result is not null
      and v_existing.result ->> 'pipelineVersion' = p_pipeline_version
      and v_existing.context_hash = p_context_hash
    then
      return jsonb_build_object(
        'status', 'cached',
        'result', v_existing.result
      );
    end if;

    if v_existing.status = 'failed'
      and v_existing.result is not null
      and v_existing.result ->> 'retryable' = 'false'
      and v_existing.result ->> 'pipelineVersion' = p_pipeline_version
      and v_existing.context_hash = p_context_hash
    then
      return jsonb_build_object(
        'status', 'cached',
        'result', v_existing.result
      );
    end if;

    if v_existing.status = 'processing'
      and v_existing.updated_at >= v_now - interval '10 minutes'
    then
      return jsonb_build_object('status', 'processing');
    end if;

    select count(*)::integer
    into v_event_attempt_count
    from public.notification_capture_ai_attempts
    where event_id = v_existing.id
      and pipeline_version = p_pipeline_version
      and context_hash = p_context_hash;

    if v_existing.status = 'failed'
      and v_existing.result is not null
      and v_existing.result ->> 'retryable' = 'true'
      and v_existing.result ->> 'pipelineVersion' = p_pipeline_version
      and v_existing.context_hash = p_context_hash
      and v_event_attempt_count >= greatest(1, p_max_event_attempts)
    then
      update public.notification_capture_classifications
      set result = v_existing.result || jsonb_build_object(
            'diagnosticCode', 'CLASSIFICATION_RETRY_EXHAUSTED',
            'retryable', false,
            'pipelineVersion', p_pipeline_version
          ),
          processing_token = null,
          updated_at = v_now
      where id = v_existing.id
      returning result into v_terminal_result;

      return jsonb_build_object(
        'status', 'cached',
        'result', v_terminal_result
      );
    end if;
  end if;

  select count(*)::integer
  into v_recent_count
  from public.notification_capture_ai_attempts
  where user_id = p_user_id
    and created_at >= v_now - interval '1 hour';

  if v_recent_count >= greatest(1, p_hourly_limit) then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  if v_has_existing then
    update public.notification_capture_classifications
    set status = 'processing',
        result = null,
        context_hash = p_context_hash,
        processing_token = v_processing_token,
        updated_at = v_now
    where id = v_existing.id
    returning id into v_event_id;
  else
    insert into public.notification_capture_classifications (
      user_id,
      event_key,
      source_package,
      source_app_label,
      status,
      context_hash,
      processing_token,
      created_at,
      updated_at
    ) values (
      p_user_id,
      p_event_key,
      p_source_package,
      nullif(trim(coalesce(p_source_app_label, '')), ''),
      'processing',
      p_context_hash,
      v_processing_token,
      v_now,
      v_now
    )
    returning id into v_event_id;
  end if;

  insert into public.notification_capture_ai_attempts (
    user_id,
    event_id,
    pipeline_version,
    context_hash,
    created_at
  ) values (
    p_user_id,
    v_event_id,
    p_pipeline_version,
    p_context_hash,
    v_now
  );

  return jsonb_build_object(
    'status', 'claimed',
    'eventId', v_event_id,
    'processingToken', v_processing_token,
    'attemptNumber', v_event_attempt_count + 1
  );
end;
$$;

revoke all on function public.claim_notification_capture_classification_v2(uuid, text, text, text, integer, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_notification_capture_classification_v2(uuid, text, text, text, integer, text, text, integer) to service_role;
