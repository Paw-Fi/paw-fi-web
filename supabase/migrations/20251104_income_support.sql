-- ====================
-- INCOME TRACKING SYSTEM - Database Migration
-- Created: 2025-11-04
-- Purpose: Enable manual income recording with privacy scopes, household sharing, and multi-currency support
-- Strategy: Type-based extension of existing expenses table for unified transaction management
-- ====================

-- ====================
-- ENUMS
-- ====================

-- Transaction type (expense vs income)
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('expense', 'income');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Privacy scope for household income visibility
DO $$ BEGIN
  CREATE TYPE privacy_scope AS ENUM ('private', 'balances_only', 'full');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Owner attribution (for household context)
DO $$ BEGIN
  CREATE TYPE transaction_owner AS ENUM ('me', 'partner', 'household');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Recurrence frequency (v1.5)
DO $$ BEGIN
  CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ====================
-- EXTEND EXPENSES TABLE FOR INCOME SUPPORT
-- ====================

-- Add transaction type (expense vs income)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN type transaction_type DEFAULT 'expense' NOT NULL;

    COMMENT ON COLUMN public.expenses.type IS 'Transaction type: expense (outflow) or income (inflow)';
  END IF;
END $$;

-- Add privacy scope (controls household visibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'privacy_scope'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN privacy_scope privacy_scope DEFAULT 'full';

    COMMENT ON COLUMN public.expenses.privacy_scope IS 'Privacy level for household members: full (all details), balances_only (totals only), private (hidden from partner)';
  END IF;
END $$;

-- Add owner attribution (for household income context)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'owner_type'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN owner_type transaction_owner DEFAULT 'me';

    COMMENT ON COLUMN public.expenses.owner_type IS 'Owner attribution: me (current user), partner (household partner), household (shared/generic)';
  END IF;
END $$;

-- Add source/employer field for income
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN source TEXT;

    COMMENT ON COLUMN public.expenses.source IS 'Income source (e.g., employer name, refund source) or expense merchant';
  END IF;
END $$;

-- Add acknowledgement tracking (partner confirmation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'acknowledged_by'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN acknowledged_by UUID[] DEFAULT '{}';

    COMMENT ON COLUMN public.expenses.acknowledged_by IS 'Array of user_ids who have acknowledged this transaction';
  END IF;
END $$;

-- Add normalized amount for multi-currency reporting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'normalized_amount_cents'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN normalized_amount_cents BIGINT;

    COMMENT ON COLUMN public.expenses.normalized_amount_cents IS 'Amount converted to household base currency at entry time';
  END IF;
END $$;

-- Add FX rate for normalization tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'fx_rate'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN fx_rate DECIMAL(12,6);

    COMMENT ON COLUMN public.expenses.fx_rate IS 'Exchange rate used for normalization (base_currency / transaction_currency)';
  END IF;
END $$;

-- Add base currency reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'base_currency'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN base_currency VARCHAR(3);

    COMMENT ON COLUMN public.expenses.base_currency IS 'Base currency used for normalization (typically household currency)';
  END IF;
END $$;

-- Add recurring income fields (v1.5)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN is_recurring BOOLEAN DEFAULT false;

    COMMENT ON COLUMN public.expenses.is_recurring IS 'Whether this is a recurring income/expense';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'recurrence_rule'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN recurrence_rule JSONB;

    COMMENT ON COLUMN public.expenses.recurrence_rule IS 'Recurrence configuration: {frequency, anchor_date, end_date, interval}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'parent_recurring_id'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN parent_recurring_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE;

    COMMENT ON COLUMN public.expenses.parent_recurring_id IS 'Reference to parent recurring transaction (for auto-generated instances)';
  END IF;
END $$;

-- Add attachment support (beyond receipt images)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN attachments JSONB DEFAULT '[]';

    COMMENT ON COLUMN public.expenses.attachments IS 'Array of attachment objects: [{url, type, name, size}]';
  END IF;
END $$;

-- Add idempotency key for deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN idempotency_key TEXT;

    COMMENT ON COLUMN public.expenses.idempotency_key IS 'Client-provided idempotency key for deduplication (household_id + creator + key)';
  END IF;
END $$;

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Type-based queries
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_type_user ON public.expenses(type, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_type_household ON public.expenses(type, household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_type_date ON public.expenses(type, date);

-- Privacy-aware household queries
CREATE INDEX IF NOT EXISTS idx_expenses_household_privacy ON public.expenses(household_id, privacy_scope) WHERE household_id IS NOT NULL;

-- Acknowledgement queries
CREATE INDEX IF NOT EXISTS idx_expenses_acknowledged ON public.expenses USING GIN(acknowledged_by);

-- Recurring income queries
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON public.expenses(is_recurring, type) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_expenses_parent_recurring ON public.expenses(parent_recurring_id) WHERE parent_recurring_id IS NOT NULL;

-- Idempotency deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_idempotency
  ON public.expenses(household_id, user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Multi-currency normalization queries
CREATE INDEX IF NOT EXISTS idx_expenses_base_currency ON public.expenses(base_currency, household_id) WHERE base_currency IS NOT NULL;

-- ====================
-- UPDATED RLS POLICIES FOR INCOME PRIVACY
-- ====================

-- Drop existing expense SELECT policy and recreate with privacy logic
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their expenses and household expenses" ON public.expenses;
END $$;

-- Users can view:
-- 1. Their own transactions (all types, all privacy levels)
-- 2. Household transactions based on privacy scope
CREATE POLICY "Users can view expenses and income with privacy" ON public.expenses
  FOR SELECT USING (
    -- Own transactions (always visible)
    user_id = auth.uid()
    -- Household transactions (privacy-aware)
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = expenses.household_id
          AND user_id = auth.uid()
      )
      -- Privacy filtering:
      -- 'full': All members see all details
      -- 'balances_only': Non-owners see it in aggregates but details are redacted (handled at application level)
      -- 'private': Only owner sees it (filter out for non-owners)
      AND (
        privacy_scope IN ('full', 'balances_only')
        OR user_id = auth.uid() -- Owner can always see their private transactions
      )
    )
  );

-- Insert policy: users can create their own transactions
CREATE POLICY "Users can create their own transactions" ON public.expenses
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Update policy: users can update their own transactions, or household admins can moderate
CREATE POLICY "Users can update their own transactions" ON public.expenses
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = expenses.household_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- Delete policy: users can delete their own transactions, or household owners can moderate
CREATE POLICY "Users can delete their own transactions" ON public.expenses
  FOR DELETE USING (
    user_id = auth.uid()
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = expenses.household_id
          AND user_id = auth.uid()
          AND role = 'owner'
      )
    )
  );

-- ====================
-- DATABASE FUNCTIONS
-- ====================

-- Function to acknowledge a transaction (partner confirmation)
CREATE OR REPLACE FUNCTION public.acknowledge_transaction(
  p_transaction_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_is_member BOOLEAN;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM public.expenses
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Verify user is household member (if household transaction)
  IF v_transaction.household_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = v_transaction.household_id
        AND user_id = p_user_id
    ) INTO v_is_member;

    IF NOT v_is_member THEN
      RAISE EXCEPTION 'User is not a member of the household';
    END IF;
  END IF;

  -- Add user to acknowledged_by array (if not already present)
  UPDATE public.expenses
  SET acknowledged_by = array_append(
    COALESCE(acknowledged_by, '{}'),
    p_user_id
  )
  WHERE id = p_transaction_id
    AND NOT (p_user_id = ANY(COALESCE(acknowledged_by, '{}')));

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.acknowledge_transaction IS 'Mark a transaction as acknowledged by a household member';

-- Function to get household income summary with privacy filtering
CREATE OR REPLACE FUNCTION public.get_household_income_summary(
  p_household_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_currency VARCHAR(3) DEFAULT NULL
)
RETURNS TABLE(
  total_income_cents BIGINT,
  currency VARCHAR(3),
  member_breakdown JSONB,
  category_breakdown JSONB,
  transaction_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_member BOOLEAN;
BEGIN
  -- Verify user is household member
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = v_user_id
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'User is not a member of the household';
  END IF;

  RETURN QUERY
  WITH filtered_income AS (
    SELECT
      e.id,
      e.user_id,
      e.amount_cents,
      e.currency,
      e.normalized_amount_cents,
      e.base_currency,
      e.category,
      e.privacy_scope,
      e.owner_type
    FROM public.expenses e
    WHERE e.household_id = p_household_id
      AND e.type = 'income'
      AND (p_start_date IS NULL OR e.date >= p_start_date)
      AND (p_end_date IS NULL OR e.date <= p_end_date)
      AND (p_currency IS NULL OR e.currency = p_currency)
      -- Privacy filtering
      AND (
        e.privacy_scope IN ('full', 'balances_only')
        OR e.user_id = v_user_id
      )
  ),
  member_totals AS (
    SELECT
      CASE
        WHEN privacy_scope = 'private' AND user_id != v_user_id THEN 'private'::TEXT
        ELSE user_id::TEXT
      END as member_key,
      SUM(COALESCE(normalized_amount_cents, amount_cents)) as total_cents
    FROM filtered_income
    GROUP BY member_key
  ),
  category_totals AS (
    SELECT
      category,
      SUM(COALESCE(normalized_amount_cents, amount_cents)) as total_cents
    FROM filtered_income
    GROUP BY category
  )
  SELECT
    SUM(COALESCE(fi.normalized_amount_cents, fi.amount_cents))::BIGINT as total_income_cents,
    COALESCE(p_currency, MAX(fi.base_currency), MAX(fi.currency))::VARCHAR(3) as currency,
    (SELECT jsonb_object_agg(member_key, total_cents) FROM member_totals) as member_breakdown,
    (SELECT jsonb_object_agg(category, total_cents) FROM category_totals) as category_breakdown,
    COUNT(*)::INTEGER as transaction_count
  FROM filtered_income fi;
END;
$$;

COMMENT ON FUNCTION public.get_household_income_summary IS 'Get household income summary with privacy-aware aggregation';

-- Function to normalize transaction amount to base currency
CREATE OR REPLACE FUNCTION public.normalize_transaction_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_currency VARCHAR(3);
  v_fx_rate DECIMAL(12,6);
BEGIN
  -- Only normalize if transaction is linked to a household
  IF NEW.household_id IS NOT NULL THEN
    -- Get household base currency
    SELECT currency INTO v_household_currency
    FROM public.households
    WHERE id = NEW.household_id;

    -- If transaction currency matches household currency, normalization is 1:1
    IF NEW.currency = v_household_currency THEN
      NEW.normalized_amount_cents := NEW.amount_cents;
      NEW.fx_rate := 1.0;
      NEW.base_currency := v_household_currency;
    ELSE
      -- Use provided FX rate or default to 1.0 (application should provide rate)
      v_fx_rate := COALESCE(NEW.fx_rate, 1.0);
      NEW.normalized_amount_cents := ROUND(NEW.amount_cents * v_fx_rate);
      NEW.base_currency := v_household_currency;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.normalize_transaction_amount IS 'Auto-normalize transaction amounts to household base currency';

-- Create trigger for auto-normalization
DROP TRIGGER IF EXISTS normalize_transaction_amount_trigger ON public.expenses;
CREATE TRIGGER normalize_transaction_amount_trigger
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW
WHEN (NEW.household_id IS NOT NULL)
EXECUTE FUNCTION public.normalize_transaction_amount();

-- Function to validate recurring rule
CREATE OR REPLACE FUNCTION public.validate_recurrence_rule()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_recurring = true THEN
    -- Ensure recurrence_rule is set
    IF NEW.recurrence_rule IS NULL THEN
      RAISE EXCEPTION 'recurrence_rule is required when is_recurring is true';
    END IF;

    -- Validate recurrence_rule structure
    IF NOT (NEW.recurrence_rule ? 'frequency') THEN
      RAISE EXCEPTION 'recurrence_rule must contain frequency field';
    END IF;

    IF NOT (NEW.recurrence_rule ? 'anchor_date') THEN
      RAISE EXCEPTION 'recurrence_rule must contain anchor_date field';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_recurrence_rule IS 'Validate recurring income/expense configuration';

-- Create trigger for recurrence validation
DROP TRIGGER IF EXISTS validate_recurrence_rule_trigger ON public.expenses;
CREATE TRIGGER validate_recurrence_rule_trigger
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW
WHEN (NEW.is_recurring = true)
EXECUTE FUNCTION public.validate_recurrence_rule();

-- ====================
-- SEED DEFAULT INCOME CATEGORIES
-- ====================

-- Add income categories to expense_categories table
INSERT INTO public.expense_categories (contact_id, name, is_default)
SELECT null, x.name, true
FROM (values
  ('income:salary'),
  ('income:freelance'),
  ('income:investment'),
  ('income:refund'),
  ('income:gift'),
  ('income:bonus'),
  ('income:rental'),
  ('income:other')
) as x(name)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.expense_categories IS 'Categories for both expenses and income (prefix with income: for income categories)';

-- ====================
-- NOTIFICATION EVENTS
-- ====================

-- Extend notification event types for income
DO $$
BEGIN
  -- Check if we need to add new notification types
  -- This is idempotent and safe to run multiple times

  -- Add income-related notification events if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'income_added'
    AND enumtypid = 'notification_event_type'::regtype
  ) THEN
    ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'income_added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'income_edited'
    AND enumtypid = 'notification_event_type'::regtype
  ) THEN
    ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'income_edited';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'income_acknowledged'
    AND enumtypid = 'notification_event_type'::regtype
  ) THEN
    ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'income_acknowledged';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ====================
-- COMMENTS FOR DOCUMENTATION
-- ====================

COMMENT ON TABLE public.expenses IS 'Unified transaction table for expenses (outflows) and income (inflows) with privacy controls and household sharing';

-- ====================
-- MIGRATION COMPLETE
-- ====================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Income support migration completed successfully';
  RAISE NOTICE 'New features: transaction types, privacy scopes, acknowledgements, recurring income, multi-currency normalization';
END $$;
