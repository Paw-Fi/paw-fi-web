BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(21);

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
  public.calculate_recurring_reminder_occurrence(
    DATE '2026-01-01',
    'daily',
    25,
    NULL,
    1,
    'days',
    TIMESTAMPTZ '2026-01-25 09:00:00+00'
  ),
  DATE '2026-01-26',
  'reminders preserve an every 25 days custom cadence'
);

SELECT is(
  public.calculate_recurring_reminder_occurrence(
    DATE '2026-01-01',
    'weekly',
    3,
    NULL,
    1,
    'days',
    TIMESTAMPTZ '2026-01-21 09:00:00+00'
  ),
  DATE '2026-01-22',
  'reminders preserve an every 3 weeks custom cadence'
);

SELECT is(
  public.calculate_recurring_reminder_occurrence(
    DATE '2026-01-01',
    'yearly',
    2,
    NULL,
    7,
    'days',
    TIMESTAMPTZ '2027-12-25 09:00:00+00'
  ),
  DATE '2028-01-01',
  'reminders preserve an every 2 years custom cadence'
);

SELECT ok(
  public.is_recurring_daily_reminder_due(
    DATE '2026-10-15', 7, DATE '2026-10-08', TIME '09:00'
  ),
  'daily reminders begin at 9 AM on the configured lead day'
);

SELECT ok(
  public.is_recurring_daily_reminder_due(
    DATE '2026-10-15', 7, DATE '2026-10-12', TIME '14:00'
  ),
  'daily reminders remain eligible throughout each lead-window day'
);

SELECT ok(
  public.is_recurring_daily_reminder_due(
    DATE '2026-10-15', 7, DATE '2026-10-15', TIME '09:00'
  ),
  'daily reminders include the due date'
);

SELECT is(
  public.is_recurring_daily_reminder_due(
    DATE '2026-10-15', 7, DATE '2026-10-07', TIME '12:00'
  ),
  FALSE,
  'daily reminders do not start before the configured lead window'
);

SELECT is(
  public.is_recurring_daily_reminder_due(
    DATE '2026-10-15', 7, DATE '2026-10-08', TIME '08:59'
  ),
  FALSE,
  'daily reminders wait until 9 AM local time'
);

SELECT is(
  public.is_recurring_daily_reminder_due(
    DATE '2026-10-15', 7, DATE '2026-10-16', TIME '09:00'
  ),
  FALSE,
  'daily reminders stop after the due date'
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
