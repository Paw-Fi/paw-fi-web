-- Relax expense reminder frequency to weekly.
-- Keep frequent cron execution for timezone slot matching, but enforce 7-day spacing.

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
          'minHoursBetween', 168
        )
      );
  $$
);
