-- ====================
-- IMMEDIATE EXPENSE NOTIFICATIONS HARDENING
-- Created: 2025-10-25
-- Purpose: Ensure pg_net + realtime trigger exist for instant push delivery
-- ====================

-- Enable pg_net (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function: send webhook to Edge Function on notification_event insert
CREATE OR REPLACE FUNCTION public.send_notification_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_webhook_url TEXT;
BEGIN
  -- Read DB-level settings (configure once per environment)
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url');
    v_service_role_key := current_setting('app.settings.service_role_key');
  EXCEPTION WHEN undefined_object THEN
    RAISE WARNING 'Supabase settings not configured for real-time notifications';
    RETURN NEW;
  END;

  v_webhook_url := v_supabase_url || '/functions/v1/households-send-push-notification';

  -- Fire async HTTP request via pg_net; swallow errors to avoid breaking TX
  BEGIN
    PERFORM net.http_post(
      url := v_webhook_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'notification_event_id', NEW.id,
        'household_id', NEW.household_id,
        'user_id', NEW.user_id,
        'event_type', NEW.event_type,
        'payload', NEW.payload
      )
    ) AS request_id;
  EXCEPTION
    WHEN undefined_function THEN
      RAISE WARNING 'pg_net not available; webhook fallback will handle delivery';
    WHEN OTHERS THEN
      RAISE WARNING 'Error sending notification webhook: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.send_notification_event IS
  'Sends HTTP webhook to Edge Function for instant push delivery on notification_events insert';

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS notification_event_realtime_push ON public.notification_events;
CREATE TRIGGER notification_event_realtime_push
  AFTER INSERT ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_event();

COMMENT ON TRIGGER notification_event_realtime_push ON public.notification_events IS
  'Instant webhook to households-send-push-notification on new notification event';
