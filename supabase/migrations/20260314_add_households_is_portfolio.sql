-- Add is_portfolio flag for household-backed portfolios.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'households'
      AND column_name = 'is_portfolio'
  ) THEN
    ALTER TABLE public.households
      ADD COLUMN is_portfolio boolean NOT NULL DEFAULT false;
  END IF;
END $$;
