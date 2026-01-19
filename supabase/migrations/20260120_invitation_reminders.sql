-- ====================
-- INVITATION REMINDERS SYSTEM - Database Migration
-- Created: 2026-01-20
-- Purpose: Implement automated invitation reminder notifications for pending household invitations
-- Features: Multi-tier reminder system, tracking columns, optimized indexes, cron scheduling
-- ====================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ====================
-- 1. ADD NEW NOTIFICATION EVENT TYPES
-- ====================

-- Add 'invite_reminder_inviter' event type (reminder for person who sent the invite)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_event_type'
      AND e.enumlabel = 'invite_reminder_inviter'
  ) THEN
    ALTER TYPE public.notification_event_type ADD VALUE 'invite_reminder_inviter';
  END IF;
END $$;

-- Add 'invite_reminder_invitee' event type (reminder for person who received the invite)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_event_type'
      AND e.enumlabel = 'invite_reminder_invitee'
  ) THEN
    ALTER TYPE public.notification_event_type ADD VALUE 'invite_reminder_invitee';
  END IF;
END $$;

-- ====================
-- 2. ADD TRACKING COLUMNS TO INVITES TABLE
-- ====================

-- Add last_reminder_sent_at column to track when the last reminder was sent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invites'
      AND column_name = 'last_reminder_sent_at'
  ) THEN
    ALTER TABLE public.invites
    ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add reminder_count column to track total number of reminders sent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invites'
      AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE public.invites
    ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add check constraint to ensure reminder_count is non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reminder_count_non_negative'
      AND conrelid = 'public.invites'::regclass
  ) THEN
    ALTER TABLE public.invites
    ADD CONSTRAINT reminder_count_non_negative CHECK (reminder_count >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.invites.last_reminder_sent_at IS 'Timestamp of the last reminder notification sent for this invitation';
COMMENT ON COLUMN public.invites.reminder_count IS 'Total number of reminder notifications sent for this invitation (max 3)';

-- ====================
-- 3. CREATE OPTIMIZED INDEXES
-- ====================

-- Composite index for efficient reminder processing queries
-- Indexes pending invites by creation date and last reminder sent time
CREATE INDEX IF NOT EXISTS idx_invites_pending_reminders
  ON public.invites(created_at, last_reminder_sent_at, reminder_count)
  WHERE status = 'pending';

-- Index for expiring invitations (Tier 3 reminders)
CREATE INDEX IF NOT EXISTS idx_invites_expiring_soon
  ON public.invites(expires_at)
  WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Index for household lookups during reminder processing
CREATE INDEX IF NOT EXISTS idx_invites_household_status
  ON public.invites(household_id, status);

-- ====================
-- 4. CREATE HELPER FUNCTION FOR REMINDER ELIGIBILITY
-- ====================

-- Function to check if an invite is eligible for a reminder
CREATE OR REPLACE FUNCTION public.is_invite_eligible_for_reminder(
  p_invite_id UUID
)
RETURNS TABLE (
  eligible BOOLEAN,
  reminder_tier INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_household_exists BOOLEAN;
  v_user_already_member BOOLEAN;
BEGIN
  -- Get invite details
  SELECT * INTO v_invite
  FROM public.invites
  WHERE id = p_invite_id;

  -- Check if invite exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Invite not found';
    RETURN;
  END IF;

  -- Check if invite is pending
  IF v_invite.status != 'pending' THEN
    RETURN QUERY SELECT false, 0, 'Invite status is not pending: ' || v_invite.status::TEXT;
    RETURN;
  END IF;

  -- Check if invite has expired
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= NOW() THEN
    RETURN QUERY SELECT false, 0, 'Invite has expired';
    RETURN;
  END IF;

  -- Check if household still exists
  SELECT EXISTS (
    SELECT 1 FROM public.households WHERE id = v_invite.household_id
  ) INTO v_household_exists;

  IF NOT v_household_exists THEN
    RETURN QUERY SELECT false, 0, 'Household no longer exists';
    RETURN;
  END IF;

  -- Check if invitee is already a member (via another invite or direct add)
  IF v_invite.invited_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = v_invite.household_id
        AND user_id = v_invite.invited_user_id
    ) INTO v_user_already_member;

    IF v_user_already_member THEN
      RETURN QUERY SELECT false, 0, 'User is already a household member';
      RETURN;
    END IF;
  END IF;

  -- Check if max reminders reached
  IF v_invite.reminder_count >= 3 THEN
    RETURN QUERY SELECT false, 0, 'Maximum reminders (3) already sent';
    RETURN;
  END IF;

  -- Check minimum interval between reminders (72 hours)
  IF v_invite.last_reminder_sent_at IS NOT NULL
     AND v_invite.last_reminder_sent_at > NOW() - INTERVAL '72 hours' THEN
    RETURN QUERY SELECT false, 0, 'Too soon since last reminder (minimum 72 hours)';
    RETURN;
  END IF;

  -- Determine reminder tier
  -- Tier 3: Expiring soon (2 days before expiration)
  IF v_invite.expires_at IS NOT NULL
     AND v_invite.expires_at < NOW() + INTERVAL '2 days'
     AND v_invite.expires_at > NOW() THEN
    RETURN QUERY SELECT true, 3, 'Tier 3: Expiring soon';
    RETURN;
  END IF;

  -- Tier 2: 7 days old, only 1 reminder sent
  IF v_invite.created_at < NOW() - INTERVAL '7 days'
     AND v_invite.reminder_count = 1 THEN
    RETURN QUERY SELECT true, 2, 'Tier 2: 7-day follow-up';
    RETURN;
  END IF;

  -- Tier 1: 3 days old, no reminders yet
  IF v_invite.created_at < NOW() - INTERVAL '3 days'
     AND v_invite.reminder_count = 0 THEN
    RETURN QUERY SELECT true, 1, 'Tier 1: Initial reminder';
    RETURN;
  END IF;

  -- Not eligible yet
  RETURN QUERY SELECT false, 0, 'Not yet eligible for reminder';
END;
$$;

COMMENT ON FUNCTION public.is_invite_eligible_for_reminder IS 'Checks if an invitation is eligible for a reminder and determines the reminder tier (1, 2, or 3)';

-- ====================
-- 5. ATOMIC TRACKING UPDATE (RPC)
-- ====================

-- Atomically update reminder tracking after a reminder is sent.
-- This avoids race conditions and avoids relying on client-side SQL snippets.
CREATE OR REPLACE FUNCTION public.increment_invite_reminder_tracking(
  p_invite_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invites
  SET
    last_reminder_sent_at = NOW(),
    reminder_count = reminder_count + 1,
    updated_at = NOW()
  WHERE id = p_invite_id;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.increment_invite_reminder_tracking IS 'Atomically increments reminder_count and sets last_reminder_sent_at for an invite';
GRANT EXECUTE ON FUNCTION public.increment_invite_reminder_tracking TO service_role;

-- ====================
-- 6. SCHEDULE CRON JOB
-- ====================

-- Remove existing job if it exists (for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-invite-reminders') THEN
    PERFORM cron.unschedule('process-invite-reminders');
  END IF;
END $$;

-- Schedule invitation reminder processing every 6 hours
-- Runs at: 00:00, 06:00, 12:00, 18:00 UTC
SELECT cron.schedule(
  'process-invite-reminders',
  '0 */6 * * *',
  $$
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/households-process-invite-reminders',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'source', 'cron',
          'max_batch_size', 100
        )
      );
  $$
);

-- ====================
-- 7. ANALYTICS VIEW (OPTIONAL)
-- ====================

-- Create a view for monitoring invitation reminder statistics
CREATE OR REPLACE VIEW public.invitation_reminder_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS total_pending_invites,
  COUNT(*) FILTER (WHERE status = 'pending' AND reminder_count = 0) AS no_reminders_sent,
  COUNT(*) FILTER (WHERE status = 'pending' AND reminder_count = 1) AS one_reminder_sent,
  COUNT(*) FILTER (WHERE status = 'pending' AND reminder_count = 2) AS two_reminders_sent,
  COUNT(*) FILTER (WHERE status = 'pending' AND reminder_count >= 3) AS max_reminders_sent,
  COUNT(*) FILTER (
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '3 days'
      AND reminder_count = 0
      AND (last_reminder_sent_at IS NULL OR last_reminder_sent_at < NOW() - INTERVAL '72 hours')
  ) AS eligible_for_tier1,
  COUNT(*) FILTER (
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '7 days'
      AND reminder_count = 1
      AND last_reminder_sent_at < NOW() - INTERVAL '72 hours'
  ) AS eligible_for_tier2,
  COUNT(*) FILTER (
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW() + INTERVAL '2 days'
      AND expires_at > NOW()
      AND last_reminder_sent_at < NOW() - INTERVAL '72 hours'
  ) AS eligible_for_tier3
FROM public.invites;

COMMENT ON VIEW public.invitation_reminder_stats IS 'Real-time statistics on pending invitations and reminder eligibility';

-- ====================
-- 8. GRANT PERMISSIONS
-- ====================

-- Grant service role access to the helper function
GRANT EXECUTE ON FUNCTION public.is_invite_eligible_for_reminder TO service_role;

-- Grant select on the stats view
GRANT SELECT ON public.invitation_reminder_stats TO authenticated;

-- ====================
-- MIGRATION COMPLETE
-- ====================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Invitation Reminders System migration completed successfully';
  RAISE NOTICE 'New event types added: invite_reminder_inviter, invite_reminder_invitee';
  RAISE NOTICE 'Cron job scheduled: process-invite-reminders (every 6 hours)';
  RAISE NOTICE 'Helper function created: is_invite_eligible_for_reminder';
  RAISE NOTICE 'Analytics view created: invitation_reminder_stats';
END $$;
