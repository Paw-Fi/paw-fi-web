-- Migration: Create unified app initialization RPC
-- Purpose: Single optimized endpoint for all critical initialization data
-- Replaces multiple separate queries with one fast server-side call
-- Expected performance: < 100ms with proper indexes
-- Date: 2025-01-20

-- Drop existing function if it exists (for safe re-deployment)
DROP FUNCTION IF EXISTS initialize_app_v2(UUID);

-- Create the unified initialization RPC
CREATE OR REPLACE FUNCTION initialize_app_v2(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Build complete init response in a single optimized query
  -- This eliminates network round-trips and connection warmup issues
  SELECT json_build_object(
    -- User contact information
    'user_contact', (
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
    
    -- Subscription status
    'subscription', (
      SELECT row_to_json(s.*)
      FROM (
        SELECT 
          id,
          user_id,
          stripe_subscription_id,
          stripe_customer_id,
          plan,
          status,
          bound_to_user_id,
          bound_to_household_id,
          created_at,
          updated_at
        FROM subscriptions
        WHERE user_id = p_user_id
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1
      ) s
    ),
    
    -- WhatsApp binding status (determined by existence of user_contact)
    -- Returns the user_contact data if bound, null if not bound
    'whatsapp_binding', (
      SELECT json_build_object(
        'is_bound', CASE WHEN uc.id IS NOT NULL THEN true ELSE false END,
        'phone_e164', uc.phone_e164,
        'verified', uc.verified,
        'user_id', p_user_id
      )
      FROM (
        SELECT id, phone_e164, verified
        FROM user_contacts
        WHERE user_id = p_user_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      ) uc
    ),
    
    -- Household list (basic info only, not full data)
    -- Full household data is loaded lazily when household is selected
    'households', COALESCE((
      SELECT json_agg(h_data.*)
      FROM (
        SELECT 
          h.id,
          h.name,
          h.owner_id,
          h.currency,
          h.cover_image_url,
          h.theme_color,
          h.created_at,
          h.updated_at,
          hm.role,
          hm.joined_at
        FROM households h
        INNER JOIN household_members hm ON hm.household_id = h.id
        WHERE hm.user_id = p_user_id
        ORDER BY h.name ASC
      ) h_data
    ), '[]'::json),
    
    -- Metadata
    'metadata', json_build_object(
      'fetched_at', NOW(),
      'user_id', p_user_id,
      'version', '2.0'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION initialize_app_v2(UUID) TO authenticated;

-- Add performance-critical indexes
-- These ensure the RPC completes in < 100ms even with large datasets

-- User contacts index (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id_updated_created
  ON user_contacts(user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST);

-- Subscriptions index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_updated
  ON subscriptions(user_id, updated_at DESC NULLS LAST);

-- Household members index (for user lookup)
CREATE INDEX IF NOT EXISTS idx_household_members_user_id
  ON household_members(user_id);

-- Add documentation
COMMENT ON FUNCTION initialize_app_v2(UUID) IS 
'Unified app initialization endpoint. Returns all critical data in a single optimized query:
- user_contact: User contact information
- subscription: Current subscription status
- whatsapp_binding: WhatsApp integration status (based on user_contacts existence)
- households: List of households user belongs to (basic info only)
- metadata: Query metadata (timestamp, version)

This replaces multiple separate queries and eliminates cold-start connection issues.
Expected performance: < 100ms with proper indexes.';
