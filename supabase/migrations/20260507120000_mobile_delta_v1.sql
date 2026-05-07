CREATE OR REPLACE FUNCTION public.get_mobile_delta_v1(
  p_user_id UUID,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 500), 1), 1000);
  v_next_cursor TIMESTAMPTZ;
  v_has_more BOOLEAN := FALSE;
  v_transactions JSONB := '[]'::JSONB;
  v_deleted_transaction_ids JSONB := '[]'::JSONB;
BEGIN
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
  visible_expenses AS (
    SELECT
      e.*,
      GREATEST(
        COALESCE(e.updated_at, e.created_at, '-infinity'::timestamptz),
        COALESCE(e.deleted_at, '-infinity'::timestamptz)
      ) AS mobile_changed_at
    FROM public.expenses e
    WHERE e.user_id = p_user_id
       OR e.contact_id IN (SELECT id FROM visible_contacts)
       OR e.household_id IN (SELECT household_id FROM visible_households)
  ),
  changed AS (
    SELECT *
    FROM visible_expenses
    WHERE p_since IS NULL OR mobile_changed_at > p_since
    ORDER BY mobile_changed_at ASC, id ASC
    LIMIT v_limit + 1
  ),
  page AS (
    SELECT *
    FROM changed
    ORDER BY mobile_changed_at ASC, id ASC
    LIMIT v_limit
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
          'account_id', p.account_id,
          'type', p.type,
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
    MAX(p.mobile_changed_at),
    EXISTS(SELECT 1 FROM changed OFFSET v_limit)
  INTO
    v_transactions,
    v_deleted_transaction_ids,
    v_next_cursor,
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
    'hasMore', COALESCE(v_has_more, FALSE)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mobile_delta_v1(UUID, TIMESTAMPTZ, INTEGER)
TO authenticated;
