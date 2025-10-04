-- Add Lifetime Plan Support Migration
-- Production Ready - Adds Lifetime plan to subscription system
-- Created: 2025-01-04
-- Description: Adds Lifetime as a valid plan type (highest tier, one-time purchase)

-- ============================================================================
-- 1. Update plan constraint to include 'lifetime'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS check_plan_valid;

-- Add updated constraint including 'lifetime'
ALTER TABLE public.subscriptions
ADD CONSTRAINT check_plan_valid CHECK (plan IN ('free', 'plus', 'premium', 'lifetime'));

-- ============================================================================
-- 2. Add comment for lifetime plan
-- ============================================================================

COMMENT ON CONSTRAINT check_plan_valid ON public.subscriptions IS
  'Valid plan types: free (0), plus (1), premium (2), lifetime (3 - highest tier, one-time payment)';

-- ============================================================================
-- 3. Create helper function to check if subscription is lifetime
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_lifetime_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_plan = 'lifetime';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_lifetime_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_lifetime_subscription(UUID) TO service_role;

COMMENT ON FUNCTION public.is_lifetime_subscription(UUID) IS
  'Returns true if user has an active Lifetime subscription (one-time purchase, never expires)';

-- ============================================================================
-- 4. Update get_user_subscription_enhanced function for Lifetime handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_subscription_enhanced(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    plan TEXT,
    billing_interval TEXT,
    status TEXT,
    current_period_end TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    pending_plan TEXT,
    pending_interval TEXT,
    pending_effective_date TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.plan,
        s.billing_interval,
        s.status,
        s.current_period_end,
        CASE
            -- Lifetime: No next payment (one-time purchase)
            WHEN s.plan = 'lifetime' THEN NULL
            -- Canceled subscriptions: No next payment
            WHEN s.cancel_at_period_end THEN NULL
            -- Active recurring: Next payment is period end
            ELSE s.current_period_end
        END AS next_payment_date,
        s.cancel_at_period_end,
        s.pending_plan,
        s.pending_interval,
        s.pending_effective_date,
        s.trial_start,
        s.trial_end,
        s.stripe_subscription_id,
        s.stripe_customer_id,
        s.created_at,
        s.updated_at
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_subscription_enhanced(UUID) IS
  'Enhanced subscription retrieval with Lifetime plan support (no next payment date for Lifetime)';

-- ============================================================================
-- 5. Add index for lifetime plan queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status
    ON public.subscriptions(plan, status)
    WHERE plan = 'lifetime' AND status = 'active';

COMMENT ON INDEX idx_subscriptions_plan_status IS
  'Optimize queries for active Lifetime subscriptions';

  -- Allow NULL current_period_end for Lifetime subscriptions
-- Lifetime plans are one-time purchases with no expiration date
-- Created: 2025-10-04

-- Make current_period_end nullable to support Lifetime plans
ALTER TABLE public.subscriptions
ALTER COLUMN current_period_end DROP NOT NULL;

-- Add constraint: current_period_end must be NULL if plan is lifetime
ALTER TABLE public.subscriptions
ADD CONSTRAINT lifetime_no_period_end CHECK (
  (plan = 'lifetime' AND current_period_end IS NULL) OR
  (plan != 'lifetime')
);

COMMENT ON CONSTRAINT lifetime_no_period_end ON public.subscriptions IS
  'Lifetime plans must have NULL current_period_end (one-time purchase, never expires)';

-- ============================================================================
-- Migration complete
-- ============================================================================
