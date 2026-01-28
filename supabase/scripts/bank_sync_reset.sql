-- ============================================================================
-- BANK SYNC RESET (DESTRUCTIVE)
--
-- Purpose:
--   A manual, destructive reset for bank sync schema objects so you can do a
--   clean re-deploy/re-apply of the bank-sync migrations.
--
-- WARNING:
--   This will DELETE bank sync data and DROP bank-sync tables/functions.
--   Do NOT run in production unless you intend to wipe bank-sync state.
--
-- What this resets:
--   - bank_* tables introduced for bank sync (connections, accounts, jobs, etc.)
--   - Tink auth state table
--   - Bank sync helper functions (locks/idempotency/cron verification)
--   - pg_cron schedules for bank sync (if pg_cron is installed)
--
-- What this does NOT reset:
--   - public.expenses (and any columns added by migrations)
--   - shared helper functions that may be used elsewhere (e.g. update_updated_at_column)
--   - auth/users/households core tables
--
-- Related migrations (apply after running this script):
--   - 20260115_salt_edge_integration.sql
--   - 20260119_bank_provider_normalization.sql
--   - 20260120_bank_sync_resilience.sql
--   - 20260128_bank_sync_hardening.sql
--   - 20260129_bank_sync_cron_scheduler.sql
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Unschedule pg_cron jobs (if installed)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('bank-sync-processor');
    EXCEPTION
      WHEN others THEN
        -- ignore (job may not exist)
        NULL;
    END;

    BEGIN
      PERFORM cron.unschedule('cleanup-tink-auth-states');
    EXCEPTION
      WHEN others THEN
        -- ignore (job may not exist)
        NULL;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Drop bank sync helper functions
-- ---------------------------------------------------------------------------
-- NOTE: We drop specific signatures to avoid ambiguity.

DROP FUNCTION IF EXISTS public.verify_bank_sync_cron_config();

DROP FUNCTION IF EXISTS public.upsert_bank_connection_with_household(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB
);

DROP FUNCTION IF EXISTS public.claim_pending_sync_jobs(INT);
DROP FUNCTION IF EXISTS public.cleanup_expired_tink_auth_states();
DROP FUNCTION IF EXISTS public.release_token_refresh_lock(UUID);
DROP FUNCTION IF EXISTS public.acquire_token_refresh_lock(UUID, INT);
DROP FUNCTION IF EXISTS public.check_webhook_idempotency(TEXT);
DROP FUNCTION IF EXISTS public.release_stuck_sync_jobs(INT);

DROP FUNCTION IF EXISTS public.release_bank_sync_lock(UUID);
DROP FUNCTION IF EXISTS public.acquire_bank_sync_lock(UUID, INT, TEXT);

-- ---------------------------------------------------------------------------
-- 3) Drop bank sync tables (CASCADE removes policies/indexes/triggers)
-- ---------------------------------------------------------------------------
-- Drop in dependency order: children -> parents.

DROP TABLE IF EXISTS public.bank_sync_jobs CASCADE;
DROP TABLE IF EXISTS public.bank_webhook_events CASCADE;
DROP TABLE IF EXISTS public.bank_sync_locks CASCADE;

DROP TABLE IF EXISTS public.tink_auth_states CASCADE;

DROP TABLE IF EXISTS public.bank_transaction_raw CASCADE;
DROP TABLE IF EXISTS public.bank_connection_tokens CASCADE;

DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.bank_sync_audit CASCADE;
DROP TABLE IF EXISTS public.bank_connections CASCADE;
DROP TABLE IF EXISTS public.bank_institutions CASCADE;

COMMIT;
