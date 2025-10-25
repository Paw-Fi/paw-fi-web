-- Hotfix: Fix previous migration error (CREATE POLICY IF NOT EXISTS not supported)
-- Safely ensure correct policy exists and legacy share_scope remnants are removed

DO $$
BEGIN
  -- Ensure only our consolidated policy remains
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'Users can view own expenses'
  ) THEN
    DROP POLICY "Users can view own expenses" ON public.expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'Users can view their expenses and household expenses'
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

-- Remove share_scope column and enum if still present (idempotent)
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
