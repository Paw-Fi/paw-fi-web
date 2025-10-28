-- ====================
-- FIX: Budget Spending Sign Convention
-- Created: 2025-10-28
-- Issue: Expenses stored as positive amounts, but spending functions filter amount_cents < 0
-- Result: All budget spending calculations return 0
-- ====================

-- ====================
-- 1. FIX calculate_period_spending() - Remove Sign Filter
-- ====================

CREATE OR REPLACE FUNCTION public.calculate_period_spending(
  p_budget_id UUID,
  p_reference_date DATE DEFAULT CURRENT_DATE,
  p_timezone VARCHAR(100) DEFAULT 'UTC'
)
RETURNS TABLE(
  spent_cents BIGINT,
  period_start DATE,
  period_end DATE,
  budget_cents BIGINT,
  currency VARCHAR(3),
  percentage_used NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget_type budget_type;
  v_user_id UUID;
  v_household_id UUID;
  v_currency VARCHAR(3);
  v_count_split_portion BOOLEAN;
  v_period budget_period;
  v_budget_amount BIGINT;
  v_period_start DATE;
  v_period_end DATE;
  v_total_spending BIGINT := 0;
  v_percentage NUMERIC(5,2);
BEGIN
  -- Get budget details
  SELECT
    budget_type, user_id, household_id, currency,
    count_split_portion_only, period, amount_cents
  INTO
    v_budget_type, v_user_id, v_household_id, v_currency,
    v_count_split_portion, v_period, v_budget_amount
  FROM public.shared_budgets
  WHERE id = p_budget_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget not found or inactive: %', p_budget_id;
  END IF;

  -- Calculate period window in household timezone
  SELECT pw.period_start, pw.period_end
  INTO v_period_start, v_period_end
  FROM public.calculate_period_window(v_period, p_reference_date, p_timezone) pw;

  -- Calculate spending based on budget type
  IF v_budget_type = 'household' THEN
    -- Household budget: sum all household expenses in period
    -- FIX: Expenses are stored as POSITIVE amounts (outflows)
    -- Use ABS() defensively and remove sign filter
    SELECT COALESCE(SUM(ABS(amount_cents)), 0)
    INTO v_total_spending
    FROM public.expenses
    WHERE household_id = v_household_id
      AND currency = v_currency
      AND date >= v_period_start
      AND date <= v_period_end;
      -- REMOVED: AND amount_cents < 0  (expenses are positive)

  ELSE
    -- Personal budget
    IF v_count_split_portion THEN
      -- Count only user's split portion
      WITH user_expense_splits AS (
        SELECT
          e.id AS expense_id,
          e.amount_cents,
          esl.amount_cents AS split_amount
        FROM public.expenses e
        LEFT JOIN public.expense_split_groups esg ON esg.expense_id = e.id
        LEFT JOIN public.expense_split_lines esl ON esl.split_group_id = esg.id AND esl.user_id = v_user_id
        WHERE e.user_id = v_user_id
          AND e.household_id = v_household_id
          AND e.currency = v_currency
          AND e.date >= v_period_start
          AND e.date <= v_period_end
          -- REMOVED: AND e.amount_cents < 0
      )
      SELECT COALESCE(SUM(
        CASE
          WHEN split_amount IS NOT NULL THEN ABS(split_amount)
          ELSE ABS(amount_cents)
        END
      ), 0)
      INTO v_total_spending
      FROM user_expense_splits;
    ELSE
      -- Count full transaction amount (ignoring splits)
      SELECT COALESCE(SUM(ABS(amount_cents)), 0)
      INTO v_total_spending
      FROM public.expenses
      WHERE user_id = v_user_id
        AND household_id = v_household_id
        AND currency = v_currency
        AND date >= v_period_start
        AND date <= v_period_end;
        -- REMOVED: AND amount_cents < 0
    END IF;
  END IF;

  -- Calculate percentage used
  v_percentage := CASE
    WHEN v_budget_amount > 0 THEN (v_total_spending::NUMERIC / v_budget_amount::NUMERIC) * 100
    ELSE 0
  END;

  -- Return results
  RETURN QUERY SELECT
    v_total_spending,
    v_period_start,
    v_period_end,
    v_budget_amount,
    v_currency,
    ROUND(v_percentage, 2);
END;
$$;

COMMENT ON FUNCTION public.calculate_period_spending IS
  'Calculate budget spending for current period (FIXED: handles positive expense amounts)';

-- ====================
-- 2. FIX calculate_budget_spending() - Remove Sign Filter
-- ====================

CREATE OR REPLACE FUNCTION public.calculate_budget_spending(
  p_budget_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget_type budget_type;
  v_user_id UUID;
  v_household_id UUID;
  v_currency VARCHAR(3);
  v_count_split_portion BOOLEAN;
  v_total_spending BIGINT := 0;
BEGIN
  -- Get budget details
  SELECT budget_type, user_id, household_id, currency, count_split_portion_only
  INTO v_budget_type, v_user_id, v_household_id, v_currency, v_count_split_portion
  FROM public.shared_budgets
  WHERE id = p_budget_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget not found';
  END IF;

  IF v_budget_type = 'household' THEN
    -- Household budget: sum all household expenses
    -- FIX: Expenses are positive, remove sign filter
    SELECT COALESCE(SUM(ABS(amount_cents)), 0)
    INTO v_total_spending
    FROM public.expenses
    WHERE household_id = v_household_id
      AND currency = v_currency
      AND date >= p_start_date
      AND date <= p_end_date;
      -- REMOVED: AND amount_cents < 0
  ELSE
    -- Personal budget
    IF v_count_split_portion THEN
      -- Count only user's split portion
      WITH user_expense_splits AS (
        SELECT
          e.id AS expense_id,
          e.amount_cents,
          esl.amount_cents AS split_amount
        FROM public.expenses e
        LEFT JOIN public.expense_split_groups esg ON esg.expense_id = e.id
        LEFT JOIN public.expense_split_lines esl ON esl.split_group_id = esg.id AND esl.user_id = v_user_id
        WHERE e.user_id = v_user_id
          AND e.household_id = v_household_id
          AND e.currency = v_currency
          AND e.date >= p_start_date
          AND e.date <= p_end_date
          -- REMOVED: AND e.amount_cents < 0
      )
      SELECT COALESCE(SUM(
        CASE
          WHEN split_amount IS NOT NULL THEN split_amount
          ELSE ABS(amount_cents)
        END
      ), 0)
      INTO v_total_spending
      FROM user_expense_splits;
    ELSE
      -- Count full transaction amount (ignoring splits)
      SELECT COALESCE(SUM(ABS(amount_cents)), 0)
      INTO v_total_spending
      FROM public.expenses
      WHERE user_id = v_user_id
        AND household_id = v_household_id
        AND currency = v_currency
        AND date >= p_start_date
        AND date <= p_end_date;
        -- REMOVED: AND amount_cents < 0
    END IF;
  END IF;

  RETURN v_total_spending;
END;
$$;

COMMENT ON FUNCTION public.calculate_budget_spending IS
  'Calculate budget spending with split awareness (FIXED: handles positive expense amounts)';

-- ====================
-- VERIFICATION
-- ====================

DO $$
BEGIN
  RAISE NOTICE '✅ Budget spending functions fixed!';
  RAISE NOTICE '   - Removed amount_cents < 0 filter';
  RAISE NOTICE '   - Now correctly sums positive expense amounts';
  RAISE NOTICE '';
  RAISE NOTICE 'Test with:';
  RAISE NOTICE '  SELECT * FROM calculate_period_spending(''<budget_id>'', CURRENT_DATE, ''UTC'');';
END;
$$;
