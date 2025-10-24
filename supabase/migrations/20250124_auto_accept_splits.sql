-- ====================
-- AUTO-ACCEPT SPLITS & EXPENSE NOTIFICATIONS
-- Created: 2025-01-24
-- Purpose: Improve UX by auto-accepting splits and adding expense notifications
-- ====================

-- ====================
-- 1. Add new notification event types
-- ====================

ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'expense_added';
ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'expense_edited';

-- ====================
-- 2. Update expense_split_lines to auto-accept by default
-- ====================

-- Change default for new rows
ALTER TABLE public.expense_split_lines 
  ALTER COLUMN is_settled SET DEFAULT true;

ALTER TABLE public.expense_split_lines 
  ALTER COLUMN settled_at SET DEFAULT NOW();

-- ====================
-- 3. Backfill existing unsettled splits to settled
-- ====================

-- Auto-accept all existing unsettled splits
UPDATE public.expense_split_lines
SET 
  is_settled = true,
  settled_at = COALESCE(settled_at, NOW())
WHERE is_settled = false;

-- ====================
-- 4. Add helper function to notify household members
-- ====================

CREATE OR REPLACE FUNCTION public.notify_household_members_expense(
  p_household_id UUID,
  p_expense_id UUID,
  p_actor_user_id UUID,
  p_event_type notification_event_type,
  p_expense_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_record RECORD;
BEGIN
  -- Create notification events for all household members EXCEPT the actor
  FOR v_member_record IN
    SELECT user_id 
    FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id != p_actor_user_id
  LOOP
    INSERT INTO public.notification_events (
      household_id,
      user_id,
      event_type,
      payload,
      created_at
    ) VALUES (
      p_household_id,
      v_member_record.user_id,
      p_event_type,
      jsonb_build_object(
        'expense_id', p_expense_id,
        'actor_user_id', p_actor_user_id,
        'expense_data', p_expense_data
      ),
      NOW()
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.notify_household_members_expense IS 
  'Creates notification events for all household members except the actor when expense is added/edited';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.notify_household_members_expense TO authenticated;

-- ====================
-- 5. Update indexes for new notification types
-- ====================

-- Index for unsettled splits (should be mostly empty now with auto-accept)
DROP INDEX IF EXISTS idx_split_lines_unsettled;
CREATE INDEX IF NOT EXISTS idx_split_lines_unsettled ON public.expense_split_lines(user_id, is_settled) 
  WHERE is_settled = false;

-- Index for notification events by type
DROP INDEX IF EXISTS idx_notification_events_type;
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON public.notification_events(event_type, created_at);

-- ====================
-- COMMENTS
-- ====================

COMMENT ON COLUMN public.expense_split_lines.is_settled IS 
  'Auto-accepted by default. Members can review and dispute expenses after auto-acceptance.';

COMMENT ON COLUMN public.expense_split_lines.settled_at IS 
  'Timestamp of auto-acceptance or manual settlement.';
