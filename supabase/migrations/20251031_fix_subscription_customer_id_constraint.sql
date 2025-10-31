-- Fix subscription stripe_customer_id constraint for household sharing
-- This migration allows stripe_customer_id to be NULL for bound household members

-- First, update any existing NULL values to avoid constraint violation during migration
UPDATE public.subscriptions 
SET stripe_customer_id = '' 
WHERE stripe_customer_id IS NULL;

-- Drop the NOT NULL constraint
ALTER TABLE public.subscriptions 
ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 
    'Stripe customer ID. Can be NULL for household members sharing subscription access';
