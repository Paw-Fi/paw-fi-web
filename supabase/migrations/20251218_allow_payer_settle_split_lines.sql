-- Allow payers to mark counterpart split lines as settled (express netting)
-- Rationale: When a user paid for an expense, they must be able to settle
-- the owed lines for other members in that split group. Previously only
-- the participant (user_id) could update their own line, which prevented
-- bilateral settlement flows from clearing both directions.

-- Enable updates when the authenticated user is the payer of the split group.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expense_split_lines'
      AND policyname = 'Payers can settle split lines they paid'
  ) THEN
    CREATE POLICY "Payers can settle split lines they paid" ON public.expense_split_lines
      FOR UPDATE USING (
        EXISTS (
          SELECT 1
          FROM public.expense_split_groups esg
          WHERE esg.id = expense_split_lines.split_group_id
            AND esg.payer_user_id = auth.uid()
        )
      );
  END IF;
END $$;
