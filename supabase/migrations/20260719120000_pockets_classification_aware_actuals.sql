DO $$
BEGIN
  IF to_regprocedure(
    'public.get_pockets_month_v2_legacy_impl(uuid,text,date,uuid,text,boolean,boolean)'
  ) IS NULL THEN
    ALTER FUNCTION public.get_pockets_month_v2_financial_impl(
      UUID,
      TEXT,
      DATE,
      UUID,
      TEXT,
      BOOLEAN,
      BOOLEAN
    ) RENAME TO get_pockets_month_v2_legacy_impl;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pockets_month_v2_financial_impl(
  p_user_id UUID,
  p_scope TEXT,
  p_period_month DATE,
  p_household_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_include_projected_recurring BOOLEAN DEFAULT TRUE,
  p_allow_currency_fallback BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_scope TEXT := LOWER(COALESCE(NULLIF(TRIM(p_scope), ''), 'personal'));
  v_payload JSONB;
  v_currency TEXT;
  v_financial_month_start_day INTEGER;
  v_actual_expenses JSONB;
  v_spent_by_envelope JSONB;
  v_total_spend_cents BIGINT;
  v_uncategorized_totals JSONB;
  v_uncategorized_expenses JSONB;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized pockets access' USING ERRCODE = '42501';
  END IF;
  IF p_household_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.household_members member
    WHERE member.household_id = p_household_id
      AND member.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized household pockets access'
      USING ERRCODE = '42501';
  END IF;

  v_payload := public.get_pockets_month_v2_legacy_impl(
    p_user_id => p_user_id,
    p_scope => p_scope,
    p_period_month => p_period_month,
    p_household_id => p_household_id,
    p_currency => p_currency,
    p_include_projected_recurring => p_include_projected_recurring,
    p_allow_currency_fallback => p_allow_currency_fallback
  );

  v_currency := UPPER(COALESCE(v_payload ->> 'selected_currency', p_currency));
  v_financial_month_start_day := public.user_financial_month_start_day(p_user_id);

  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', e.id,
        'date', e.date,
        'amount_cents', ABS(e.amount_cents) * e.analytics_spending_multiplier,
        'currency', e.currency,
        'category', CASE
          WHEN e.user_id IS DISTINCT FROM p_user_id
            AND e.privacy_scope = 'balances_only' THEN 'uncategorized'
          ELSE e.category
        END,
        'household_id', e.household_id,
        'user_id', e.user_id,
        'split_group_id', e.split_group_id,
        'raw_text', CASE
          WHEN e.user_id IS DISTINCT FROM p_user_id
            AND e.privacy_scope = 'balances_only' THEN NULL
          ELSE e.raw_text
        END,
        'created_at', e.created_at,
        'updated_at', e.updated_at,
        'bank_account_id', e.bank_account_id,
        'type', e.type,
        'analytics_class', e.analytics_class,
        'analytics_is_final', e.analytics_is_final,
        'analytics_spending_multiplier', e.analytics_spending_multiplier,
        'analytics_counts_toward_income', e.analytics_counts_toward_income,
        'is_recurring', e.is_recurring
      )
      ORDER BY e.date, e.created_at, e.id
    ),
    '[]'::JSONB
  )
  INTO v_actual_expenses
  FROM public.expenses e
  WHERE JSONB_ARRAY_LENGTH(COALESCE(v_payload -> 'envelopes', '[]'::JSONB)) > 0
    AND e.deleted_at IS NULL
    AND COALESCE(e.is_recurring, FALSE) = FALSE
    AND e.analytics_is_final IS TRUE
    AND e.analytics_spending_multiplier <> 0
    AND UPPER(COALESCE(e.currency, '')) = v_currency
    AND e.date >= p_period_month
    AND e.date < public.next_financial_cycle_start(
      p_period_month,
      v_financial_month_start_day
    )
    AND (
      (v_scope = 'household' AND e.household_id = p_household_id)
      OR (
        v_scope = 'personal'
        AND e.user_id = p_user_id
        AND e.household_id IS NULL
      )
      OR (
        v_scope = 'portfolio'
        AND e.user_id = p_user_id
        AND e.household_id = p_household_id
      )
    )
    AND (
      e.user_id = p_user_id
      OR e.privacy_scope IN ('full', 'balances_only')
    );

  WITH actual_rows AS (
    SELECT
      LOWER(TRIM(COALESCE(value ->> 'category', 'uncategorized'))) AS category,
      COALESCE((value ->> 'amount_cents')::BIGINT, 0) AS amount_cents,
      value AS row_json
    FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_actual_expenses, '[]'::JSONB)) value
  ), projected_rows AS (
    SELECT
      LOWER(TRIM(COALESCE(
        CASE
          WHEN template.user_id IS DISTINCT FROM p_user_id
            AND template.privacy_scope = 'balances_only' THEN 'uncategorized'
          ELSE projected.category
        END,
        'uncategorized'
      ))) AS category,
      ABS(projected.amount_cents)::BIGINT AS amount_cents,
      JSONB_BUILD_OBJECT(
        'id', projected.id,
        'date', projected.date,
        'amount_cents', ABS(projected.amount_cents),
        'currency', projected.currency,
        'category', CASE
          WHEN template.user_id IS DISTINCT FROM p_user_id
            AND template.privacy_scope = 'balances_only' THEN 'uncategorized'
          ELSE projected.category
        END,
        'household_id', projected.household_id,
        'user_id', projected.user_id,
        'raw_text', CASE
          WHEN template.user_id IS DISTINCT FROM p_user_id
            AND template.privacy_scope = 'balances_only' THEN NULL
          ELSE projected.raw_text
        END,
        'type', projected.type,
        'is_recurring', TRUE
      ) AS row_json
    FROM public.get_projected_scoped_recurring_expenses_v1(
      p_user_id,
      v_scope,
      p_household_id,
      v_currency,
      p_period_month,
      public.next_financial_cycle_start(
        p_period_month,
        v_financial_month_start_day
      ) - 1
    ) projected
    JOIN public.expenses template ON template.id = projected.recurring_id
    WHERE p_include_projected_recurring IS TRUE
      AND LOWER(COALESCE(projected.type, 'expense')) <> 'income'
      AND (
        template.user_id = p_user_id
        OR template.privacy_scope IN ('full', 'balances_only')
      )
  ), combined_rows AS (
    SELECT * FROM actual_rows
    UNION ALL
    SELECT * FROM projected_rows
  ), category_links AS (
    SELECT DISTINCT
      value ->> 'envelope_id' AS envelope_id,
      LOWER(TRIM(COALESCE(value ->> 'category', ''))) AS category
    FROM JSONB_ARRAY_ELEMENTS(
      COALESCE(v_payload -> 'category_links', '[]'::JSONB)
    ) value
  ), envelope_totals AS (
    SELECT link.envelope_id, COALESCE(SUM(row.amount_cents), 0)::BIGINT AS spent_cents
    FROM category_links link
    LEFT JOIN combined_rows row ON row.category = link.category
    GROUP BY link.envelope_id
  ), uncategorized AS (
    SELECT row.*
    FROM combined_rows row
    WHERE NOT EXISTS (
      SELECT 1 FROM category_links link WHERE link.category = row.category
    )
  ), uncategorized_grouped AS (
    SELECT category,
      SUM(amount_cents)::BIGINT AS amount_cents,
      JSONB_AGG(row_json ORDER BY row_json ->> 'date', row_json ->> 'id') AS expenses
    FROM uncategorized
    GROUP BY category
  )
  SELECT
    COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'envelope_id', envelope_id,
        'spent_cents', spent_cents
      ) ORDER BY envelope_id)
      FROM envelope_totals
    ), '[]'::JSONB),
    COALESCE((SELECT SUM(amount_cents) FROM combined_rows), 0)::BIGINT,
    COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'category', category,
        'amount_cents', amount_cents
      ) ORDER BY amount_cents DESC, category)
      FROM uncategorized_grouped
    ), '[]'::JSONB),
    COALESCE((
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
        'category', category,
        'expenses', expenses
      ) ORDER BY category)
      FROM uncategorized_grouped
    ), '[]'::JSONB)
  INTO v_spent_by_envelope, v_total_spend_cents,
    v_uncategorized_totals, v_uncategorized_expenses;

  RETURN v_payload || JSONB_BUILD_OBJECT(
    'actual_expenses', v_actual_expenses,
    'spent_by_envelope', v_spent_by_envelope,
    'total_spend_cents', v_total_spend_cents,
    'uncategorized_totals', v_uncategorized_totals,
    'uncategorized_expenses', v_uncategorized_expenses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_pockets_month_v2_financial_impl(
  UUID,
  TEXT,
  DATE,
  UUID,
  TEXT,
  BOOLEAN,
  BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_pockets_month_v2_financial_impl(
  UUID,
  TEXT,
  DATE,
  UUID,
  TEXT,
  BOOLEAN,
  BOOLEAN
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_pockets_month_v2_legacy_impl(
  UUID,
  TEXT,
  DATE,
  UUID,
  TEXT,
  BOOLEAN,
  BOOLEAN
) FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
