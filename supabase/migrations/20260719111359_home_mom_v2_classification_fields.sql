CREATE OR REPLACE FUNCTION public.get_home_mom_transactions_v2(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_before_date DATE DEFAULT NULL,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 1000
) RETURNS TABLE (
  id TEXT,
  contact_id UUID,
  user_id UUID,
  household_id UUID,
  date DATE,
  amount_cents BIGINT,
  currency TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  raw_text TEXT,
  split_group_id UUID,
  bank_account_id UUID,
  type TEXT,
  analytics_class TEXT,
  analytics_is_final BOOLEAN,
  analytics_spending_multiplier SMALLINT,
  analytics_counts_toward_income BOOLEAN,
  is_recurring BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_auth_user_id UUID := (SELECT auth.uid());
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 1000), 1), 1000);
BEGIN
  IF v_auth_user_id IS NULL OR v_auth_user_id <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized Home month-over-month access'
      USING ERRCODE = '42501';
  END IF;

  IF p_before_date IS NOT NULL AND p_before_id IS NULL THEN
    RAISE EXCEPTION 'Incomplete Home month-over-month cursor'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH contact_ids AS (
    SELECT uc.id
    FROM public.user_contacts uc
    WHERE uc.user_id = p_user_id
  )
  SELECT
    e.id::TEXT,
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
    e.split_group_id,
    e.bank_account_id,
    LOWER(COALESCE(e.type::TEXT, 'expense')),
    e.analytics_class,
    e.analytics_is_final,
    e.analytics_spending_multiplier,
    e.analytics_counts_toward_income,
    e.is_recurring
  FROM public.expenses e
  WHERE e.deleted_at IS NULL
    AND e.split_group_id IS NULL
    AND COALESCE(e.is_recurring, FALSE) = FALSE
    AND (
      e.user_id = p_user_id
      OR EXISTS (
        SELECT 1
        FROM contact_ids contact
        WHERE contact.id = e.contact_id
      )
    )
    AND (p_start_date IS NULL OR e.date >= p_start_date)
    AND (p_end_date IS NULL OR e.date <= p_end_date)
    AND (
      p_before_date IS NULL
      OR (
        e.date,
        CASE WHEN e.created_at IS NULL THEN 1 ELSE 0 END,
        COALESCE(e.created_at, '-infinity'::TIMESTAMPTZ),
        e.id
      ) < (
        p_before_date,
        CASE WHEN p_before_created_at IS NULL THEN 1 ELSE 0 END,
        COALESCE(p_before_created_at, '-infinity'::TIMESTAMPTZ),
        p_before_id
      )
    )
  ORDER BY e.date DESC, e.created_at DESC NULLS FIRST, e.id DESC
  LIMIT v_limit;
END;
$$;

COMMENT ON FUNCTION public.get_home_mom_transactions_v2(
  UUID,
  DATE,
  DATE,
  DATE,
  TIMESTAMPTZ,
  UUID,
  INTEGER
) IS 'Returns classification-complete Home month-over-month transaction pages.';

REVOKE ALL ON FUNCTION public.get_home_mom_transactions_v2(
  UUID,
  DATE,
  DATE,
  DATE,
  TIMESTAMPTZ,
  UUID,
  INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_home_mom_transactions_v2(
  UUID,
  DATE,
  DATE,
  DATE,
  TIMESTAMPTZ,
  UUID,
  INTEGER
) TO authenticated;

NOTIFY pgrst, 'reload schema';
