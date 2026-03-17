ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS wallet_capture_idempotency_key TEXT;

COMMENT ON COLUMN public.expenses.wallet_capture_idempotency_key IS
  'Unique idempotency key for Apple Wallet and Android notification auto-capture flows.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_wallet_capture_idempotency_key
  ON public.expenses(wallet_capture_idempotency_key)
  WHERE wallet_capture_idempotency_key IS NOT NULL;
