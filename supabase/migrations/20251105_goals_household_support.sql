-- IMPORTANT: NOT DEPLOY TO PRODUCTION YET!
-- Extend financial goals for household support, privacy, and savings/paydown types
-- Following existing pattern from income feature (type-based extension)

-- 1) Add goal types for savings/paydown distinction
CREATE TYPE goal_category AS ENUM ('savings', 'paydown');

-- 2) Extend financial_goals table with household and privacy fields
ALTER TABLE public.financial_goals
ADD COLUMN IF NOT EXISTS category goal_category DEFAULT 'savings' NOT NULL,
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS privacy_scope privacy_scope DEFAULT 'full',
ADD COLUMN IF NOT EXISTS owner_type transaction_owner DEFAULT 'me',
ADD COLUMN IF NOT EXISTS acknowledged_by UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS base_currency TEXT,
ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(10, 6),
ADD COLUMN IF NOT EXISTS normalized_target_amount BIGINT,
ADD COLUMN IF NOT EXISTS normalized_current_amount BIGINT;

COMMENT ON COLUMN public.financial_goals.category IS 'Goal category: savings (accumulate) or paydown (reduce debt)';
COMMENT ON COLUMN public.financial_goals.household_id IS 'Household this goal belongs to (NULL for personal goals)';
COMMENT ON COLUMN public.financial_goals.privacy_scope IS 'Privacy level: private (me only), balances_only (amounts hidden), full (all details)';
COMMENT ON COLUMN public.financial_goals.owner_type IS 'Owner type: me, partner, or household';
COMMENT ON COLUMN public.financial_goals.acknowledged_by IS 'Array of user IDs who have acknowledged this goal';
COMMENT ON COLUMN public.financial_goals.base_currency IS 'Household base currency for normalization';
COMMENT ON COLUMN public.financial_goals.fx_rate IS 'Exchange rate used for normalization';
COMMENT ON COLUMN public.financial_goals.normalized_target_amount IS 'Target amount in household base currency (cents)';
COMMENT ON COLUMN public.financial_goals.normalized_current_amount IS 'Current amount in household base currency (cents)';

-- 3) Create contributions table (extends goal_progress_updates pattern)
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,

  -- Transaction details
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  contribution_type TEXT NOT NULL, -- 'contribution', 'withdrawal', 'interest', 'adjustment'

  -- Normalization (multi-currency support)
  normalized_amount_cents BIGINT,
  fx_rate NUMERIC(10, 6),
  base_currency TEXT,

  -- Privacy and ownership
  privacy_scope privacy_scope DEFAULT 'full',
  owner_type transaction_owner DEFAULT 'me',
  acknowledged_by UUID[] DEFAULT '{}',

  -- Metadata
  source TEXT, -- 'manual', 'automatic', 'recurring', 'interest'
  note TEXT,
  attachment_urls TEXT[],

  -- Deduplication
  idempotency_key TEXT,

  -- Timestamps
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_amount CHECK (amount_cents != 0),
  CONSTRAINT unique_contribution_key UNIQUE (household_id, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON public.goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_date ON public.goal_contributions(user_id, contribution_date);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_household_date ON public.goal_contributions(household_id, contribution_date);

COMMENT ON TABLE public.goal_contributions IS 'Goal contributions and withdrawals with privacy controls and multi-currency support';
COMMENT ON COLUMN public.goal_contributions.contribution_type IS 'Type: contribution (add), withdrawal (remove), interest (earned), adjustment (correction)';

-- 4) RLS policies for financial_goals with privacy filtering
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS goals_user_select ON public.financial_goals;
DROP POLICY IF EXISTS goals_user_insert ON public.financial_goals;
DROP POLICY IF EXISTS goals_user_update ON public.financial_goals;
DROP POLICY IF EXISTS goals_user_delete ON public.financial_goals;

-- Personal goals: user can see their own goals
CREATE POLICY goals_personal_select ON public.financial_goals
  FOR SELECT
  USING (
    auth.uid() = user_id AND household_id IS NULL
  );

-- Household goals: members can see based on privacy scope
CREATE POLICY goals_household_select ON public.financial_goals
  FOR SELECT
  USING (
    household_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = financial_goals.household_id
      AND hm.user_id = auth.uid()
      AND hm.status = 'active'
    )
    AND (
      -- Owner always sees everything
      user_id = auth.uid()
      -- Private: only owner sees
      OR (privacy_scope = 'private' AND user_id = auth.uid())
      -- Balances only: partner sees limited view (handled in application)
      OR (privacy_scope = 'balances_only')
      -- Full: everyone sees everything
      OR (privacy_scope = 'full')
    )
  );

-- Insert: user can create personal goals or household goals
CREATE POLICY goals_insert ON public.financial_goals
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Personal goal
      household_id IS NULL
      -- Or household member
      OR EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = financial_goals.household_id
        AND hm.user_id = auth.uid()
        AND hm.status = 'active'
      )
    )
  );

-- Update: owner can update, or household admin
CREATE POLICY goals_update ON public.financial_goals
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = financial_goals.household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
        AND hm.status = 'active'
      )
    )
  );

-- Delete: owner can delete, or household admin
CREATE POLICY goals_delete ON public.financial_goals
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = financial_goals.household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
        AND hm.status = 'active'
      )
    )
  );

-- 5) RLS policies for goal_contributions
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- View contributions based on goal visibility and privacy
CREATE POLICY contributions_select ON public.goal_contributions
  FOR SELECT
  USING (
    -- User can see their own contributions
    user_id = auth.uid()
    -- Or contributions to goals they can access
    OR EXISTS (
      SELECT 1 FROM public.financial_goals fg
      WHERE fg.id = goal_contributions.goal_id
      AND (
        fg.user_id = auth.uid()
        OR (
          fg.household_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.household_members hm
            WHERE hm.household_id = fg.household_id
            AND hm.user_id = auth.uid()
            AND hm.status = 'active'
          )
        )
      )
    )
  );

