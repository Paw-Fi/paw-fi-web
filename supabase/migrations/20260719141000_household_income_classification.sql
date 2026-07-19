CREATE OR REPLACE FUNCTION public.get_household_income_summary(
  p_household_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_currency VARCHAR(3) DEFAULT NULL
) RETURNS TABLE(
  total_income_cents BIGINT,
  currency VARCHAR(3),
  member_breakdown JSONB,
  category_breakdown JSONB,
  transaction_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of the household';
  END IF;

  RETURN QUERY
  WITH filtered_income AS (
    SELECT
      e.user_id,
      e.amount_cents,
      e.currency,
      e.normalized_amount_cents,
      e.base_currency,
      e.category,
      e.privacy_scope
    FROM public.expenses e
    WHERE e.household_id = p_household_id
      AND e.deleted_at IS NULL
      AND e.analytics_is_final IS TRUE
      AND e.analytics_counts_toward_income IS TRUE
      AND (p_start_date IS NULL OR e.date >= p_start_date)
      AND (p_end_date IS NULL OR e.date <= p_end_date)
      AND (p_currency IS NULL OR UPPER(e.currency) = UPPER(p_currency))
      AND (
        e.privacy_scope IN ('full', 'balances_only')
        OR e.user_id = v_user_id
      )
  ), member_totals AS (
    SELECT user_id::TEXT AS member_key,
      SUM(ABS(CASE WHEN p_currency IS NULL
        THEN COALESCE(normalized_amount_cents, amount_cents)
        ELSE amount_cents END)) AS total_cents
    FROM filtered_income
    GROUP BY user_id
  ), category_totals AS (
    SELECT category,
      SUM(ABS(CASE WHEN p_currency IS NULL
        THEN COALESCE(normalized_amount_cents, amount_cents)
        ELSE amount_cents END)) AS total_cents
    FROM filtered_income
    WHERE privacy_scope = 'full' OR user_id = v_user_id
    GROUP BY category
  )
  SELECT
    COALESCE(SUM(ABS(CASE WHEN p_currency IS NULL
      THEN COALESCE(fi.normalized_amount_cents, fi.amount_cents)
      ELSE fi.amount_cents END)), 0)::BIGINT,
    COALESCE(p_currency, MAX(fi.base_currency), MAX(fi.currency), 'USD')::VARCHAR(3),
    COALESCE((SELECT JSONB_OBJECT_AGG(member_key, total_cents) FROM member_totals), '{}'::JSONB),
    COALESCE((SELECT JSONB_OBJECT_AGG(category, total_cents) FROM category_totals), '{}'::JSONB),
    COUNT(*)::INTEGER
  FROM filtered_income fi;
END;
$$;

REVOKE ALL ON FUNCTION public.get_household_income_summary(UUID, DATE, DATE, VARCHAR)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_household_income_summary(UUID, DATE, DATE, VARCHAR)
  TO authenticated, service_role;
