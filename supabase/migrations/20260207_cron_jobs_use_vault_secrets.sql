-- ====================
-- MIGRATE CRON JOBS TO USE VAULT SECRETS
-- Created: 2026-02-07
-- Purpose: Replace current_setting('app.settings.*') with vault.decrypted_secrets
--          in all pg_cron jobs. Supabase Cloud does not allow ALTER DATABASE SET,
--          so vault secrets are the supported mechanism for storing credentials
--          accessible from pg_cron SQL.
--
-- Prerequisites (run once per environment):
--   SELECT vault.create_secret('<SUPABASE_URL>', 'supabase_url', 'Supabase project URL for pg_cron jobs');
--   SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key', 'Service role key for pg_cron jobs');
--   SELECT vault.create_secret('<INTERNAL_SERVICE_SECRET>', 'internal_service_secret', 'Internal service secret for bank sync');
-- ====================

-- 1. Re-schedule daily-expense-nudges
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-expense-nudges') THEN
    PERFORM cron.unschedule('daily-expense-nudges');
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

-- 2. Re-schedule process-invite-reminders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-invite-reminders') THEN
    PERFORM cron.unschedule('process-invite-reminders');
  END IF;
END $$;

SELECT cron.schedule(
  'process-invite-reminders',
  '0 */6 * * *',
  $$
    SELECT
      net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/households-process-invite-reminders',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'source', 'cron',
          'max_batch_size', 100
        )
      );
  $$
);

-- 3. Re-schedule bank-sync-processor
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bank-sync-processor') THEN
    PERFORM cron.unschedule('bank-sync-processor');
  END IF;
END $$;

SELECT cron.schedule(
  'bank-sync-processor',
  '*/5 * * * *',
  $$
    SELECT
      CASE
        WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
             OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NULL
        THEN NULL
        ELSE net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/bank-sync-processor',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        )
      END;
  $$
);

-- 4. Update verify_bank_sync_cron_config to use vault
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
  RETURN QUERY
  SELECT
    'supabase_url'::TEXT,
    CASE
      WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NOT NULL
      THEN 'OK'::TEXT
      ELSE 'MISSING'::TEXT
    END,
    COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1), 'Not configured')::TEXT;

  RETURN QUERY
  SELECT
    'internal_service_secret'::TEXT,
    CASE
      WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NOT NULL
      THEN 'OK'::TEXT
      ELSE 'MISSING'::TEXT
    END,
    CASE
      WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NOT NULL
      THEN '***configured***'::TEXT
      ELSE 'Not configured'::TEXT
    END;

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
