-- Household Subscription Binding Migration
-- Created: 2025-10-25
-- Purpose: Enable household members to share subscription access
-- Description: Only the main inviter needs to be subscribed, other household members get free access

-- ============================================================================
-- 1. Add household subscription binding to subscriptions table
-- ============================================================================

-- Add column to track which user's subscription this member is bound to
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS bound_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add column to track household binding
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS bound_to_household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. Create indexes for efficient lookups
-- ============================================================================

-- Drop existing indexes if they exist (for safe re-running of migration)
DROP INDEX IF EXISTS public.idx_subscriptions_bound_to_user;
DROP INDEX IF EXISTS public.idx_subscriptions_bound_to_household;

-- Index for finding all users bound to a subscription owner
CREATE INDEX idx_subscriptions_bound_to_user
    ON public.subscriptions(bound_to_user_id)
    WHERE bound_to_user_id IS NOT NULL;

-- Index for finding all users bound to a household
CREATE INDEX idx_subscriptions_bound_to_household
    ON public.subscriptions(bound_to_household_id)
    WHERE bound_to_household_id IS NOT NULL;

-- ============================================================================
-- 3. Function to bind user to household owner's subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bind_user_to_household_subscription(
    p_user_id UUID,
    p_household_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
    v_owner_subscription RECORD;
