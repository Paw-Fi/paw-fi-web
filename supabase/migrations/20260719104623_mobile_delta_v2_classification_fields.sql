CREATE OR REPLACE FUNCTION public.get_mobile_delta_v2(
  p_user_id UUID,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_since_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 1000);
  v_next_cursor TIMESTAMPTZ;
  v_next_cursor_id UUID;
  v_has_more BOOLEAN := FALSE;
  v_transactions JSONB := '[]'::JSONB;
  v_deleted_transaction_ids JSONB := '[]'::JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized mobile delta access'
      USING ERRCODE = '42501';
  END IF;

  WITH visible_contacts AS (
    SELECT id
    FROM public.user_contacts
    WHERE user_id = p_user_id
  ),
  visible_households AS (
    SELECT household_id
    FROM public.household_members
    WHERE user_id = p_user_id
  ),
  visible_transaction_candidates AS (
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
      e.breakdown,
      e.receipt_image_url,
      e.split_group_id,
      e.bank_account_id,
      e.account_id,
      e.type,
      e.analytics_class,
      e.analytics_is_final,
      e.analytics_spending_multiplier,
      e.analytics_counts_toward_income,
      e.is_recurring,
      e.deleted_at,
      GREATEST(
        COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
        COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
        COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
      ) AS mobile_changed_at
    FROM public.expenses e
    WHERE e.user_id = p_user_id
      AND (
        p_since IS NULL
        OR (
          p_since_id IS NULL
          AND GREATEST(
            COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
            COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
            COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
          ) > p_since
        )
        OR (
          p_since_id IS NOT NULL
          AND (
            GREATEST(
              COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
              COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
              COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
            ),
            e.id
          ) > (p_since, p_since_id)
        )
      )
    UNION ALL
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
      e.breakdown,
      e.receipt_image_url,
      e.split_group_id,
      e.bank_account_id,
      e.account_id,
      e.type,
      e.analytics_class,
      e.analytics_is_final,
      e.analytics_spending_multiplier,
      e.analytics_counts_toward_income,
      e.is_recurring,
      e.deleted_at,
      GREATEST(
        COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
        COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
        COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
      ) AS mobile_changed_at
    FROM public.expenses e
    WHERE e.contact_id IN (SELECT id FROM visible_contacts)
      AND (
        p_since IS NULL
        OR (
          p_since_id IS NULL
          AND GREATEST(
            COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
            COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
            COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
          ) > p_since
        )
        OR (
          p_since_id IS NOT NULL
          AND (
            GREATEST(
              COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
              COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
              COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
            ),
            e.id
          ) > (p_since, p_since_id)
        )
      )
    UNION ALL
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
      e.breakdown,
      e.receipt_image_url,
      e.split_group_id,
      e.bank_account_id,
      e.account_id,
      e.type,
      e.analytics_class,
      e.analytics_is_final,
      e.analytics_spending_multiplier,
      e.analytics_counts_toward_income,
      e.is_recurring,
      e.deleted_at,
      GREATEST(
        COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
        COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
        COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
      ) AS mobile_changed_at
    FROM public.expenses e
    WHERE e.household_id IN (SELECT household_id FROM visible_households)
      AND (
        p_since IS NULL
        OR (
          p_since_id IS NULL
          AND GREATEST(
            COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
            COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
            COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
          ) > p_since
        )
        OR (
          p_since_id IS NOT NULL
          AND (
            GREATEST(
              COALESCE(e.updated_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
              COALESCE(e.deleted_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ),
              COALESCE(e.created_at, '1970-01-01 00:00:00+00'::TIMESTAMPTZ)
            ),
            e.id
          ) > (p_since, p_since_id)
        )
      )
  ),
  visible_transactions AS (
    SELECT DISTINCT ON (id) *
    FROM visible_transaction_candidates
    ORDER BY id, mobile_changed_at DESC
  ),
  ordered_changes AS (
    SELECT *
    FROM visible_transactions
    ORDER BY mobile_changed_at ASC, id ASC
    LIMIT v_limit + 1
  ),
  page AS (
    SELECT *
    FROM ordered_changes
    ORDER BY mobile_changed_at ASC, id ASC
    LIMIT v_limit
  ),
  last_page_row AS (
    SELECT mobile_changed_at, id
    FROM page
    ORDER BY mobile_changed_at DESC, id DESC
    LIMIT 1
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'contact_id', p.contact_id,
          'user_id', p.user_id,
          'household_id', p.household_id,
          'date', p.date,
          'amount_cents', p.amount_cents,
          'currency', p.currency,
          'category', p.category,
          'created_at', p.created_at,
          'updated_at', p.updated_at,
          'raw_text', p.raw_text,
          'merchant', p.merchant,
          'breakdown', p.breakdown,
          'receipt_image_url', p.receipt_image_url,
          'split_group_id', p.split_group_id,
          'bank_account_id', p.bank_account_id,
          'account_id', p.account_id,
          'type', p.type,
          'analytics_class', p.analytics_class,
          'analytics_is_final', p.analytics_is_final,
          'analytics_spending_multiplier', p.analytics_spending_multiplier,
          'analytics_counts_toward_income', p.analytics_counts_toward_income,
          'is_recurring', p.is_recurring,
          'mobile_changed_at', p.mobile_changed_at
        )
        ORDER BY p.mobile_changed_at ASC, p.id ASC
      ) FILTER (WHERE p.deleted_at IS NULL),
      '[]'::JSONB
    ),
    COALESCE(
      jsonb_agg(to_jsonb(p.id) ORDER BY p.mobile_changed_at ASC, p.id ASC)
        FILTER (WHERE p.deleted_at IS NOT NULL),
      '[]'::JSONB
    ),
    (SELECT mobile_changed_at FROM last_page_row),
    (SELECT id FROM last_page_row),
    EXISTS(SELECT 1 FROM ordered_changes OFFSET v_limit)
  INTO
    v_transactions,
    v_deleted_transaction_ids,
    v_next_cursor,
    v_next_cursor_id,
    v_has_more
  FROM page p;

  RETURN jsonb_build_object(
    'transactions', v_transactions,
    'deletedTransactionIds', v_deleted_transaction_ids,
    'budgets', '[]'::JSONB,
    'wallets', '[]'::JSONB,
    'categories', '[]'::JSONB,
    'recurring', '[]'::JSONB,
    'householdSplits', '[]'::JSONB,
    'summarySnapshots', '[]'::JSONB,
    'nextCursor', CASE
      WHEN v_next_cursor IS NULL THEN NULL
      ELSE to_jsonb(v_next_cursor)
    END,
    'nextCursorId', CASE
      WHEN v_next_cursor_id IS NULL THEN NULL
      ELSE to_jsonb(v_next_cursor_id)
    END,
    'hasMore', v_has_more
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mobile_delta_v2(UUID, TIMESTAMPTZ, UUID, INTEGER)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_mobile_delta_v2(UUID, TIMESTAMPTZ, UUID, INTEGER)
TO authenticated;
