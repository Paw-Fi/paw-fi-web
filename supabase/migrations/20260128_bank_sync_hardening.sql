-- ====================
-- BANK SYNC HARDENING - Production Readiness
-- Created: 2026-01-28
-- Purpose: Add webhook idempotency, stuck job recovery, country routing,
--          needs_reauth status, and auto-space creation support
-- ====================

-- 1. Add webhook_event_id to bank_sync_jobs for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'webhook_event_id'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN webhook_event_id TEXT;
    COMMENT ON COLUMN public.bank_sync_jobs.webhook_event_id IS 'Unique webhook event identifier for idempotency deduplication.';
  END IF;
END $$;

-- Create unique index for webhook idempotency (partial - only for webhook-triggered jobs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_sync_jobs_webhook_idempotency
  ON public.bank_sync_jobs(webhook_event_id)
  WHERE webhook_event_id IS NOT NULL;

-- 2. Add processing_started_at for stuck job recovery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_jobs' AND column_name = 'processing_started_at'
  ) THEN
    ALTER TABLE public.bank_sync_jobs
      ADD COLUMN processing_started_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.bank_sync_jobs.processing_started_at IS 'Timestamp when job started processing, used for TTL-based stuck job recovery.';
  END IF;
END $$;

-- 3. Add country_code to bank_connections for routing persistence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN country_code TEXT;
    COMMENT ON COLUMN public.bank_connections.country_code IS 'ISO 3166-1 alpha-2 country code for provider routing.';
  END IF;
END $$;

-- 4. Add household_id to bank_connections for auto-space linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'household_id'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.bank_connections.household_id IS 'Linked private space (portfolio) for this bank connection.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bank_connections_household
  ON public.bank_connections(household_id)
  WHERE household_id IS NOT NULL;

