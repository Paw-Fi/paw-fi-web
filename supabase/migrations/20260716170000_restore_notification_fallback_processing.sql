alter table public.notification_events
  add column if not exists processing_started_at timestamptz;

-- Existing unsent rows intentionally remain NULL so enabling the fallback does
-- not replay a historical backlog. New events become eligible automatically.
alter table public.notification_events
  add column if not exists fallback_eligible_at timestamptz;
alter table public.notification_events
  alter column fallback_eligible_at set default now();

create index if not exists idx_notification_events_fallback_ready
  on public.notification_events (created_at)
  where is_sent = false;

create or replace function public.claim_notification_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.notification_events
  set processing_started_at = now()
  where id = p_event_id
    and is_sent = false
    and (
      processing_started_at is null
      or processing_started_at < now() - interval '15 minutes'
    );

  return found;
end;
$$;

revoke execute on function public.claim_notification_event(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_notification_event(uuid) to service_role;

create or replace function public.register_notification_device(
  p_user_id uuid,
  p_platform public.device_platform,
  p_push_token text,
  p_device_model text default null,
  p_os_version text default null,
  p_app_version text default null,
  p_locale text default 'en',
  p_timezone text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_device_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_push_token, 0));

  update public.devices
  set
    is_active = false,
    updated_at = now()
  where push_token = p_push_token
    and user_id <> p_user_id
    and is_active is distinct from false;

  insert into public.devices (
    user_id,
    platform,
    push_token,
    device_model,
    os_version,
    app_version,
    locale,
    timezone,
    is_active,
    last_seen_at,
    updated_at
  ) values (
    p_user_id,
    p_platform,
    p_push_token,
    p_device_model,
    p_os_version,
    p_app_version,
    coalesce(p_locale, 'en'),
    p_timezone,
    true,
    now(),
    now()
  )
  on conflict on constraint unique_user_push_token do update
  set
    platform = excluded.platform,
    device_model = excluded.device_model,
    os_version = excluded.os_version,
    app_version = excluded.app_version,
    locale = excluded.locale,
    timezone = excluded.timezone,
    is_active = true,
    last_seen_at = now(),
    updated_at = now()
  returning id into v_device_id;

  return v_device_id;
end;
$$;

revoke execute on function public.register_notification_device(
  uuid,
  public.device_platform,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.register_notification_device(
  uuid,
  public.device_platform,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

create or replace function public.create_member_reminder_event(
  p_household_id uuid,
  p_sender_id uuid,
  p_target_user_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recent_created_at timestamptz;
  v_event_id uuid;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_household_id::text || ':' || p_sender_id::text || ':' || p_target_user_id::text,
      0
    )
  );

  select created_at
  into v_recent_created_at
  from public.notification_events
  where household_id = p_household_id
    and user_id = p_target_user_id
    and event_type = 'member_reminded'
    and payload @> jsonb_build_object('sender_id', p_sender_id::text)
    and created_at >= now() - interval '24 hours'
  order by created_at desc
  limit 1;

  if v_recent_created_at is not null then
    return jsonb_build_object(
      'created', false,
      'cooldown_ends_at', v_recent_created_at + interval '24 hours'
    );
  end if;

  insert into public.notification_events (
    household_id,
    user_id,
    event_type,
    payload
  ) values (
    p_household_id,
    p_target_user_id,
    'member_reminded',
    p_payload
  )
  returning id into v_event_id;

  return jsonb_build_object('created', true, 'event_id', v_event_id);
end;
$$;

revoke execute on function public.create_member_reminder_event(
  uuid,
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
grant execute on function public.create_member_reminder_event(
  uuid,
  uuid,
  uuid,
  jsonb
) to service_role;

do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'process-notification-events'
  ) then
    perform cron.unschedule('process-notification-events');
  end if;
end;
$$;

select cron.schedule(
  'process-notification-events',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'supabase_url'
        limit 1
      ) || '/functions/v1/households-process-notifications',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'service_role_key'
          limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Deploy the updated Edge Functions before enabling this job. This avoids an
-- older worker processing rows during the schema/function rollout window.
update cron.job
set active = false
where jobname = 'process-notification-events';
