-- ====================
-- PLAID PRODUCTION HARDENING
-- Created: 2026-04-10
-- Purpose: Add lifecycle state, billing-aware retention, manual refresh locks,
--          provider-vs-user projection fields, and stronger sync job orchestration.
-- ====================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ====================
-- BANK CONNECTIONS
-- ====================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'item_created_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN item_created_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'first_billing_month_start'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN first_billing_month_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'second_billing_month_start'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN second_billing_month_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'third_billing_month_start'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN third_billing_month_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'item_status'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN item_status TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'item_health_state'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN item_health_state TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'relink_state'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN relink_state TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'last_webhook_received_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN last_webhook_received_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'last_successful_sync_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN last_successful_sync_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'last_manual_refresh_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN last_manual_refresh_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'next_manual_refresh_eligible_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN next_manual_refresh_eligible_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'warning_sent_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN warning_sent_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'scheduled_removal_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN scheduled_removal_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'removed_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN removed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'duplicate_group_key'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN duplicate_group_key TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'cursor_generation'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN cursor_generation INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'last_financial_feature_used_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN last_financial_feature_used_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'billing_keep_reason'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN billing_keep_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'needs_resync'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN needs_resync BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

UPDATE public.bank_connections
SET
  item_created_at = COALESCE(item_created_at, created_at, NOW()),
  first_billing_month_start = COALESCE(
    first_billing_month_start,
    date_trunc('month', COALESCE(item_created_at, created_at, NOW()) AT TIME ZONE 'UTC')
  ),
  second_billing_month_start = COALESCE(
    second_billing_month_start,
    date_trunc('month', COALESCE(item_created_at, created_at, NOW()) AT TIME ZONE 'UTC') + INTERVAL '1 month'
  ),
  third_billing_month_start = COALESCE(
    third_billing_month_start,
    date_trunc('month', COALESCE(item_created_at, created_at, NOW()) AT TIME ZONE 'UTC') + INTERVAL '2 months'
  ),
  scheduled_removal_at = COALESCE(
    scheduled_removal_at,
    (date_trunc('month', COALESCE(item_created_at, created_at, NOW()) AT TIME ZONE 'UTC') + INTERVAL '2 months') - INTERVAL '48 hours'
  ),
  item_status = COALESCE(
    item_status,
    CASE
      WHEN status = 'needs_reauth' THEN 'pending_relink'
      WHEN status = 'disabled' THEN 'removed'
      WHEN status = 'disconnected' THEN 'removed'
      WHEN status = 'error' THEN 'degraded_unhealthy'
      ELSE 'active'
    END
  ),
  item_health_state = COALESCE(
    item_health_state,
    CASE
      WHEN status IN ('error', 'needs_reauth') THEN 'unhealthy'
      WHEN status IN ('disabled', 'disconnected') THEN 'removed'
      ELSE 'healthy'
    END
  ),
  relink_state = COALESCE(
    relink_state,
    CASE
      WHEN status = 'needs_reauth' THEN 'required'
      ELSE NULL
    END
  ),
  last_successful_sync_at = COALESCE(last_successful_sync_at, last_synced_at)
WHERE provider = 'plaid';

CREATE INDEX IF NOT EXISTS idx_bank_connections_plaid_lifecycle
  ON public.bank_connections(provider, item_status, item_health_state, removed_at);

CREATE INDEX IF NOT EXISTS idx_bank_connections_plaid_retention
  ON public.bank_connections(provider, scheduled_removal_at, third_billing_month_start)
  WHERE provider = 'plaid' AND removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_connections_plaid_refresh
  ON public.bank_connections(provider, next_manual_refresh_eligible_at, last_successful_sync_at)
  WHERE provider = 'plaid' AND removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_connections_plaid_resync
  ON public.bank_connections(provider, needs_resync, last_webhook_received_at, last_successful_sync_at)
  WHERE provider = 'plaid' AND removed_at IS NULL;

-- ====================
-- BANK SYNC JOBS
-- ====================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN job_type TEXT NOT NULL DEFAULT 'transactions_sync';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'dedupe_key'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN dedupe_key TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'attempt_count'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'next_attempt_at'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN next_attempt_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'last_error_code'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN last_error_code TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'last_error_at'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN last_error_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'superseded_by_job_id'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN superseded_by_job_id UUID REFERENCES public.bank_sync_jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.bank_sync_jobs
SET job_type = COALESCE(job_type, 'transactions_sync');

