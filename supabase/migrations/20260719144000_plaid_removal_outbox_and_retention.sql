CREATE OR REPLACE FUNCTION public.queue_plaid_connection_removal_v1(
  p_connection_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_connection public.bank_connections%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_connection
  FROM public.bank_connections
  WHERE id = p_connection_id
    AND provider = 'plaid'
    AND removed_at IS NULL
    AND status IS DISTINCT FROM 'disabled'
    AND COALESCE(item_status, '') <> 'removed'
  FOR UPDATE;

  IF v_connection.id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.bank_connections
  SET item_status = 'pending_removal',
      item_health_state = 'removal_pending',
      scheduled_removal_at = v_now,
      error_code = 'PLAID_REMOVE_RETRY_PENDING',
      error_message = 'Plaid item removal is queued for retry.',
      updated_at = v_now
  WHERE id = v_connection.id;

  IF v_connection.user_id IS NOT NULL AND (
    v_connection.access_token_encrypted IS NOT NULL
    OR v_connection.plaid_access_token_encrypted IS NOT NULL
  ) THEN
    INSERT INTO public.plaid_offboarding_jobs (
      user_id,
      connection_id,
      access_token_encrypted,
      plaid_access_token_encrypted,
      reason
    ) VALUES (
      v_connection.user_id,
      v_connection.id,
      v_connection.access_token_encrypted,
      v_connection.plaid_access_token_encrypted,
      COALESCE(NULLIF(TRIM(p_reason), ''), 'user_disconnect')
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_plaid_connection_removal_v1(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_plaid_connection_removal_v1(UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.set_plaid_offboarding_token_expiry_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.access_token_encrypted IS NOT NULL
    OR NEW.plaid_access_token_encrypted IS NOT NULL THEN
    NEW.token_expires_at := LEAST(
      COALESCE(NEW.token_expires_at, NEW.created_at + INTERVAL '30 days'),
      NEW.created_at + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_plaid_offboarding_token_expiry_v1()
  FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
