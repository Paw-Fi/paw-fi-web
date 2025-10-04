-- Allow NULL current_period_end for Lifetime subscriptions
-- Lifetime plans are one-time purchases with no expiration date
-- Created: 2025-10-04

-- Make current_period_end nullable to support Lifetime plans
ALTER TABLE public.subscriptions
ALTER COLUMN current_period_end DROP NOT NULL;

-- Add constraint: current_period_end must be NULL if plan is lifetime
ALTER TABLE public.subscriptions
ADD CONSTRAINT lifetime_no_period_end CHECK (
  (plan = 'lifetime' AND current_period_end IS NULL) OR
  (plan != 'lifetime')
);

COMMENT ON CONSTRAINT lifetime_no_period_end ON public.subscriptions IS
  'Lifetime plans must have NULL current_period_end (one-time purchase, never expires)';
