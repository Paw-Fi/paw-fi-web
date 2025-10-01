-- Add unique constraint on user_id for subscriptions table
-- Created: 2025-01-03
-- Description: Ensures each user can only have one subscription record at a time
-- This is required for the webhook upsert operation to work correctly

-- CRITICAL: A user should only have ONE subscription record at a time
-- The webhook uses upsert with onConflict: 'user_id' which requires this constraint

-- First, check if there are any duplicate user_id entries (there shouldn't be in production)
-- If duplicates exist, keep only the most recent one
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id
        FROM public.subscriptions
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) AS duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % users with multiple subscriptions. Keeping only the most recent.', duplicate_count;
        
        -- Delete older subscription records, keeping only the most recent per user
        DELETE FROM public.subscriptions
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
                FROM public.subscriptions
            ) AS ranked
            WHERE rn > 1
        );
        
        RAISE NOTICE 'Cleaned up duplicate subscription records.';
    ELSE
        RAISE NOTICE 'No duplicate user_id entries found. Safe to add unique constraint.';
    END IF;
END $$;

-- Add unique constraint on user_id
-- This allows the webhook to use: upsert(..., { onConflict: 'user_id' })
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT subscriptions_user_id_unique ON public.subscriptions IS 
  'Ensures each user has only one subscription record. Required for webhook upsert operations.';

-- Verify the constraint was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'subscriptions_user_id_unique'
    ) THEN
        RAISE NOTICE 'SUCCESS: Unique constraint on user_id has been added.';
    ELSE
        RAISE EXCEPTION 'FAILED: Unique constraint was not added.';
    END IF;
END $$;
