-- Enhanced Subscription Schema Migration
-- Production Ready - Addresses all P0 database schema issues
-- Created: 2025-01-01
-- Description: Adds missing fields for complete subscription lifecycle management

-- ============================================================================
-- 1. Add missing columns to subscriptions table
-- ============================================================================

-- Billing interval tracking
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly'));

-- Trial period tracking
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Cancellation tracking
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Pending changes for scheduled downgrades
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS pending_plan TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS pending_interval TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS pending_effective_date TIMESTAMPTZ;

-- Price tracking for proration calculations
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS original_price_id TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS current_price_id TEXT;

-- Previous plan for upgrade/downgrade detection
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS previous_plan TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS previous_interval TEXT;

-- Webhook event tracking for idempotency
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS last_event_id TEXT;

-- ============================================================================
-- 2. Create webhook_events table for idempotency
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id 
    ON public.webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
    ON public.webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at 
    ON public.webhook_events(processed_at);

-- ============================================================================
-- 3. Create idempotency_keys table for API operation deduplication
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for faster lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key 
    ON public.idempotency_keys(key);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at 
    ON public.idempotency_keys(expires_at);

-- ============================================================================
-- 4. Create subscription_events table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    old_plan TEXT,
    new_plan TEXT,
    old_interval TEXT,
    new_interval TEXT,
    old_status TEXT,
    new_status TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for querying and analysis
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id 
    ON public.subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id 
    ON public.subscription_events(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type 
    ON public.subscription_events(event_type);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at 
    ON public.subscription_events(created_at);

-- ============================================================================
-- 5. Update subscriptions table to enforce plan enum
-- ============================================================================

-- Add constraint to validate plan values
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS check_plan_valid;

ALTER TABLE public.subscriptions
ADD CONSTRAINT check_plan_valid CHECK (plan IN ('free', 'plus', 'premium'));

-- Add constraint to validate status values
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS check_status_valid;

ALTER TABLE public.subscriptions
ADD CONSTRAINT check_status_valid CHECK (
    status IN (
        'active', 'trialing', 'past_due', 'canceled', 
        'incomplete', 'incomplete_expired', 'unpaid', 'paused'
    )
);

-- ============================================================================
-- 6. Create helper function to log subscription changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if this is an update (not insert)
    IF TG_OP = 'UPDATE' THEN
        -- Check if plan, interval, or status changed
        IF OLD.plan IS DISTINCT FROM NEW.plan 
            OR OLD.billing_interval IS DISTINCT FROM NEW.billing_interval
            OR OLD.status IS DISTINCT FROM NEW.status THEN
            
            INSERT INTO public.subscription_events (
                user_id,
                subscription_id,
                event_type,
                old_plan,
                new_plan,
                old_interval,
                new_interval,
                old_status,
                new_status,
                metadata
            ) VALUES (
                NEW.user_id,
                NEW.id,
                CASE 
                    WHEN OLD.plan IS DISTINCT FROM NEW.plan THEN 'plan_change'
                    WHEN OLD.billing_interval IS DISTINCT FROM NEW.billing_interval THEN 'interval_change'
                    WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change'
                    ELSE 'update'
                END,
                OLD.plan,
                NEW.plan,
                OLD.billing_interval,
                NEW.billing_interval,
                OLD.status,
                NEW.status,
                jsonb_build_object(
                    'cancel_at_period_end', NEW.cancel_at_period_end,
                    'current_period_end', NEW.current_period_end
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription change logging
DROP TRIGGER IF EXISTS trigger_log_subscription_change ON public.subscriptions;

CREATE TRIGGER trigger_log_subscription_change
AFTER UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_subscription_change();

-- ============================================================================
-- 7. Create RLS policies for new tables
-- ============================================================================

-- webhook_events: Service role only (contains sensitive event data)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook events"
    ON public.webhook_events
    FOR ALL
    USING (auth.role() = 'service_role');

-- idempotency_keys: Service role only
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage idempotency keys"
    ON public.idempotency_keys
    FOR ALL
    USING (auth.role() = 'service_role');

-- subscription_events: Users can view their own events, service role can manage all
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription events"
    ON public.subscription_events
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscription events"
    ON public.subscription_events
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. Create cleanup function for old records
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS TABLE (
    idempotency_keys_deleted INTEGER,
    webhook_events_deleted INTEGER
) AS $$
DECLARE
    idempotency_count INTEGER;
    webhook_count INTEGER;
BEGIN
    -- Delete idempotency keys older than 24 hours
    DELETE FROM public.idempotency_keys
    WHERE created_at < (now() - interval '24 hours');
    
    GET DIAGNOSTICS idempotency_count = ROW_COUNT;
    
    -- Delete webhook events older than 30 days
    DELETE FROM public.webhook_events
    WHERE processed_at < (now() - interval '30 days');
    
    GET DIAGNOSTICS webhook_count = ROW_COUNT;
    
    RETURN QUERY SELECT idempotency_count, webhook_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_tracking_data() TO service_role;

-- ============================================================================
-- 9. Create helper function to get active subscription with enhanced data
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
            WHEN s.cancel_at_period_end THEN NULL
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_subscription_enhanced(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_enhanced(UUID) TO service_role;

-- ============================================================================
-- 10. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.webhook_events IS 'Tracks processed Stripe webhook events for idempotency and audit trail';
COMMENT ON TABLE public.idempotency_keys IS 'Stores idempotency keys for API operations to prevent duplicates';
COMMENT ON TABLE public.subscription_events IS 'Audit trail of all subscription changes for analytics and debugging';

COMMENT ON COLUMN public.subscriptions.billing_interval IS 'Monthly or yearly billing cycle';
COMMENT ON COLUMN public.subscriptions.trial_start IS 'Start date of trial period if applicable';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'End date of trial period if applicable';
COMMENT ON COLUMN public.subscriptions.pending_plan IS 'Plan to switch to at period end (for scheduled downgrades)';
COMMENT ON COLUMN public.subscriptions.pending_interval IS 'Interval to switch to at period end';
COMMENT ON COLUMN public.subscriptions.previous_plan IS 'Previous plan before last change (for analytics)';
COMMENT ON COLUMN public.subscriptions.last_event_id IS 'Last Stripe webhook event ID that updated this subscription';

-- ============================================================================
-- Migration complete
-- ============================================================================
