BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(14);

SELECT has_table(
  'public',
  'recurring_reminder_deliveries',
  'daily reminder delivery ledger exists'
);
SELECT has_column(
  'public',
  'recurring_reminder_deliveries',
  'scheduled_occurrence_date',
  'delivery claims retain occurrence identity'
);
SELECT has_column(
  'public',
  'recurring_reminder_deliveries',
  'recipient_user_id',
  'delivery claims are recipient scoped'
);
SELECT has_column(
  'public',
  'recurring_reminder_deliveries',
  'reminder_schedule_date',
  'delivery claims are local-day scoped'
);

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_expense_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'authenticated',
    'authenticated',
    'daily-recurring-reminder-pgtap@example.com',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::JSONB,
    '{}'::JSONB,
    now(),
    now()
  );

  INSERT INTO public.expenses (
    id,
    user_id,
    date,
    amount_cents,
    currency,
    category,
    is_recurring,
    recurrence_rule,
    type
  ) VALUES (
    v_expense_id,
    v_user_id,
    DATE '2026-10-15',
    1999,
    'USD',
    'subscriptions',
    TRUE,
    jsonb_build_object(
      'frequency', 'monthly',
      'anchor_date', '2026-10-15',
      'reminder', jsonb_build_object(
        'enabled', TRUE,
        'value', 3,
        'unit', 'days',
        'mode', 'daily_until_due'
      )
    ),
    'expense'
  );

  PERFORM set_config('test.daily_reminder_user', v_user_id::TEXT, FALSE);
  PERFORM set_config('test.daily_reminder_expense', v_expense_id::TEXT, FALSE);
END;
$$;

SELECT public.check_recurring_reminders(
  TIMESTAMPTZ '2026-10-12 09:00:00+00'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.recurring_reminder_deliveries delivery
    WHERE delivery.recurring_id =
      current_setting('test.daily_reminder_expense')::UUID
  ),
  1::BIGINT,
  'the lead day creates one recipient delivery claim'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.notification_events event
    WHERE event.event_type = 'recurring_reminder'
      AND event.payload->>'expense_id' =
        current_setting('test.daily_reminder_expense')
  ),
  1::BIGINT,
  'the lead day creates one notification event'
);

SELECT public.check_recurring_reminders(
  TIMESTAMPTZ '2026-10-12 09:10:00+00'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.notification_events event
    WHERE event.event_type = 'recurring_reminder'
      AND event.payload->>'expense_id' =
        current_setting('test.daily_reminder_expense')
  ),
  1::BIGINT,
  'a scheduler retry cannot duplicate the same recipient local day'
);

SELECT public.check_recurring_reminders(
  TIMESTAMPTZ '2026-10-13 09:00:00+00'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.recurring_reminder_deliveries delivery
    WHERE delivery.recurring_id =
      current_setting('test.daily_reminder_expense')::UUID
  ),
  2::BIGINT,
  'the next local day creates the next reminder claim'
);
SELECT is(
  (
    SELECT (event.payload->>'days_until_due')::INTEGER
    FROM public.notification_events event
    WHERE event.event_type = 'recurring_reminder'
      AND event.payload->>'expense_id' =
        current_setting('test.daily_reminder_expense')
    ORDER BY event.created_at DESC
    LIMIT 1
  ),
  2,
  'the event carries deterministic local days until due'
);

UPDATE public.expenses
SET recurrence_rule = jsonb_set(
  recurrence_rule,
  '{excluded_dates}',
  '["2026-10-15"]'::JSONB
)
WHERE id = current_setting('test.daily_reminder_expense')::UUID;

SELECT is(
  (
    SELECT count(*)
    FROM public.recurring_reminder_deliveries delivery
    WHERE delivery.recurring_id =
      current_setting('test.daily_reminder_expense')::UUID
  ),
  0::BIGINT,
  'editing the recurrence rule invalidates prior delivery claims'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.notification_events event
    WHERE event.event_type = 'recurring_reminder'
      AND event.is_sent IS FALSE
      AND event.payload->>'expense_id' =
        current_setting('test.daily_reminder_expense')
  ),
  0::BIGINT,
  'editing the recurrence rule removes queued reminder events'
);

SELECT public.check_recurring_reminders(
  TIMESTAMPTZ '2026-10-14 09:00:00+00'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.recurring_reminder_deliveries delivery
    WHERE delivery.recurring_id =
      current_setting('test.daily_reminder_expense')::UUID
  ),
  0::BIGINT,
  'an excluded occurrence stops subsequent daily reminders'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.notification_events event
    WHERE event.event_type = 'recurring_reminder'
      AND event.payload->>'expense_id' =
        current_setting('test.daily_reminder_expense')
  ),
  0::BIGINT,
  'an excluded occurrence creates no queued notification'
);

UPDATE public.expenses
SET
  deleted_at = now(),
  recurrence_rule = recurrence_rule - 'excluded_dates'
WHERE id = current_setting('test.daily_reminder_expense')::UUID;

SELECT public.check_recurring_reminders(
  TIMESTAMPTZ '2026-10-14 10:00:00+00'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.notification_events event
    WHERE event.event_type = 'recurring_reminder'
      AND event.is_sent IS FALSE
      AND event.payload->>'expense_id' =
        current_setting('test.daily_reminder_expense')
  ),
  0::BIGINT,
  'a soft-deleted recurring series cannot recreate reminders'
);

SELECT * FROM finish();
ROLLBACK;
