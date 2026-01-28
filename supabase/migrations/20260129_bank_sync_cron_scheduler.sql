-- ====================
-- BANK SYNC CRON SCHEDULER
-- Created: 2026-01-29
-- Purpose: Schedule automatic processing of bank sync jobs and cleanup of expired auth states
-- Depends on: 20260128_bank_sync_hardening.sql (tink_auth_states, claim_pending_sync_jobs)
-- ====================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ====================
-- 1. BANK SYNC PROCESSOR SCHEDULE
-- ====================

-- Remove existing job if it exists (for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bank-sync-processor') THEN
    PERFORM cron.unschedule('bank-sync-processor');
  END IF;
END $$;

-- Schedule bank sync processor every 5 minutes
-- This picks up jobs queued by webhooks and processes them
-- Note: Uses COALESCE with current_setting(..., true) to gracefully handle missing settings
-- If settings are not configured, the job will log an error but won't crash the cron system
SELECT cron.schedule(
  'bank-sync-processor',
  '*/5 * * * *',
  $$
    SELECT
      CASE 
        WHEN current_setting('app.settings.supabase_url', true) IS NULL 
             OR current_setting('app.settings.internal_service_secret', true) IS NULL
        THEN NULL  -- Skip if settings not configured (logs warning but doesn't error)
        ELSE net.http_post(
          url := current_setting('app.settings.supabase_url', true) || '/functions/v1/bank-sync-processor',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', current_setting('app.settings.internal_service_secret', true),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        )
      END;
  $$
);

-- ====================
-- 2. TINK AUTH STATE CLEANUP SCHEDULE
-- ====================

-- Remove existing cleanup job if it exists (for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-tink-auth-states') THEN
    PERFORM cron.unschedule('cleanup-tink-auth-states');
  END IF;
END $$;

-- Schedule cleanup of expired Tink auth states daily at 3 AM UTC
-- This prevents table bloat from abandoned link flows
SELECT cron.schedule(
  'cleanup-tink-auth-states',
  '0 3 * * *',
  $$
    SELECT public.cleanup_expired_tink_auth_states();
  $$
);

-- ====================
-- 3. VERIFY APP SETTINGS ARE CONFIGURED
-- ====================

-- Note: The following app settings must be configured in the database:
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
--   ALTER DATABASE postgres SET app.settings.internal_service_secret = 'your-internal-secret';
--
-- The internal_service_secret must match the INTERNAL_SERVICE_SECRET environment variable
-- configured in the Edge Functions.
--
-- To verify settings are configured, run:
--   SELECT current_setting('app.settings.supabase_url', true);
--   SELECT current_setting('app.settings.internal_service_secret', true);

-- Helper function to verify cron job configuration
CREATE OR REPLACE FUNCTION public.verify_bank_sync_cron_config()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, cron
AS $$
BEGIN
  -- Check supabase_url setting
  RETURN QUERY
  SELECT 
    'supabase_url'::TEXT,
    CASE 
      WHEN current_setting('app.settings.supabase_url', true) IS NOT NULL 
           AND current_setting('app.settings.supabase_url', true) != ''
      THEN 'OK'::TEXT
      ELSE 'MISSING'::TEXT
    END,
    COALESCE(current_setting('app.settings.supabase_url', true), 'Not configured')::TEXT;
  
  -- Check internal_service_secret setting
  RETURN QUERY
  SELECT 
    'internal_service_secret'::TEXT,
    CASE 
      WHEN current_setting('app.settings.internal_service_secret', true) IS NOT NULL 
           AND current_setting('app.settings.internal_service_secret', true) != ''
      THEN 'OK'::TEXT
      ELSE 'MISSING'::TEXT
    END,
    CASE 
      WHEN current_setting('app.settings.internal_service_secret', true) IS NOT NULL 
           AND current_setting('app.settings.internal_service_secret', true) != ''
      THEN '***configured***'::TEXT
      ELSE 'Not configured'::TEXT
    END;
  
  -- Check bank-sync-processor cron job
  RETURN QUERY
  SELECT 
    'bank-sync-processor job'::TEXT,
    CASE 
      WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bank-sync-processor')
      THEN 'SCHEDULED'::TEXT
      ELSE 'MISSING'::TEXT
    END,
    COALESCE(
      (SELECT schedule FROM cron.job WHERE jobname = 'bank-sync-processor'),
      'Not scheduled'
    )::TEXT;
  
  -- Check cleanup-tink-auth-states cron job
  RETURN QUERY
  SELECT 
    'cleanup-tink-auth-states job'::TEXT,
    CASE 
      WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-tink-auth-states')
      THEN 'SCHEDULED'::TEXT
      ELSE 'MISSING'::TEXT
    END,
    COALESCE(
      (SELECT schedule FROM cron.job WHERE jobname = 'cleanup-tink-auth-states'),
      'Not scheduled'
    )::TEXT;
END;
$$;

COMMENT ON FUNCTION public.verify_bank_sync_cron_config IS 'Verifies that bank sync cron jobs and required settings are properly configured.';

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.verify_bank_sync_cron_config TO service_role;

-- ====================
-- MIGRATION COMPLETE
-- ====================

DO $$
BEGIN
  RAISE NOTICE 'Bank Sync Cron Scheduler migration completed successfully';
  RAISE NOTICE 'Cron job scheduled: bank-sync-processor (every 5 minutes)';
  RAISE NOTICE 'Cron job scheduled: cleanup-tink-auth-states (daily at 3 AM UTC)';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Ensure app.settings are configured:';
  RAISE NOTICE '  ALTER DATABASE postgres SET app.settings.supabase_url = ''https://your-project.supabase.co'';';
  RAISE NOTICE '  ALTER DATABASE postgres SET app.settings.internal_service_secret = ''your-internal-secret'';';
  RAISE NOTICE '';
  RAISE NOTICE 'Run SELECT * FROM public.verify_bank_sync_cron_config(); to verify configuration.';
END $$;
