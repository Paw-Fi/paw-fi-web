-- Allow household members to delete household transactions.
--
-- The mobile app expects that any active household member can delete a
-- household expense/income entry (not just the creator or household owner).

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.expenses;
END $$;

CREATE POLICY "Users can delete their own transactions" ON public.expenses
  FOR DELETE USING (
    -- Always allow deleting your own transactions
    user_id = auth.uid()
    -- Allow deleting household transactions if you're a household member
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.household_members hm
        WHERE hm.household_id = expenses.household_id
          AND hm.user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "Users can delete their own transactions" ON public.expenses IS
'Allows deleting own transactions and deleting household transactions when the user is a member of the household.';