-- Insert contributions
CREATE POLICY contributions_insert ON public.goal_contributions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.financial_goals fg
      WHERE fg.id = goal_contributions.goal_id
      AND (
        fg.user_id = auth.uid()
        OR (
          fg.household_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.household_members hm
            WHERE hm.household_id = fg.household_id
            AND hm.user_id = auth.uid()
            AND hm.status = 'active'
          )
        )
      )
    )
  );

-- Update own contributions
CREATE POLICY contributions_update ON public.goal_contributions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete own contributions
CREATE POLICY contributions_delete ON public.goal_contributions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6) Database function: Acknowledge goal
CREATE OR REPLACE FUNCTION acknowledge_goal(
  p_goal_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.financial_goals
  SET
    acknowledged_by = array_append(acknowledged_by, p_user_id),
    updated_at = NOW()
  WHERE id = p_goal_id
  AND NOT (p_user_id = ANY(acknowledged_by));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Database function: Normalize goal amounts
CREATE OR REPLACE FUNCTION normalize_goal_amount(
  p_goal_id UUID,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_household_id UUID
)
RETURNS TABLE (
  normalized_amount_cents BIGINT,
  fx_rate NUMERIC,
  base_currency TEXT
) AS $$
DECLARE
  v_base_currency TEXT;
  v_fx_rate NUMERIC;
  v_normalized_amount BIGINT;
BEGIN
  -- Get household base currency
  SELECT currency INTO v_base_currency
  FROM public.households
  WHERE id = p_household_id;

  -- If same currency, no conversion needed
  IF p_currency = v_base_currency THEN
    v_fx_rate := 1.0;
    v_normalized_amount := p_amount_cents;
  ELSE
    -- TODO: Fetch live exchange rate from external service
    -- For now, use 1.0 (same as income pattern)
    v_fx_rate := 1.0;
    v_normalized_amount := p_amount_cents;
  END IF;

  -- Return normalized values
  RETURN QUERY SELECT v_normalized_amount, v_fx_rate, v_base_currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8) Database function: Get household goal summary
CREATE OR REPLACE FUNCTION get_household_goal_summary(
  p_household_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  total_goals INTEGER,
  active_goals INTEGER,
  completed_goals INTEGER,
  total_target_amount BIGINT,
  total_current_amount BIGINT,
  total_contributions_mtd BIGINT,
  savings_goals INTEGER,
  paydown_goals INTEGER,
  on_track_goals INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_goals,
    COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS active_goals,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_goals,
    COALESCE(SUM(normalized_target_amount), 0)::BIGINT AS total_target_amount,
    COALESCE(SUM(normalized_current_amount), 0)::BIGINT AS total_current_amount,
    COALESCE((
      SELECT SUM(normalized_amount_cents)
      FROM public.goal_contributions gc
      WHERE gc.household_id = p_household_id
      AND gc.contribution_date >= DATE_TRUNC('month', CURRENT_DATE)::DATE
      AND gc.contribution_type = 'contribution'
    ), 0)::BIGINT AS total_contributions_mtd,
    COUNT(*) FILTER (WHERE category = 'savings')::INTEGER AS savings_goals,
    COUNT(*) FILTER (WHERE category = 'paydown')::INTEGER AS paydown_goals,
    COUNT(*) FILTER (WHERE is_on_track = true)::INTEGER AS on_track_goals
  FROM public.financial_goals
  WHERE household_id = p_household_id
  AND (
    user_id = p_user_id
    OR privacy_scope = 'full'
    OR (privacy_scope = 'balances_only' AND user_id != p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9) Trigger: Auto-update goal current_amount on contribution
CREATE OR REPLACE FUNCTION update_goal_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
  -- Update goal current amount (add for contribution, subtract for withdrawal)
  IF TG_OP = 'INSERT' THEN
    UPDATE public.financial_goals
    SET
      current_amount = CASE
        WHEN NEW.contribution_type IN ('contribution', 'interest') THEN
          current_amount + (NEW.amount_cents::NUMERIC / 100)
        WHEN NEW.contribution_type IN ('withdrawal', 'adjustment') THEN
          current_amount - (NEW.amount_cents::NUMERIC / 100)
        ELSE current_amount
      END,
      normalized_current_amount = CASE
        WHEN NEW.contribution_type IN ('contribution', 'interest') THEN
          COALESCE(normalized_current_amount, 0) + NEW.normalized_amount_cents
        WHEN NEW.contribution_type IN ('withdrawal', 'adjustment') THEN
          COALESCE(normalized_current_amount, 0) - NEW.normalized_amount_cents
        ELSE normalized_current_amount
      END,
      progress_percentage = CASE
        WHEN target_amount > 0 THEN
          LEAST(
            ((current_amount + CASE
              WHEN NEW.contribution_type IN ('contribution', 'interest') THEN (NEW.amount_cents::NUMERIC / 100)
              WHEN NEW.contribution_type IN ('withdrawal', 'adjustment') THEN -(NEW.amount_cents::NUMERIC / 100)
              ELSE 0
            END) / target_amount) * 100,
            100
          )
        ELSE 0
      END,
      updated_at = NOW()
    WHERE id = NEW.goal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_goal_on_contribution
  AFTER INSERT ON public.goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_on_contribution();

-- 10) Update existing goals to have default values
UPDATE public.financial_goals
SET
  category = 'savings',
  privacy_scope = 'full',
  owner_type = 'me'
WHERE category IS NULL;
