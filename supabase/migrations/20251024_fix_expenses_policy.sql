-- Ensure expenses are visible to all household members and remove share_scope remnants

-- Drop legacy policies that restrict by contact_id only or referenced share_scope
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'Users can view own expenses'
  ) THEN
    DROP POLICY "Users can view own expenses" ON public.expenses;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'Users can view accessible expenses'
  ) THEN
    DROP POLICY "Users can view accessible expenses" ON public.expenses;
  END IF;
END $$;

-- Recreate the single simplified read policy (guarded for re-runs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'expenses' 
      AND policyname = 'Users can view their expenses and household expenses'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can view their expenses and household expenses" ON public.expenses
        FOR SELECT USING (
          user_id = auth.uid()
          OR (
            household_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.household_members hm
              WHERE hm.household_id = expenses.household_id AND hm.user_id = auth.uid()
            )
          )
        )
    $policy$;
  END IF;
END $$;

-- Remove share_scope column and enum if they still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'share_scope'
  ) THEN
    ALTER TABLE public.expenses DROP COLUMN share_scope;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'share_scope'
  ) THEN
    DROP TYPE share_scope CASCADE;
  END IF;
END $$;
