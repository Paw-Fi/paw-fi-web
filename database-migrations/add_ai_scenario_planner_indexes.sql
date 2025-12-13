-- Migration: Add performance indexes for AI scenario planner queries
-- Purpose: Optimize expenses and budgets lookups used by the ai-scenario-planner edge function
-- Impact: Faster range scans for personal and household expenses and monthly budgets

-- Personal expenses for scenario planner (by user, date, type = 'expense')
CREATE INDEX IF NOT EXISTS idx_expenses_personal_scenario
ON expenses(user_id, date)
WHERE type = 'expense';

-- Household expenses for scenario planner (by household, date, type = 'expense')
CREATE INDEX IF NOT EXISTS idx_expenses_household_scenario
ON expenses(household_id, date)
WHERE type = 'expense';

-- Personal budgets (user-level, no household) by currency and month
CREATE INDEX IF NOT EXISTS idx_budgets_personal_scenario
ON budgets(user_id, currency, period_month)
WHERE household_id IS NULL;

-- Household budgets by currency and month
CREATE INDEX IF NOT EXISTS idx_budgets_household_scenario
ON budgets(household_id, currency, period_month);