CREATE INDEX IF NOT EXISTS idx_bank_sync_jobs_ready
  ON public.bank_sync_jobs(status, next_attempt_at, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_sync_jobs_active_connection_type
  ON public.bank_sync_jobs(bank_connection_id, job_type)
  WHERE status IN ('pending', 'processing');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_sync_jobs_active_dedupe
  ON public.bank_sync_jobs(dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('pending', 'processing');

-- ====================
-- EXPENSES PROJECTION FIELDS
-- ====================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'provider_fields'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN provider_fields JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'user_overrides'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN user_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'provider_deleted_at'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN provider_deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'sync_version'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'provider_pending_transaction_id'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN provider_pending_transaction_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'provider_posted_from_pending_transaction_id'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN provider_posted_from_pending_transaction_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'provider_sync_cursor_generation'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN provider_sync_cursor_generation INTEGER;
  END IF;
END $$;

UPDATE public.expenses
SET
  provider_deleted_at = COALESCE(provider_deleted_at, deleted_at),
  sync_version = COALESCE(sync_version, 0),
  user_overrides = COALESCE(user_overrides, '{}'::jsonb)
WHERE provider = 'plaid';

CREATE INDEX IF NOT EXISTS idx_expenses_plaid_provider_transaction
  ON public.expenses(provider, provider_transaction_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_expenses_plaid_pending_lineage
  ON public.expenses(provider, provider_pending_transaction_id, provider_posted_from_pending_transaction_id)
  WHERE provider = 'plaid';

-- ====================
-- RPCS
-- ====================

CREATE OR REPLACE FUNCTION public.claim_pending_sync_jobs(
  p_batch_size INT DEFAULT 10,
  p_processor_id TEXT DEFAULT NULL
)
RETURNS SETOF public.bank_sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM public.bank_sync_jobs
    WHERE status = 'pending'
      AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
    ORDER BY COALESCE(next_attempt_at, created_at) ASC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.bank_sync_jobs j
  SET
    status = 'processing',
    processing_started_at = NOW(),
    updated_at = NOW(),
    payload = CASE
      WHEN p_processor_id IS NOT NULL THEN
        COALESCE(j.payload, '{}'::jsonb) || jsonb_build_object('processor_id', p_processor_id)
      ELSE j.payload
    END
  FROM claimed c
  WHERE j.id = c.id
  RETURNING j.*;
END;
$$;

COMMENT ON FUNCTION public.claim_pending_sync_jobs IS 'Atomically claims pending sync jobs that are ready to run, respecting retry backoff.';

CREATE OR REPLACE FUNCTION public.claim_plaid_manual_refresh(
  p_connection_id UUID,
  p_requested_at TIMESTAMPTZ,
  p_next_eligible_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rowcount INT;
BEGIN
  UPDATE public.bank_connections
  SET
    last_manual_refresh_at = p_requested_at,
    next_manual_refresh_eligible_at = p_next_eligible_at,
    updated_at = NOW()
  WHERE id = p_connection_id
    AND provider = 'plaid'
    AND removed_at IS NULL
    AND status = 'active'
    AND (
      next_manual_refresh_eligible_at IS NULL
      OR next_manual_refresh_eligible_at <= p_requested_at
    );

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount > 0;
END;
$$;

COMMENT ON FUNCTION public.claim_plaid_manual_refresh IS 'Atomically claims a paid-user Plaid manual refresh slot so duplicate taps cannot trigger multiple refresh calls.';

GRANT EXECUTE ON FUNCTION public.claim_plaid_manual_refresh(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ====================
-- CRON SCHEDULES
-- ====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bank-sync-processor') THEN
    PERFORM cron.unschedule('bank-sync-processor');
  END IF;
END $$;

SELECT cron.schedule(
  'bank-sync-processor',
  '*/2 * * * *',
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
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-stale-reconciler',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
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
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-lifecycle-enforcer',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
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
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-lifecycle-enforcer',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{"monthEndSweep":true}'::jsonb
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
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-lifecycle-enforcer',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{"trialSweep":true}'::jsonb
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
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/plaid-retention-cleaner',
          headers := jsonb_build_object(
            'X-Internal-Service-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        )
      END;
  $$
);
