-- Migration: Add get_user_analytics RPC function
-- Purpose: Single optimized query to fetch all user analytics data (contact, expenses, budgets)
-- This replaces multiple client-side batched queries with a single server-side call,
-- eliminating cold-start connection issues and improving performance by 2-5x.
--
-- Run this in Supabase SQL Editor or via migration tool.

-- Drop existing function if it exists (for idempotent migrations)
DROP FUNCTION IF EXISTS get_user_analytics(UUID);

-- Create the optimized RPC function
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  contact_ids UUID[];
BEGIN
  -- First, get all contact IDs for this user (some users may have multiple historical contacts)
  SELECT ARRAY_AGG(id) INTO contact_ids
  FROM user_contacts
  WHERE user_id = p_user_id;

  -- Build the complete analytics response in a single query
  SELECT json_build_object(
    'contact', (
      SELECT row_to_json(c.*)
      FROM (
        SELECT 
          id,
          user_id,
          phone_e164,
          verified,
          preferred_currency,
          preferred_timezone,
          created_at,
          updated_at
        FROM user_contacts
        WHERE user_id = p_user_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      ) c
    ),
    'expenses', COALESCE((
      SELECT json_agg(e.*)
      FROM (
        SELECT 
          id,
          contact_id,
          user_id,
          date,
          amount_cents,
          currency,
          category,
          created_at,
          raw_text,
          receipt_image_url,
          household_id,
          split_group_id,
          type,
          is_recurring
        FROM expenses
        WHERE 
          -- Match by contact_ids if available, otherwise by user_id
          CASE 
            WHEN contact_ids IS NOT NULL AND array_length(contact_ids, 1) > 0 
            THEN contact_id = ANY(contact_ids)
            ELSE user_id = p_user_id
          END
          -- Filter for personal expenses only (no splits, no recurring)
          AND split_group_id IS NULL
          AND (is_recurring IS NULL OR is_recurring = false)
        ORDER BY date DESC
      ) e
    ), '[]'::json),
    'budgets', COALESCE((
      SELECT json_agg(b.*)
      FROM (
        SELECT 
          id,
          contact_id,
          date,
          amount_cents,
          currency
        FROM daily_budgets
        WHERE 
          CASE 
            WHEN contact_ids IS NOT NULL AND array_length(contact_ids, 1) > 0 
            THEN contact_id = ANY(contact_ids)
            ELSE false  -- No budgets if no contacts
          END
        ORDER BY date ASC
        LIMIT 10000  -- Safety limit
      ) b
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_analytics(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_analytics(UUID) IS 
'Fetches all analytics data for a user in a single optimized query.
Returns JSON with: contact (user_contacts), expenses (filtered personal only), budgets (daily_budgets).
This replaces multiple client-side batched queries, eliminating cold-start timeouts.';
