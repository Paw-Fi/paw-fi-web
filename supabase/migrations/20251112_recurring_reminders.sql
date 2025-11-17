-- ====================
-- RECURRING TRANSACTION REMINDERS
-- Created: 2025-11-12
-- Purpose: Add reminder support for recurring transactions
-- ====================

-- ====================
-- REMINDERS SENT TRACKING TABLE
-- ====================
-- Tracks which occurrence dates have been reminded to prevent duplicate notifications

CREATE TABLE IF NOT EXISTS public.recurring_transaction_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  reminded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure we only remind once per occurrence
  UNIQUE(expense_id, occurrence_date)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reminders_sent_expense_id ON public.recurring_transaction_reminders_sent(expense_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_occurrence ON public.recurring_transaction_reminders_sent(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_reminded_at ON public.recurring_transaction_reminders_sent(reminded_at);

COMMENT ON TABLE public.recurring_transaction_reminders_sent IS 'Tracks which recurring transaction occurrences have been reminded to prevent duplicate notifications';
COMMENT ON COLUMN public.recurring_transaction_reminders_sent.expense_id IS 'Reference to the recurring transaction';
COMMENT ON COLUMN public.recurring_transaction_reminders_sent.occurrence_date IS 'The date of the occurrence that was reminded';
COMMENT ON COLUMN public.recurring_transaction_reminders_sent.reminded_at IS 'When the reminder notification was sent';

-- ====================
-- ADD NEW NOTIFICATION EVENT TYPE
-- ====================

-- Add recurring_reminder to the notification_event_type enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_event_type' AND e.enumlabel = 'recurring_reminder'
  ) THEN
    ALTER TYPE notification_event_type ADD VALUE 'recurring_reminder';
  END IF;
END $$;

-- ====================
-- FUNCTION: Calculate Next Occurrence Date
-- ====================
-- Calculates the next occurrence date for a recurring transaction

CREATE OR REPLACE FUNCTION public.calculate_next_occurrence(
  p_anchor_date DATE,
  p_frequency TEXT,
  p_interval INTEGER DEFAULT 1,
  p_end_date DATE DEFAULT NULL
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_next_date DATE;
  v_days_diff INTEGER;
  v_weeks_diff INTEGER;
  v_months_diff INTEGER;
  v_years_diff INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- If today is before anchor, return anchor
  IF v_today < p_anchor_date THEN
    RETURN p_anchor_date;
  END IF;

  -- If there's an end date and we're past it, return NULL
  IF p_end_date IS NOT NULL AND v_today > p_end_date THEN
    RETURN NULL;
  END IF;

  -- Calculate next occurrence based on frequency
  CASE p_frequency
    WHEN 'daily' THEN
      v_days_diff := v_today - p_anchor_date;
      v_next_date := p_anchor_date + (CEIL(v_days_diff::NUMERIC / p_interval) * p_interval)::INTEGER;
      
    WHEN 'weekly' THEN
      v_weeks_diff := FLOOR((v_today - p_anchor_date) / 7.0);
      v_next_date := p_anchor_date + ((CEIL(v_weeks_diff::NUMERIC / p_interval) * p_interval * 7))::INTEGER;
      
    WHEN 'biweekly' THEN
      v_weeks_diff := FLOOR((v_today - p_anchor_date) / 7.0);
      v_next_date := p_anchor_date + ((CEIL(v_weeks_diff::NUMERIC / 2.0) * 2 * 7))::INTEGER;
      
    WHEN 'monthly' THEN
      v_months_diff := EXTRACT(YEAR FROM AGE(v_today, p_anchor_date)) * 12 + 
                      EXTRACT(MONTH FROM AGE(v_today, p_anchor_date));
      v_next_date := p_anchor_date + (CEIL(v_months_diff::NUMERIC / p_interval) * p_interval || ' months')::INTERVAL;
      
    WHEN 'yearly' THEN
      v_years_diff := EXTRACT(YEAR FROM AGE(v_today, p_anchor_date));
      v_next_date := p_anchor_date + (CEIL(v_years_diff::NUMERIC / p_interval) * p_interval || ' years')::INTERVAL;
      
    ELSE
      -- Unknown frequency, return anchor
      RETURN p_anchor_date;
  END CASE;

  -- If calculated date is past end_date, return NULL
  IF p_end_date IS NOT NULL AND v_next_date > p_end_date THEN
    RETURN NULL;
  END IF;

  RETURN v_next_date;
END;
$$;

COMMENT ON FUNCTION public.calculate_next_occurrence IS 'Calculates the next occurrence date for a recurring transaction based on frequency and interval';

-- ====================
-- FUNCTION: Check and Create Recurring Reminders
-- ====================
-- Checks all recurring transactions with reminders and creates notifications

CREATE OR REPLACE FUNCTION public.check_recurring_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense RECORD;
  v_next_occurrence DATE;
  v_reminder_trigger_time TIMESTAMPTZ;
  v_reminder_value INTEGER;
  v_reminder_unit TEXT;
  v_notification_id UUID;
  v_reminders_created INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  -- Loop through all active recurring transactions with reminders enabled
  FOR v_expense IN
    SELECT 
      id,
      user_id,
      household_id,
      category,
      amount_cents,
      currency,
      type,
      recurrence_rule,
      (recurrence_rule->>'anchor_date')::DATE as anchor_date,
      recurrence_rule->>'frequency' as frequency,
      COALESCE((recurrence_rule->>'interval')::INTEGER, 1) as interval,
      (recurrence_rule->>'end_date')::DATE as end_date,
      (recurrence_rule->'reminder'->>'enabled')::BOOLEAN as reminder_enabled,
      (recurrence_rule->'reminder'->>'value')::INTEGER as reminder_value,
      recurrence_rule->'reminder'->>'unit' as reminder_unit
    FROM public.expenses
    WHERE is_recurring = true
      AND recurrence_rule IS NOT NULL
      AND recurrence_rule->'reminder'->>'enabled' = 'true'
      AND (recurrence_rule->>'end_date' IS NULL OR (recurrence_rule->>'end_date')::DATE >= CURRENT_DATE)
  LOOP
    BEGIN
      -- Calculate next occurrence
      v_next_occurrence := calculate_next_occurrence(
        v_expense.anchor_date,
        v_expense.frequency,
        v_expense.interval,
        v_expense.end_date
      );

      -- Skip if no next occurrence (past end date)
      CONTINUE WHEN v_next_occurrence IS NULL;

      -- Calculate reminder trigger time
      v_reminder_value := v_expense.reminder_value;
      v_reminder_unit := v_expense.reminder_unit;

      IF v_reminder_unit = 'days' THEN
        v_reminder_trigger_time := (v_next_occurrence - (v_reminder_value || ' days')::INTERVAL)::TIMESTAMPTZ;
      ELSIF v_reminder_unit = 'hours' THEN
        v_reminder_trigger_time := (v_next_occurrence - (v_reminder_value || ' hours')::INTERVAL)::TIMESTAMPTZ;
      ELSE
        -- Unknown unit, skip
        CONTINUE;
      END IF;

      -- Check if it's time to send reminder and hasn't been sent yet
      IF NOW() >= v_reminder_trigger_time THEN
        -- Check if not already reminded for this occurrence
        IF NOT EXISTS (
          SELECT 1 FROM public.recurring_transaction_reminders_sent
          WHERE expense_id = v_expense.id
            AND occurrence_date = v_next_occurrence
        ) THEN
          -- Personal vs household notifications:
          -- - Personal (household_id IS NULL): single notification to owner
          -- - Household: same notification payload to every household member (including the creator)
          IF v_expense.household_id IS NULL THEN
            INSERT INTO public.notification_events (
              household_id,
              user_id,
              event_type,
              payload,
              is_sent,
              created_at
            ) VALUES (
              NULL,
              v_expense.user_id,
              'recurring_reminder',
              jsonb_build_object(
                'expense_id', v_expense.id,
                'category', v_expense.category,
                'amount_cents', v_expense.amount_cents,
                'currency', v_expense.currency,
                'type', v_expense.type,
                'occurrence_date', v_next_occurrence,
                'reminder_value', v_reminder_value,
                'reminder_unit', v_reminder_unit,
                'frequency', v_expense.frequency
              ),
              false,
              NOW()
            ) RETURNING id INTO v_notification_id;
          ELSE
            -- Household recurring reminder: notify every household member
            INSERT INTO public.notification_events (
              household_id,
              user_id,
              event_type,
              payload,
              is_sent,
              created_at
            )
            SELECT
              v_expense.household_id,
              hm.user_id,
              'recurring_reminder',
              jsonb_build_object(
                'expense_id', v_expense.id,
                'category', v_expense.category,
                'amount_cents', v_expense.amount_cents,
                'currency', v_expense.currency,
                'type', v_expense.type,
                'occurrence_date', v_next_occurrence,
                'reminder_value', v_reminder_value,
                'reminder_unit', v_reminder_unit,
                'frequency', v_expense.frequency
              ),
              false,
              NOW()
            FROM public.household_members hm
            WHERE hm.household_id = v_expense.household_id;
          END IF;

          -- Mark as reminded
          INSERT INTO public.recurring_transaction_reminders_sent (
            expense_id,
            occurrence_date,
            reminded_at
          ) VALUES (
            v_expense.id,
            v_next_occurrence,
            NOW()
          );

          v_reminders_created := v_reminders_created + 1;
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other transactions
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Error processing reminder for expense %: %', v_expense.id, SQLERRM;
    END;
  END LOOP;

  -- Log execution
  INSERT INTO public.cron_job_logs (job_name, executed_at, rows_affected)
  VALUES ('check-recurring-reminders', NOW(), v_reminders_created);

  RETURN v_reminders_created;
END;
$$;

COMMENT ON FUNCTION public.check_recurring_reminders IS 'Checks recurring transactions with reminders and creates notification events for upcoming occurrences';

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Index for finding recurring transactions with reminders
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_reminder 
ON public.expenses(is_recurring, user_id) 
WHERE is_recurring = true AND recurrence_rule->'reminder'->>'enabled' = 'true';

-- ====================
-- SCHEDULE CRON JOB
-- ====================

-- Schedule recurring reminder check to run every 10 minutes
SELECT cron.schedule(
  'check-recurring-reminders',          -- Job name
  '*/10 * * * *',                       -- Cron expression: every 10 minutes
  $$
    SELECT check_recurring_reminders();
  $$
);

-- ====================
-- GRANT PERMISSIONS
-- ====================

-- Allow service role to execute functions
GRANT EXECUTE ON FUNCTION public.calculate_next_occurrence TO service_role;
GRANT EXECUTE ON FUNCTION public.check_recurring_reminders TO service_role;

-- ====================
-- SUCCESS MESSAGE
-- ====================

DO $$
BEGIN
  RAISE NOTICE 'Recurring reminders migration completed successfully!';
  RAISE NOTICE 'Cron job scheduled to run every 10 minutes';
  RAISE NOTICE 'Reminder data structure: recurrence_rule.reminder = {enabled, value, unit}';
END $$;
