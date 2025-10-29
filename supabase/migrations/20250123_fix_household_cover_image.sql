-- ====================
-- FIX HOUSEHOLD COVER IMAGE FIELD
-- Created: 2025-01-23
-- Purpose: Replace emoji VARCHAR(10) with cover_image_url TEXT to support uploaded images
-- Issue: Mobile app uploads images to storage and needs to store full URLs, not emojis
-- ====================

-- Step 1: Add new cover_image_url column
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Step 2: Migrate any existing emoji data that looks like URLs (longer than 10 chars)
-- This handles any data that might have been truncated
UPDATE public.households
SET cover_image_url = emoji
WHERE emoji IS NOT NULL
  AND (emoji LIKE 'http%' OR LENGTH(emoji) > 10);

-- Step 3: Clear emoji field for migrated rows
UPDATE public.households
SET emoji = NULL
WHERE cover_image_url IS NOT NULL;

-- Step 4: Drop the emoji column since we're fully replacing it with cover_image_url
ALTER TABLE public.households
  DROP COLUMN IF EXISTS emoji;

-- Step 5: Add helpful comment
COMMENT ON COLUMN public.households.cover_image_url IS 'URL to household cover image stored in Supabase storage (public/household-covers/). Replaces emoji field.';

-- ====================
-- VERIFICATION
-- ====================
-- Run this after migration to verify:
-- SELECT id, name, cover_image_url FROM public.households LIMIT 5;
