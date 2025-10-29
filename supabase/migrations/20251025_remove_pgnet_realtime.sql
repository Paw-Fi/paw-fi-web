-- Remove pg_net-based realtime trigger and related cron job as we rely on Database Webhooks now

DO $$
BEGIN
  -- Drop trigger if exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'notification_events' AND t.tgname = 'notification_event_realtime_push'
  ) THEN
    DROP TRIGGER notification_event_realtime_push ON public.notification_events;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop helper function if present
DO $$
BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'send_notification_event' AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    DROP FUNCTION public.send_notification_event();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Unschedule legacy cron job, if present
DO $$
BEGIN
  PERFORM cron.unschedule('process-notification-events');
EXCEPTION WHEN OTHERS THEN NULL; -- cron extension may not be present
END $$;
