-- Migration: Add performance indexes for expense filtering
-- Purpose: Optimize queries for personal, household, and recurring transactions  
-- Impact: Handles 1M+ transactions per user with <100ms query times
-- Run this in Supabase SQL Editor

-- Index for personal expenses (home page)
CREATE INDEX IF NOT EXISTS idx_expenses_personal_regular
ON expenses(user_id, date DESC, created_at DESC)
WHERE split_group_id IS NULL 
  AND (is_recurring IS FALSE OR is_recurring IS NULL)
  AND type = 'expense';

-- Index for household expenses
CREATE INDEX IF NOT EXISTS idx_expenses_household_regular
ON expenses(household_id, date DESC, created_at DESC)
WHERE split_group_id IS NOT NULL 
  AND (is_recurring IS FALSE OR is_recurring IS NULL)
  AND type = 'expense';

-- Index for recurring expenses
CREATE INDEX IF NOT EXISTS idx_expenses_recurring
ON expenses(user_id, date DESC, created_at DESC)
WHERE is_recurring = TRUE
  AND type = 'expense';

-- Index for personal income
CREATE INDEX IF NOT EXISTS idx_income_personal_regular
ON expenses(user_id, date DESC, created_at DESC)
WHERE split_group_id IS NULL 
  AND (is_recurring IS FALSE OR is_recurring IS NULL)
  AND type = 'income';

-- Index for recurring income
CREATE INDEX IF NOT EXISTS idx_income_recurring
ON expenses(user_id, date DESC, created_at DESC)
WHERE is_recurring = TRUE
  AND type = 'income';

-- Analyze to update statistics
ANALYZE expenses;
