-- Ensure app_version_config is readable by all clients (anon + authenticated)
-- so the mobile app version check works even before login.

-- Enable RLS (safe to call even if already enabled)
ALTER TABLE public.app_version_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any to avoid duplicate errors
DROP POLICY IF EXISTS app_version_config_select_all ON public.app_version_config;

-- Allow all clients to read version config
CREATE POLICY app_version_config_select_all
  ON public.app_version_config
  FOR SELECT
  TO anon, authenticated
  USING (true);
