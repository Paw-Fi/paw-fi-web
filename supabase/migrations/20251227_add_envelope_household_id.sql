-- Add household_id to budget_envelopes for household-aware pockets
-- This migration is safe for both existing databases (where the column
-- does not exist yet) and fresh installs (where the updated 20251009_envelopes
-- migration may already create the column without a foreign key).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'budget_envelopes'
      AND column_name = 'household_id'
  ) THEN
    ALTER TABLE public.budget_envelopes
      ADD COLUMN household_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.budget_envelopes'::regclass
      AND contype = 'f'
      AND conname = 'budget_envelopes_household_id_fkey'
  ) THEN
    ALTER TABLE public.budget_envelopes
      ADD CONSTRAINT budget_envelopes_household_id_fkey
      FOREIGN KEY (household_id)
      REFERENCES public.households(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_envelopes_household
  ON public.budget_envelopes(household_id);
