-- ====================
-- BANK PROVIDER NORMALIZATION
-- Created: 2026-01-19
-- Purpose: Introduce provider-neutral columns for bank connections/accounts,
--          add token storage, raw transaction staging, and audit enhancements.
-- ====================

-- BANK CONNECTIONS: provider-neutral columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'provider_item_id'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN provider_item_id TEXT;
    COMMENT ON COLUMN public.bank_connections.provider_item_id IS 'Provider-specific item/connection identifier.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'access_token_encrypted'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN access_token_encrypted TEXT;
    COMMENT ON COLUMN public.bank_connections.access_token_encrypted IS 'Provider access token encrypted at rest.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'refresh_token_encrypted'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN refresh_token_encrypted TEXT;
    COMMENT ON COLUMN public.bank_connections.refresh_token_encrypted IS 'Provider refresh token encrypted at rest (if available).';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'cursor'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN cursor TEXT;
    COMMENT ON COLUMN public.bank_connections.cursor IS 'Provider cursor for incremental sync.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN expires_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.bank_connections.expires_at IS 'Provider access token expiry timestamp.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_connections' AND column_name = 'last_sync_attempt_at'
  ) THEN
    ALTER TABLE public.bank_connections
      ADD COLUMN last_sync_attempt_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.bank_connections.last_sync_attempt_at IS 'Last sync attempt timestamp (successful or failed).';
  END IF;
END $$;

-- Backfill provider-neutral columns from Plaid fields + metadata
UPDATE public.bank_connections
SET provider_item_id = COALESCE(provider_item_id, plaid_item_id)
WHERE provider_item_id IS NULL AND plaid_item_id IS NOT NULL;

UPDATE public.bank_connections
SET access_token_encrypted = COALESCE(access_token_encrypted, plaid_access_token_encrypted)
WHERE access_token_encrypted IS NULL AND plaid_access_token_encrypted IS NOT NULL;

UPDATE public.bank_connections
SET cursor = COALESCE(cursor, plaid_cursor)
WHERE cursor IS NULL AND plaid_cursor IS NOT NULL;

UPDATE public.bank_connections
SET refresh_token_encrypted = COALESCE(refresh_token_encrypted, metadata->>'tink_refresh_token_encrypted')
WHERE refresh_token_encrypted IS NULL AND (metadata ? 'tink_refresh_token_encrypted');

UPDATE public.bank_connections
SET expires_at = COALESCE(expires_at, (metadata->>'expires_at')::timestamptz)
WHERE expires_at IS NULL AND (metadata ? 'expires_at');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_connections_provider_item
  ON public.bank_connections(user_id, provider, provider_item_id)
  WHERE provider_item_id IS NOT NULL;

DROP INDEX IF EXISTS idx_bank_connections_user_item;

CREATE INDEX IF NOT EXISTS idx_bank_connections_provider_status_v2
  ON public.bank_connections(provider, status);

-- BANK ACCOUNTS: provider-neutral columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_accounts' AND column_name = 'provider_account_id'
  ) THEN
    ALTER TABLE public.bank_accounts
      ADD COLUMN provider_account_id TEXT;
    COMMENT ON COLUMN public.bank_accounts.provider_account_id IS 'Provider-specific account identifier.';
  END IF;
END $$;

UPDATE public.bank_accounts
SET provider_account_id = COALESCE(provider_account_id, plaid_account_id)
WHERE provider_account_id IS NULL AND plaid_account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_provider_account
  ON public.bank_accounts(provider, provider_account_id)
  WHERE provider_account_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_accounts_provider_account_unique'
  ) THEN
    ALTER TABLE public.bank_accounts
      ADD CONSTRAINT bank_accounts_provider_account_unique
      UNIQUE (provider, provider_account_id);
  END IF;
END $$;

ALTER TABLE public.bank_accounts
  DROP CONSTRAINT IF EXISTS unique_plaid_account;

-- BANK CONNECTION TOKENS (optional rotation support)
CREATE TABLE IF NOT EXISTS public.bank_connection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),
  token_encrypted TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  key_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_connection_tokens_unique'
  ) THEN
    ALTER TABLE public.bank_connection_tokens
      ADD CONSTRAINT bank_connection_tokens_unique
      UNIQUE (bank_connection_id, token_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bank_connection_tokens_connection
  ON public.bank_connection_tokens(bank_connection_id);

ALTER TABLE public.bank_connection_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank connection tokens managed by service role"
  ON public.bank_connection_tokens
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- BANK TRANSACTION RAW STAGING
CREATE TABLE IF NOT EXISTS public.bank_transaction_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transaction_raw_provider
  ON public.bank_transaction_raw(bank_account_id, provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bank_transaction_raw_unique'
  ) THEN
    ALTER TABLE public.bank_transaction_raw
      ADD CONSTRAINT bank_transaction_raw_unique
      UNIQUE (bank_account_id, provider, provider_transaction_id);
  END IF;
END $$;

ALTER TABLE public.bank_transaction_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank transaction raw managed by service role"
  ON public.bank_transaction_raw
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- BANK SYNC AUDIT ENHANCEMENTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_audit' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE public.bank_sync_audit
      ADD COLUMN error_code TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_audit' AND column_name = 'error_payload'
  ) THEN
    ALTER TABLE public.bank_sync_audit
      ADD COLUMN error_payload JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_sync_audit' AND column_name = 'attempt'
  ) THEN
    ALTER TABLE public.bank_sync_audit
      ADD COLUMN attempt INTEGER DEFAULT 1;
  END IF;
END $$;