-- 5. Extend status enum to include needs_reauth
-- First check current constraint and update if needed
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bank_connections' AND constraint_name = 'bank_connections_status_check'
  ) THEN
    ALTER TABLE public.bank_connections DROP CONSTRAINT bank_connections_status_check;
  END IF;
  
  -- Add new constraint with needs_reauth and disconnected statuses
  ALTER TABLE public.bank_connections
    ADD CONSTRAINT bank_connections_status_check 
    CHECK (status IN ('pending', 'active', 'disabled', 'error', 'needs_reauth', 'disconnected'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Status constraint update skipped: %', SQLERRM;
END $$;

-- 6. Function to release stuck/expired sync jobs
CREATE OR REPLACE FUNCTION public.release_stuck_sync_jobs(
  p_ttl_minutes INT DEFAULT 5
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE public.bank_sync_jobs
  SET 
    status = 'pending',
    processing_started_at = NULL,
    updated_at = NOW()
  WHERE status = 'processing'
    AND processing_started_at IS NOT NULL
    AND processing_started_at < NOW() - (p_ttl_minutes || ' minutes')::INTERVAL;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  IF affected_count > 0 THEN
    RAISE NOTICE 'Released % stuck sync jobs', affected_count;
  END IF;
  
  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION public.release_stuck_sync_jobs IS 'Releases sync jobs stuck in processing state beyond TTL.';

-- 7. Function to check webhook idempotency
CREATE OR REPLACE FUNCTION public.check_webhook_idempotency(
  p_webhook_event_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Returns TRUE if this webhook was already processed
  RETURN EXISTS (
    SELECT 1 FROM public.bank_sync_jobs
    WHERE webhook_event_id = p_webhook_event_id
  );
END;
$$;

COMMENT ON FUNCTION public.check_webhook_idempotency IS 'Checks if a webhook event was already processed to prevent duplicates.';

-- 8. Add idempotency_key to bank_connections for link flow idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN idempotency_key TEXT;
    COMMENT ON COLUMN public.bank_connections.idempotency_key IS 'Client-generated idempotency key to prevent duplicate connections on retry.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_connections_idempotency
  ON public.bank_connections(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 9. Add token_refresh_lock to bank_connection_tokens for Tink mutex
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connection_tokens' AND column_name = 'refresh_locked_at'
  ) THEN
    ALTER TABLE public.bank_connection_tokens
      ADD COLUMN refresh_locked_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.bank_connection_tokens.refresh_locked_at IS 'Timestamp when token refresh lock was acquired, for mutex protection.';
  END IF;
END $$;

-- 10. Function to acquire token refresh lock (mutex)
CREATE OR REPLACE FUNCTION public.acquire_token_refresh_lock(
  p_bank_connection_id UUID,
  p_lock_seconds INT DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  lock_acquired BOOLEAN := FALSE;
  v_rowcount INT;
BEGIN
  -- Try to acquire lock (only if not already locked or lock expired)
  UPDATE public.bank_connection_tokens
  SET refresh_locked_at = NOW()
  WHERE bank_connection_id = p_bank_connection_id
    AND token_type = 'refresh'
    AND (
      refresh_locked_at IS NULL
      OR refresh_locked_at < NOW() - (p_lock_seconds || ' seconds')::INTERVAL
    );
  
  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  lock_acquired := v_rowcount > 0;
  
  RETURN lock_acquired;
END;
$$;

COMMENT ON FUNCTION public.acquire_token_refresh_lock IS 'Acquires mutex lock for token refresh to prevent concurrent refresh attempts.';

-- 11. Function to release token refresh lock
CREATE OR REPLACE FUNCTION public.release_token_refresh_lock(
  p_bank_connection_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.bank_connection_tokens
  SET refresh_locked_at = NULL
  WHERE bank_connection_id = p_bank_connection_id
    AND token_type = 'refresh';
END;
$$;

COMMENT ON FUNCTION public.release_token_refresh_lock IS 'Releases mutex lock for token refresh.';

-- 12. Add error tracking columns for better diagnostics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_audit' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE public.bank_sync_audit
      ADD COLUMN error_code TEXT;
    COMMENT ON COLUMN public.bank_sync_audit.error_code IS 'Provider error code if sync failed.';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_audit' AND column_name = 'error_payload'
  ) THEN
    ALTER TABLE public.bank_sync_audit
      ADD COLUMN error_payload JSONB;
    COMMENT ON COLUMN public.bank_sync_audit.error_payload IS 'Full error details from provider for debugging.';
  END IF;
END $$;

-- 13. Index for finding connections needing reauth
CREATE INDEX IF NOT EXISTS idx_bank_connections_needs_reauth
  ON public.bank_connections(user_id, status)
  WHERE status = 'needs_reauth';

-- 14. Table for Tink OAuth state validation (CSRF protection)
CREATE TABLE IF NOT EXISTS public.tink_auth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_user_id TEXT,
  market TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tink_auth_states IS 'Stores Tink OAuth state tokens for CSRF protection during bank linking flow.';
COMMENT ON COLUMN public.tink_auth_states.state IS 'Unique state token generated for each link session.';
COMMENT ON COLUMN public.tink_auth_states.user_id IS 'User who initiated the link flow.';
COMMENT ON COLUMN public.tink_auth_states.external_user_id IS 'Tink external user ID for this session (format: {user_id}-{market}).';
COMMENT ON COLUMN public.tink_auth_states.market IS 'ISO 3166-1 alpha-2 market code for this link session.';
COMMENT ON COLUMN public.tink_auth_states.expires_at IS 'Expiration time for this state (typically 10 minutes).';

-- Index for efficient cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_tink_auth_states_expires
  ON public.tink_auth_states(expires_at);

-- Index for user lookup during validation
CREATE INDEX IF NOT EXISTS idx_tink_auth_states_user
  ON public.tink_auth_states(user_id, expires_at);

-- Index for external_user_id lookup (for finding existing Tink users)
CREATE INDEX IF NOT EXISTS idx_tink_auth_states_external_user
  ON public.tink_auth_states(external_user_id)
  WHERE external_user_id IS NOT NULL;

-- RLS policies for tink_auth_states (service role only)
ALTER TABLE public.tink_auth_states ENABLE ROW LEVEL SECURITY;

-- No user-facing policies - only service role can access this table

-- 15. Function to clean up expired auth states (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_tink_auth_states()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.tink_auth_states
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_tink_auth_states IS 'Removes expired Tink auth states. Run periodically to prevent table bloat.';

-- 16. Function to atomically claim pending sync jobs (prevents race conditions)
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
    ORDER BY created_at ASC
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

COMMENT ON FUNCTION public.claim_pending_sync_jobs IS 'Atomically claims pending sync jobs using FOR UPDATE SKIP LOCKED to prevent race conditions.';

-- 17. Function to atomically upsert bank connection with household (prevents race conditions)
-- This function handles the "get-or-create connection + household" pattern atomically
-- to prevent duplicate households when concurrent exchange requests occur.
--
-- Uses pg_advisory_xact_lock to serialize concurrent first-link attempts for the same
-- (user_id, provider, provider_item_id) tuple. This prevents the race where two concurrent
-- calls both see "no existing connection" and both create households.
CREATE OR REPLACE FUNCTION public.upsert_bank_connection_with_household(
  p_user_id UUID,
  p_provider TEXT,
  p_provider_item_id TEXT,
  p_access_token_encrypted TEXT,
  p_refresh_token_encrypted TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_institution_name TEXT DEFAULT 'Bank Account',
  p_institution_logo TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  connection_id UUID,
  household_id UUID,
  is_new_connection BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_connection_id UUID;
  v_household_id UUID;
  v_is_new BOOLEAN := FALSE;
  v_existing_household_id UUID;
  v_lock_key BIGINT;
  v_user_currency TEXT;
BEGIN
  -- Generate a deterministic lock key from the unique constraint columns
  -- Using hashtext to convert the composite key to a bigint for pg_advisory_xact_lock
  v_lock_key := hashtext(p_user_id::text || '|' || p_provider || '|' || p_provider_item_id);
  
  -- Acquire transaction-scoped advisory lock to serialize concurrent first-link attempts
  -- This lock is automatically released when the transaction commits/rollbacks
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Now safely check for existing connection (we hold the lock, so no race)
  SELECT bc.id, bc.household_id INTO v_connection_id, v_existing_household_id
  FROM public.bank_connections bc
  WHERE bc.user_id = p_user_id
    AND bc.provider = p_provider
    AND bc.provider_item_id = p_provider_item_id
  FOR UPDATE;

  IF v_connection_id IS NOT NULL THEN
    -- Connection exists - this is a reconnect
    v_household_id := v_existing_household_id;
    
    -- Update the connection with new tokens
    -- MERGE metadata: existing keys preserved, new keys added/overwritten
    UPDATE public.bank_connections
    SET
      access_token_encrypted = p_access_token_encrypted,
      plaid_access_token_encrypted = p_access_token_encrypted,
      refresh_token_encrypted = COALESCE(p_refresh_token_encrypted, refresh_token_encrypted),
      expires_at = COALESCE(p_expires_at, expires_at),
      status = 'active',
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
    WHERE id = v_connection_id;
    
  ELSE
    -- New connection - create household first, then connection
    v_is_new := TRUE;
    
    -- Get user's preferred currency (from user_contacts or default to USD)
    SELECT COALESCE(
      (
        SELECT UPPER(uc.preferred_currency)
        FROM public.user_contacts uc
        WHERE uc.user_id = p_user_id
        ORDER BY uc.updated_at DESC NULLS LAST, uc.created_at DESC NULLS LAST
        LIMIT 1
      ),
      'USD'
    ) INTO v_user_currency;
    
    -- Create the household with correct column names:
    -- - owner_id (not created_by)
    -- - cover_image_url (not image_url)
    -- - currency is required
    INSERT INTO public.households (name, owner_id, is_portfolio, cover_image_url, currency)
    VALUES (p_institution_name, p_user_id, TRUE, p_institution_logo, v_user_currency)
    RETURNING id INTO v_household_id;
    
    -- Add user as owner
    INSERT INTO public.household_members (household_id, user_id, role, joined_at)
    SELECT v_household_id, p_user_id, 'owner', NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = v_household_id
        AND hm.user_id = p_user_id
    );
    
    -- Create the connection
    -- The advisory lock ensures this INSERT won't race with another transaction
    INSERT INTO public.bank_connections (
      user_id,
      provider,
      provider_item_id,
      plaid_item_id,
      access_token_encrypted,
      plaid_access_token_encrypted,
      refresh_token_encrypted,
      expires_at,
      status,
      country_code,
      idempotency_key,
      household_id,
      metadata
    ) VALUES (
      p_user_id,
      p_provider,
      p_provider_item_id,
      p_provider_item_id,
      p_access_token_encrypted,
      p_access_token_encrypted,
      p_refresh_token_encrypted,
      p_expires_at,
      'active',
      p_country_code,
      p_idempotency_key,
      v_household_id,
      p_metadata
    )
    RETURNING id INTO v_connection_id;
  END IF;
  
  RETURN QUERY SELECT v_connection_id, v_household_id, v_is_new;

EXCEPTION
  WHEN unique_violation THEN
    -- Unique violation can occur from:
    -- 1. (user_id, provider, provider_item_id) - primary connection key (unlikely with advisory lock)
    -- 2. (user_id, idempotency_key) - concurrent retries with same idempotency key
    --
    -- In either case, clean up any orphan household we created, then look up the
    -- winning connection and return it (making the API idempotent for the client).
    IF v_household_id IS NOT NULL AND v_is_new THEN
      DELETE FROM public.household_members hm WHERE hm.household_id = v_household_id;
      DELETE FROM public.households WHERE id = v_household_id;
    END IF;
    
    -- Look up the winning connection (the one that was inserted by the other transaction)
    SELECT bc.id, bc.household_id INTO v_connection_id, v_household_id
    FROM public.bank_connections bc
    WHERE bc.user_id = p_user_id
      AND bc.provider = p_provider
      AND bc.provider_item_id = p_provider_item_id;
    
    IF v_connection_id IS NOT NULL THEN
      -- Return the winning connection as if we created it (idempotent behavior)
      RETURN QUERY SELECT v_connection_id, v_household_id, FALSE;
    ELSE
      -- Shouldn't happen, but re-raise if we can't find the winning connection
      RAISE;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.upsert_bank_connection_with_household IS 'Atomically creates or updates a bank connection with its associated household. Uses advisory locks to prevent race conditions that could create orphan households on concurrent first-link attempts.';

-- ====================
-- END OF MIGRATION
-- ====================
