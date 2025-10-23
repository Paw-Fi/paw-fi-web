-- Migration: Add Personal Budget Support with Split Awareness
-- This addresses SHOWSTOPPER-002: Users need personal budgets that automatically adjust for splits

-- ============================================================================
-- 1. Add budget_type to shared_budgets table
-- ============================================================================

-- Add budget_type enum
CREATE TYPE budget_type AS ENUM ('household', 'personal');

-- Add columns to existing shared_budgets table
ALTER TABLE public.shared_budgets
  ADD COLUMN budget_type budget_type NOT NULL DEFAULT 'household',
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN count_split_portion_only BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.shared_budgets.budget_type IS 'Whether this is a household-wide budget or personal budget';
COMMENT ON COLUMN public.shared_budgets.user_id IS 'For personal budgets, the user who owns this budget';
COMMENT ON COLUMN public.shared_budgets.count_split_portion_only IS 'For personal budgets, whether to count only the user''s split portion (true) or full transaction amount (false)';

-- Add constraint: personal budgets must have user_id
ALTER TABLE public.shared_budgets
  ADD CONSTRAINT personal_budget_has_user
  CHECK (
    (budget_type = 'household' AND user_id IS NULL) OR
    (budget_type = 'personal' AND user_id IS NOT NULL)
  );

-- Add index for personal budget queries
CREATE INDEX idx_shared_budgets_user_id ON public.shared_budgets(user_id) WHERE budget_type = 'personal';
CREATE INDEX idx_shared_budgets_type ON public.shared_budgets(budget_type);

-- ============================================================================
-- 2. Update RLS Policies for Personal Budgets
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view budgets for their households" ON public.shared_budgets;

-- New policy: Users can view household budgets OR their own personal budgets
CREATE POLICY "Users can view budgets for their households and personal budgets"
  ON public.shared_budgets
  FOR SELECT
  USING (
    -- Household budgets: user must be a member
    (budget_type = 'household' AND EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = shared_budgets.household_id
        AND household_members.user_id = auth.uid()
    ))
    OR
    -- Personal budgets: user must be the owner
    (budget_type = 'personal' AND user_id = auth.uid())
  );

-- Update INSERT policy
DROP POLICY IF EXISTS "Owners/admins can create budgets" ON public.shared_budgets;

CREATE POLICY "Owners/admins can create household budgets and users can create personal budgets"
  ON public.shared_budgets
  FOR INSERT
  WITH CHECK (
    -- Household budgets: user must be owner/admin
    (budget_type = 'household' AND EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = shared_budgets.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role IN ('owner', 'admin')
    ))
    OR
    -- Personal budgets: user must be creating for themselves
    (budget_type = 'personal' AND user_id = auth.uid())
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Owners/admins can update budgets" ON public.shared_budgets;

CREATE POLICY "Owners/admins can update household budgets and users can update their personal budgets"
  ON public.shared_budgets
  FOR UPDATE
  USING (
    (budget_type = 'household' AND EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = shared_budgets.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role IN ('owner', 'admin')
    ))
    OR
    (budget_type = 'personal' AND user_id = auth.uid())
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Owners/admins can delete budgets" ON public.shared_budgets;

CREATE POLICY "Owners/admins can delete household budgets and users can delete their personal budgets"
  ON public.shared_budgets
  FOR DELETE
  USING (
    (budget_type = 'household' AND EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = shared_budgets.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role IN ('owner', 'admin')
    ))
    OR
    (budget_type = 'personal' AND user_id = auth.uid())
  );

-- ============================================================================
-- 3. Backfill existing budgets as household type
-- ============================================================================

UPDATE public.shared_budgets
SET budget_type = 'household',
    user_id = NULL,
    count_split_portion_only = false
WHERE budget_type IS NULL;

-- ============================================================================
-- 4. Add helper function to calculate budget spending with split awareness
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_budget_spending(
  p_budget_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget_type budget_type;
  v_user_id UUID;
  v_household_id UUID;
  v_currency VARCHAR(3);
  v_count_split_portion BOOLEAN;
  v_total_spending BIGINT := 0;
BEGIN
  -- Get budget details
  SELECT budget_type, user_id, household_id, currency, count_split_portion_only
  INTO v_budget_type, v_user_id, v_household_id, v_currency, v_count_split_portion
  FROM public.shared_budgets
  WHERE id = p_budget_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget not found';
  END IF;

  IF v_budget_type = 'household' THEN
    -- Household budget: sum all household expenses
    SELECT COALESCE(SUM(ABS(amount_cents)), 0)
    INTO v_total_spending
    FROM public.expenses
    WHERE household_id = v_household_id
      AND currency = v_currency
      AND date >= p_start_date
      AND date <= p_end_date
      AND amount_cents < 0; -- Only expenses, not income
  ELSE
    -- Personal budget
    IF v_count_split_portion THEN
      -- Count only user's split portion
      WITH user_expense_splits AS (
        SELECT
          e.id AS expense_id,
          e.amount_cents,
          esl.amount_cents AS split_amount
        FROM public.expenses e
        LEFT JOIN public.expense_split_groups esg ON esg.expense_id = e.id
        LEFT JOIN public.expense_split_lines esl ON esl.split_group_id = esg.id AND esl.user_id = v_user_id
        WHERE e.user_id = v_user_id
          AND e.household_id = v_household_id
          AND e.currency = v_currency
          AND e.date >= p_start_date
          AND e.date <= p_end_date
          AND e.amount_cents < 0
      )
      SELECT COALESCE(SUM(
        CASE
          WHEN split_amount IS NOT NULL THEN split_amount
          ELSE ABS(amount_cents)
        END
      ), 0)
      INTO v_total_spending
      FROM user_expense_splits;
    ELSE
      -- Count full transaction amount (ignoring splits)
      SELECT COALESCE(SUM(ABS(amount_cents)), 0)
      INTO v_total_spending
      FROM public.expenses
      WHERE user_id = v_user_id
        AND household_id = v_household_id
        AND currency = v_currency
        AND date >= p_start_date
        AND date <= p_end_date
        AND amount_cents < 0;
    END IF;
  END IF;

  RETURN v_total_spending;
END;
$$;

COMMENT ON FUNCTION public.calculate_budget_spending IS 'Calculate budget spending with split awareness for personal budgets';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_budget_spending TO authenticated;
