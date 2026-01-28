-- ====================
-- TINK CREDENTIALS CACHE
-- Created: 2026-01-28
-- Purpose: Persist credentialsId returned by Tink Link even when token exchange fails,
--          so subsequent attempts can use UPDATE mode and avoid duplicate credentials.
-- ====================

CREATE TABLE IF NOT EXISTS public.tink_credentials_cache (
  credentials_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  market TEXT NOT NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tink_credentials_cache_user_market
  ON public.tink_credentials_cache(user_id, market, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tink_credentials_cache_external_user
  ON public.tink_credentials_cache(external_user_id);

DROP TRIGGER IF EXISTS tink_credentials_cache_updated_at ON public.tink_credentials_cache;
CREATE TRIGGER tink_credentials_cache_updated_at
BEFORE UPDATE ON public.tink_credentials_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tink_credentials_cache ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Tink credentials cache managed by service role"
  ON public.tink_credentials_cache
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.tink_credentials_cache IS 'Caches credentialsId values returned by Tink Link to enable UPDATE flows and prevent duplicate credentials.';
