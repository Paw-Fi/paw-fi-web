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

-- DB-backed idempotency key for daily nudges (one per user/event_type/local day)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_events'
      AND column_name = 'local_date'
  ) THEN
    ALTER TABLE public.notification_events
      ADD COLUMN local_date DATE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notification_events_log_expense_per_local_day
  ON public.notification_events (user_id, event_type, local_date)
  WHERE event_type = 'log_expense_reminder' AND local_date IS NOT NULL;

-- Backfill local_date from payload for existing rows (safe regex guard)
UPDATE public.notification_events
SET local_date = (payload->>'local_date')::date
WHERE event_type = 'log_expense_reminder'
  AND local_date IS NULL
  AND (payload ? 'local_date')
  AND (payload->>'local_date') ~ '^\d{4}-\d{2}-\d{2}$';

-- Helper functions for edge-function advisory locking
CREATE OR REPLACE FUNCTION public.try_advisory_lock(p_key BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT pg_try_advisory_lock(p_key);
$$;

CREATE OR REPLACE FUNCTION public.advisory_unlock(p_key BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT pg_advisory_unlock(p_key);
$$;

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
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/expense-daily-nudges',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
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
