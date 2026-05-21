-- ====================
-- BANK SYNC CRON AUTH ALIGNMENT
-- Created: 2026-04-15
-- Purpose:
--   1) Align pg_cron headers with current bank-sync-processor authentication.
--   2) Keep backward compatibility with legacy header naming.
--   3) Add Authorization/apikey headers so calls also work when verify_jwt is enabled.
-- ====================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension not installed; skipping bank-sync-processor reschedule';
  ELSE
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bank-sync-processor') THEN
      PERFORM cron.unschedule('bank-sync-processor');
    END IF;

    PERFORM cron.schedule(
      'bank-sync-processor',
      '*/5 * * * *',
      $job$
        SELECT
          CASE
            WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
                 OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NULL
            THEN NULL
            ELSE net.http_post(
              url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/bank-sync-processor',
              headers := jsonb_build_object(
                'X-Moneko-Internal-Key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
                'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
                'Content-Type', 'application/json'
              ) || CASE
                WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) IS NULL
                THEN '{}'::jsonb
                ELSE jsonb_build_object(
                  'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
                  'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
                )
              END,
              body := '{}'::jsonb
            )
          END;
      $job$
    );
  END IF;
END $$;
