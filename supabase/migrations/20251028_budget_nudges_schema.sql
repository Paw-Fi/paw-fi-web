-- ====================
-- BUDGET NUDGES SCHEMA ENHANCEMENTS
-- Created: 2025-10-28
-- Purpose: Enable automatic budget threshold notifications
-- Spec: BUDGET_NUDGE_IMPLEMENTATION.md
-- ====================

-- ====================
-- 1. ADD BUDGET_ID TO NOTIFICATION_EVENTS
-- ====================

-- Add budget_id column to track which budget triggered the notification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_events' AND column_name = 'budget_id'
  ) THEN
    ALTER TABLE public.notification_events
    ADD COLUMN budget_id UUID REFERENCES public.shared_budgets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for efficient budget notification queries
CREATE INDEX IF NOT EXISTS idx_notification_events_budget_id
  ON public.notification_events(budget_id, event_type, created_at)
  WHERE budget_id IS NOT NULL;

COMMENT ON COLUMN public.notification_events.budget_id IS 'Budget that triggered this notification (for budget_warn/budget_alert events)';

-- ====================
-- 2. ADD TIMEZONE TO HOUSEHOLDS
-- ====================

-- Add timezone column for accurate period calculations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.households
    ADD COLUMN timezone VARCHAR(100) DEFAULT 'UTC';
  END IF;
END $$;

-- Create index for timezone queries
CREATE INDEX IF NOT EXISTS idx_households_timezone
  ON public.households(timezone);

COMMENT ON COLUMN public.households.timezone IS 'IANA timezone for budget period calculations (e.g., America/New_York, Europe/London)';

-- ====================
-- 3. CREATE BUDGET NUDGE IDEMPOTENCY LOG (OPTIONAL BUT RECOMMENDED)
-- ====================

