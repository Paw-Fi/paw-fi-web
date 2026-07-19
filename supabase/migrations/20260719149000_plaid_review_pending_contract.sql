-- Keep the Plaid review RPC's transaction payload aligned with ExpenseEntry.
-- Pending display must come from provider_pending, while analytics fields remain
-- available for fail-closed local economic handling.

CREATE OR REPLACE FUNCTION public.get_plaid_sync_review_transactions_v2(
  p_user_id UUID,
  p_bank_connection_id UUID,
  p_bank_account_ids UUID[],
  p_household_id UUID DEFAULT NULL,
  p_cursor_review_priority BOOLEAN DEFAULT NULL,
  p_cursor_date DATE DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 200
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized Plaid review access' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bank_connections
    WHERE id = p_bank_connection_id
      AND user_id = p_user_id
      AND provider = 'plaid'
  ) THEN
    RAISE EXCEPTION 'Plaid connection not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_household_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = p_household_id
      AND hm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized Plaid review household' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_bank_account_ids, '{}'::UUID[])) account_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.bank_accounts ba
      WHERE ba.id = account_id
        AND ba.bank_connection_id = p_bank_connection_id
        AND ba.user_id = p_user_id
        AND ba.provider = 'plaid'
    )
  ) THEN
    RAISE EXCEPTION 'Invalid Plaid review account scope' USING ERRCODE = '42501';
  END IF;

  WITH ordered_rows AS MATERIALIZED (
    SELECT
      e.id,
      e.contact_id,
      e.user_id,
      e.household_id,
      e.date,
      e.amount_cents,
      e.currency,
      e.category,
      e.created_at,
      e.updated_at,
      e.raw_text,
      e.merchant,
      e.bank_account_id,
      e.account_id,
      e.type,
      e.provider_pending,
      e.analytics_is_final,
      e.analytics_spending_multiplier,
      e.analytics_counts_toward_income,
      e.is_recurring,
      e.recurrence_rule,
      e.analytics_class,
      e.classification_source,
      e.classification_review_state,
      e.classification_review_reason,
      e.provider_pfc_confidence,
      (e.classification_review_state = 'needs_review') AS review_priority
    FROM public.expenses e
    WHERE e.user_id = p_user_id
      AND e.provider = 'plaid'
      AND e.deleted_at IS NULL
      AND e.bank_account_id = ANY(
        COALESCE(p_bank_account_ids, '{}'::UUID[])
      )
      AND e.household_id IS NOT DISTINCT FROM p_household_id
      AND (
        p_cursor_review_priority IS NULL
        OR (
          (e.classification_review_state = 'needs_review'),
          e.date,
          e.created_at,
          e.id
        ) < (
          p_cursor_review_priority,
          p_cursor_date,
          COALESCE(p_cursor_created_at, 'infinity'::TIMESTAMPTZ),
          COALESCE(
            p_cursor_id,
            'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID
          )
        )
      )
    ORDER BY
      review_priority DESC,
      e.date DESC,
      e.created_at DESC,
      e.id DESC
    LIMIT v_limit + 1
  ), page_rows AS (
    SELECT *
    FROM ordered_rows
    ORDER BY review_priority DESC, date DESC, created_at DESC, id DESC
    LIMIT v_limit
  ), page_boundary AS (
    SELECT *
    FROM page_rows
    ORDER BY review_priority ASC, date ASC, created_at ASC, id ASC
    LIMIT 1
  ), unresolved AS (
    SELECT count(*)::INTEGER AS count
    FROM public.expenses e
    WHERE e.user_id = p_user_id
      AND e.provider = 'plaid'
      AND e.deleted_at IS NULL
      AND e.bank_account_id = ANY(
        COALESCE(p_bank_account_ids, '{}'::UUID[])
      )
      AND e.household_id IS NOT DISTINCT FROM p_household_id
      AND e.classification_review_state = 'needs_review'
  )
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(rows)
        ORDER BY
          rows.review_priority DESC,
          rows.date DESC,
          rows.created_at DESC,
          rows.id DESC
      )
      FROM page_rows rows
    ), '[]'::JSONB),
    'has_more', (SELECT count(*) FROM ordered_rows) > v_limit,
    'next_cursor', CASE
      WHEN (SELECT count(*) FROM ordered_rows) > v_limit THEN (
        SELECT jsonb_build_object(
          'review_priority', rows.review_priority,
          'date', rows.date,
          'created_at', rows.created_at,
          'id', rows.id
        )
        FROM page_boundary rows
      )
      ELSE NULL
    END,
    'unresolved_count', (SELECT count FROM unresolved)
  )
  INTO v_result;

  RETURN COALESCE(
    v_result,
    jsonb_build_object(
      'items', '[]'::JSONB,
      'has_more', FALSE,
      'next_cursor', NULL,
      'unresolved_count', 0
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_plaid_sync_review_transactions_v2(
  UUID, UUID, UUID[], UUID, BOOLEAN, DATE, TIMESTAMPTZ, UUID, INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_plaid_sync_review_transactions_v2(
  UUID, UUID, UUID[], UUID, BOOLEAN, DATE, TIMESTAMPTZ, UUID, INTEGER
) TO authenticated;
