-- ====================
-- PLAID INTEGRATION - DATABASE SUPPORT
-- Created: 2026-01-15 (updated for Plaid migration)
-- Purpose: Provide normalized storage for Plaid banking connections, accounts,
--          and provider-mapped transactions synced into public.expenses
-- ====================

-- Helper: ensure updated_at trigger function exists (no-op if already defined)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- BANK INSTITUTIONS (optional metadata cache)
-- ====================
CREATE TABLE IF NOT EXISTS public.bank_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'plaid',
  plaid_institution_id TEXT NOT NULL,
  name TEXT NOT NULL,
  country_code TEXT,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_plaid_institution UNIQUE (provider, plaid_institution_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_institutions_provider ON public.bank_institutions(provider);

DROP TRIGGER IF EXISTS bank_institutions_updated_at ON public.bank_institutions;
CREATE TRIGGER bank_institutions_updated_at
BEFORE UPDATE ON public.bank_institutions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bank_institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank institutions readable"
  ON public.bank_institutions
  FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));

CREATE POLICY "Bank institutions managed by service role"
  ON public.bank_institutions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.bank_institutions IS 'Cached metadata for financial institutions exposed by external providers (e.g., Plaid).';
COMMENT ON COLUMN public.bank_institutions.provider IS 'Provider identifier (e.g., plaid).';
COMMENT ON COLUMN public.bank_institutions.plaid_institution_id IS 'Plaid institution_id cached from Link sessions.';

-- ====================
-- BANK CONNECTIONS
-- ====================
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'plaid',
  plaid_item_id TEXT NOT NULL,
  plaid_access_token_encrypted TEXT NOT NULL,
  plaid_cursor TEXT,
  institution_id UUID REFERENCES public.bank_institutions(id) ON DELETE SET NULL,
  country_code TEXT,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled', 'error')),
  last_synced_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_connections_user_item
  ON public.bank_connections(user_id, plaid_item_id);

CREATE INDEX IF NOT EXISTS idx_bank_connections_provider_status
  ON public.bank_connections(provider, status);

DROP TRIGGER IF EXISTS bank_connections_updated_at ON public.bank_connections;
CREATE TRIGGER bank_connections_updated_at
BEFORE UPDATE ON public.bank_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bank connections"
  ON public.bank_connections
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users insert own bank connections"
  ON public.bank_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users update own bank connections"
  ON public.bank_connections
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users delete own bank connections"
  ON public.bank_connections
  FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

COMMENT ON TABLE public.bank_connections IS 'External banking connections per user (Plaid Items).';
COMMENT ON COLUMN public.bank_connections.provider IS 'External provider identifier (plaid by default).';
COMMENT ON COLUMN public.bank_connections.plaid_item_id IS 'Plaid item_id referenced for API calls.';
COMMENT ON COLUMN public.bank_connections.plaid_access_token_encrypted IS 'Access token encrypted at rest via PLAID_ENCRYPTION_KEY.';
COMMENT ON COLUMN public.bank_connections.status IS 'Lifecycle state (pending, active, disabled, error).';
COMMENT ON COLUMN public.bank_connections.last_synced_at IS 'Last time a manual or automated sync completed successfully.';

-- ====================
-- BANK ACCOUNTS
-- ====================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'plaid',
  plaid_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  official_name TEXT,
  mask TEXT,
  currency TEXT NOT NULL,
  type TEXT,
  subtype TEXT,
  status TEXT DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  raw_provider_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_plaid_account UNIQUE (plaid_account_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON public.bank_accounts(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);

DROP TRIGGER IF EXISTS bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bank accounts"
  ON public.bank_accounts
  FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users insert own bank accounts"
  ON public.bank_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users update own bank accounts"
  ON public.bank_accounts
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users delete own bank accounts"
  ON public.bank_accounts
  FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

COMMENT ON TABLE public.bank_accounts IS 'Individual bank accounts returned per provider connection.';
COMMENT ON COLUMN public.bank_accounts.provider IS 'Provider identifier (plaid by default).';
COMMENT ON COLUMN public.bank_accounts.plaid_account_id IS 'Plaid account_id used to deduplicate accounts.';
COMMENT ON COLUMN public.bank_accounts.raw_provider_payload IS 'Latest provider payload snapshot for reconciliation/debugging.';

-- ====================
-- EXTEND EXPENSES TABLE FOR PROVIDER TRANSACTIONS
-- ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'bank_account_id'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.expenses.bank_account_id IS 'Linked bank account (if transaction imported from provider).';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN provider TEXT;
    COMMENT ON COLUMN public.expenses.provider IS 'External provider identifier for imported transactions (e.g., plaid).';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'provider_transaction_id'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN provider_transaction_id TEXT;
    COMMENT ON COLUMN public.expenses.provider_transaction_id IS 'Provider transaction reference used for idempotent upserts.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'raw_provider_payload'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN raw_provider_payload JSONB;
    COMMENT ON COLUMN public.expenses.raw_provider_payload IS 'Raw provider payload snapshot for reconciliation/debugging.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_bank_account
  ON public.expenses(bank_account_id)
  WHERE bank_account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_provider_transaction
  ON public.expenses(user_id, provider, provider_transaction_id)
  WHERE provider IS NOT NULL AND provider_transaction_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_provider_transaction_unique'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_provider_transaction_unique
      UNIQUE (user_id, provider, provider_transaction_id);
  END IF;
END $$;

COMMENT ON INDEX idx_expenses_provider_transaction IS 'Prevents duplicate imports of provider transactions per user.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'contact_id'
  ) THEN
    BEGIN
      ALTER TABLE public.expenses
        ALTER COLUMN contact_id DROP NOT NULL;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Unable to drop NOT NULL constraint on expenses.contact_id: %', SQLERRM;
    END;
  END IF;
END $$;

-- ====================
-- FUTURE BACKGROUND JOB READY HOOK
-- ====================
CREATE TABLE IF NOT EXISTS public.bank_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sync_scope TEXT DEFAULT 'manual',
  synced_accounts INTEGER DEFAULT 0,
  inserted_transactions INTEGER DEFAULT 0,
  updated_transactions INTEGER DEFAULT 0,
  skipped_transactions INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_bank_sync_audit_connection ON public.bank_sync_audit(bank_connection_id);

ALTER TABLE public.bank_sync_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bank sync audits"
  ON public.bank_sync_audit
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = bank_sync_audit.bank_connection_id
        AND bc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own bank sync audits"
  ON public.bank_sync_audit
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = bank_sync_audit.bank_connection_id
        AND bc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own bank sync audits"
  ON public.bank_sync_audit
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = bank_sync_audit.bank_connection_id
        AND bc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = bank_sync_audit.bank_connection_id
        AND bc.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.bank_sync_audit IS 'Execution log for manual/background sync operations per banking connection.';

-- ====================
-- END OF FILE
-- ====================
