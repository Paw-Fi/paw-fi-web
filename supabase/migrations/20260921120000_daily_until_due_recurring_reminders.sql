-- Add recipient-scoped daily reminder delivery without changing the legacy
-- one-reminder-per-occurrence contract.

CREATE TABLE IF NOT EXISTS public.recurring_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  scheduled_occurrence_date DATE NOT NULL,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_schedule_date DATE NOT NULL,
  notification_event_id UUID REFERENCES public.notification_events(id)
    ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT recurring_reminder_deliveries_unique_day UNIQUE (
    recurring_id,
    scheduled_occurrence_date,
    recipient_user_id,
    reminder_schedule_date
  )
);

CREATE INDEX IF NOT EXISTS idx_recurring_reminder_deliveries_occurrence
  ON public.recurring_reminder_deliveries (
    recurring_id,
    scheduled_occurrence_date
  );

ALTER TABLE public.recurring_reminder_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.recurring_reminder_deliveries
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.recurring_reminder_deliveries TO service_role;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_recurring_reminder_contract_check
  CHECK (
    CASE
      WHEN recurrence_rule IS NULL
        OR recurrence_rule->'reminder' IS NULL
        OR recurrence_rule->'reminder'->>'enabled' IS DISTINCT FROM 'true'
      THEN TRUE
      WHEN coalesce(recurrence_rule->'reminder'->>'mode', 'once') = 'once'
      THEN recurrence_rule->'reminder'->>'unit' IN ('days', 'hours')
        AND coalesce(recurrence_rule->'reminder'->>'value', '') ~ '^\d{1,4}$'
      WHEN recurrence_rule->'reminder'->>'mode' = 'daily_until_due'
      THEN recurrence_rule->'reminder'->>'unit' = 'days'
        AND CASE
          WHEN coalesce(
            recurrence_rule->'reminder'->>'value',
            ''
          ) ~ '^\d{1,2}$'
          THEN (recurrence_rule->'reminder'->>'value')::INTEGER BETWEEN 1 AND 31
          ELSE FALSE
        END
      ELSE FALSE
    END
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.clear_stale_recurring_reminders_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.recurrence_rule IS NOT DISTINCT FROM NEW.recurrence_rule
    AND OLD.is_recurring IS NOT DISTINCT FROM NEW.is_recurring
    AND OLD.date IS NOT DISTINCT FROM NEW.date
    AND OLD.deleted_at IS NOT DISTINCT FROM NEW.deleted_at THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.notification_events event
  WHERE event.event_type = 'recurring_reminder'
    AND event.is_sent IS FALSE
    AND event.payload->>'expense_id' = NEW.id::TEXT;

  DELETE FROM public.recurring_reminder_deliveries delivery
  WHERE delivery.recurring_id = NEW.id;

  DELETE FROM public.recurring_transaction_reminders_sent sent
  WHERE sent.expense_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_stale_recurring_reminders
  ON public.expenses;
CREATE TRIGGER clear_stale_recurring_reminders
AFTER UPDATE OF recurrence_rule, is_recurring, date, deleted_at
ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.clear_stale_recurring_reminders_v1();

CREATE OR REPLACE FUNCTION public.is_recurring_daily_reminder_due(
  p_occurrence_date DATE,
  p_reminder_value INTEGER,
  p_local_date DATE,
  p_local_time TIME
) RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_occurrence_date IS NOT NULL
    AND p_reminder_value BETWEEN 1 AND 31
    AND p_local_date BETWEEN
      p_occurrence_date - p_reminder_value AND p_occurrence_date
    AND p_local_time >= TIME '09:00';
$$;

-- Keep delivery eligibility and claiming in one database transaction so both
-- the immediate webhook and fallback worker share the same final guard.
CREATE OR REPLACE FUNCTION public.claim_notification_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event public.notification_events%ROWTYPE;
  v_recurring_id UUID;
  v_occurrence_date DATE;
  v_terminal_reason TEXT;
BEGIN
  SELECT * INTO v_event
  FROM public.notification_events event
  WHERE event.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR v_event.is_sent IS TRUE OR (
    v_event.processing_started_at IS NOT NULL
    AND v_event.processing_started_at >= now() - INTERVAL '15 minutes'
  ) THEN
    RETURN FALSE;
  END IF;

  IF v_event.event_type = 'recurring_reminder' THEN
    IF coalesce(v_event.payload->>'expense_id', '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      OR coalesce(v_event.payload->>'occurrence_date', '') !~
        '^\d{4}-\d{2}-\d{2}$' THEN
      v_terminal_reason := 'Recurring reminder payload is invalid';
    ELSE
      v_recurring_id := (v_event.payload->>'expense_id')::UUID;
      v_occurrence_date := (v_event.payload->>'occurrence_date')::DATE;

      IF NOT EXISTS (
        SELECT 1
        FROM public.expenses expense
        WHERE expense.id = v_recurring_id
          AND expense.deleted_at IS NULL
          AND NOT (
            coalesce(
              expense.recurrence_rule->'excluded_dates',
              '[]'::JSONB
            ) ? v_occurrence_date::TEXT
          )
      ) OR EXISTS (
        SELECT 1
        FROM public.recurring_occurrences occurrence
        WHERE occurrence.recurring_id = v_recurring_id
          AND occurrence.scheduled_occurrence_date = v_occurrence_date
          AND occurrence.status IN ('confirmed', 'skipped')
      ) THEN
        v_terminal_reason := 'Recurring occurrence already resolved';
      END IF;

      IF v_terminal_reason IS NULL
        AND v_event.payload ? 'expires_at'
        AND (v_event.payload->>'expires_at')::TIMESTAMPTZ <= now() THEN
        v_terminal_reason := 'Recurring reminder expired before delivery';
      END IF;
    END IF;
  END IF;

  IF v_terminal_reason IS NOT NULL THEN
    UPDATE public.notification_events
    SET
      is_sent = TRUE,
      sent_at = now(),
      processing_started_at = NULL,
      error_message = v_terminal_reason,
      delivery_error = v_terminal_reason
    WHERE id = p_event_id;
    RETURN FALSE;
  END IF;

  UPDATE public.notification_events
  SET processing_started_at = now()
  WHERE id = p_event_id;

  RETURN TRUE;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  UPDATE public.notification_events
  SET
    is_sent = TRUE,
    sent_at = now(),
    processing_started_at = NULL,
    error_message = 'Recurring reminder payload is invalid',
    delivery_error = 'Recurring reminder payload is invalid'
  WHERE id = p_event_id;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_recurring_once_reminders_v1(
  p_now TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expense RECORD;
  v_anchor_date DATE;
  v_frequency TEXT;
  v_interval INTEGER;
  v_end_date DATE;
  v_next_occurrence DATE;
  v_reminder_trigger_time TIMESTAMPTZ;
  v_reminder_value INTEGER;
  v_reminder_unit TEXT;
  v_lead_interval INTERVAL;
  v_claim_id UUID;
  v_reminders_created INTEGER := 0;
BEGIN
  FOR v_expense IN
    SELECT
      id,
      user_id,
      household_id,
      category,
      amount_cents,
      currency,
      type,
      privacy_scope,
      recurrence_rule
    FROM public.expenses
    WHERE is_recurring = TRUE
      AND deleted_at IS NULL
      AND recurrence_rule IS NOT NULL
      AND recurrence_rule->'reminder'->>'enabled' = 'true'
      AND lower(coalesce(
        recurrence_rule->'reminder'->>'mode',
        'once'
      )) = 'once'
  LOOP
    BEGIN
      v_anchor_date := (v_expense.recurrence_rule->>'anchor_date')::DATE;
      v_frequency := v_expense.recurrence_rule->>'frequency';
      v_interval := greatest(coalesce(
        (v_expense.recurrence_rule->>'interval')::INTEGER,
        1
      ), 1);
      v_end_date := (v_expense.recurrence_rule->>'end_date')::DATE;
      v_reminder_value := (
        v_expense.recurrence_rule->'reminder'->>'value'
      )::INTEGER;
      v_reminder_unit := lower(coalesce(
        v_expense.recurrence_rule->'reminder'->>'unit',
        ''
      ));

      CONTINUE WHEN v_end_date IS NOT NULL AND v_end_date < p_now::DATE;

      CASE v_reminder_unit
        WHEN 'days' THEN
          v_lead_interval := make_interval(days => v_reminder_value);
        WHEN 'hours' THEN
          v_lead_interval := make_interval(hours => v_reminder_value);
        ELSE
          CONTINUE;
      END CASE;

      v_next_occurrence := public.calculate_recurring_reminder_occurrence(
        v_anchor_date,
        v_frequency,
        v_interval,
        v_end_date,
        v_reminder_value,
        v_reminder_unit,
        p_now
      );
      CONTINUE WHEN v_next_occurrence IS NULL;
      CONTINUE WHEN EXISTS (
        SELECT 1
        FROM public.recurring_occurrences occurrence
        WHERE occurrence.recurring_id = v_expense.id
          AND occurrence.scheduled_occurrence_date = v_next_occurrence
          AND occurrence.status IN ('confirmed', 'skipped')
      );

      v_reminder_trigger_time :=
        v_next_occurrence::TIMESTAMPTZ - v_lead_interval;
      CONTINUE WHEN p_now < v_reminder_trigger_time;
      CONTINUE WHEN v_reminder_unit = 'hours'
        AND p_now >= v_next_occurrence::TIMESTAMPTZ;

      v_claim_id := NULL;
      INSERT INTO public.recurring_transaction_reminders_sent (
        expense_id,
        occurrence_date,
        reminded_at
      ) VALUES (
        v_expense.id,
        v_next_occurrence,
        p_now
      )
      ON CONFLICT (expense_id, occurrence_date) DO NOTHING
      RETURNING id INTO v_claim_id;

      CONTINUE WHEN v_claim_id IS NULL;

      IF v_expense.household_id IS NULL
        OR coalesce(v_expense.privacy_scope, 'private') <> 'full' THEN
        INSERT INTO public.notification_events (
          household_id,
          user_id,
          event_type,
          payload,
          is_sent,
          created_at
        ) VALUES (
          CASE WHEN v_expense.privacy_scope = 'full'
            THEN v_expense.household_id ELSE NULL END,
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
            'frequency', v_frequency
          ),
          FALSE,
          p_now
        );
      ELSE
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
          member.user_id,
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
            'frequency', v_frequency
          ),
          FALSE,
          p_now
        FROM public.household_members member
        WHERE member.household_id = v_expense.household_id;
      END IF;
      v_reminders_created := v_reminders_created + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing once reminder for expense %: %',
        v_expense.id, sqlerrm;
    END;
  END LOOP;

  RETURN v_reminders_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_recurring_daily_reminders_v1(
  p_now TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expense RECORD;
  v_recipient RECORD;
  v_anchor_date DATE;
  v_end_date DATE;
  v_interval INTEGER;
  v_reminder_value INTEGER;
  v_local_timestamp TIMESTAMP;
  v_local_date DATE;
  v_next_occurrence DATE;
  v_delivery_id UUID;
  v_event_id UUID;
  v_created INTEGER := 0;
BEGIN
  FOR v_expense IN
    SELECT
      expense.id,
      expense.user_id,
      expense.household_id,
      expense.category,
      expense.amount_cents,
      expense.currency,
      expense.type,
      expense.privacy_scope,
      expense.recurrence_rule
    FROM public.expenses expense
    WHERE expense.is_recurring = TRUE
      AND expense.deleted_at IS NULL
      AND expense.recurrence_rule IS NOT NULL
      AND expense.recurrence_rule->'reminder'->>'enabled' = 'true'
      AND lower(coalesce(
        expense.recurrence_rule->'reminder'->>'mode',
        'once'
      )) = 'daily_until_due'
      AND lower(coalesce(
        expense.recurrence_rule->'reminder'->>'unit',
        ''
      )) = 'days'
  LOOP
    BEGIN
      v_anchor_date := (v_expense.recurrence_rule->>'anchor_date')::DATE;
      v_end_date := (v_expense.recurrence_rule->>'end_date')::DATE;
      v_interval := greatest(coalesce(
        (v_expense.recurrence_rule->>'interval')::INTEGER,
        1
      ), 1);
      v_reminder_value := (
        v_expense.recurrence_rule->'reminder'->>'value'
      )::INTEGER;

      CONTINUE WHEN v_reminder_value NOT BETWEEN 1 AND 31;

      FOR v_recipient IN
        WITH recipients AS (
          SELECT v_expense.user_id AS user_id
          WHERE v_expense.household_id IS NULL
            OR coalesce(v_expense.privacy_scope, 'private') <> 'full'
          UNION
          SELECT member.user_id
          FROM public.household_members member
          WHERE member.household_id = v_expense.household_id
            AND v_expense.privacy_scope = 'full'
        ), recipient_timezones AS (
          SELECT
            recipient.user_id,
            coalesce((
              SELECT contact.preferred_timezone
              FROM public.user_contacts contact
              WHERE contact.user_id = recipient.user_id
                AND EXISTS (
                  SELECT 1
                  FROM pg_catalog.pg_timezone_names timezone_name
                  WHERE timezone_name.name = contact.preferred_timezone
                )
              ORDER BY contact.updated_at DESC NULLS LAST,
                contact.created_at DESC,
                contact.id DESC
              LIMIT 1
            ), 'UTC') AS timezone_name
          FROM recipients recipient
        )
        SELECT user_id, timezone_name
        FROM recipient_timezones
      LOOP
        BEGIN
          v_local_timestamp := timezone(v_recipient.timezone_name, p_now);
          v_local_date := v_local_timestamp::DATE;

          v_next_occurrence := public.calculate_next_occurrence_on_or_after(
            v_anchor_date,
            v_expense.recurrence_rule->>'frequency',
            v_interval,
            v_end_date,
            v_local_date
          );
          CONTINUE WHEN v_next_occurrence IS NULL;
          CONTINUE WHEN coalesce(
            v_expense.recurrence_rule->'excluded_dates',
            '[]'::JSONB
          ) ? v_next_occurrence::TEXT;
          CONTINUE WHEN EXISTS (
            SELECT 1
            FROM public.recurring_occurrences occurrence
            WHERE occurrence.recurring_id = v_expense.id
              AND occurrence.scheduled_occurrence_date = v_next_occurrence
              AND occurrence.status IN ('confirmed', 'skipped')
          );
          CONTINUE WHEN NOT public.is_recurring_daily_reminder_due(
            v_next_occurrence,
            v_reminder_value,
            v_local_date,
            v_local_timestamp::TIME
          );

          v_delivery_id := NULL;
          INSERT INTO public.recurring_reminder_deliveries (
            recurring_id,
            scheduled_occurrence_date,
            recipient_user_id,
            reminder_schedule_date
          ) VALUES (
            v_expense.id,
            v_next_occurrence,
            v_recipient.user_id,
            v_local_date
          )
          ON CONFLICT DO NOTHING
          RETURNING id INTO v_delivery_id;

          CONTINUE WHEN v_delivery_id IS NULL;

          v_event_id := NULL;
          INSERT INTO public.notification_events (
            household_id,
            user_id,
            event_type,
            payload,
            is_sent,
            created_at
          ) VALUES (
            CASE WHEN v_expense.privacy_scope = 'full'
              THEN v_expense.household_id ELSE NULL END,
            v_recipient.user_id,
            'recurring_reminder',
            jsonb_build_object(
              'expense_id', v_expense.id,
              'category', v_expense.category,
              'amount_cents', v_expense.amount_cents,
              'currency', v_expense.currency,
              'type', v_expense.type,
              'occurrence_date', v_next_occurrence,
              'delivery_date', v_local_date,
              'days_until_due', v_next_occurrence - v_local_date,
              'reminder_mode', 'daily_until_due',
              'reminder_value', v_reminder_value,
              'reminder_unit', 'days',
              'frequency', v_expense.recurrence_rule->>'frequency',
              'timezone', v_recipient.timezone_name,
              'expires_at',
                ((v_local_date + 1)::TIMESTAMP AT TIME ZONE
                  v_recipient.timezone_name)
            ),
            FALSE,
            p_now
          )
          RETURNING id INTO v_event_id;

          IF v_event_id IS NOT NULL THEN
            UPDATE public.recurring_reminder_deliveries
            SET notification_event_id = v_event_id
            WHERE id = v_delivery_id;
            v_created := v_created + 1;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Error processing daily reminder for expense %, recipient %: %',
            v_expense.id, v_recipient.user_id, sqlerrm;
        END;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error preparing daily reminder for expense %: %',
        v_expense.id, sqlerrm;
    END;
  END LOOP;

  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_recurring_reminders(
  p_now TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_once_created INTEGER;
  v_daily_created INTEGER;
  v_total_created INTEGER;
BEGIN
  v_once_created := public.check_recurring_once_reminders_v1(p_now);
  v_daily_created := public.check_recurring_daily_reminders_v1(p_now);
  v_total_created := v_once_created + v_daily_created;

  INSERT INTO public.cron_job_logs (job_name, executed_at, rows_affected)
  VALUES ('check-recurring-reminders', p_now, v_total_created);

  RETURN v_total_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_recurring_reminders()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.check_recurring_reminders(now());
$$;

REVOKE ALL ON FUNCTION public.is_recurring_daily_reminder_due(
  DATE, INTEGER, DATE, TIME
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_recurring_once_reminders_v1(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_recurring_daily_reminders_v1(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_recurring_reminders(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_recurring_reminders()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_stale_recurring_reminders_v1()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_notification_event(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_recurring_daily_reminder_due(
  DATE, INTEGER, DATE, TIME
) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_recurring_once_reminders_v1(TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.check_recurring_daily_reminders_v1(TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.check_recurring_reminders(TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.check_recurring_reminders()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_event(UUID)
  TO service_role;
