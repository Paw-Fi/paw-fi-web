-- Add DB-backed idempotency for log_expense_reminder nudges.

DO $$
BEGIN
  -- Column used for uniqueness (one per user/event_type/local day)
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

-- Backfill from payload.local_date for existing reminder rows
UPDATE public.notification_events
SET local_date = (payload->>'local_date')::date
WHERE event_type = 'log_expense_reminder'
  AND local_date IS NULL
  AND (payload ? 'local_date')
  AND (payload->>'local_date') ~ '^\d{4}-\d{2}-\d{2}$';

-- Clean up duplicates before adding unique index: keep the earliest row
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, event_type, local_date
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.notification_events
  WHERE event_type = 'log_expense_reminder'
    AND local_date IS NOT NULL
)
DELETE FROM public.notification_events ne
USING ranked r
WHERE ne.id = r.id
  AND r.rn > 1;

-- Enforce at-most-once per local day
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notification_events_log_expense_per_local_day
  ON public.notification_events (user_id, event_type, local_date)
  WHERE event_type = 'log_expense_reminder' AND local_date IS NOT NULL;

-- Optional: helper functions for edge-function advisory locking
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
