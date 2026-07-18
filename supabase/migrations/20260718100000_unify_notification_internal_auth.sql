-- Unify notification service-to-service authentication on Supabase secret API
-- keys. Configure a dedicated `notification_internal_secret_key` Vault secret
-- with an active sb_secret_* value before deploying this migration.

do $$
declare
  v_supabase_url text;
  v_notification_secret_key text;
begin
  select decrypted_secret
  into v_supabase_url
  from vault.decrypted_secrets
  where name = 'supabase_url'
  limit 1;

  select decrypted_secret
  into v_notification_secret_key
  from vault.decrypted_secrets
  where name = 'notification_internal_secret_key'
  limit 1;

  if nullif(trim(v_supabase_url), '') is null then
    raise exception 'Configure the supabase_url Vault secret before applying this migration';
  end if;

  if v_notification_secret_key is null
    or v_notification_secret_key not like 'sb_secret_%' then
    raise exception 'Configure notification_internal_secret_key in Vault with an active sb_secret_ API key before applying this migration';
  end if;
end;
$$;

create or replace function public.dispatch_notification_event_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_supabase_url text;
  v_notification_secret_key text;
begin
  select decrypted_secret
  into v_supabase_url
  from vault.decrypted_secrets
  where name = 'supabase_url'
  limit 1;

  select decrypted_secret
  into v_notification_secret_key
  from vault.decrypted_secrets
  where name = 'notification_internal_secret_key'
  limit 1;

  if nullif(trim(v_supabase_url), '') is null then
    raise warning 'notification webhook skipped: supabase_url Vault secret is missing';
    return new;
  end if;

  if v_notification_secret_key is null
    or v_notification_secret_key not like 'sb_secret_%' then
    raise warning 'notification webhook skipped: notification_internal_secret_key Vault secret is missing or invalid';
    return new;
  end if;

  perform net.http_post(
    url := rtrim(v_supabase_url, '/') || '/functions/v1/households-send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_notification_secret_key
    ),
    body := jsonb_build_object('notification_event_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  raise warning 'notification webhook enqueue failed for event %: %', new.id, sqlerrm;
  return new;
end;
$$;

revoke execute on function public.dispatch_notification_event_v1()
  from public, anon, authenticated;

drop trigger if exists "notification-events-push"
  on public.notification_events;
drop trigger if exists notification_event_realtime_push
  on public.notification_events;

create trigger notification_event_realtime_push
after insert on public.notification_events
for each row
execute function public.dispatch_notification_event_v1();

comment on function public.dispatch_notification_event_v1() is
  'Queues the canonical notification event webhook with a Vault-backed Supabase secret API key.';
comment on trigger notification_event_realtime_push
  on public.notification_events is
  'Queues immediate delivery for every new notification event through the canonical push consumer.';

do $$
begin
  perform cron.unschedule('process-notification-events');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'process-notification-events',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := rtrim((
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'supabase_url'
        limit 1
      ), '/') || '/functions/v1/households-process-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'notification_internal_secret_key'
          limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    ) as request_id;
  $job$
);

do $$
begin
  perform cron.unschedule('daily-expense-nudges');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'daily-expense-nudges',
  '*/15 * * * *',
  $job$
    select net.http_post(
      url := rtrim((
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'supabase_url'
        limit 1
      ), '/') || '/functions/v1/expense-daily-nudges',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'notification_internal_secret_key'
          limit 1
        )
      ),
      body := jsonb_build_object(
        'slotMins', 15,
        'quietStart', 22,
        'quietEnd', 8,
        'allowedHours', jsonb_build_array(9,10,11,12,13,14,15,16,17,18,19,20),
        'minHoursBetween', 168
      ),
      timeout_milliseconds := 5000
    ) as request_id;
  $job$
);
