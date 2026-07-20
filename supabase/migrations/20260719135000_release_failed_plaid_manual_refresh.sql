CREATE OR REPLACE FUNCTION public.release_plaid_manual_refresh_v1(
  p_connection_id UUID,
  p_requested_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.bank_connections
  SET last_manual_refresh_at = NULL,
      next_manual_refresh_eligible_at = NULL,
      updated_at = NOW()
  WHERE id = p_connection_id
    AND provider = 'plaid'
    AND removed_at IS NULL
    AND last_manual_refresh_at = p_requested_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.release_plaid_manual_refresh_v1(UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_plaid_manual_refresh_v1(UUID, TIMESTAMPTZ)
  TO service_role;
