-- ====================
-- REMOVE PRIVACY FEATURES MIGRATION
-- Created: 2025-10-24
-- Purpose: Remove privacy controls - all household members have full access to all data
-- NOTE: Keeps sharing_prefs table for nudge preferences, removes only privacy columns
-- ====================

-- ====================
-- UPDATE SHARING PREFERENCES TABLE
-- ====================
-- NOTE: We're keeping sharing_prefs table for nudge preferences (enable_nudges, quiet hours)
-- but removing privacy-related columns (transaction/account share scopes, category overrides)

DO $$
BEGIN
  -- Remove default_transaction_share_scope column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sharing_prefs' AND column_name = 'default_transaction_share_scope'
  ) THEN
    ALTER TABLE public.sharing_prefs DROP COLUMN default_transaction_share_scope;
  END IF;

  -- Remove default_account_share_scope column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sharing_prefs' AND column_name = 'default_account_share_scope'
  ) THEN
    ALTER TABLE public.sharing_prefs DROP COLUMN default_account_share_scope;
  END IF;

  -- Remove per_category_overrides column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sharing_prefs' AND column_name = 'per_category_overrides'
  ) THEN
    ALTER TABLE public.sharing_prefs DROP COLUMN per_category_overrides;
  END IF;
END $$;

-- ====================
-- UPDATE EXPENSES TABLE
-- ====================

-- Remove privacy-related columns from expenses table
DO $$
BEGIN
  -- Remove share_scope column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'share_scope'
  ) THEN
    ALTER TABLE public.expenses DROP COLUMN share_scope;
  END IF;

  -- Remove shared_member_ids column (used for custom sharing)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'shared_member_ids'
  ) THEN
    ALTER TABLE public.expenses DROP COLUMN shared_member_ids;
  END IF;
END $$;

-- Drop indexes related to removed columns
DROP INDEX IF EXISTS public.idx_expenses_share_scope;
DROP INDEX IF EXISTS public.idx_expenses_shared_members;

-- ====================
-- UPDATE EXPENSES RLS POLICIES
-- ====================

-- Drop the old complex RLS policy that checked share_scope
DROP POLICY IF EXISTS "Users can view accessible expenses" ON public.expenses;

-- Create new simple RLS policy: users can view their own expenses + all household expenses they're a member of
CREATE POLICY "Users can view their expenses and household expenses" ON public.expenses
  FOR SELECT USING (
    -- Own expenses
    user_id = auth.uid()
    -- OR household expenses where user is a member
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = expenses.household_id
          AND user_id = auth.uid()
      )
    )
  );

-- ====================
-- DROP SHARE_SCOPE ENUM
-- ====================

-- Drop the share_scope enum type (this will fail if there are still dependencies)
-- We already removed all dependencies above, so this should work
DROP TYPE IF EXISTS share_scope CASCADE;

-- ====================
-- COMMENTS
-- ====================

COMMENT ON TABLE public.expenses IS 'User expenses - household members have full access to all household expenses';
COMMENT ON TABLE public.sharing_prefs IS 'User notification preferences per household (nudges and quiet hours only)';

COMMENT ON POLICY "Users can view their expenses and household expenses" ON public.expenses IS
  'Users can view their own expenses and all expenses from households they are members of - no privacy restrictions';
