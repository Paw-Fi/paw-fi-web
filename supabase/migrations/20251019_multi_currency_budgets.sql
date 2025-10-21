-- Multi-Currency Budgets Migration
-- Allows users to set budgets in multiple currencies per day
-- Replaces UNIQUE(contact_id, date) with UNIQUE(contact_id, date, currency)

-- Drop the old unique constraint that prevents multi-currency budgets per day
ALTER TABLE public.daily_budgets 
  DROP CONSTRAINT IF EXISTS daily_budgets_contact_id_date_key;

-- Add new unique constraint that includes currency
-- This allows multiple budget entries for the same contact/date with different currencies
CREATE UNIQUE INDEX IF NOT EXISTS daily_budgets_contact_date_currency_uniq 
  ON public.daily_budgets(contact_id, date, currency);

-- Add performance indexes for common query patterns
-- Index for filtering expenses by contact, date, and currency
CREATE INDEX IF NOT EXISTS expenses_contact_date_currency_idx 
  ON public.expenses(contact_id, date, currency);

-- Index for filtering budgets by contact and currency
CREATE INDEX IF NOT EXISTS daily_budgets_contact_currency_idx 
  ON public.daily_budgets(contact_id, currency);

-- Index for efficient date range queries on expenses
CREATE INDEX IF NOT EXISTS expenses_date_idx 
  ON public.expenses(date);

-- Index for efficient date range queries on budgets
CREATE INDEX IF NOT EXISTS daily_budgets_date_idx 
  ON public.daily_budgets(date);

-- Add comment explaining the change
COMMENT ON INDEX daily_budgets_contact_date_currency_uniq IS 
  'Allows multiple currency budgets per contact per day. Updated 2024-10-19 for multi-currency support.';
