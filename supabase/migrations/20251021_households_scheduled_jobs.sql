-- ====================
-- SCHEDULED JOBS FOR HOUSEHOLDS FEATURE
-- Created: 2025-10-21
-- Purpose: Automated maintenance tasks (invite expiry, cleanup)
-- ====================

-- Enable pg_cron extension (requires superuser, may need manual setup)
-- Note: In Supabase Cloud, pg_cron is pre-enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Required for net.http_post used below
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ====================
-- CRON JOB LOGS TABLE (for monitoring)
-- ====================
-- IMPORTANT: Create this table FIRST before scheduling any jobs that use it

CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id BIGSERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  rows_affected INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying job execution history
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_executed_at ON public.cron_job_logs(executed_at);

-- ====================
-- INVITE EXPIRY JOB
-- ====================

-- Schedule invite expiry to run every hour
-- This prevents accumulation of expired invites and maintains data hygiene
SELECT cron.schedule(
  'expire-old-invites',                 -- Job name
  '0 * * * *',                          -- Cron expression: every hour at minute 0
  $$
    -- Call the invite expiry function
    SELECT expire_old_invites();

    -- Log the execution for monitoring
    INSERT INTO public.cron_job_logs (job_name, executed_at, rows_affected)
    SELECT
      'expire-old-invites',
      NOW(),
      (
        SELECT COUNT(*)
        FROM public.invites
        WHERE status = 'expired'
          AND expires_at IS NOT NULL
          AND updated_at >= NOW() - INTERVAL '1 hour'
      );
  $$
);

-- ====================
-- NOTIFICATION PROCESSING JOB
-- ====================

-- Schedule notification processing to run every 5 minutes
-- Processes unsent notification_events and sends push notifications
SELECT cron.schedule(
  'process-notification-events',        -- Job name
  '*/5 * * * *',                        -- Cron expression: every 5 minutes
  $$
    -- Call the Edge Function to process notifications
    -- This uses the service role key to bypass RLS
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/households-process-notifications',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);

-- ====================
-- NOTIFICATION EVENT CLEANUP JOB
-- ====================

-- Schedule cleanup of old notification events (keep last 90 days)
-- This prevents the notification_events table from growing indefinitely
SELECT cron.schedule(
  'cleanup-old-notification-events',    -- Job name
  '0 2 * * 0',                          -- Cron expression: every Sunday at 2 AM
  $$
    -- Delete notification events older than 90 days
    WITH deleted AS (
      DELETE FROM public.notification_events
      WHERE created_at < NOW() - INTERVAL '90 days'
      RETURNING id
    )
    INSERT INTO public.cron_job_logs (job_name, executed_at, rows_affected)
    SELECT
      'cleanup-old-notification-events',
      NOW(),
      COUNT(*)
    FROM deleted;
  $$
);

-- ====================
-- DEVICE CLEANUP JOB
-- ====================

-- Schedule cleanup of inactive devices (not seen in 180 days)
-- Helps maintain FCM token hygiene and reduces invalid push attempts
SELECT cron.schedule(
  'cleanup-inactive-devices',           -- Job name
  '0 3 * * 0',                          -- Cron expression: every Sunday at 3 AM
  $$
    -- Delete devices that haven't been seen in 180 days
    WITH deleted AS (
      DELETE FROM public.devices
      WHERE last_seen_at < NOW() - INTERVAL '180 days'
      RETURNING id
    )
    INSERT INTO public.cron_job_logs (job_name, executed_at, rows_affected)
    SELECT
      'cleanup-inactive-devices',
      NOW(),
      COUNT(*)
    FROM deleted;
  $$
);

-- ====================
-- COMMENTS FOR DOCUMENTATION
-- ====================

COMMENT ON TABLE public.cron_job_logs IS 'Audit log for scheduled cron jobs execution and monitoring';

COMMENT ON COLUMN public.cron_job_logs.job_name IS 'Name of the cron job that was executed';
COMMENT ON COLUMN public.cron_job_logs.executed_at IS 'Timestamp when the job was executed';
COMMENT ON COLUMN public.cron_job_logs.rows_affected IS 'Number of rows affected by the job';
COMMENT ON COLUMN public.cron_job_logs.error_message IS 'Error message if job failed (NULL if successful)';
