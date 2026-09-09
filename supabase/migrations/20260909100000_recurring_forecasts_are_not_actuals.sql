-- Scheduled recurring occurrences are forecasts. They must never alter pocket
-- spend, balances, carry, or other actual accounting fields before confirmation.

DO $$
BEGIN
  IF to_regprocedure(
    'public.get_pockets_month_v2_financial_with_forecasts(uuid,text,date,uuid,text,boolean,boolean)'
  ) IS NULL THEN
    ALTER FUNCTION public.get_pockets_month_v2_financial_impl(
      UUID, TEXT, DATE, UUID, TEXT, BOOLEAN, BOOLEAN
    ) RENAME TO get_pockets_month_v2_financial_with_forecasts;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pockets_month_v2_financial_impl(
  p_user_id UUID,
  p_scope TEXT,
  p_period_month DATE,
  p_household_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_include_projected_recurring BOOLEAN DEFAULT TRUE,
  p_allow_currency_fallback BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload JSONB;
  v_currency TEXT;
  v_financial_month_start_day INTEGER;
  v_upcoming JSONB := '[]'::JSONB;
BEGIN
  v_payload := public.get_pockets_month_v2_financial_with_forecasts(
    p_user_id,
    p_scope,
    p_period_month,
    p_household_id,
    p_currency,
    FALSE,
    p_allow_currency_fallback
  );

  v_currency := UPPER(COALESCE(v_payload ->> 'selected_currency', p_currency));
  v_financial_month_start_day := public.user_financial_month_start_day(p_user_id);

  IF p_include_projected_recurring THEN
    SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
      'id', projected.id,
      'recurring_id', projected.recurring_id,
      'date', projected.date,
      'amount_cents', ABS(projected.amount_cents),
      'currency', projected.currency,
      'category', projected.category,
      'household_id', projected.household_id,
      'user_id', projected.user_id,
      'split_group_id', projected.split_group_id,
      'raw_text', projected.raw_text,
      'type', projected.type,
      'account_id', projected.account_id
    ) ORDER BY projected.date, projected.id), '[]'::JSONB)
    INTO v_upcoming
    FROM public.get_projected_scoped_recurring_expenses_v1(
      p_user_id,
      p_scope,
      p_household_id,
      v_currency,
      p_period_month,
      public.next_financial_cycle_start(
        p_period_month,
        v_financial_month_start_day
      ) - 1
    ) projected;
  END IF;

  RETURN v_payload || JSONB_BUILD_OBJECT('upcoming_recurring', v_upcoming);
END;
$$;

CREATE OR REPLACE FUNCTION public.pocket_lineage_virtual_balance_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_lineage_id uuid,
  p_currency text,
  p_anchor date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_lineage public.pocket_lineages%rowtype;
  v_month date;
  v_cycle_start date;
  v_cycle_end date;
  v_base bigint;
  v_spent bigint;
  v_adjustments bigint;
  v_carry bigint := 0;
BEGIN
  SELECT * INTO v_lineage FROM public.pocket_lineages WHERE id = p_lineage_id;
  IF NOT FOUND OR (v_scope <> 'household' AND v_lineage.owner_user_id IS DISTINCT FROM p_user_id)
    OR v_lineage.household_id IS DISTINCT FROM p_household_id OR v_lineage.scope <> v_scope
    OR v_lineage.currency <> upper(coalesce(nullif(trim(p_currency), ''), 'USD')) THEN
    RAISE EXCEPTION 'Unknown pocket lineage for scope' USING ERRCODE = '22023';
  END IF;
  IF auth.role() <> 'service_role' AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Client user does not match authenticated user' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_access_pocket_scope_v1(p_user_id, p_household_id, v_scope) THEN
    RAISE EXCEPTION 'Unauthorized pocket carry access' USING ERRCODE = '42501';
  END IF;
  v_month := date_trunc('month', v_lineage.activated_on)::date;
  WHILE v_month < v_anchor LOOP
    v_cycle_start := public.pocket_cycle_anchor_v1(p_user_id, v_month);
    v_cycle_end := public.next_financial_cycle_start(v_cycle_start, public.user_financial_month_start_day(p_user_id));
    SELECT coalesce(allocation.amount_cents, envelope.budget_amount_cents, 0)::bigint INTO v_base
    FROM public.budgets budget JOIN public.budget_envelopes envelope ON envelope.budget_id = budget.id
    LEFT JOIN public.envelope_allocations allocation ON allocation.envelope_id = envelope.id AND allocation.period_month = v_month
    WHERE budget.period_month = v_month AND envelope.rollover_group_id = p_lineage_id
    ORDER BY envelope.updated_at DESC NULLS LAST LIMIT 1;
    SELECT coalesce(sum(amount_cents), 0)::bigint INTO v_adjustments FROM public.pocket_lineage_balance_adjustments
    WHERE lineage_id = p_lineage_id AND effective_month = v_month;
    SELECT coalesce(sum(abs(expense.amount_cents) * expense.analytics_spending_multiplier), 0)::bigint INTO v_spent
    FROM public.expenses expense WHERE coalesce(expense.is_recurring, false) = false
      AND expense.analytics_is_final IS TRUE AND expense.analytics_spending_multiplier <> 0
      AND upper(coalesce(expense.currency, '')) = v_lineage.currency AND expense.deleted_at IS NULL
      AND expense.date >= v_cycle_start AND expense.date < v_cycle_end AND EXISTS (
        SELECT 1 FROM public.pocket_lineage_category_assignments assignment WHERE assignment.lineage_id = p_lineage_id
          AND lower(trim(assignment.category)) = lower(trim(coalesce(expense.category, '')))
          AND assignment.effective_from <= v_month AND (assignment.effective_until IS NULL OR assignment.effective_until >= v_month))
      AND ((v_scope = 'household' AND expense.household_id = p_household_id)
        OR (v_scope = 'personal' AND expense.user_id = p_user_id AND expense.household_id IS NULL)
        OR (v_scope = 'portfolio' AND expense.user_id = p_user_id AND expense.household_id = p_household_id));
    IF v_lineage.rollover_enabled THEN
      v_carry := coalesce(v_base, 0) + v_carry + v_adjustments - v_spent;
      IF v_carry < 0 AND NOT v_lineage.rollover_negative THEN v_carry := 0;
      ELSIF v_lineage.rollover_cap_cents IS NOT NULL AND v_carry > v_lineage.rollover_cap_cents THEN v_carry := v_lineage.rollover_cap_cents; END IF;
    ELSE v_carry := 0; END IF;
    v_month := (v_month + interval '1 month')::date;
  END LOOP;
  RETURN jsonb_build_object('lineage_id', p_lineage_id, 'is_virtual', true, 'carry_cents', v_carry,
    'retired', EXISTS (SELECT 1 FROM public.pocket_lineage_retirements retirement WHERE retirement.lineage_id = p_lineage_id AND retirement.effective_month <= v_anchor));
END;
$$;

NOTIFY pgrst, 'reload schema';
