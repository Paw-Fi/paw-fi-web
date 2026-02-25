-- Shared edge-function error alerting with 5-minute digest emails

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.edge_error_aggregates (
  id BIGSERIAL PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  function_name TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  count BIGINT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sample_message TEXT,
  sample_stack TEXT,
  sample_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.edge_error_aggregates ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_edge_error_aggregate_window_fn_fingerprint
  ON public.edge_error_aggregates (window_start, function_name, fingerprint);

CREATE INDEX IF NOT EXISTS idx_edge_error_aggregates_window
  ON public.edge_error_aggregates (window_start DESC);

CREATE INDEX IF NOT EXISTS idx_edge_error_aggregates_function
  ON public.edge_error_aggregates (function_name, window_start DESC);

CREATE TABLE IF NOT EXISTS public.edge_error_digest_windows (
  window_start TIMESTAMPTZ PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.edge_error_digest_windows ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_edge_error_aggregate(
  p_window_start TIMESTAMPTZ,
  p_function_name TEXT,
  p_fingerprint TEXT,
  p_message TEXT,
  p_stack TEXT,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.edge_error_aggregates (
    window_start,
    function_name,
    fingerprint,
    count,
    first_seen_at,
    last_seen_at,
    sample_message,
    sample_stack,
    sample_context
  )
  VALUES (
    p_window_start,
    p_function_name,
    p_fingerprint,
    1,
    NOW(),
    NOW(),
    p_message,
    p_stack,
    p_context
  )
  ON CONFLICT (window_start, function_name, fingerprint)
  DO UPDATE SET
    count = public.edge_error_aggregates.count + 1,
    last_seen_at = NOW(),
    sample_message = COALESCE(public.edge_error_aggregates.sample_message, EXCLUDED.sample_message),
    sample_stack = COALESCE(public.edge_error_aggregates.sample_stack, EXCLUDED.sample_stack),
    sample_context = CASE
      WHEN public.edge_error_aggregates.sample_context IS NULL
        OR public.edge_error_aggregates.sample_context = '{}'::jsonb
      THEN EXCLUDED.sample_context
      ELSE public.edge_error_aggregates.sample_context
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_edge_error_digest_window(
  p_window_start TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_row_count INTEGER := 0;
BEGIN
  INSERT INTO public.edge_error_digest_windows (
    window_start,
    status,
    attempts,
    updated_at,
    created_at
  )
  VALUES (
    p_window_start,
    'sending',
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (window_start)
  DO UPDATE SET
    status = 'sending',
    attempts = public.edge_error_digest_windows.attempts + 1,
    updated_at = NOW()
  WHERE public.edge_error_digest_windows.status <> 'sent'
    AND (
      public.edge_error_digest_windows.status <> 'sending'
      OR public.edge_error_digest_windows.updated_at < NOW() - INTERVAL '10 minutes'
    );

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

REVOKE ALL ON TABLE public.edge_error_aggregates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.edge_error_digest_windows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.edge_error_aggregates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.edge_error_digest_windows TO service_role;

REVOKE ALL ON FUNCTION public.record_edge_error_aggregate(TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_edge_error_digest_window(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_edge_error_aggregate(TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_edge_error_digest_window(TIMESTAMPTZ) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'edge-error-digest') THEN
    PERFORM cron.unschedule('edge-error-digest');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regnamespace('vault') IS NULL THEN
    RAISE NOTICE 'vault schema not found; skip scheduling edge-error-digest cron job';
    RETURN;
  END IF;

  IF (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) IS NULL THEN
    RAISE NOTICE 'vault secret supabase_url missing; skip scheduling edge-error-digest cron job';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'edge-error-digest',
    '*/5 * * * *',
    $cron$
      SELECT
        net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/edge-error-digest',
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
    $cron$
  );
END $$;
