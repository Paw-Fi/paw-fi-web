REVOKE ALL ON FUNCTION public.apply_plaid_sync_batch_v1(
  UUID,
  UUID,
  INTEGER,
  TEXT,
  JSONB,
  JSONB,
  TEXT[],
  UUID[],
  UUID[],
  UUID,
  UUID
) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.apply_plaid_sync_batch_v1(
  UUID,
  UUID,
  INTEGER,
  TEXT,
  JSONB,
  JSONB,
  TEXT[],
  UUID[],
  UUID[],
  UUID,
  UUID
) IS 'Internal implementation owned by apply_plaid_sync_batch_v2; direct worker execution is revoked.';

NOTIFY pgrst, 'reload schema';
