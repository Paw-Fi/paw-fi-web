-- Surface a display-only recurring marker for finalized Plaid ledger rows.
-- Do not set expenses.is_recurring on actual bank transactions: that column
-- identifies recurring templates and is intentionally excluded from analytics.

CREATE OR REPLACE FUNCTION public.get_user_transactions_page_v3(
  p_user_id UUID,
  p_household_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_currencies TEXT[] DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_include_unassigned_account BOOLEAN DEFAULT FALSE,
  p_categories TEXT[] DEFAULT NULL,
  p_type TEXT DEFAULT 'all',
  p_search_query TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_page_size INTEGER DEFAULT 60,
  p_cursor_date DATE DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload JSONB;
  v_items JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized transaction page access'
      USING ERRCODE = '42501';
  END IF;

  v_payload := public.get_user_transactions_page_v2(
    p_user_id,
    p_household_id,
    p_currency,
    p_currencies,
    p_category,
    p_account_id,
    p_include_unassigned_account,
    p_categories,
    p_type,
    p_search_query,
    p_start_date,
    p_end_date,
    p_page_size,
    p_cursor_date,
    p_cursor_created_at,
    p_cursor_id
  );

  SELECT COALESCE(
    jsonb_agg(
      item.value || jsonb_build_object(
        'provider_recurring',
        CASE
          WHEN item.value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN EXISTS (
            SELECT 1
            FROM public.expenses actual
            JOIN public.expenses template
              ON template.user_id = actual.user_id
             AND template.household_id IS NOT DISTINCT FROM actual.household_id
             AND template.deleted_at IS NULL
             AND COALESCE(template.is_recurring, FALSE)
             AND template.provider_fields ->> 'source' = 'plaid_recurring_template'
             AND template.provider_fields ->> 'bank_account_id' = actual.bank_account_id::TEXT
             AND jsonb_typeof(template.provider_fields -> 'transaction_ids') = 'array'
             AND (template.provider_fields -> 'transaction_ids') ? actual.provider_transaction_id
            WHERE actual.id = (item.value ->> 'id')::UUID
              AND actual.deleted_at IS NULL
              AND actual.provider = 'plaid'
              AND actual.bank_account_id IS NOT NULL
              AND NULLIF(BTRIM(actual.provider_transaction_id), '') IS NOT NULL
          )
          ELSE FALSE
        END
      )
      ORDER BY item.ordinality
    ),
    '[]'::JSONB
  )
  INTO v_items
  FROM jsonb_array_elements(COALESCE(v_payload -> 'items', '[]'::JSONB))
    WITH ORDINALITY AS item(value, ordinality);

  RETURN jsonb_set(v_payload, '{items}', v_items, TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_transactions_page_v3(
  UUID, UUID, TEXT, TEXT[], TEXT, UUID, BOOLEAN, TEXT[], TEXT, TEXT,
  DATE, DATE, INTEGER, DATE, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_transactions_page_v3(
  UUID, UUID, TEXT, TEXT[], TEXT, UUID, BOOLEAN, TEXT[], TEXT, TEXT,
  DATE, DATE, INTEGER, DATE, TIMESTAMPTZ, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mobile_delta_v3(
  p_user_id UUID,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_since_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload JSONB;
  v_transactions JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized mobile delta access'
      USING ERRCODE = '42501';
  END IF;

  v_payload := public.get_mobile_delta_v2(
    p_user_id,
    p_since,
    p_since_id,
    p_limit
  );

  SELECT COALESCE(
    jsonb_agg(
      item.value || jsonb_build_object(
        'provider_recurring',
        EXISTS (
          SELECT 1
          FROM public.expenses actual
          JOIN public.expenses template
            ON template.user_id = actual.user_id
           AND template.household_id IS NOT DISTINCT FROM actual.household_id
           AND template.deleted_at IS NULL
           AND COALESCE(template.is_recurring, FALSE)
           AND template.provider_fields ->> 'source' = 'plaid_recurring_template'
           AND template.provider_fields ->> 'bank_account_id' = actual.bank_account_id::TEXT
           AND jsonb_typeof(template.provider_fields -> 'transaction_ids') = 'array'
           AND (template.provider_fields -> 'transaction_ids') ? actual.provider_transaction_id
          WHERE actual.id = (item.value ->> 'id')::UUID
            AND actual.deleted_at IS NULL
            AND actual.provider = 'plaid'
            AND actual.bank_account_id IS NOT NULL
            AND NULLIF(BTRIM(actual.provider_transaction_id), '') IS NOT NULL
        )
      )
      ORDER BY item.ordinality
    ),
    '[]'::JSONB
  )
  INTO v_transactions
  FROM jsonb_array_elements(COALESCE(v_payload -> 'transactions', '[]'::JSONB))
    WITH ORDINALITY AS item(value, ordinality);

  RETURN jsonb_set(v_payload, '{transactions}', v_transactions, TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.get_mobile_delta_v3(UUID, TIMESTAMPTZ, UUID, INTEGER)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_mobile_delta_v3(UUID, TIMESTAMPTZ, UUID, INTEGER)
TO authenticated;
