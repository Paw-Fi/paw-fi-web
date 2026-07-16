BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(12);

SELECT is(
  public.calculate_next_occurrence(
    (CURRENT_DATE - INTERVAL '17 months')::DATE,
    'monthly',
    6,
    NULL
  ),
  ((CURRENT_DATE - INTERVAL '17 months')::DATE + INTERVAL '18 months')::DATE,
  'calculate_next_occurrence supports monthly recurrences with a 6 month interval'
);

SELECT is(
  public.calculate_next_occurrence(
    (CURRENT_DATE - INTERVAL '17 months')::DATE,
    'monthly',
    6,
    CURRENT_DATE
  ),
  NULL::DATE,
  'calculate_next_occurrence returns null when the next 6 month occurrence is beyond the end date'
);

SELECT is(
  public.calculate_next_occurrence_on_or_after(
    DATE '2026-07-16',
    'monthly',
    1,
    NULL,
    DATE '2026-07-17'
  ),
  DATE '2026-08-16',
  'a monthly recurrence anchored today targets next month for a one-day reminder'
);

SELECT is(
  public.calculate_recurring_reminder_occurrence(
    DATE '2026-07-16',
    'monthly',
    1,
    NULL,
    1,
    'days',
    TIMESTAMPTZ '2026-07-16 09:00:00+00'
  ),
  DATE '2026-08-16',
  'creating a monthly recurrence today does not remind for today'
);

SELECT is(
  public.calculate_recurring_reminder_occurrence(
    DATE '2026-07-16',
    'monthly',
    1,
    NULL,
    1,
    'days',
    TIMESTAMPTZ '2026-08-15 00:00:00+00'
  ),
  DATE '2026-08-16',
  'the next monthly occurrence is selected exactly at its reminder lead time'
);

SELECT is(
  public.calculate_next_occurrence_on_or_after(
    DATE '2026-01-16',
    'monthly',
    2,
    NULL,
    DATE '2026-02-16'
  ),
  DATE '2026-03-16',
  'monthly intervals skip months outside the recurrence cadence'
);

SELECT is(
  public.calculate_next_occurrence_on_or_after(
    DATE '2026-01-31',
    'monthly',
    1,
    NULL,
    DATE '2026-02-01'
  ),
  DATE '2026-02-28',
  'monthly recurrences clamp to the final day of shorter months'
);

SELECT is(
  public.calculate_next_occurrence_on_or_after(
    DATE '2026-01-31',
    'monthly',
    1,
    DATE '2026-02-27',
    DATE '2026-02-01'
  ),
  NULL::DATE,
  'occurrences beyond the recurrence end date are not eligible for reminders'
);

SELECT is(
  public.calculate_recurring_reminder_occurrence(
    DATE '2026-07-16',
    'daily',
    1,
    NULL,
    1,
    'days',
    TIMESTAMPTZ '2026-07-16 09:00:00+00'
  ),
  DATE '2026-07-17',
  'daily reminders target tomorrow instead of sending late for today'
);

SELECT is(
  public.calculate_next_occurrence_on_or_after(
    DATE '2026-07-01',
    'weekly',
    2,
    NULL,
    DATE '2026-07-09'
  ),
  DATE '2026-07-15',
  'weekly intervals preserve their configured cadence'
);

SELECT is(
  public.calculate_next_occurrence_on_or_after(
    DATE '2026-07-01',
    'biweekly',
    1,
    NULL,
    DATE '2026-07-09'
  ),
  DATE '2026-07-15',
  'biweekly recurrences advance in fourteen-day steps'
);

SELECT is(
  public.calculate_next_occurrence_on_or_after(
    DATE '2024-02-29',
    'yearly',
    1,
    NULL,
    DATE '2025-01-01'
  ),
  DATE '2025-02-28',
  'yearly leap-day recurrences clamp in non-leap years'
);

SELECT * FROM finish();
ROLLBACK;
