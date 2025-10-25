-- Add household currency with immutability, backfill, and validation
-- Created: 2025-10-24

-- 1) Add column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'households' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.households ADD COLUMN currency VARCHAR(3);
  END IF;
END $$;

-- 2) Backfill from owner's preferred currency, fallback to USD
UPDATE public.households h
SET currency = COALESCE(
  (
    SELECT UPPER(uc.preferred_currency)
    FROM public.user_contacts uc
    WHERE uc.user_id = h.owner_id
    ORDER BY uc.updated_at DESC NULLS LAST, uc.created_at DESC NULLS LAST
    LIMIT 1
  ), 'USD'
)
WHERE h.currency IS NULL OR TRIM(h.currency) = '';

-- 3) Enforce NOT NULL and format constraint
ALTER TABLE public.households ALTER COLUMN currency SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'households_currency_format'
  ) THEN
    ALTER TABLE public.households
      ADD CONSTRAINT households_currency_format CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END $$;

-- 4) Immutable currency after insert
CREATE OR REPLACE FUNCTION prevent_household_currency_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'household currency is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'households_currency_immutable'
  ) THEN
    CREATE TRIGGER households_currency_immutable
    BEFORE UPDATE ON public.households
    FOR EACH ROW EXECUTE FUNCTION prevent_household_currency_update();
  END IF;
END $$;
