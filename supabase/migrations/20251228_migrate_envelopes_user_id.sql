-- Migrate budget_envelopes to use user_id (auth.users) instead of contact_id
-- Safe for both existing databases (contact_id-based) and fresh installs.

-- 1) Add user_id column if it does not exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'budget_envelopes'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.budget_envelopes
      ADD COLUMN user_id uuid;
  END IF;
END $$;

-- 2) Backfill user_id from user_contacts when contact_id is still present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'budget_envelopes'
      AND column_name = 'contact_id'
  ) THEN
    UPDATE public.budget_envelopes e
    SET user_id = uc.user_id
    FROM public.user_contacts uc
    WHERE e.contact_id = uc.id
      AND e.user_id IS NULL;
  END IF;
END $$;

-- 3) Add FK and (optionally) NOT NULL constraint on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.budget_envelopes'::regclass
      AND conname = 'budget_envelopes_user_id_fkey'
  ) THEN
    ALTER TABLE public.budget_envelopes
      ADD CONSTRAINT budget_envelopes_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;

  -- Only enforce NOT NULL if there are no nulls to avoid breaking existing data
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_envelopes WHERE user_id IS NULL
  ) THEN
    ALTER TABLE public.budget_envelopes
      ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 4) Drop old contact-based unique constraint and index (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'budget_envelopes'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'budget_envelopes_contact_id_name_key'
  ) THEN
    ALTER TABLE public.budget_envelopes
      DROP CONSTRAINT budget_envelopes_contact_id_name_key;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_envelopes_contact;

-- 5) Create new composite unique constraint and user index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'budget_envelopes'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'budget_envelopes_owner_scope_unique'
  ) THEN
    ALTER TABLE public.budget_envelopes
      ADD CONSTRAINT budget_envelopes_owner_scope_unique
      UNIQUE (user_id, household_id, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_envelopes_user
  ON public.budget_envelopes(user_id);

-- 6) Update RLS policies on budget_envelopes to use user_id
DROP POLICY IF EXISTS "envelopes_select_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_select_own" ON public.budget_envelopes
  FOR SELECT USING (budget_envelopes.user_id = auth.uid());

DROP POLICY IF EXISTS "envelopes_insert_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_insert_own" ON public.budget_envelopes
  FOR INSERT WITH CHECK (budget_envelopes.user_id = auth.uid());

DROP POLICY IF EXISTS "envelopes_update_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_update_own" ON public.budget_envelopes
  FOR UPDATE USING (budget_envelopes.user_id = auth.uid());

DROP POLICY IF EXISTS "envelopes_delete_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_delete_own" ON public.budget_envelopes
  FOR DELETE USING (budget_envelopes.user_id = auth.uid());

-- 7) Update allocations and links policies to join via user_id
DROP POLICY IF EXISTS "allocations_select_own" ON public.envelope_allocations;
CREATE POLICY "allocations_select_own" ON public.envelope_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_allocations.envelope_id
        AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "allocations_mutate_own" ON public.envelope_allocations;
CREATE POLICY "allocations_mutate_own" ON public.envelope_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_allocations.envelope_id
        AND e.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_allocations.envelope_id
        AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "links_select_own" ON public.envelope_category_links;
CREATE POLICY "links_select_own" ON public.envelope_category_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_category_links.envelope_id
        AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "links_mutate_own" ON public.envelope_category_links;
CREATE POLICY "links_mutate_own" ON public.envelope_category_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_category_links.envelope_id
        AND e.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_category_links.envelope_id
        AND e.user_id = auth.uid()
    )
  );

-- 8) Recreate v_envelope_monthly_spend to derive spend via user_id
-- (using user_contacts to map user_id -> contact_id so this works before
-- the households migration adds user_id/household_id to expenses)
CREATE OR REPLACE VIEW public.v_envelope_monthly_spend AS
SELECT
  e.id AS envelope_id,
  date_trunc('month', ex.date)::date AS period_month,
  SUM(ex.amount_cents) AS spent_cents
FROM public.budget_envelopes e
JOIN public.envelope_category_links l
  ON l.envelope_id = e.id
JOIN public.user_contacts uc
  ON uc.user_id = e.user_id
JOIN public.expenses ex
  ON ex.contact_id = uc.id
 AND lower(coalesce(ex.category, 'uncategorized')) = lower(l.category)
GROUP BY e.id, date_trunc('month', ex.date)::date;

COMMENT ON VIEW public.v_envelope_monthly_spend IS
  'Aggregated monthly spend per envelope using user_id, category links and expenses';

-- 9) Finally, drop contact_id column if it still exists
ALTER TABLE public.budget_envelopes
  DROP COLUMN IF EXISTS contact_id;
