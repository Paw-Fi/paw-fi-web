BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(2);

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

SELECT * FROM finish();
ROLLBACK;
