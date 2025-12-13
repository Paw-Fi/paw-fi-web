-- Remove min_version column from app_version_config
-- logic: latest_version is now the enforced minimum version

ALTER TABLE public.app_version_config DROP COLUMN IF EXISTS min_version;
