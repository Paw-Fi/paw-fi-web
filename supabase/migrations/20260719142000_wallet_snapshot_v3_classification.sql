DO $$
BEGIN
  IF to_regprocedure(
    'public.get_wallets_month_snapshot_v3_legacy(uuid,uuid,text,date,boolean,integer)'
  ) IS NULL THEN
    ALTER FUNCTION public.get_wallets_month_snapshot_v3(
      UUID, UUID, TEXT, DATE, BOOLEAN, INTEGER
    ) RENAME TO get_wallets_month_snapshot_v3_legacy;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wallets_month_snapshot_v3(
  p_user_id UUID,
  p_household_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_month_start DATE DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT FALSE,
  p_financial_month_start_day INTEGER DEFAULT 1
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start_day INTEGER := CASE
    WHEN p_financial_month_start_day BETWEEN 1 AND 31
      THEN p_financial_month_start_day
    ELSE 1
  END;
  v_nominal_start DATE := MAKE_DATE(
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    LEAST(
      v_start_day,
      EXTRACT(DAY FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::INTEGER
    )
  );
  v_current_start DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_effective_end DATE;
  v_payload JSONB;
  v_income BIGINT;
  v_spending BIGINT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized wallet snapshot access'
      USING ERRCODE = '42501';
  END IF;
  IF p_household_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.household_members member
    WHERE member.household_id = p_household_id
      AND member.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized household wallet snapshot access'
      USING ERRCODE = '42501';
  END IF;

  v_current_start := CASE
    WHEN CURRENT_DATE >= v_nominal_start THEN v_nominal_start
    ELSE public.previous_financial_cycle_start(v_nominal_start, v_start_day)
  END;
  v_month_start := COALESCE(p_month_start, v_current_start);
  v_month_end := public.next_financial_cycle_start(v_month_start, v_start_day);
  v_effective_end := CASE
    WHEN v_month_start = v_current_start THEN CURRENT_DATE + 1
    ELSE v_month_end
  END;

  v_payload := public.get_wallets_month_snapshot_v3_legacy(
    p_user_id,
    p_household_id,
    p_currency,
    p_month_start,
    p_include_archived,
    p_financial_month_start_day
  );

  WITH contact_ids AS (
    SELECT id FROM public.user_contacts WHERE user_id = p_user_id
  ), actual AS (
    SELECT
      CASE
        WHEN e.analytics_is_final IS TRUE
          AND e.analytics_counts_toward_income IS TRUE
          THEN ABS(e.amount_cents)
        ELSE 0
      END::BIGINT AS income_cents,
      CASE
        WHEN e.analytics_is_final IS TRUE
          THEN ABS(e.amount_cents) * e.analytics_spending_multiplier
        ELSE 0
      END::BIGINT AS spending_cents
    FROM public.expenses e
    WHERE COALESCE(e.is_recurring, FALSE) = FALSE
      AND e.deleted_at IS NULL
      AND e.date >= v_month_start
      AND e.date < v_effective_end
      AND (
        (
          p_household_id IS NULL
          AND e.household_id IS NULL
          AND (
            e.user_id = p_user_id
            OR e.contact_id IN (SELECT id FROM contact_ids)
          )
        )
       OR (p_household_id IS NOT NULL AND e.household_id = p_household_id)
      )
      AND (p_currency IS NULL OR UPPER(e.currency) = UPPER(p_currency))
      AND (
        e.user_id = p_user_id
        OR e.contact_id IN (SELECT id FROM contact_ids)
        OR e.privacy_scope IN ('full', 'balances_only')
      )
  ), projected AS (
    SELECT
      CASE WHEN LOWER(COALESCE(pr.type, 'expense')) = 'income'
        THEN ABS(pr.amount_cents) ELSE 0 END::BIGINT AS income_cents,
      CASE WHEN LOWER(COALESCE(pr.type, 'expense')) = 'income'
        THEN 0 ELSE ABS(pr.amount_cents) END::BIGINT AS spending_cents
    FROM public.get_projected_scoped_recurring_expenses_v1(
      p_user_id,
      CASE WHEN p_household_id IS NULL THEN 'personal' ELSE 'household' END,
      p_household_id,
      p_currency,
      v_month_start,
      v_effective_end - 1
    ) pr
    JOIN public.expenses template ON template.id = pr.recurring_id
    WHERE LOWER(TRIM(COALESCE(pr.category, ''))) <> 'transfers'
      AND (
        template.user_id = p_user_id
        OR template.privacy_scope IN ('full', 'balances_only')
      )
  ), combined AS (
    SELECT * FROM actual
    UNION ALL
    SELECT * FROM projected
  )
  SELECT COALESCE(SUM(income_cents), 0)::BIGINT,
    COALESCE(SUM(spending_cents), 0)::BIGINT
  INTO v_income, v_spending
  FROM combined;

  RETURN v_payload || JSONB_BUILD_OBJECT(
    'income_total_cents', v_income,
    'spent_total_cents', v_spending
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_wallets_month_snapshot_v3(
  UUID, UUID, TEXT, DATE, BOOLEAN, INTEGER
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallets_month_snapshot_v3(
  UUID, UUID, TEXT, DATE, BOOLEAN, INTEGER
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_wallets_month_snapshot_v3_legacy(
  UUID, UUID, TEXT, DATE, BOOLEAN, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
