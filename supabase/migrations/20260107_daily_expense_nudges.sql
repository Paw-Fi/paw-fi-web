CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_event_type'
      AND e.enumlabel = 'log_expense_reminder'
  ) THEN
    ALTER TYPE public.notification_event_type ADD VALUE 'log_expense_reminder';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_events_user_type_created
  ON public.notification_events(user_id, event_type, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-expense-nudges') THEN
    DELETE FROM cron.job WHERE jobname = 'daily-expense-nudges';
  END IF;
END $$;

SELECT cron.schedule(
  'daily-expense-nudges',
  '*/15 * * * *',
  $$
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/expense-daily-nudges',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'slotMins', 15,
          'quietStart', 22,
          'quietEnd', 8,
          'allowedHours', jsonb_build_array(9,10,11,12,13,14,15,16,17,18,19,20),
          'minHoursBetween', 24
        )
      );
  $$
);
