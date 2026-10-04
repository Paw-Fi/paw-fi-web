-- Household and personal budgets have different owners and may share a
-- household, currency, and period. Keep each identity unique independently.
ALTER TABLE public.shared_budgets
  DROP CONSTRAINT IF EXISTS unique_household_currency_period;

CREATE UNIQUE INDEX IF NOT EXISTS unique_household_budget_currency_period
  ON public.shared_budgets (household_id, currency, period)
  WHERE budget_type = 'household';

CREATE UNIQUE INDEX IF NOT EXISTS unique_personal_budget_currency_period
  ON public.shared_budgets (household_id, user_id, currency, period)
  WHERE budget_type = 'personal';
