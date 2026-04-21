CREATE TABLE IF NOT EXISTS public.household_settlement_event_allocation_status_v2 (
  settlement_event_id UUID PRIMARY KEY
    REFERENCES public.household_settlement_events(id) ON DELETE CASCADE,
  allocated_total_cents BIGINT NOT NULL DEFAULT 0,
  allocation_source TEXT NOT NULL DEFAULT 'runtime',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT household_settlement_event_allocation_status_v2_nonnegative
    CHECK (allocated_total_cents >= 0)
);

CREATE TABLE IF NOT EXISTS public.household_settlement_event_allocations_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  settlement_event_id UUID NOT NULL
    REFERENCES public.household_settlement_events(id) ON DELETE CASCADE,
  split_group_id UUID NOT NULL
    REFERENCES public.expense_split_groups(id) ON DELETE CASCADE,
  split_line_id UUID NOT NULL
    REFERENCES public.expense_split_lines(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  currency TEXT NOT NULL,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocated_amount_cents BIGINT NOT NULL,
  allocation_order INTEGER NOT NULL DEFAULT 0,
  allocation_source TEXT NOT NULL DEFAULT 'runtime',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT household_settlement_event_allocations_v2_positive
    CHECK (allocated_amount_cents > 0),
  CONSTRAINT household_settlement_event_allocations_v2_unique_event_line
    UNIQUE (settlement_event_id, split_line_id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_event_allocations_v2_household_pair
  ON public.household_settlement_event_allocations_v2 (
    household_id,
    currency,
    payer_user_id,
    participant_user_id,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_settlement_event_allocations_v2_split_line
  ON public.household_settlement_event_allocations_v2 (split_line_id);

ALTER TABLE public.household_settlement_event_allocation_status_v2
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.household_settlement_event_allocations_v2
  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_settlement_event_allocation_status_v2'
      AND policyname = 'Members can view settlement allocation status v2'
  ) THEN
    CREATE POLICY "Members can view settlement allocation status v2"
      ON public.household_settlement_event_allocation_status_v2
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.household_settlement_events e
          WHERE e.id = household_settlement_event_allocation_status_v2.settlement_event_id
            AND public.is_member_of_household(e.household_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'household_settlement_event_allocations_v2'
      AND policyname = 'Members can view settlement allocations v2'
  ) THEN
    CREATE POLICY "Members can view settlement allocations v2"
      ON public.household_settlement_event_allocations_v2
      FOR SELECT USING (
        public.is_member_of_household(household_settlement_event_allocations_v2.household_id)
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.households_allocate_settlement_event_v2(
  p_event_id UUID,
  p_allocation_source TEXT DEFAULT 'runtime'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.household_settlement_events%ROWTYPE;
  v_remaining BIGINT := 0;
  v_allocated BIGINT := 0;
  v_order INTEGER := 0;
  v_candidate RECORD;
BEGIN
  SELECT *
  INTO v_event
  FROM public.household_settlement_events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_event.household_id::TEXT || ':' ||
      v_event.payer_user_id::TEXT || ':' ||
      v_event.participant_user_id::TEXT || ':' ||
      UPPER(v_event.currency),
      0
    )
  );

  DELETE FROM public.household_settlement_event_allocations_v2
  WHERE settlement_event_id = p_event_id;

  v_remaining := ABS(COALESCE(v_event.amount_cents, 0));

  FOR v_candidate IN
    SELECT
      l.id AS split_line_id,
      g.id AS split_group_id,
      g.expense_id,
      GREATEST(
        ABS(COALESCE(l.amount_cents, 0)) - COALESCE(existing_allocations.allocated_cents, 0),
        0
      ) AS remaining_cents
    FROM public.expense_split_lines l
    JOIN public.expense_split_groups g
      ON g.id = l.split_group_id
    LEFT JOIN public.expenses e
      ON e.id = g.expense_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(a.allocated_amount_cents), 0) AS allocated_cents
      FROM public.household_settlement_event_allocations_v2 a
      WHERE a.split_line_id = l.id
        AND a.settlement_event_id <> p_event_id
    ) existing_allocations ON TRUE
    WHERE g.household_id = v_event.household_id
      AND UPPER(g.currency) = UPPER(v_event.currency)
      AND g.payer_user_id = v_event.payer_user_id
      AND l.user_id = v_event.participant_user_id
      AND l.is_settled = FALSE
      AND ABS(COALESCE(l.amount_cents, 0)) > 0
    ORDER BY
      COALESCE((e.date::timestamp AT TIME ZONE 'UTC'), g.created_at) ASC,
      g.created_at ASC,
      l.created_at ASC,
      l.id ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF v_candidate.remaining_cents <= 0 THEN
      CONTINUE;
    END IF;

    v_order := v_order + 1;

    INSERT INTO public.household_settlement_event_allocations_v2 (
      household_id,
      settlement_event_id,
      split_group_id,
      split_line_id,
      expense_id,
      currency,
      payer_user_id,
      participant_user_id,
      allocated_amount_cents,
      allocation_order,
      allocation_source
    ) VALUES (
      v_event.household_id,
      v_event.id,
      v_candidate.split_group_id,
      v_candidate.split_line_id,
      v_candidate.expense_id,
      UPPER(v_event.currency),
      v_event.payer_user_id,
      v_event.participant_user_id,
      LEAST(v_remaining, v_candidate.remaining_cents),
      v_order,
      COALESCE(NULLIF(BTRIM(p_allocation_source), ''), 'runtime')
    );

    v_allocated := v_allocated + LEAST(v_remaining, v_candidate.remaining_cents);
    v_remaining := v_remaining - LEAST(v_remaining, v_candidate.remaining_cents);
  END LOOP;

  INSERT INTO public.household_settlement_event_allocation_status_v2 (
    settlement_event_id,
    allocated_total_cents,
    allocation_source,
    processed_at
  ) VALUES (
    v_event.id,
    v_allocated,
    COALESCE(NULLIF(BTRIM(p_allocation_source), ''), 'runtime'),
    NOW()
  )
  ON CONFLICT (settlement_event_id)
  DO UPDATE SET
    allocated_total_cents = EXCLUDED.allocated_total_cents,
    allocation_source = EXCLUDED.allocation_source,
    processed_at = EXCLUDED.processed_at;

  RETURN v_allocated;
