-- Keep this migration safe for environments where the earlier commitment-field
-- migration has not yet been applied. These columns remain required for native
-- App Store commitment plans.
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS payment_interval TEXT
CHECK (payment_interval IN ('monthly', 'yearly'));

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS commitment_months INTEGER
CHECK (commitment_months IS NULL OR commitment_months > 0);

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS commitment_end TIMESTAMPTZ;

-- Stripe yearly subscriptions are paid upfront and do not use App Store-style
-- monthly commitment terms. Preserve commitment state only for store providers.
UPDATE public.subscriptions
SET
  payment_interval = billing_interval,
  commitment_months = NULL,
  commitment_end = NULL,
  updated_at = NOW()
WHERE provider = 'stripe'
  AND (
    payment_interval IS DISTINCT FROM billing_interval
    OR commitment_months IS NOT NULL
    OR commitment_end IS NOT NULL
  );
