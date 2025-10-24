-- ====================
-- REAL-TIME NOTIFICATIONS SYSTEM
-- Created: 2025-10-24
-- Purpose: Instant push notifications via database triggers instead of cron jobs
-- ====================

-- ====================
-- 1. CREATE TRIGGER FUNCTION FOR NOTIFICATION EVENTS
-- ====================

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
  -- Get Supabase configuration (must be set via database settings)
  -- You can set these with: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url');
    v_service_role_key := current_setting('app.settings.service_role_key');
  EXCEPTION
    WHEN undefined_object THEN
      -- Settings not configured, log warning and continue
      RAISE WARNING 'Supabase settings not configured for real-time notifications';
      RETURN NEW;
  END;

  -- Build webhook URL
  v_webhook_url := v_supabase_url || '/functions/v1/households-send-push-notification';

  -- Send HTTP POST request to Edge Function (async, non-blocking)
  -- This will fail silently if pg_net is not available
  BEGIN
    PERFORM
      net.http_post(
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
      -- pg_net extension not available, fall back to cron job processing
      RAISE WARNING 'pg_net extension not available, falling back to cron job processing';
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Error sending notification webhook: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.send_notification_event IS
  'Trigger function that sends instant push notification via webhook when notification_event is created';

-- ====================
-- 2. CREATE TRIGGER ON NOTIFICATION_EVENTS
-- ====================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS notification_event_realtime_push ON public.notification_events;

-- Create trigger that fires AFTER INSERT on notification_events
-- This will instantly call the Edge Function to send push notification
CREATE TRIGGER notification_event_realtime_push
  AFTER INSERT ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_event();

COMMENT ON TRIGGER notification_event_realtime_push ON public.notification_events IS
  'Sends instant push notification via webhook when new notification event is created';

-- ====================
-- 3. ENABLE pg_net EXTENSION FOR HTTP REQUESTS
-- ====================

-- Try to enable pg_net extension (required for http_post)
-- In Supabase Cloud, this should be available by default
-- In self-hosted, you may need to install it manually
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ====================
-- 4. UPDATE CRON JOB AS FALLBACK
-- ====================

-- The cron job will now serve as a FALLBACK for:
-- 1. Failed webhook deliveries (is_sent = false AND created_at < NOW() - INTERVAL '10 minutes')
-- 2. Notifications created when webhook was unavailable
-- 3. Retry mechanism for transient failures

-- Update the cron job description
COMMENT ON TABLE public.cron_job_logs IS
  'Audit log for scheduled cron jobs execution - cron serves as fallback for failed webhook deliveries';

-- ====================
-- 5. ADD RETRY TRACKING TO NOTIFICATION_EVENTS
-- ====================

-- Add columns to track retry attempts and delivery status
DO $$
BEGIN
  -- Add retry_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_events' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE public.notification_events
    ADD COLUMN retry_count INTEGER DEFAULT 0;
  END IF;

  -- Add last_retry_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_events' AND column_name = 'last_retry_at'
  ) THEN
    ALTER TABLE public.notification_events
    ADD COLUMN last_retry_at TIMESTAMPTZ;
  END IF;

  -- Add delivery_error column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_events' AND column_name = 'delivery_error'
  ) THEN
    ALTER TABLE public.notification_events
    ADD COLUMN delivery_error TEXT;
  END IF;
END $$;

-- Create index for retry queries
CREATE INDEX IF NOT EXISTS idx_notification_events_retry
  ON public.notification_events(created_at, retry_count)
  WHERE is_sent = false;

COMMENT ON COLUMN public.notification_events.retry_count IS 'Number of delivery retry attempts';
COMMENT ON COLUMN public.notification_events.last_retry_at IS 'Timestamp of last delivery retry';
COMMENT ON COLUMN public.notification_events.delivery_error IS 'Error message from last delivery attempt';

-- ====================
-- 6. CONFIGURATION INSTRUCTIONS
-- ====================

/*
TO CONFIGURE REAL-TIME NOTIFICATIONS:

1. Set Supabase URL and service role key in database settings:

   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';

2. Ensure pg_net extension is enabled (should be automatic in Supabase Cloud)

3. Deploy the households-send-push-notification Edge Function

4. Test by creating a notification event:

   INSERT INTO notification_events (household_id, user_id, event_type, payload)
   VALUES ('some-uuid', 'user-uuid', 'expense_added', '{"test": true}');

5. Check logs in Edge Function dashboard to verify webhook is being called

FLOW:
1. User A adds expense → save-expense function creates notification_events
2. Database trigger fires → calls send_notification_event()
3. send_notification_event() → HTTP POST to households-send-push-notification
4. Edge Function → sends FCM push notification instantly
5. If webhook fails → cron job retries every 5 minutes as fallback
*/
