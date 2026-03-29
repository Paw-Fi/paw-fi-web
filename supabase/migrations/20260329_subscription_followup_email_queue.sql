CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.subscription_followup_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('subscription_welcome', 'subscription_cancellation_followup')
  ),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  plan_label TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  send_after TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'retrying', 'sent', 'failed')
  ),
  dedupe_key TEXT NOT NULL UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_followup_queue_due
  ON public.subscription_followup_email_queue(status, send_after);

CREATE INDEX IF NOT EXISTS idx_subscription_followup_queue_user
  ON public.subscription_followup_email_queue(user_id, created_at DESC);

COMMENT ON TABLE public.subscription_followup_email_queue IS
  'Queue for delayed founder follow-up emails triggered by subscriptions lifecycle changes.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process-subscription-followup-email-queue'
  ) THEN
    PERFORM cron.unschedule('process-subscription-followup-email-queue');
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

SELECT cron.schedule(
  'process-subscription-followup-email-queue',
  '*/5 * * * *',
  $$
    SELECT
      CASE
        WHEN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL
          OR (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'secret_key' LIMIT 1) IS NULL
        THEN NULL
        ELSE net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1)
            || '/functions/v1/process-subscription-followup-emails',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'secret_key' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        )
      END;
  $$
);