BEGIN
    -- Get household owner
    SELECT owner_id INTO v_owner_id
    FROM public.households
    WHERE id = p_household_id;
    
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Household not found';
    END IF;
    
    -- Don't bind to yourself (owner doesn't need binding)
    IF v_owner_id = p_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- CRITICAL: Only bind to household OWNER, not to other members
    -- This ensures clean subscription hierarchy: owner -> members (not member -> member)
    
    -- VALIDATION: Check if user is actually a member of this household
    IF NOT EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = p_household_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this household';
    END IF;
    
    -- Check if owner has active subscription (and not bound themselves)
    -- Get ALL subscription fields to copy to bound member
    SELECT 
        plan, 
        status, 
        bound_to_user_id, 
        stripe_customer_id,
        billing_interval,
        current_period_end,
        trial_start,
        trial_end
    INTO v_owner_subscription
    FROM public.subscriptions
    WHERE user_id = v_owner_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_owner_subscription.plan IS NULL THEN
        -- Owner doesn't have subscription, no binding needed
        RETURN FALSE;
    END IF;
    
    -- CRITICAL: Owner must not be bound to another household themselves
    -- A bound user cannot share their subscription (they don't own it)
    IF v_owner_subscription.bound_to_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Household owner is bound to another subscription and cannot share access';
    END IF;
    
    -- Check if owner has active subscription
    IF NOT (
        (v_owner_subscription.plan = 'lifetime' AND v_owner_subscription.status = 'active') OR
        (v_owner_subscription.status = 'trialing') OR
        (v_owner_subscription.status = 'active' AND v_owner_subscription.plan != 'free')
    ) THEN
        -- Owner doesn't have active subscription
        RETURN FALSE;
    END IF;
    
    -- Create or update subscription record for the user
    -- IMPORTANT: Copy ALL subscription fields from owner so bound members have same lifecycle
    INSERT INTO public.subscriptions (
        user_id,
        plan,
        status,
        bound_to_user_id,
        bound_to_household_id,
        stripe_subscription_id,
        stripe_customer_id,
        billing_interval,
        current_period_end,
        cancel_at_period_end,
        trial_start,
        trial_end,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        v_owner_subscription.plan,  -- Copy owner's plan (plus/premium/lifetime)
        v_owner_subscription.status,  -- Copy owner's exact status (active/trialing/etc)
        v_owner_id,  -- Bind to owner's subscription
        p_household_id,
        NULL,  -- No direct Stripe subscription ID (bound members don't have their own)
        v_owner_subscription.stripe_customer_id,  -- IMPORTANT: Use owner's customer ID for batch operations
        v_owner_subscription.billing_interval,  -- Copy billing interval (monthly/yearly)
        v_owner_subscription.current_period_end,  -- Copy period end (bound members follow owner's cycle)
        FALSE, -- Not cancelable by bound user
        v_owner_subscription.trial_start,  -- Copy trial start (if owner is trialing)
        v_owner_subscription.trial_end,  -- Copy trial end (if owner is trialing)
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,  -- Copy owner's exact status
        bound_to_user_id = EXCLUDED.bound_to_user_id,
        bound_to_household_id = EXCLUDED.bound_to_household_id,
        stripe_subscription_id = NULL,  -- Clear any existing Stripe subscription
        stripe_customer_id = EXCLUDED.stripe_customer_id,  -- Use owner's customer ID
        billing_interval = EXCLUDED.billing_interval,  -- Copy owner's billing interval
        current_period_end = EXCLUDED.current_period_end,  -- Copy owner's period end
        trial_start = EXCLUDED.trial_start,  -- Copy owner's trial start
        trial_end = EXCLUDED.trial_end,  -- Copy owner's trial end
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.bind_user_to_household_subscription(UUID, UUID) TO service_role;

-- ============================================================================
-- 5. Function to remove household subscription bindings when member leaves
-- ============================================================================

CREATE OR REPLACE FUNCTION public.remove_household_subscription_binding(
    p_user_id UUID,
    p_household_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Remove binding and reset to free plan
    UPDATE public.subscriptions
    SET 
        plan = 'free',
        status = 'active',
        bound_to_user_id = NULL,
        bound_to_household_id = NULL,
        stripe_subscription_id = NULL,
        stripe_customer_id = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND bound_to_user_id IS NOT NULL
      AND (p_household_id IS NULL OR bound_to_household_id = p_household_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.remove_household_subscription_binding(UUID, UUID) TO service_role;

-- ============================================================================
-- 6. Function to cascade subscription cancellations to bound household members
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cascade_subscription_cancellation(p_owner_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_affected_count INTEGER;
    v_owner_stripe_customer_id TEXT;
BEGIN
    -- Get owner's Stripe customer ID (all bound members share this)
    SELECT stripe_customer_id INTO v_owner_stripe_customer_id
    FROM public.subscriptions
    WHERE user_id = p_owner_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update all users bound to this owner's subscription
    -- Can identify by either bound_to_user_id OR matching stripe_customer_id
    UPDATE public.subscriptions
    SET 
        plan = 'free',
        status = 'canceled',
        bound_to_user_id = NULL,
        bound_to_household_id = NULL,
        stripe_customer_id = NULL,
        stripe_subscription_id = NULL,
        ended_at = NOW(),
        updated_at = NOW()
    WHERE bound_to_user_id = p_owner_user_id
       OR (stripe_customer_id = v_owner_stripe_customer_id 
           AND stripe_customer_id IS NOT NULL 
           AND user_id != p_owner_user_id
           AND bound_to_user_id IS NOT NULL);
    
    GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    
    RETURN v_affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cascade_subscription_cancellation(UUID) TO service_role;

-- ============================================================================
-- 7. Add constraints and validation
-- ============================================================================

-- Drop existing constraints if they exist (for safe re-running of migration)
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS check_bound_user_no_stripe;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS check_bound_user_active;

-- Ensure bound users don't have their own Stripe subscription
ALTER TABLE public.subscriptions
ADD CONSTRAINT check_bound_user_no_stripe CHECK (
    (bound_to_user_id IS NULL) OR 
    (bound_to_user_id IS NOT NULL AND stripe_subscription_id IS NULL)
);

-- NOTE: We don't enforce status='active' for bound users anymore
-- Bound users should have EXACT same status as owner (including 'trialing')
-- This ensures bound members follow the owner's subscription lifecycle completely

-- ============================================================================
-- 8. Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.subscriptions.bound_to_user_id IS 
    'User ID of the household owner whose subscription this user is bound to';

COMMENT ON COLUMN public.subscriptions.bound_to_household_id IS 
    'Household ID that this user gets subscription access through';

COMMENT ON FUNCTION public.bind_user_to_household_subscription(UUID, UUID) IS 
    'Binds a user to the household owner''s subscription for shared access';

COMMENT ON FUNCTION public.cascade_subscription_cancellation(UUID) IS 
    'Removes subscription access from all users bound to a canceled subscription';

-- ============================================================================
-- 9. Function to cascade subscription upgrades to bound household members
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cascade_subscription_upgrade(
    p_owner_user_id UUID,
    p_new_plan TEXT,
    p_new_status TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_affected_count INTEGER;
    v_owner_subscription RECORD;
BEGIN
    -- Get ALL current subscription fields from owner
    SELECT 
        plan,
        status,
        billing_interval,
        current_period_end,
        trial_start,
        trial_end,
        stripe_customer_id
    INTO v_owner_subscription
    FROM public.subscriptions
    WHERE user_id = p_owner_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update all users bound to this owner's subscription
    -- Copy ALL subscription fields to keep bound members in EXACT sync with owner
    UPDATE public.subscriptions
    SET 
        plan = v_owner_subscription.plan,
        status = v_owner_subscription.status,  -- Copy owner's EXACT status (including trialing)
        billing_interval = v_owner_subscription.billing_interval,
        current_period_end = v_owner_subscription.current_period_end,
        trial_start = v_owner_subscription.trial_start,
        trial_end = v_owner_subscription.trial_end,
        stripe_customer_id = v_owner_subscription.stripe_customer_id,
        updated_at = NOW()
    WHERE bound_to_user_id = p_owner_user_id;
    
    GET DIAGNOSTICS v_affected_count = ROW_COUNT;
    
    RETURN v_affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cascade_subscription_upgrade(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.cascade_subscription_upgrade(UUID, TEXT, TEXT) IS 
    'Updates subscription plan for all users bound to an upgraded subscription';

-- ============================================================================
-- 10. Create trigger to automatically cleanup subscription bindings when household member is removed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_household_subscription_binding()
RETURNS TRIGGER AS $$
BEGIN
    -- When a household member is deleted, remove their subscription binding
    PERFORM public.remove_household_subscription_binding(OLD.user_id, OLD.household_id);
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (for safe re-running of migration)
DROP TRIGGER IF EXISTS trigger_cleanup_subscription_binding ON public.household_members;

-- Create trigger on household_members table
CREATE TRIGGER trigger_cleanup_subscription_binding
    BEFORE DELETE ON public.household_members
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_household_subscription_binding();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_household_subscription_binding() TO service_role;

COMMENT ON FUNCTION public.cleanup_household_subscription_binding() IS 
    'Automatically removes subscription binding when household member is removed';

-- ============================================================================
-- Migration complete
-- ============================================================================
