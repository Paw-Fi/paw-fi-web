-- Add missing notification event types used by edge functions

DO $$
BEGIN
  ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'expense_added';
  ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'expense_edited';
  ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'expense_deleted';
  ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'income_added';
  ALTER TYPE notification_event_type ADD VALUE IF NOT EXISTS 'income_edited';
EXCEPTION
  WHEN undefined_object THEN
    -- notification_event_type does not exist yet in this environment
    RAISE NOTICE 'notification_event_type enum does not exist; migration should run after base schema.';
END $$;
