CREATE OR REPLACE FUNCTION public.complete_plaid_update_mode_v1(
  p_user_id UUID,
  p_connection_id UUID,
  p_link_session_id UUID,
  p_mode TEXT,
  p_household_id UUID,
  p_account_upserts JSONB,
  p_disabled_provider_account_ids TEXT[],
  p_metadata JSONB,
  p_item_status TEXT,
  p_link_request_id TEXT,
  p_plaid_link_session_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF JSONB_TYPEOF(COALESCE(p_account_upserts, '[]'::JSONB)) <> 'array'
    OR JSONB_TYPEOF(COALESCE(p_metadata, '{}'::JSONB)) <> 'object' THEN
    RAISE EXCEPTION 'Invalid Plaid update-mode payload' USING ERRCODE = '22023';
  END IF;
  IF JSONB_ARRAY_LENGTH(COALESCE(p_account_upserts, '[]'::JSONB)) = 0 THEN
    RAISE EXCEPTION 'Plaid update-mode requires at least one account'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.bank_connections connection
  WHERE connection.id = p_connection_id
    AND connection.user_id = p_user_id
    AND connection.provider = 'plaid'
    AND connection.household_id IS NOT DISTINCT FROM p_household_id
    AND connection.removed_at IS NULL
    AND connection.status IS DISTINCT FROM 'disabled'
    AND COALESCE(connection.item_status, '') NOT IN ('removed', 'pending_removal')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plaid connection not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.plaid_link_update_sessions session
  WHERE session.id = p_link_session_id
    AND session.user_id = p_user_id
    AND session.connection_id = p_connection_id
    AND session.mode = p_mode
    AND p_mode IN ('update', 'reconnect')
    AND session.processing_started_at IS NOT NULL
    AND session.consumed_at IS NULL
    AND session.expires_at > v_now
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plaid update session is not claimable'
      USING ERRCODE = '40001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM JSONB_POPULATE_RECORDSET(
      NULL::public.bank_accounts,
      COALESCE(p_account_upserts, '[]'::JSONB)
    ) incoming
    WHERE incoming.user_id IS DISTINCT FROM p_user_id
      OR incoming.bank_connection_id IS DISTINCT FROM p_connection_id
      OR incoming.provider IS DISTINCT FROM 'plaid'
      OR incoming.provider_account_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Plaid account payload is outside the connection scope'
      USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM JSONB_POPULATE_RECORDSET(
      NULL::public.bank_accounts,
      COALESCE(p_account_upserts, '[]'::JSONB)
    ) incoming
    WHERE incoming.provider_account_id = ANY(
      COALESCE(p_disabled_provider_account_ids, '{}'::TEXT[])
    ) OR incoming.plaid_account_id = ANY(
      COALESCE(p_disabled_provider_account_ids, '{}'::TEXT[])
    )
  ) THEN
    RAISE EXCEPTION 'Selected Plaid accounts cannot also be disabled'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.bank_accounts (
    id, user_id, bank_connection_id, provider, plaid_account_id,
    provider_account_id, provider_persistent_account_id, name, official_name,
    mask, currency, type, subtype, status, provider_balance_current_cents,
    provider_balance_available_cents, provider_balance_limit_cents,
    provider_balance_updated_at, raw_provider_payload
  )
  SELECT
    incoming.id, incoming.user_id, incoming.bank_connection_id,
    incoming.provider, incoming.plaid_account_id,
    incoming.provider_account_id, incoming.provider_persistent_account_id,
    incoming.name, incoming.official_name, incoming.mask, incoming.currency,
    incoming.type, incoming.subtype, 'active',
    incoming.provider_balance_current_cents,
    incoming.provider_balance_available_cents,
    incoming.provider_balance_limit_cents,
    incoming.provider_balance_updated_at, incoming.raw_provider_payload
  FROM JSONB_POPULATE_RECORDSET(
    NULL::public.bank_accounts,
    COALESCE(p_account_upserts, '[]'::JSONB)
  ) incoming
  ON CONFLICT (id) DO UPDATE SET
    plaid_account_id = EXCLUDED.plaid_account_id,
    provider_account_id = EXCLUDED.provider_account_id,
    provider_persistent_account_id = EXCLUDED.provider_persistent_account_id,
    name = EXCLUDED.name,
    official_name = EXCLUDED.official_name,
    mask = EXCLUDED.mask,
    currency = EXCLUDED.currency,
    type = EXCLUDED.type,
    subtype = EXCLUDED.subtype,
    status = 'active',
    provider_balance_current_cents = EXCLUDED.provider_balance_current_cents,
    provider_balance_available_cents = EXCLUDED.provider_balance_available_cents,
    provider_balance_limit_cents = EXCLUDED.provider_balance_limit_cents,
    provider_balance_updated_at = EXCLUDED.provider_balance_updated_at,
    raw_provider_payload = EXCLUDED.raw_provider_payload,
    updated_at = v_now;

  UPDATE public.bank_accounts account
  SET status = 'disabled', updated_at = v_now
  WHERE account.user_id = p_user_id
    AND account.bank_connection_id = p_connection_id
    AND account.provider = 'plaid'
    AND (
      account.provider_account_id = ANY(COALESCE(p_disabled_provider_account_ids, '{}'::TEXT[]))
      OR account.plaid_account_id = ANY(COALESCE(p_disabled_provider_account_ids, '{}'::TEXT[]))
    );

  UPDATE public.expenses expense
  SET deleted_at = v_now,
      deleted_reason = 'bank_account_inactive',
      updated_at = v_now
  WHERE expense.user_id = p_user_id
    AND expense.provider = 'plaid'
    AND expense.deleted_at IS NULL
    AND expense.bank_account_id IN (
      SELECT account.id
      FROM public.bank_accounts account
      WHERE account.user_id = p_user_id
        AND account.bank_connection_id = p_connection_id
        AND account.provider = 'plaid'
        AND account.status = 'disabled'
    );

  UPDATE public.expenses expense
  SET deleted_at = NULL,
      deleted_reason = NULL,
      updated_at = v_now
  WHERE expense.user_id = p_user_id
    AND expense.provider = 'plaid'
    AND expense.deleted_reason = 'bank_account_inactive'
    AND expense.bank_account_id IN (
      SELECT incoming.id
      FROM JSONB_POPULATE_RECORDSET(
        NULL::public.bank_accounts,
        COALESCE(p_account_upserts, '[]'::JSONB)
      ) incoming
    );

  UPDATE public.bank_connections
  SET household_id = p_household_id,
      status = 'active',
      item_status = p_item_status,
      item_health_state = 'healthy',
      relink_state = NULL,
      error_code = NULL,
      error_message = NULL,
      metadata = p_metadata,
      updated_at = v_now
  WHERE id = p_connection_id;

  UPDATE public.plaid_link_update_sessions
  SET consumed_at = v_now,
      completed_at = v_now,
      processing_started_at = NULL,
      link_request_id = p_link_request_id,
      link_session_id = p_plaid_link_session_id,
      updated_at = v_now
  WHERE id = p_link_session_id;

  INSERT INTO public.bank_sync_jobs (
    bank_connection_id,
    provider,
    trigger_source,
    job_type,
    dedupe_key,
    payload,
    next_attempt_at,
    attempt_count
  ) VALUES (
    p_connection_id,
    'plaid',
    CASE WHEN p_item_status = 'accounts_updated'
      THEN 'new_accounts_update' ELSE 'reconnect' END,
    'transactions_sync',
    'transactions_sync:' || p_connection_id::TEXT,
    JSONB_BUILD_OBJECT(
      'updateModeComplete', TRUE,
      'targetHouseholdId', p_household_id
    ),
    NULL,
    0
  )
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_plaid_update_mode_v1(
  UUID, UUID, UUID, TEXT, UUID, JSONB, TEXT[], JSONB, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_plaid_update_mode_v1(
  UUID, UUID, UUID, TEXT, UUID, JSONB, TEXT[], JSONB, TEXT, TEXT, TEXT
) TO service_role;

NOTIFY pgrst, 'reload schema';
