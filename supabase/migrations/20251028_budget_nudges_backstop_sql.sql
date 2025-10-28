-- ====================
-- BUDGET NUDGES BACKSTOP - PURE SQL IMPLEMENTATION
-- Created: 2025-10-28
-- Purpose: Replace pg_net-dependent backstop with pure SQL procedure
-- ====================

-- ====================
-- 1. CREATE PURE SQL BACKSTOP PROCEDURE
-- ====================

CREATE OR REPLACE FUNCTION public.recompute_budget_nudges(
  p_window_days INT DEFAULT 1
)
RETURNS TABLE(
  budgets_evaluated INT,
  nudges_emitted INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household RECORD;
  v_budget RECORD;
  v_spending RECORD;
  v_timezone VARCHAR(100);
  v_period_data RECORD;
  v_percentage NUMERIC;
  v_already_sent BOOLEAN;
  v_recipient RECORD;
  v_total_budgets INT := 0;
  v_total_nudges INT := 0;
BEGIN
  -- Get households with recent activity (last p_window_days)
  FOR v_household IN
    SELECT DISTINCT h.id, h.timezone
    FROM public.households h
    INNER JOIN public.expenses e ON e.household_id = h.id
    WHERE e.date >= CURRENT_DATE - p_window_days
      AND e.date <= CURRENT_DATE
  LOOP
    v_timezone := COALESCE(v_household.timezone, 'UTC');

    -- Get active budgets for this household
    FOR v_budget IN
      SELECT *
      FROM public.shared_budgets
      WHERE household_id = v_household.id
        AND is_active = true
    LOOP
      v_total_budgets := v_total_budgets + 1;

      -- Calculate current spending for this budget
      BEGIN
        SELECT *
        INTO v_spending
        FROM public.calculate_period_spending(
          v_budget.id,
          CURRENT_DATE,
          v_timezone
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to calculate spending for budget %: %', v_budget.id, SQLERRM;
        CONTINUE;
      END;

      -- Skip if no spending data
      IF v_spending IS NULL THEN
        CONTINUE;
      END IF;

      v_percentage := v_spending.percentage_used / 100.0; -- Convert to decimal

      -- Check alert threshold (100%)
      IF v_percentage >= v_budget.alert_threshold THEN
        -- Check if already sent this period
        SELECT EXISTS(
          SELECT 1 FROM public.budget_nudge_log
          WHERE budget_id = v_budget.id
            AND event_type = 'budget_alert'
            AND period_start = v_spending.period_start
        ) INTO v_already_sent;

        IF NOT v_already_sent THEN
          -- Get recipients (household: all members, personal: owner only)
          IF v_budget.budget_type = 'household' THEN
            -- Send to all household members
            FOR v_recipient IN
              SELECT user_id, household_id
              FROM public.household_members
              WHERE household_id = v_household.id
            LOOP
              -- Insert notification event
              INSERT INTO public.notification_events (
                household_id,
                user_id,
                event_type,
                budget_id,
                payload
              ) VALUES (
                v_recipient.household_id,
                v_recipient.user_id,
                'budget_alert',
                v_budget.id,
                jsonb_build_object(
                  'budget_id', v_budget.id,
                  'budget_name', v_budget.name,
                  'currency', v_budget.currency,
                  'budget_cents', v_spending.budget_cents,
                  'spent_cents', v_spending.spent_cents,
                  'percentage_used', v_spending.percentage_used,
                  'period_start', v_spending.period_start,
                  'period_end', v_spending.period_end,
                  'budget_type', v_budget.budget_type
                )
              );
              v_total_nudges := v_total_nudges + 1;
            END LOOP;
          ELSE
            -- Personal budget: owner only
            IF v_budget.user_id IS NOT NULL THEN
              INSERT INTO public.notification_events (
                household_id,
                user_id,
                event_type,
                budget_id,
                payload
              ) VALUES (
                v_household.id,
                v_budget.user_id,
                'budget_alert',
                v_budget.id,
                jsonb_build_object(
                  'budget_id', v_budget.id,
                  'budget_name', v_budget.name,
                  'currency', v_budget.currency,
                  'budget_cents', v_spending.budget_cents,
                  'spent_cents', v_spending.spent_cents,
                  'percentage_used', v_spending.percentage_used,
                  'period_start', v_spending.period_start,
                  'period_end', v_spending.period_end,
                  'budget_type', v_budget.budget_type
                )
              );
              v_total_nudges := v_total_nudges + 1;
            END IF;
          END IF;

          -- Log to idempotency table
          INSERT INTO public.budget_nudge_log (
            budget_id,
            household_id,
            event_type,
            period_start,
            period_end,
            spent_cents,
            budget_cents,
            percentage_used
          ) VALUES (
            v_budget.id,
            v_household.id,
            'budget_alert',
            v_spending.period_start,
            v_spending.period_end,
            v_spending.spent_cents,
            v_spending.budget_cents,
            v_spending.percentage_used
          )
          ON CONFLICT (budget_id, event_type, period_start) DO NOTHING;
        END IF;

      -- Check warn threshold (80%)
      ELSIF v_percentage >= v_budget.warn_threshold THEN
        -- Check if already sent this period
        SELECT EXISTS(
          SELECT 1 FROM public.budget_nudge_log
          WHERE budget_id = v_budget.id
            AND event_type = 'budget_warn'
            AND period_start = v_spending.period_start
        ) INTO v_already_sent;

        IF NOT v_already_sent THEN
          -- Get recipients (same logic as alert)
          IF v_budget.budget_type = 'household' THEN
            FOR v_recipient IN
              SELECT user_id, household_id
              FROM public.household_members
              WHERE household_id = v_household.id
            LOOP
              INSERT INTO public.notification_events (
                household_id,
                user_id,
                event_type,
                budget_id,
                payload
              ) VALUES (
                v_recipient.household_id,
                v_recipient.user_id,
                'budget_warn',
                v_budget.id,
                jsonb_build_object(
                  'budget_id', v_budget.id,
                  'budget_name', v_budget.name,
                  'currency', v_budget.currency,
                  'budget_cents', v_spending.budget_cents,
                  'spent_cents', v_spending.spent_cents,
                  'percentage_used', v_spending.percentage_used,
                  'period_start', v_spending.period_start,
                  'period_end', v_spending.period_end,
                  'budget_type', v_budget.budget_type
                )
              );
              v_total_nudges := v_total_nudges + 1;
            END LOOP;
          ELSE
            IF v_budget.user_id IS NOT NULL THEN
              INSERT INTO public.notification_events (
                household_id,
                user_id,
                event_type,
                budget_id,
                payload
              ) VALUES (
                v_household.id,
                v_budget.user_id,
                'budget_warn',
                v_budget.id,
                jsonb_build_object(
                  'budget_id', v_budget.id,
                  'budget_name', v_budget.name,
                  'currency', v_budget.currency,
                  'budget_cents', v_spending.budget_cents,
                  'spent_cents', v_spending.spent_cents,
                  'percentage_used', v_spending.percentage_used,
                  'period_start', v_spending.period_start,
                  'period_end', v_spending.period_end,
                  'budget_type', v_budget.budget_type
                )
              );
              v_total_nudges := v_total_nudges + 1;
            END IF;
          END IF;

          -- Log to idempotency table
          INSERT INTO public.budget_nudge_log (
            budget_id,
            household_id,
            event_type,
            period_start,
            period_end,
            spent_cents,
            budget_cents,
            percentage_used
          ) VALUES (
            v_budget.id,
            v_household.id,
            'budget_warn',
            v_spending.period_start,
            v_spending.period_end,
            v_spending.spent_cents,
            v_spending.budget_cents,
            v_spending.percentage_used
          )
          ON CONFLICT (budget_id, event_type, period_start) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '[budget-nudges-backstop] Evaluated % budgets, emitted % nudges', v_total_budgets, v_total_nudges;

  RETURN QUERY SELECT v_total_budgets, v_total_nudges;
END;
$$;

COMMENT ON FUNCTION public.recompute_budget_nudges IS
  'Pure SQL backstop for budget nudges - scans recent budgets and emits notifications directly';

-- ====================
-- 2. UPDATE CRON JOB TO USE SQL PROCEDURE
-- ====================

-- Remove old pg_net-based cron job
SELECT cron.unschedule('budget-nudges-backstop')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'budget-nudges-backstop'
);

-- Create new SQL-based cron job (every 15 minutes)
SELECT cron.schedule(
  'budget-nudges-backstop-sql',
  '*/15 * * * *',  -- Every 15 minutes
  $$
    SELECT public.recompute_budget_nudges(1); -- Scan last 24 hours
  $$
);

COMMENT ON EXTENSION cron IS 'Budget nudges backstop runs every 15 minutes via pure SQL';

-- ====================
-- 3. CREATE CRON LOG TABLE (if not exists)
-- ====================

CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id BIGSERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN,
  result JSONB,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_started_at ON public.cron_job_logs(started_at DESC);

COMMENT ON TABLE public.cron_job_logs IS 'Logs for scheduled cron jobs including budget nudges backstop';

-- ====================
-- VERIFICATION
-- ====================

DO $$
BEGIN
  RAISE NOTICE '✅ Budget nudges backstop SQL migration complete!';
  RAISE NOTICE '   - Created recompute_budget_nudges() procedure';
  RAISE NOTICE '   - Updated cron job to use SQL procedure (no pg_net dependency)';
  RAISE NOTICE '   - Runs every 15 minutes';
  RAISE NOTICE '';
  RAISE NOTICE 'Manual test:';
  RAISE NOTICE '  SELECT * FROM public.recompute_budget_nudges(1);';
END;
$$;
