-- ====================
-- BANK SYNC RESILIENCE
-- Created: 2026-01-20
-- Purpose: Add sync locks, webhook events, and soft-delete support for provider transactions.
-- ====================

-- EXPENSES: soft-delete columns for provider removals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'deleted_reason'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN deleted_reason TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_provider_active
  ON public.expenses(provider, deleted_at);

-- BANK SYNC LOCKS
CREATE TABLE IF NOT EXISTS public.bank_sync_locks (
  bank_connection_id UUID PRIMARY KEY REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  locked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_sync_locks_until
  ON public.bank_sync_locks(locked_until);

ALTER TABLE public.bank_sync_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank sync locks managed by service role"
  ON public.bank_sync_locks
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.acquire_bank_sync_lock(
  p_bank_connection_id UUID,
  p_lock_seconds INTEGER DEFAULT 900,
  p_locked_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_until TIMESTAMPTZ := NOW() + (p_lock_seconds || ' seconds')::interval;
  v_rowcount INTEGER;
BEGIN
  INSERT INTO public.bank_sync_locks (bank_connection_id, locked_until, locked_by)
  VALUES (p_bank_connection_id, v_locked_until, p_locked_by)
  ON CONFLICT (bank_connection_id)
  DO UPDATE SET
    locked_until = EXCLUDED.locked_until,
    locked_by = EXCLUDED.locked_by
  WHERE public.bank_sync_locks.locked_until <= NOW();

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_bank_sync_lock(
  p_bank_connection_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rowcount INTEGER;
BEGIN
  DELETE FROM public.bank_sync_locks
  WHERE bank_connection_id = p_bank_connection_id;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount > 0;
END;
$$;

-- BANK WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS public.bank_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT,
  event_code TEXT,
  provider_item_id TEXT,
  bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_webhook_events_provider_item
  ON public.bank_webhook_events(provider, provider_item_id);

CREATE INDEX IF NOT EXISTS idx_bank_webhook_events_connection
  ON public.bank_webhook_events(bank_connection_id);

ALTER TABLE public.bank_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank webhook events managed by service role"
  ON public.bank_webhook_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- BANK SYNC JOB QUEUE
CREATE TABLE IF NOT EXISTS public.bank_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bank_sync_jobs_connection
  ON public.bank_sync_jobs(bank_connection_id, status);

ALTER TABLE public.bank_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank sync jobs managed by service role"
  ON public.bank_sync_jobs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
