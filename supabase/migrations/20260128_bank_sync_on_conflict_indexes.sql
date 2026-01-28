-- Ensure unique indexes exist for ON CONFLICT targets used in bank sync

-- bank_accounts upsert target
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_provider_account
  ON public.bank_accounts(provider, provider_account_id)
  WHERE provider_account_id IS NOT NULL;

-- bank_transaction_raw upsert target
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transaction_raw_provider
  ON public.bank_transaction_raw(bank_account_id, provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

-- expenses upsert/merge target for provider transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_provider_transaction
  ON public.expenses(user_id, provider, provider_transaction_id)
  WHERE provider IS NOT NULL AND provider_transaction_id IS NOT NULL;