CREATE TABLE IF NOT EXISTS public.budget_nudge_log (
  budget_id UUID NOT NULL REFERENCES public.shared_budgets(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  event_type notification_event_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  spent_cents BIGINT NOT NULL,
  budget_cents BIGINT NOT NULL,
  percentage_used NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (budget_id, event_type, period_start),

  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_event_type CHECK (event_type IN ('budget_warn', 'budget_alert')),
  CONSTRAINT valid_amounts CHECK (spent_cents >= 0 AND budget_cents > 0),
  CONSTRAINT valid_percentage CHECK (percentage_used >= 0 AND percentage_used <= 999.99)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_budget_nudge_log_household
  ON public.budget_nudge_log(household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_budget_nudge_log_period
  ON public.budget_nudge_log(period_start, period_end);

COMMENT ON TABLE public.budget_nudge_log IS 'Idempotency log for budget threshold notifications (ensures max one nudge per budget per threshold per period)';
COMMENT ON COLUMN public.budget_nudge_log.period_start IS 'Start date of budget period (local date in household timezone)';
COMMENT ON COLUMN public.budget_nudge_log.period_end IS 'End date of budget period (local date in household timezone)';
COMMENT ON COLUMN public.budget_nudge_log.spent_cents IS 'Amount spent at time of nudge (in cents)';
COMMENT ON COLUMN public.budget_nudge_log.percentage_used IS 'Percentage of budget used (0-100+)';

-- ====================
-- 4. HELPER FUNCTION: CALCULATE PERIOD WINDOW
-- ====================

CREATE OR REPLACE FUNCTION public.calculate_period_window(
  p_period budget_period,
  p_reference_date DATE,
  p_timezone VARCHAR(100) DEFAULT 'UTC'
)
RETURNS TABLE(period_start DATE, period_end DATE)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_ref_timestamp TIMESTAMPTZ;
  v_start_timestamp TIMESTAMPTZ;
  v_end_timestamp TIMESTAMPTZ;
BEGIN
  -- Convert reference date to timestamp in household timezone
  v_ref_timestamp := (p_reference_date::TEXT || ' 00:00:00')::TIMESTAMP AT TIME ZONE p_timezone;

  -- Calculate period boundaries based on budget period type
  CASE p_period
    WHEN 'daily' THEN
      -- Daily: 00:00:00 to 23:59:59 of reference date
      v_start_timestamp := date_trunc('day', v_ref_timestamp);
      v_end_timestamp := v_start_timestamp + INTERVAL '1 day' - INTERVAL '1 second';

    WHEN 'weekly' THEN
      -- Weekly: Monday 00:00:00 to Sunday 23:59:59
      v_start_timestamp := date_trunc('week', v_ref_timestamp); -- Monday
      v_end_timestamp := v_start_timestamp + INTERVAL '7 days' - INTERVAL '1 second';

    WHEN 'monthly' THEN
      -- Monthly: First day 00:00:00 to last day 23:59:59 of month
      v_start_timestamp := date_trunc('month', v_ref_timestamp);
      v_end_timestamp := (date_trunc('month', v_ref_timestamp) + INTERVAL '1 month') - INTERVAL '1 second';

    WHEN 'yearly' THEN
      -- Yearly: Jan 1 00:00:00 to Dec 31 23:59:59
      v_start_timestamp := date_trunc('year', v_ref_timestamp);
      v_end_timestamp := (date_trunc('year', v_ref_timestamp) + INTERVAL '1 year') - INTERVAL '1 second';

    ELSE
      RAISE EXCEPTION 'Invalid budget period: %', p_period;
  END CASE;

  -- Convert back to dates in household timezone
  RETURN QUERY SELECT
    (v_start_timestamp AT TIME ZONE p_timezone)::DATE,
    (v_end_timestamp AT TIME ZONE p_timezone)::DATE;
END;
$$;

COMMENT ON FUNCTION public.calculate_period_window IS 'Calculate budget period start and end dates in household timezone';

GRANT EXECUTE ON FUNCTION public.calculate_period_window TO authenticated;

-- ====================
-- 5. HELPER FUNCTION: CALCULATE PERIOD SPENDING WITH TIMEZONE
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
    SELECT COALESCE(SUM(ABS(amount_cents)), 0)
    INTO v_total_spending
    FROM public.expenses
    WHERE household_id = v_household_id
      AND currency = v_currency
      AND date >= v_period_start
      AND date <= v_period_end
      AND amount_cents < 0; -- Only expenses (negative amounts)

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
          AND e.amount_cents < 0
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
        AND date <= v_period_end
        AND amount_cents < 0;
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

COMMENT ON FUNCTION public.calculate_period_spending IS 'Calculate budget spending for current period with timezone awareness and split support';

GRANT EXECUTE ON FUNCTION public.calculate_period_spending TO authenticated;

-- ====================
-- 6. UPDATE RLS POLICIES FOR BUDGET_NUDGE_LOG
-- ====================

ALTER TABLE public.budget_nudge_log ENABLE ROW LEVEL SECURITY;

-- Users can view budget nudge logs for their households
CREATE POLICY "Users can view budget nudge logs for their households"
  ON public.budget_nudge_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = budget_nudge_log.household_id
        AND household_members.user_id = auth.uid()
    )
  );

-- Only backend (service role) can insert budget nudge logs
CREATE POLICY "Service role can insert budget nudge logs"
  ON public.budget_nudge_log
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' = 'service_role'
  );

-- ====================
-- MIGRATION COMPLETE
-- ====================

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Budget Nudges Schema Migration Complete!';
  RAISE NOTICE '✅ Added notification_events.budget_id column';
  RAISE NOTICE '✅ Added households.timezone column';
  RAISE NOTICE '✅ Created budget_nudge_log idempotency table';
  RAISE NOTICE '✅ Created calculate_period_window() helper';
  RAISE NOTICE '✅ Created calculate_period_spending() helper';
  RAISE NOTICE '✅ Configured RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Set household timezones: UPDATE households SET timezone = ''America/New_York'' WHERE ...';
  RAISE NOTICE '2. Deploy budget-nudge-evaluator.ts shared module';
  RAISE NOTICE '3. Integrate evaluator into expense Edge Functions';
  RAISE NOTICE '4. Deploy budget-nudges-backstop Edge Function';
  RAISE NOTICE '5. Schedule backstop cron job';
END;
$$;
