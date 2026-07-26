CREATE OR REPLACE FUNCTION public.get_user_transactions_page_v5(
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

  v_payload := public.get_user_transactions_page_v4(
    p_user_id, p_household_id, p_currency, p_currencies, p_category,
    p_account_id, p_include_unassigned_account, p_categories, p_type,
    p_search_query, p_start_date, p_end_date, p_page_size, p_cursor_date,
    p_cursor_created_at, p_cursor_id
  );

  SELECT COALESCE(
    jsonb_agg(
      item.value || COALESCE(
        (
          SELECT jsonb_build_object(
            'parent_recurring_id', expense.parent_recurring_id,
            'scheduled_occurrence_date', expense.scheduled_occurrence_date,
            'recurring_confirmed_at', expense.recurring_confirmed_at,
            'recurring_confirmation_source', expense.recurring_confirmation_source
          )
          FROM public.expenses expense
          WHERE item.value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND expense.id = (item.value ->> 'id')::UUID
        ),
        jsonb_build_object(
          'parent_recurring_id', NULL,
          'scheduled_occurrence_date', NULL,
          'recurring_confirmed_at', NULL,
          'recurring_confirmation_source', NULL
        )
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

REVOKE ALL ON FUNCTION public.get_user_transactions_page_v5(
  UUID, UUID, TEXT, TEXT[], TEXT, UUID, BOOLEAN, TEXT[], TEXT, TEXT,
  DATE, DATE, INTEGER, DATE, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_transactions_page_v5(
  UUID, UUID, TEXT, TEXT[], TEXT, UUID, BOOLEAN, TEXT[], TEXT, TEXT,
  DATE, DATE, INTEGER, DATE, TIMESTAMPTZ, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mobile_delta_v5(
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

  v_payload := public.get_mobile_delta_v4(
    p_user_id, p_since, p_since_id, p_limit
  );

  SELECT COALESCE(
    jsonb_agg(
      item.value || COALESCE(
        (
          SELECT jsonb_build_object(
            'parent_recurring_id', expense.parent_recurring_id,
            'scheduled_occurrence_date', expense.scheduled_occurrence_date,
            'recurring_confirmed_at', expense.recurring_confirmed_at,
            'recurring_confirmation_source', expense.recurring_confirmation_source
          )
          FROM public.expenses expense
          WHERE item.value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND expense.id = (item.value ->> 'id')::UUID
        ),
        jsonb_build_object(
          'parent_recurring_id', NULL,
          'scheduled_occurrence_date', NULL,
          'recurring_confirmed_at', NULL,
          'recurring_confirmation_source', NULL
        )
      )
      ORDER BY item.ordinality
    ),
    '[]'::JSONB
  )
  INTO v_transactions
  FROM jsonb_array_elements(
    COALESCE(v_payload -> 'transactions', '[]'::JSONB)
  ) WITH ORDINALITY AS item(value, ordinality);

  RETURN jsonb_set(v_payload, '{transactions}', v_transactions, TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.get_mobile_delta_v5(
  UUID, TIMESTAMPTZ, UUID, INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_mobile_delta_v5(
  UUID, TIMESTAMPTZ, UUID, INTEGER
) TO authenticated;

NOTIFY pgrst, 'reload schema';