END;
$$;

CREATE OR REPLACE FUNCTION public.households_backfill_settlement_allocations_v2(
  p_household_id UUID,
  p_user_a UUID DEFAULT NULL,
  p_user_b UUID DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_processed INTEGER := 0;
  v_event RECORD;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL
     AND NOT public.is_member_of_household(p_household_id, v_actor_id) THEN
    RAISE EXCEPTION 'households_backfill_settlement_allocations_v2: actor not member of household';
  END IF;

  FOR v_event IN
    SELECT e.id
    FROM public.household_settlement_events e
    LEFT JOIN public.household_settlement_event_allocation_status_v2 s
      ON s.settlement_event_id = e.id
    WHERE e.household_id = p_household_id
      AND s.settlement_event_id IS NULL
      AND (
        p_currency IS NULL OR BTRIM(p_currency) = '' OR UPPER(e.currency) = UPPER(BTRIM(p_currency))
      )
      AND (
        p_user_a IS NULL OR p_user_b IS NULL OR (
          (e.payer_user_id = p_user_a AND e.participant_user_id = p_user_b)
          OR
          (e.payer_user_id = p_user_b AND e.participant_user_id = p_user_a)
        )
      )
    ORDER BY e.created_at ASC, e.id ASC
    LIMIT GREATEST(COALESCE(p_limit, 500), 1)
  LOOP
    PERFORM public.households_allocate_settlement_event_v2(v_event.id, 'backfill');
    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;

CREATE OR REPLACE FUNCTION public.households_get_pairwise_settlement_balances_v2(
  p_household_id UUID,
  p_currency TEXT DEFAULT NULL
)
RETURNS TABLE (
  other_user_id UUID,
  currency TEXT,
  split_to_cents BIGINT,
  split_from_cents BIGINT,
  paid_to_cents BIGINT,
  paid_from_cents BIGINT,
  net_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_currency TEXT;
  v_backfill_processed INTEGER := 0;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'households_get_pairwise_settlement_balances_v2: auth.uid() is null';
  END IF;

  IF NOT public.is_member_of_household(p_household_id, v_actor_id) THEN
    RAISE EXCEPTION 'households_get_pairwise_settlement_balances_v2: actor not member of household';
  END IF;

  IF p_currency IS NOT NULL AND BTRIM(p_currency) <> '' THEN
    v_currency := UPPER(BTRIM(p_currency));
  ELSE
    SELECT h.currency INTO v_currency
    FROM public.households h
    WHERE h.id = p_household_id;
  END IF;

  RETURN QUERY
  WITH deltas AS (
    SELECT
      g.payer_user_id AS other_user_id,
      ABS(COALESCE(l.amount_cents, 0)) AS split_to_delta,
      0::BIGINT AS split_from_delta,
      0::BIGINT AS paid_to_delta,
      0::BIGINT AS paid_from_delta
    FROM public.expense_split_lines l
    JOIN public.expense_split_groups g ON g.id = l.split_group_id
    WHERE g.household_id = p_household_id
      AND l.is_settled = FALSE
      AND g.payer_user_id <> v_actor_id
      AND l.user_id = v_actor_id
      AND UPPER(g.currency) = v_currency

    UNION ALL

    SELECT
      l.user_id AS other_user_id,
      0::BIGINT,
      ABS(COALESCE(l.amount_cents, 0)),
      0::BIGINT,
      0::BIGINT
    FROM public.expense_split_lines l
    JOIN public.expense_split_groups g ON g.id = l.split_group_id
    WHERE g.household_id = p_household_id
      AND l.is_settled = FALSE
      AND g.payer_user_id = v_actor_id
      AND l.user_id <> v_actor_id
      AND UPPER(g.currency) = v_currency

    UNION ALL

    SELECT
      e.payer_user_id AS other_user_id,
      0::BIGINT,
      0::BIGINT,
      ABS(COALESCE(e.amount_cents, 0)),
      0::BIGINT
    FROM public.household_settlement_events e
    WHERE e.household_id = p_household_id
      AND e.participant_user_id = v_actor_id
      AND UPPER(e.currency) = v_currency

    UNION ALL

    SELECT
      e.participant_user_id AS other_user_id,
      0::BIGINT,
      0::BIGINT,
      0::BIGINT,
      ABS(COALESCE(e.amount_cents, 0))
    FROM public.household_settlement_events e
    WHERE e.household_id = p_household_id
      AND e.payer_user_id = v_actor_id
      AND UPPER(e.currency) = v_currency
  )
  SELECT
    d.other_user_id,
    v_currency AS currency,
    COALESCE(SUM(d.split_to_delta), 0) AS split_to_cents,
    COALESCE(SUM(d.split_from_delta), 0) AS split_from_cents,
    COALESCE(SUM(d.paid_to_delta), 0) AS paid_to_cents,
    COALESCE(SUM(d.paid_from_delta), 0) AS paid_from_cents,
    (COALESCE(SUM(d.split_to_delta), 0) - COALESCE(SUM(d.split_from_delta), 0))
      - (COALESCE(SUM(d.paid_to_delta), 0) - COALESCE(SUM(d.paid_from_delta), 0)) AS net_cents
  FROM deltas d
  WHERE d.other_user_id IS NOT NULL
    AND d.other_user_id <> v_actor_id
  GROUP BY d.other_user_id
  HAVING
    COALESCE(SUM(d.split_to_delta), 0) <> 0
    OR COALESCE(SUM(d.split_from_delta), 0) <> 0
    OR COALESCE(SUM(d.paid_to_delta), 0) <> 0
    OR COALESCE(SUM(d.paid_from_delta), 0) <> 0
  ORDER BY ABS(
    (COALESCE(SUM(d.split_to_delta), 0) - COALESCE(SUM(d.split_from_delta), 0))
      - (COALESCE(SUM(d.paid_to_delta), 0) - COALESCE(SUM(d.paid_from_delta), 0))
  ) DESC,
  d.other_user_id ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.households_get_settlement_breakdown_v2(
  p_household_id UUID,
  p_other_user_id UUID,
  p_currency TEXT DEFAULT NULL
)
RETURNS TABLE (
  direction TEXT,
  expense_id UUID,
  split_group_id UUID,
  split_line_id UUID,
  expense_date TIMESTAMPTZ,
  expense_description TEXT,
  expense_category TEXT,
  expense_raw_text TEXT,
  expense_type TEXT,
  total_amount_cents BIGINT,
  remaining_amount_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_currency TEXT;
  v_backfill_processed INTEGER := 0;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'households_get_settlement_breakdown_v2: auth.uid() is null';
  END IF;

  IF NOT public.is_member_of_household(p_household_id, v_actor_id) THEN
    RAISE EXCEPTION 'households_get_settlement_breakdown_v2: actor not member of household';
  END IF;

  IF NOT public.is_member_of_household(p_household_id, p_other_user_id) THEN
    RAISE EXCEPTION 'households_get_settlement_breakdown_v2: other member not in household';
  END IF;

  IF p_currency IS NOT NULL AND BTRIM(p_currency) <> '' THEN
    v_currency := UPPER(BTRIM(p_currency));
  ELSE
    SELECT h.currency INTO v_currency
    FROM public.households h
    WHERE h.id = p_household_id;
  END IF;

  LOOP
    v_backfill_processed := public.households_backfill_settlement_allocations_v2(
      p_household_id,
      v_actor_id,
      p_other_user_id,
      v_currency,
      5000
    );
    EXIT WHEN v_backfill_processed = 0;
  END LOOP;

  RETURN QUERY
  WITH pairwise_balance AS (
    WITH deltas AS (
      SELECT
        g.payer_user_id AS other_user_id,
        ABS(COALESCE(l.amount_cents, 0)) AS split_to_delta,
        0::BIGINT AS split_from_delta,
        0::BIGINT AS paid_to_delta,
        0::BIGINT AS paid_from_delta
      FROM public.expense_split_lines l
      JOIN public.expense_split_groups g ON g.id = l.split_group_id
      WHERE g.household_id = p_household_id
        AND l.is_settled = FALSE
        AND g.payer_user_id = p_other_user_id
        AND l.user_id = v_actor_id
        AND UPPER(g.currency) = v_currency

      UNION ALL

      SELECT
        l.user_id AS other_user_id,
        0::BIGINT,
        ABS(COALESCE(l.amount_cents, 0)),
        0::BIGINT,
        0::BIGINT
      FROM public.expense_split_lines l
      JOIN public.expense_split_groups g ON g.id = l.split_group_id
      WHERE g.household_id = p_household_id
        AND l.is_settled = FALSE
        AND g.payer_user_id = v_actor_id
        AND l.user_id = p_other_user_id
        AND UPPER(g.currency) = v_currency

      UNION ALL

      SELECT
        e.payer_user_id AS other_user_id,
        0::BIGINT,
        0::BIGINT,
        ABS(COALESCE(e.amount_cents, 0)),
        0::BIGINT
      FROM public.household_settlement_events e
      WHERE e.household_id = p_household_id
        AND e.payer_user_id = p_other_user_id
        AND e.participant_user_id = v_actor_id
        AND UPPER(e.currency) = v_currency

      UNION ALL

      SELECT
        e.participant_user_id AS other_user_id,
        0::BIGINT,
        0::BIGINT,
        0::BIGINT,
        ABS(COALESCE(e.amount_cents, 0))
      FROM public.household_settlement_events e
      WHERE e.household_id = p_household_id
        AND e.payer_user_id = v_actor_id
        AND e.participant_user_id = p_other_user_id
        AND UPPER(e.currency) = v_currency
    )
    SELECT
      COALESCE(SUM(d.split_to_delta), 0) AS split_to_cents,
      COALESCE(SUM(d.split_from_delta), 0) AS split_from_cents,
      COALESCE(SUM(d.paid_to_delta), 0) AS paid_to_cents,
      COALESCE(SUM(d.paid_from_delta), 0) AS paid_from_cents,
      (COALESCE(SUM(d.split_to_delta), 0) - COALESCE(SUM(d.split_from_delta), 0))
        - (COALESCE(SUM(d.paid_to_delta), 0) - COALESCE(SUM(d.paid_from_delta), 0)) AS net_cents
    FROM deltas d
    WHERE d.other_user_id = p_other_user_id
  ),
  allocation_totals AS (
    SELECT
      a.split_line_id,
      COALESCE(SUM(a.allocated_amount_cents), 0) AS allocated_cents
    FROM public.household_settlement_event_allocations_v2 a
    WHERE a.household_id = p_household_id
      AND UPPER(a.currency) = v_currency
      AND (
        (a.payer_user_id = p_other_user_id AND a.participant_user_id = v_actor_id)
        OR
        (a.payer_user_id = v_actor_id AND a.participant_user_id = p_other_user_id)
      )
    GROUP BY a.split_line_id
  ),
  obligation_rows AS (
    SELECT
      CASE
        WHEN g.payer_user_id = p_other_user_id AND l.user_id = v_actor_id
          THEN 'you_owe'
        ELSE 'they_owe_you'
      END AS direction,
      g.expense_id,
      g.id AS split_group_id,
      l.id AS split_line_id,
      COALESCE((e.date::timestamp AT TIME ZONE 'UTC'), g.created_at) AS expense_date,
      g.description AS expense_description,
      e.category AS expense_category,
      e.raw_text AS expense_raw_text,
      e.type AS expense_type,
      ABS(COALESCE(l.amount_cents, 0)) AS total_amount_cents,
      GREATEST(
        ABS(COALESCE(l.amount_cents, 0)) - COALESCE(at.allocated_cents, 0),
        0
      ) AS remaining_amount_cents
    FROM public.expense_split_lines l
    JOIN public.expense_split_groups g ON g.id = l.split_group_id
    LEFT JOIN public.expenses e ON e.id = g.expense_id
    LEFT JOIN allocation_totals at ON at.split_line_id = l.id
    WHERE g.household_id = p_household_id
      AND UPPER(g.currency) = v_currency
      AND l.is_settled = FALSE
      AND ABS(COALESCE(l.amount_cents, 0)) > 0
      AND (
        (g.payer_user_id = p_other_user_id AND l.user_id = v_actor_id)
        OR
        (g.payer_user_id = v_actor_id AND l.user_id = p_other_user_id)
      )
      AND GREATEST(
        ABS(COALESCE(l.amount_cents, 0)) - COALESCE(at.allocated_cents, 0),
        0
      ) > 0
  ),
  obligation_net AS (
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'you_owe' THEN remaining_amount_cents ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN direction = 'they_owe_you' THEN remaining_amount_cents ELSE 0 END), 0)
        AS net_cents
    FROM obligation_rows
  ),
  adjustment_row AS (
    SELECT
      CASE
        WHEN (pb.net_cents - onet.net_cents) > 0 THEN 'you_owe'
        ELSE 'they_owe_you'
      END AS direction,
      NULL::UUID AS expense_id,
      NULL::UUID AS split_group_id,
      NULL::UUID AS split_line_id,
      NOW() AS expense_date,
      'Settlement adjustment'::TEXT AS expense_description,
      NULL::TEXT AS expense_category,
      NULL::TEXT AS expense_raw_text,
      'adjustment'::TEXT AS expense_type,
      ABS(pb.net_cents - onet.net_cents) AS total_amount_cents,
      ABS(pb.net_cents - onet.net_cents) AS remaining_amount_cents
    FROM pairwise_balance pb
    CROSS JOIN obligation_net onet
    WHERE (pb.net_cents - onet.net_cents) <> 0
  )
  SELECT
    CASE
      WHEN source.direction = 'you_owe' THEN 'you_owe'
      ELSE 'they_owe_you'
    END AS direction,
    source.expense_id,
    source.split_group_id,
    source.split_line_id,
    source.expense_date,
    source.expense_description,
    source.expense_category,
    source.expense_raw_text,
    source.expense_type,
    source.total_amount_cents,
    source.remaining_amount_cents
  FROM (
    SELECT * FROM obligation_rows
    UNION ALL
    SELECT * FROM adjustment_row
  ) AS source
  ORDER BY
    source.expense_date DESC,
    source.split_group_id DESC NULLS LAST,
    source.split_line_id DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_allocate_settlement_event_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.households_allocate_settlement_event_v2(NEW.id, 'runtime');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_settlement_event_v2
  ON public.household_settlement_events;

CREATE TRIGGER trg_allocate_settlement_event_v2
AFTER INSERT ON public.household_settlement_events
FOR EACH ROW
EXECUTE FUNCTION public.trg_allocate_settlement_event_v2();

GRANT EXECUTE ON FUNCTION public.households_get_pairwise_settlement_balances_v2(UUID, TEXT)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.households_get_settlement_breakdown_v2(UUID, UUID, TEXT)
  TO authenticated;
