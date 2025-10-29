-- Allow unlimited invitations by making expires_at nullable and relaxing constraint
-- Created: 2025-10-24

-- Drop NOT NULL on expires_at
ALTER TABLE public.invites ALTER COLUMN expires_at DROP NOT NULL;

-- Replace validity constraint to allow NULL (unlimited)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_expiry'
  ) THEN
    ALTER TABLE public.invites DROP CONSTRAINT valid_expiry;
  END IF;
END $$;

ALTER TABLE public.invites
  ADD CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at);
