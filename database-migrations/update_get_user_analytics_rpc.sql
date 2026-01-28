-- Migration: Update get_user_analytics RPC function
-- Purpose: Fix analytics to include user-owned rows even when contact_ids exist.
--
-- Use this migration for already-deployed databases where `add_get_user_analytics_rpc.sql`
-- has already run. For clean/new database deploys, `add_get_user_analytics_rpc.sql`
-- already contains the corrected logic; running this migration after it is safe.

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
          -- Always include rows owned by this user_id (covers app-created rows where contact_id is NULL),
          -- plus legacy/WhatsApp rows keyed only by contact_id for this user (may have user_id NULL).
          (
            user_id = p_user_id
            OR (
              contact_ids IS NOT NULL
              AND array_length(contact_ids, 1) > 0
              AND contact_id = ANY(contact_ids)
            )
          )
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

-- Ensure execute permission remains granted
GRANT EXECUTE ON FUNCTION get_user_analytics(UUID) TO authenticated;

-- Keep documentation comment up to date
COMMENT ON FUNCTION get_user_analytics(UUID) IS 
'Fetches all analytics data for a user in a single optimized query.
Returns JSON with: contact (user_contacts), expenses (filtered personal only), budgets (daily_budgets).
Includes user_id-owned rows even when contact_id history exists, preventing contact_id NULL rows from being dropped.';

