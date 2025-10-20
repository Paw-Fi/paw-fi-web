-- Backfill missing currency fields based on contact's preferred currency
-- Run this BEFORE deploying multi-currency feature to production
-- Created: 2025-01-20
-- Purpose: Ensure all existing expense and budget records have valid currency codes

BEGIN;

-- Log migration start
DO $$
BEGIN
  RAISE NOTICE 'Starting currency backfill migration...';
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- Update expenses with NULL currency
UPDATE expenses 
SET currency = COALESCE(
  (SELECT preferred_currency 
   FROM user_contacts 
   WHERE id = expenses.contact_id 
   LIMIT 1),
  'USD'
),
updated_at = NOW()
WHERE currency IS NULL;

-- Log expenses updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % expense records with NULL currency', updated_count;
END $$;

-- Update daily_budgets with NULL currency
UPDATE daily_budgets 
SET currency = COALESCE(
  (SELECT preferred_currency 
   FROM user_contacts 
   WHERE id = daily_budgets.contact_id 
   LIMIT 1),
  'USD'
),
updated_at = NOW()
WHERE currency IS NULL;

-- Log budgets updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % budget records with NULL currency', updated_count;
END $$;

-- Verify no NULL currencies remain
DO $$
DECLARE
  null_expenses INTEGER;
  null_budgets INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_expenses FROM expenses WHERE currency IS NULL;
  SELECT COUNT(*) INTO null_budgets FROM daily_budgets WHERE currency IS NULL;
  
  IF null_expenses > 0 OR null_budgets > 0 THEN
    RAISE EXCEPTION 'Migration failed: % expenses and % budgets still have NULL currency', 
      null_expenses, null_budgets;
  END IF;
  
  RAISE NOTICE '✅ Migration successful: All records have currency set';
  RAISE NOTICE 'Timestamp: %', NOW();
END $$;

COMMIT;
