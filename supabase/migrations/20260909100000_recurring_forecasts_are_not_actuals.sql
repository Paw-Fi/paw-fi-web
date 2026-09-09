-- Scheduled recurring occurrences are forecasts. They must never alter pocket
-- spend, balances, carry, or other actual accounting fields before confirmation.

DO $$
BEGIN
  IF to_regprocedure(
    'public.get_pockets_month_v2_financial_with_forecasts(uuid,text,date,uuid,text,boolean,boolean)'
  ) IS NULL THEN
    ALTER FUNCTION public.get_pockets_month_v2_financial_impl(
      UUID, TEXT, DATE, UUID, TEXT, BOOLEAN, BOOLEAN
    ) RENAME TO get_pockets_month_v2_financial_with_forecasts;
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
  v_payload JSONB;
  v_currency TEXT;
  v_financial_month_start_day INTEGER;
  v_upcoming JSONB := '[]'::JSONB;
BEGIN
  v_payload := public.get_pockets_month_v2_financial_with_forecasts(
    p_user_id,
    p_scope,
    p_period_month,
    p_household_id,
    p_currency,
    FALSE,
    p_allow_currency_fallback
  );

  v_currency := UPPER(COALESCE(v_payload ->> 'selected_currency', p_currency));
  v_financial_month_start_day := public.user_financial_month_start_day(p_user_id);

  IF p_include_projected_recurring THEN
    SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
      'id', projected.id,
      'recurring_id', projected.recurring_id,
      'date', projected.date,
      'amount_cents', ABS(projected.amount_cents),
      'currency', projected.currency,
      'category', projected.category,
      'household_id', projected.household_id,
      'user_id', projected.user_id,
      'split_group_id', projected.split_group_id,
      'raw_text', projected.raw_text,
      'type', projected.type,
      'account_id', projected.account_id
    ) ORDER BY projected.date, projected.id), '[]'::JSONB)
    INTO v_upcoming
    FROM public.get_projected_scoped_recurring_expenses_v1(
      p_user_id,
      p_scope,
      p_household_id,
      v_currency,
      p_period_month,
      public.next_financial_cycle_start(
        p_period_month,
        v_financial_month_start_day
      ) - 1
    ) projected;
  END IF;

  RETURN v_payload || JSONB_BUILD_OBJECT('upcoming_recurring', v_upcoming);
END;
$$;

NOTIFY pgrst, 'reload schema';
