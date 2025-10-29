-- ====================
-- FEATURE FLAGS SYSTEM
-- Created: 2025-10-21
-- Purpose: Centralized feature flag management for progressive rollout
-- ====================

-- ====================
-- FEATURE FLAGS TABLE
-- ====================
-- Stores feature flags with support for:
-- - Boolean on/off toggles
-- - User-based rollout (whitelist/blacklist)
-- - Percentage-based rollout (0-100)
-- - Environment-based flags (dev/staging/production)

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  description TEXT,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  user_whitelist UUID[] DEFAULT '{}',
  user_blacklist UUID[] DEFAULT '{}',
  environment VARCHAR(50) DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production', 'all')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON public.feature_flags(environment);

-- ====================
-- UPDATE TRIGGER
-- ====================
CREATE OR REPLACE FUNCTION update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION update_feature_flag_timestamp();

-- ====================
-- RLS POLICIES
-- ====================
-- Feature flags are read-only for authenticated users
-- Only admins/service role can modify them

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read feature flags
CREATE POLICY "Feature flags are readable by authenticated users" ON public.feature_flags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can insert/update/delete (via Edge Functions or admin dashboard)
CREATE POLICY "Feature flags are manageable by service role" ON public.feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- ====================
-- HELPER FUNCTION: Check if feature is enabled for user
-- ====================
CREATE OR REPLACE FUNCTION is_feature_enabled(
  feature_key VARCHAR,
  user_id UUID DEFAULT auth.uid(),
  check_environment VARCHAR DEFAULT 'production'
)
RETURNS BOOLEAN AS $$
DECLARE
  flag_record RECORD;
  user_hash INTEGER;
BEGIN
  -- Get the feature flag
  SELECT * INTO flag_record
  FROM public.feature_flags
  WHERE key = feature_key;

  -- If flag doesn't exist, default to disabled
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- If flag is globally disabled, return false
  IF NOT flag_record.enabled THEN
    RETURN FALSE;
  END IF;

  -- Check environment match
  IF flag_record.environment != 'all' AND flag_record.environment != check_environment THEN
    RETURN FALSE;
  END IF;

  -- Check user blacklist (takes precedence over everything else)
  IF user_id = ANY(flag_record.user_blacklist) THEN
    RETURN FALSE;
  END IF;

  -- Check user whitelist (overrides percentage rollout)
  IF user_id = ANY(flag_record.user_whitelist) THEN
    RETURN TRUE;
  END IF;

  -- Percentage-based rollout using consistent hashing
  -- This ensures the same user always gets the same result for a given feature
  IF flag_record.rollout_percentage < 100 THEN
    -- Use MD5 hash of user_id + feature_key for deterministic random assignment
    user_hash := ('x' || substring(md5(user_id::text || feature_key), 1, 8))::bit(32)::int;
    RETURN (abs(user_hash) % 100) < flag_record.rollout_percentage;
  END IF;

  -- If we get here, flag is enabled for everyone
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================
-- SEED INITIAL FLAGS
-- ====================
-- Insert the households.enabled feature flag

INSERT INTO public.feature_flags (key, enabled, description, rollout_percentage, environment, metadata)
VALUES (
  'households.enabled',
  FALSE,  -- Start disabled, enable when ready for production
  'Enable Joint Accounts (Households) feature for sharing expenses and budgets between users',
  0,      -- Start at 0% rollout, increase gradually (e.g., 10%, 25%, 50%, 100%)
  'all',  -- Available in all environments when enabled
  jsonb_build_object(
    'documentation_url', 'https://docs.moneko.app/features/households',
    'release_date', '2025-10-21',
    'requires_migration', '20251021_households_joint_accounts.sql'
  )
)
ON CONFLICT (key) DO NOTHING;  -- Don't overwrite if flag already exists

-- ====================
-- COMMENTS FOR DOCUMENTATION
-- ====================
COMMENT ON TABLE public.feature_flags IS 'Centralized feature flag management for progressive feature rollout and A/B testing';

COMMENT ON COLUMN public.feature_flags.key IS 'Unique identifier for the feature (e.g., households.enabled, export.pdf)';
COMMENT ON COLUMN public.feature_flags.enabled IS 'Global on/off toggle for the feature';
COMMENT ON COLUMN public.feature_flags.rollout_percentage IS 'Percentage of users who see the feature (0-100)';
COMMENT ON COLUMN public.feature_flags.user_whitelist IS 'Array of user IDs who always see the feature';
COMMENT ON COLUMN public.feature_flags.user_blacklist IS 'Array of user IDs who never see the feature (takes precedence)';
COMMENT ON COLUMN public.feature_flags.environment IS 'Environment where flag is active (development, staging, production, all)';
COMMENT ON COLUMN public.feature_flags.metadata IS 'Additional metadata (docs, release date, dependencies, etc.)';

COMMENT ON FUNCTION is_feature_enabled IS 'Check if a feature is enabled for a specific user, considering rollout percentage and whitelist/blacklist';

-- ====================
-- EXAMPLE USAGE
-- ====================
-- In SQL:
--   SELECT is_feature_enabled('households.enabled', auth.uid());
--
-- In Edge Functions:
--   const { data } = await supabase.rpc('is_feature_enabled', {
--     feature_key: 'households.enabled',
--     user_id: user.id
--   });
--
-- Enable feature for 10% of users:
--   UPDATE feature_flags SET enabled = true, rollout_percentage = 10 WHERE key = 'households.enabled';
--
-- Enable feature for specific user:
--   UPDATE feature_flags SET user_whitelist = array_append(user_whitelist, 'user-uuid-here') WHERE key = 'households.enabled';
--
-- Full rollout (100%):
--   UPDATE feature_flags SET enabled = true, rollout_percentage = 100 WHERE key = 'households.enabled';
