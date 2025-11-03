-- Migration: Referral System Hardening
-- Date: 2025-11-02
-- Changes:
-- 1) Fix over-permissive RLS policy on referral_codes (remove broad select)
-- 2) Enforce one active acceptance per referee (pending/completed) via partial unique index
-- 3) Convert unconditional unique(user_id) on referral_codes to partial unique index on active codes

-- 1) Tighten RLS on referral_codes: remove broad select policy if present
DO $$ BEGIN
  PERFORM 1
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'referral_codes'
    AND policyname = 'Anyone can view referral codes by code';

  IF FOUND THEN
    EXECUTE 'DROP POLICY "Anyone can view referral codes by code" ON public.referral_codes';
  END IF;
END $$;

-- 2) Enforce one active acceptance (pending or completed) per referee
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_acceptances_referee_active
  ON public.referral_acceptances(referee_user_id)
  WHERE status IN ('pending', 'completed');

-- 3) Replace unconditional unique(user_id) with partial unique on active codes
DO $$ BEGIN
  -- Drop legacy constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'referral_codes'
      AND c.conname = 'unique_user_active_code'
  ) THEN
    EXECUTE 'ALTER TABLE public.referral_codes DROP CONSTRAINT unique_user_active_code';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_user_active
  ON public.referral_codes(user_id)
  WHERE is_active = true;

