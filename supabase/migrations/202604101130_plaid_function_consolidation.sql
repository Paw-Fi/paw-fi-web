DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'plaid-stale-reconciler') THEN
    PERFORM cron.unschedule('plaid-stale-reconciler');
  END IF;
END $$;

SELECT cron.schedule(
  'plaid-stale-reconciler',
  '0 * * * *',
  $$
    SELECT
      CASE
        WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
             OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NULL
        THEN NULL
        ELSE net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-maintenance',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{"action":"reconcile_stale"}'::jsonb
        )
      END;
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'plaid-lifecycle-enforcer') THEN
    PERFORM cron.unschedule('plaid-lifecycle-enforcer');
  END IF;
END $$;

SELECT cron.schedule(
  'plaid-lifecycle-enforcer',
  '15 2 * * *',
  $$
    SELECT
      CASE
        WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
             OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NULL
        THEN NULL
        ELSE net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-maintenance',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{"action":"enforce_lifecycle"}'::jsonb
        )
      END;
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'plaid-lifecycle-enforcer-month-end') THEN
    PERFORM cron.unschedule('plaid-lifecycle-enforcer-month-end');
  END IF;
END $$;

SELECT cron.schedule(
  'plaid-lifecycle-enforcer-month-end',
  '0 */6 28-31 * *',
  $$
    SELECT
      CASE
        WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
             OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NULL
        THEN NULL
        ELSE net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-maintenance',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{"action":"enforce_lifecycle"}'::jsonb
        )
      END;
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-cost-guard') THEN
    PERFORM cron.unschedule('trial-cost-guard');
  END IF;
END $$;

SELECT cron.schedule(
  'trial-cost-guard',
  '30 3 * * *',
  $$
    SELECT
      CASE
        WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
             OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NULL
        THEN NULL
        ELSE net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-maintenance',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{"action":"enforce_lifecycle"}'::jsonb
        )
      END;
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'plaid-retention-cleaner') THEN
    PERFORM cron.unschedule('plaid-retention-cleaner');
  END IF;
END $$;

SELECT cron.schedule(
  'plaid-retention-cleaner',
  '0 4 * * 0',
  $$
    SELECT
      CASE
        WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
             OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1) IS NULL
        THEN NULL
        ELSE net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-maintenance',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{"action":"cleanup_retention"}'::jsonb
        )
      END;
  $$
);
