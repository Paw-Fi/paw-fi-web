-- Make pockets/budgets truly household-scoped and shareable
-- - Deduplicate household budgets so there is only one per (household, currency, month)
-- - Enforce household-level uniqueness
-- - Relax RLS to allow all household members to read/write shared budgets, envelopes, and links

-- 1) Drop the old scope constraint that keyed uniqueness off user_id
ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_scope_unique;

-- 2) Merge duplicate household budgets (keep the most recently updated)
DO $$
DECLARE
  rec record;
  env record;
  keep_id uuid;
  dup_id uuid;
  dup_idx integer;
BEGIN
  FOR rec IN
    SELECT household_id, currency, period_month,
           array_agg(id ORDER BY updated_at DESC, created_at DESC) AS ids
    FROM public.budgets
    WHERE household_id IS NOT NULL
    GROUP BY household_id, currency, period_month
    HAVING COUNT(*) > 1
  LOOP
    keep_id := rec.ids[1];

    FOR dup_idx IN 2..array_length(rec.ids, 1) LOOP
      dup_id := rec.ids[dup_idx];

      -- Move envelopes to the kept budget; rename on conflict to preserve data
      FOR env IN
        SELECT id, name FROM public.budget_envelopes WHERE budget_id = dup_id
      LOOP
        IF EXISTS (
          SELECT 1 FROM public.budget_envelopes
          WHERE budget_id = keep_id AND name = env.name
        ) THEN
          UPDATE public.budget_envelopes
          SET name = env.name || ' (merged ' || substring(dup_id::text, 1, 4) || ')',
              updated_at = now()
          WHERE id = env.id;
          RAISE NOTICE 'Renamed envelope % while merging budget % into %', env.id, dup_id, keep_id;
        END IF;

        UPDATE public.budget_envelopes
        SET budget_id = keep_id,
            household_id = rec.household_id,
            updated_at = now()
        WHERE id = env.id;
      END LOOP;

      DELETE FROM public.budgets WHERE id = dup_id;
      RAISE NOTICE 'Merged household budget %, currency %, month %, kept %, removed %',
        rec.household_id, rec.currency, rec.period_month, keep_id, dup_id;
    END LOOP;
  END LOOP;
END $$;

-- 2b) Merge duplicate PERSONAL budgets (same user, currency, month) before unique index
DO $$
DECLARE
  rec record;
  env record;
  keep_id uuid;
  dup_id uuid;
  dup_idx integer;
BEGIN
  FOR rec IN
    SELECT user_id, currency, period_month,
           array_agg(id ORDER BY updated_at DESC, created_at DESC) AS ids
    FROM public.budgets
    WHERE household_id IS NULL
      AND user_id IS NOT NULL
    GROUP BY user_id, currency, period_month
    HAVING COUNT(*) > 1
  LOOP
    keep_id := rec.ids[1];

    FOR dup_idx IN 2..array_length(rec.ids, 1) LOOP
      dup_id := rec.ids[dup_idx];

      -- Move envelopes to the kept budget; rename on conflict to preserve data
      FOR env IN
        SELECT id, name FROM public.budget_envelopes WHERE budget_id = dup_id
      LOOP
        IF EXISTS (
          SELECT 1 FROM public.budget_envelopes
          WHERE budget_id = keep_id AND name = env.name
        ) THEN
          UPDATE public.budget_envelopes
          SET name = env.name || ' (merged ' || substring(dup_id::text, 1, 4) || ')',
              updated_at = now()
          WHERE id = env.id;
          RAISE NOTICE 'Renamed personal envelope % while merging budget % into %', env.id, dup_id, keep_id;
        END IF;

        UPDATE public.budget_envelopes
        SET budget_id = keep_id,
            household_id = NULL,
            updated_at = now()
        WHERE id = env.id;
      END LOOP;

      DELETE FROM public.budgets WHERE id = dup_id;
      RAISE NOTICE 'Merged personal budget user %, currency %, month %, kept %, removed %',
        rec.user_id, rec.currency, rec.period_month, keep_id, dup_id;
    END LOOP;
  END LOOP;
END $$;

-- 3) Enforce uniqueness per household/month/currency (and keep personal uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS budgets_personal_unique
  ON public.budgets(user_id, currency, period_month)
  WHERE household_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_household_unique
  ON public.budgets(household_id, currency, period_month)
  WHERE household_id IS NOT NULL;

-- 4) Household-aware RLS for budgets
DROP POLICY IF EXISTS "budgets_select_own" ON public.budgets;
CREATE POLICY "budgets_select_own" ON public.budgets
  FOR SELECT USING (
    budgets.user_id = auth.uid()
    OR (budgets.household_id IS NOT NULL
        AND public.is_member_of_household(budgets.household_id))
  );

DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
CREATE POLICY "budgets_insert_own" ON public.budgets
  FOR INSERT WITH CHECK (
    (budgets.household_id IS NULL AND budgets.user_id = auth.uid())
    OR (budgets.household_id IS NOT NULL
        AND budgets.user_id = auth.uid()
        AND public.is_member_of_household(budgets.household_id))
  );

DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
CREATE POLICY "budgets_update_own" ON public.budgets
  FOR UPDATE USING (
    budgets.user_id = auth.uid()
    OR (budgets.household_id IS NOT NULL
        AND public.is_member_of_household(budgets.household_id))
  ) WITH CHECK (
    budgets.user_id = auth.uid()
    OR (budgets.household_id IS NOT NULL
        AND public.is_member_of_household(budgets.household_id))
  );

DROP POLICY IF EXISTS "budgets_delete_own" ON public.budgets;
CREATE POLICY "budgets_delete_own" ON public.budgets
  FOR DELETE USING (
    budgets.user_id = auth.uid()
    OR (budgets.household_id IS NOT NULL
        AND public.is_member_of_household(budgets.household_id))
  );

-- 5) Household-aware RLS for budget_envelopes
DROP POLICY IF EXISTS "envelopes_select_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_select_own" ON public.budget_envelopes
  FOR SELECT USING (
    budget_envelopes.user_id = auth.uid()
    OR (budget_envelopes.household_id IS NOT NULL
        AND public.is_member_of_household(budget_envelopes.household_id))
  );

DROP POLICY IF EXISTS "envelopes_insert_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_insert_own" ON public.budget_envelopes
  FOR INSERT WITH CHECK (
    (budget_envelopes.household_id IS NULL AND budget_envelopes.user_id = auth.uid())
    OR (budget_envelopes.household_id IS NOT NULL
        AND budget_envelopes.user_id = auth.uid()
        AND public.is_member_of_household(budget_envelopes.household_id))
  );

DROP POLICY IF EXISTS "envelopes_update_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_update_own" ON public.budget_envelopes
  FOR UPDATE USING (
    budget_envelopes.user_id = auth.uid()
    OR (budget_envelopes.household_id IS NOT NULL
        AND public.is_member_of_household(budget_envelopes.household_id))
  ) WITH CHECK (
    budget_envelopes.user_id = auth.uid()
    OR (budget_envelopes.household_id IS NOT NULL
        AND public.is_member_of_household(budget_envelopes.household_id))
  );

DROP POLICY IF EXISTS "envelopes_delete_own" ON public.budget_envelopes;
CREATE POLICY "envelopes_delete_own" ON public.budget_envelopes
  FOR DELETE USING (
    budget_envelopes.user_id = auth.uid()
    OR (budget_envelopes.household_id IS NOT NULL
        AND public.is_member_of_household(budget_envelopes.household_id))
  );

-- 6) Household-aware RLS for envelope allocations and category links
DROP POLICY IF EXISTS "allocations_select_own" ON public.envelope_allocations;
CREATE POLICY "allocations_select_own" ON public.envelope_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_allocations.envelope_id
        AND (
          e.user_id = auth.uid()
          OR (e.household_id IS NOT NULL
              AND public.is_member_of_household(e.household_id))
        )
    )
  );

DROP POLICY IF EXISTS "allocations_mutate_own" ON public.envelope_allocations;
CREATE POLICY "allocations_mutate_own" ON public.envelope_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_allocations.envelope_id
        AND (
          e.user_id = auth.uid()
          OR (e.household_id IS NOT NULL
              AND public.is_member_of_household(e.household_id))
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_allocations.envelope_id
        AND (
          e.user_id = auth.uid()
          OR (e.household_id IS NOT NULL
              AND public.is_member_of_household(e.household_id))
        )
    )
  );

DROP POLICY IF EXISTS "links_select_own" ON public.envelope_category_links;
CREATE POLICY "links_select_own" ON public.envelope_category_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_category_links.envelope_id
        AND (
          e.user_id = auth.uid()
          OR (e.household_id IS NOT NULL
              AND public.is_member_of_household(e.household_id))
        )
    )
  );

DROP POLICY IF EXISTS "links_mutate_own" ON public.envelope_category_links;
CREATE POLICY "links_mutate_own" ON public.envelope_category_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_category_links.envelope_id
        AND (
          e.user_id = auth.uid()
          OR (e.household_id IS NOT NULL
              AND public.is_member_of_household(e.household_id))
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_envelopes e
      WHERE e.id = envelope_category_links.envelope_id
        AND (
          e.user_id = auth.uid()
          OR (e.household_id IS NOT NULL
              AND public.is_member_of_household(e.household_id))
        )
    )
  );
