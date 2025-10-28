-- ====================
-- BUDGET NUDGES BACKSTOP CRON JOB
-- Created: 2025-10-28
-- Purpose: Schedule periodic budget threshold scanning to catch missed events
-- Spec: BUDGET_NUDGE_IMPLEMENTATION.md (lines 598-608, 771)
-- ====================

-- ====================
-- SCHEDULE BUDGET NUDGES BACKSTOP JOB
-- ====================

-- Schedule budget nudges backstop to run every 15 minutes
-- Catches missed threshold events from:
-- - Imports or batch operations
-- - Quiet hours deferrals
-- - Transient delivery failures
-- - Real-time producer downtime

SELECT cron.schedule(
  'budget-nudges-backstop',              -- Job name
  '*/15 * * * *',                        -- Cron expression: every 15 minutes
  $$
    -- Call the Edge Function to scan budgets
    -- This uses the service role key to bypass RLS
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/budget-nudges-backstop',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);

-- ====================
-- COMMENTS FOR DOCUMENTATION
-- ====================

COMMENT ON FUNCTION cron.schedule IS 'Schedules recurring jobs using pg_cron extension';

-- ====================
-- VERIFICATION
-- ====================

-- Verify the job is scheduled
DO $$
DECLARE
  v_job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_job_count
  FROM cron.job
  WHERE jobname = 'budget-nudges-backstop';

  IF v_job_count > 0 THEN
    RAISE NOTICE '✅ Budget Nudges Backstop cron job scheduled successfully';
    RAISE NOTICE '   Schedule: Every 15 minutes (*/15 * * * *)';
    RAISE NOTICE '   Function: /functions/v1/budget-nudges-backstop';
    RAISE NOTICE '';
    RAISE NOTICE 'Job will:';
    RAISE NOTICE '  1. Scan active budgets with recent expense activity';
    RAISE NOTICE '  2. Calculate current period spending';
    RAISE NOTICE '  3. Emit missed threshold notifications';
    RAISE NOTICE '  4. Log execution to cron_job_logs';
    RAISE NOTICE '';
    RAISE NOTICE 'To monitor job execution:';
    RAISE NOTICE '  SELECT * FROM cron_job_logs WHERE job_name = ''budget-nudges-backstop'' ORDER BY executed_at DESC LIMIT 10;';
  ELSE
    RAISE WARNING '⚠️  Budget Nudges Backstop cron job NOT scheduled (check logs)';
  END IF;
END;
$$;

-- ====================
-- MANUAL EXECUTION (FOR TESTING)
-- ====================

-- To manually trigger the backstop job for testing:
-- SELECT net.http_post(
--   url := current_setting('app.settings.supabase_url') || '/functions/v1/budget-nudges-backstop',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--     'Content-Type', 'application/json'
--   ),
--   body := '{}'::jsonb
-- );

-- ====================
-- UNSCHEDULE (IF NEEDED)
-- ====================

-- To remove the job:
-- SELECT cron.unschedule('budget-nudges-backstop');
