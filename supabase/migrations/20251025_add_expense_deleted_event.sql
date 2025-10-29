-- Add missing notification event enum for deletions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_event_type' AND e.enumlabel = 'expense_deleted'
  ) THEN
    ALTER TYPE notification_event_type ADD VALUE 'expense_deleted';
  END IF;
END $$;
