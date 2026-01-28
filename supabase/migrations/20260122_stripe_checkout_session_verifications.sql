-- Stripe Checkout Session Verification Gate
-- Purpose: allow verify-payment to be public while still protected for logged-out users.

CREATE TABLE IF NOT EXISTS public.stripe_checkout_session_verifications (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_called_at TIMESTAMPTZ,
  call_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stripe_checkout_session_verifications_created_at
  ON public.stripe_checkout_session_verifications(created_at);

ALTER TABLE public.stripe_checkout_session_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stripe_checkout_session_verifications'
      AND policyname = 'Service role can manage stripe checkout verifications'
  ) THEN
    CREATE POLICY "Service role can manage stripe checkout verifications"
      ON public.stripe_checkout_session_verifications
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END
$$;
