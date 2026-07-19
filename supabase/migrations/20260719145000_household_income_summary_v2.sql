CREATE OR REPLACE FUNCTION public.get_household_income_summary_v2(
  p_user_id UUID,
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
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.household_members member
    WHERE member.household_id = p_household_id
      AND member.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of the household'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered_income AS (
    SELECT
      expense.user_id,
      expense.amount_cents,
      expense.currency,
      expense.normalized_amount_cents,
      expense.base_currency,
      expense.category,
      expense.privacy_scope
    FROM public.expenses expense
    WHERE expense.household_id = p_household_id
      AND expense.deleted_at IS NULL
      AND expense.analytics_is_final IS TRUE
      AND expense.analytics_counts_toward_income IS TRUE
      AND (p_start_date IS NULL OR expense.date >= p_start_date)
      AND (p_end_date IS NULL OR expense.date <= p_end_date)
      AND (p_currency IS NULL OR UPPER(expense.currency) = UPPER(p_currency))
      AND (
        expense.privacy_scope IN ('full', 'balances_only')
        OR expense.user_id = p_user_id
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
    WHERE privacy_scope = 'full' OR user_id = p_user_id
    GROUP BY category
  )
  SELECT
    COALESCE(SUM(ABS(CASE WHEN p_currency IS NULL
      THEN COALESCE(item.normalized_amount_cents, item.amount_cents)
      ELSE item.amount_cents END)), 0)::BIGINT,
    COALESCE(p_currency, MAX(item.base_currency), MAX(item.currency), 'USD')::VARCHAR(3),
    COALESCE((SELECT JSONB_OBJECT_AGG(member_key, total_cents) FROM member_totals), '{}'::JSONB),
    COALESCE((SELECT JSONB_OBJECT_AGG(category, total_cents) FROM category_totals), '{}'::JSONB),
    COUNT(*)::INTEGER
  FROM filtered_income item;
END;
$$;

REVOKE ALL ON FUNCTION public.get_household_income_summary_v2(
  UUID, UUID, DATE, DATE, VARCHAR
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_household_income_summary_v2(
  UUID, UUID, DATE, DATE, VARCHAR
) TO service_role;

NOTIFY pgrst, 'reload schema';
