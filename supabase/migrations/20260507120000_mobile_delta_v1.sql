CREATE TABLE IF NOT EXISTS public.mobile_expense_tombstones (
  id UUID PRIMARY KEY,
  user_id UUID,
  contact_id UUID,
  household_id UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_expense_tombstones_user_deleted
  ON public.mobile_expense_tombstones(user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_mobile_expense_tombstones_contact_deleted
  ON public.mobile_expense_tombstones(contact_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_mobile_expense_tombstones_household_deleted
  ON public.mobile_expense_tombstones(household_id, deleted_at);

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
  visible_changes AS (
    SELECT
      'transaction'::TEXT AS change_kind,
      e.id,
      COALESCE(e.updated_at, e.created_at, '-infinity'::timestamptz)
        AS mobile_changed_at,
      jsonb_build_object(
        'id', e.id,
        'contact_id', e.contact_id,
        'user_id', e.user_id,
        'household_id', e.household_id,
        'date', e.date,
        'amount_cents', e.amount_cents,
        'currency', e.currency,
        'category', e.category,
        'created_at', e.created_at,
        'updated_at', e.updated_at,
        'raw_text', e.raw_text,
        'merchant', e.merchant,
        'breakdown', e.breakdown,
        'receipt_image_url', e.receipt_image_url,
        'split_group_id', e.split_group_id,
        'account_id', e.account_id,
        'type', e.type,
        'is_recurring', e.is_recurring,
        'mobile_changed_at',
        COALESCE(e.updated_at, e.created_at, '-infinity'::timestamptz)
      ) AS transaction_payload,
      NULL::UUID AS deleted_transaction_id
    FROM public.expenses e
    WHERE e.deleted_at IS NULL
      AND (
        e.user_id = p_user_id
        OR e.contact_id IN (SELECT id FROM visible_contacts)
        OR e.household_id IN (SELECT household_id FROM visible_households)
      )
    UNION ALL
    SELECT
      'deleted'::TEXT AS change_kind,
      e.id,
      COALESCE(e.deleted_at, e.updated_at, e.created_at) AS mobile_changed_at,
      NULL::JSONB AS transaction_payload,
      e.id AS deleted_transaction_id
    FROM public.expenses e
    WHERE e.deleted_at IS NOT NULL
      AND (
        e.user_id = p_user_id
        OR e.contact_id IN (SELECT id FROM visible_contacts)
        OR e.household_id IN (SELECT household_id FROM visible_households)
      )
    UNION ALL
    SELECT
      'deleted'::TEXT AS change_kind,
      t.id,
      t.deleted_at AS mobile_changed_at,
      NULL::JSONB AS transaction_payload,
      t.id AS deleted_transaction_id
    FROM public.mobile_expense_tombstones t
    WHERE t.user_id = p_user_id
       OR t.contact_id IN (SELECT id FROM visible_contacts)
       OR t.household_id IN (SELECT household_id FROM visible_households)
  ),
  changed AS (
    SELECT *
    FROM visible_changes
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
        p.transaction_payload
        ORDER BY p.mobile_changed_at ASC, p.id ASC
      ) FILTER (WHERE p.change_kind = 'transaction'),
      '[]'::JSONB
    ),
    COALESCE(
      jsonb_agg(
        to_jsonb(p.deleted_transaction_id)
        ORDER BY p.mobile_changed_at ASC, p.id ASC
      ) FILTER (WHERE p.change_kind = 'deleted'),
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
