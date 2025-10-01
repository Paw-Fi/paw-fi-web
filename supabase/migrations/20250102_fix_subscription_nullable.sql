-- Fix Subscription Schema for Cancelled/Free Users
-- Created: 2025-01-02
-- Description: Makes stripe_subscription_id nullable to properly support free plan and cancelled subscriptions

-- CRITICAL FIX: stripe_subscription_id should be NULL for:
-- 1. Users on free plan
-- 2. Users who cancelled their subscription
-- 3. Users whose trial expired without payment

-- Make stripe_subscription_id nullable
ALTER TABLE public.subscriptions 
ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Update constraint to allow NULL when plan is free or status is canceled
-- Remove unique constraint temporarily
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_stripe_subscription_id_key;

-- Re-add unique constraint but allow NULL values
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_unique 
ON public.subscriptions (stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- Update any existing free plan users to have NULL subscription ID
UPDATE public.subscriptions
SET stripe_subscription_id = NULL
WHERE plan = 'free' OR status IN ('canceled', 'incomplete_expired', 'unpaid');

-- Add comment for documentation
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 
  'Stripe subscription ID. NULL for free plan users, cancelled subscriptions, or expired trials without payment.';

-- Add index for faster lookups (excluding NULL values)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id_not_null 
ON public.subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;
