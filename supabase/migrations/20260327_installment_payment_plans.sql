-- ====================
-- INSTALLMENT PAYMENT PLANS - First-class plan support
-- Created: 2026-03-27
-- Purpose: Add normalized recurring/installment plan tables and workflow helpers
-- ====================

-- Enums ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.payment_plan_type_enum AS ENUM ('recurring', 'installment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_plan_status_enum AS ENUM (
    'active',
    'paused',
    'completed',
    'cancelled',
    'defaulted'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_plan_occurrence_status_enum AS ENUM (
    'scheduled',
    'paid',
    'skipped',
    'cancelled',
    'overdue',
    'partially_paid',
    'settled_early'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_plan_payment_kind_enum AS ENUM (
    'normal',
    'partial',
    'extra',
    'early_payoff',
    'correction'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- expenses table extensions --------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'payment_plan_type'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN payment_plan_type public.payment_plan_type_enum;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'payment_plan_id'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN payment_plan_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'payment_plan_occurrence_id'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN payment_plan_occurrence_id uuid;
  END IF;
END $$;

-- plan tables ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NULL REFERENCES public.households(id) ON DELETE SET NULL,
  contact_id uuid NULL REFERENCES public.user_contacts(id) ON DELETE SET NULL,
  category text NOT NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  currency varchar(3) NOT NULL,
  payment_plan_type public.payment_plan_type_enum NOT NULL,
  plan_status public.payment_plan_status_enum NOT NULL DEFAULT 'active',
  privacy_scope public.privacy_scope NULL,
  owner_type public.transaction_owner NULL,
  payer_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  split_group_id uuid NULL REFERENCES public.expense_split_groups(id) ON DELETE SET NULL,
  acknowledged_by uuid[] NULL,
  recurrence_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  principal_amount_cents bigint NULL,
  interest_fee_amount_cents bigint NULL,
  total_payable_amount_cents bigint NULL,
  installment_count integer NULL,
  installment_amount_cents bigint NULL,
  custom_schedule_mode boolean NOT NULL DEFAULT false,
  allow_custom_amounts boolean NOT NULL DEFAULT false,
  allow_partial_payments boolean NOT NULL DEFAULT true,
  early_payoff_at timestamptz NULL,
  remaining_balance_cents bigint NULL,
  paid_installments_count integer NULL,
  remaining_installments_count integer NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CONSTRAINT payment_plans_installment_total_positive_chk CHECK (
    payment_plan_type <> 'installment' OR (total_payable_amount_cents IS NOT NULL AND total_payable_amount_cents > 0)
  ),
  CONSTRAINT payment_plans_installment_components_chk CHECK (
    payment_plan_type <> 'installment' OR (
      principal_amount_cents IS NOT NULL
      AND principal_amount_cents > 0
      AND interest_fee_amount_cents IS NOT NULL
      AND interest_fee_amount_cents >= 0
      AND total_payable_amount_cents = principal_amount_cents + interest_fee_amount_cents
    )
  )
);

CREATE TABLE IF NOT EXISTS public.payment_plan_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  occurrence_number integer NOT NULL,
  scheduled_date date NOT NULL,
  original_scheduled_date date NOT NULL,
  due_amount_cents bigint NOT NULL,
  principal_component_cents bigint NULL,
  interest_component_cents bigint NULL,
  fee_component_cents bigint NULL,
  status public.payment_plan_occurrence_status_enum NOT NULL DEFAULT 'scheduled',
  paid_amount_cents bigint NOT NULL DEFAULT 0,
  remaining_amount_cents bigint NOT NULL,
  skipped_reason text NULL,
  deferred_to_occurrence_id uuid NULL REFERENCES public.payment_plan_occurrences(id) ON DELETE SET NULL,
  generated_from_skip boolean NOT NULL DEFAULT false,
  transaction_id uuid NULL REFERENCES public.expenses(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  settled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CONSTRAINT payment_plan_occurrence_unique_number UNIQUE (payment_plan_id, occurrence_number),
  CONSTRAINT payment_plan_occurrence_due_positive_chk CHECK (due_amount_cents > 0),
  CONSTRAINT payment_plan_occurrence_non_negative_chk CHECK (paid_amount_cents >= 0 AND remaining_amount_cents >= 0)
);

CREATE TABLE IF NOT EXISTS public.payment_plan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  occurrence_id uuid NULL REFERENCES public.payment_plan_occurrences(id) ON DELETE SET NULL,
  transaction_id uuid NULL REFERENCES public.expenses(id) ON DELETE SET NULL,
  payment_kind public.payment_plan_payment_kind_enum NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  payment_date date NOT NULL,
  notes text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Foreign keys from expenses -> plans/occurrences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'expenses'
      AND tc.constraint_name = 'expenses_payment_plan_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_payment_plan_id_fkey
      FOREIGN KEY (payment_plan_id)
      REFERENCES public.payment_plans(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'expenses'
      AND tc.constraint_name = 'expenses_payment_plan_occurrence_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_payment_plan_occurrence_id_fkey
      FOREIGN KEY (payment_plan_occurrence_id)
      REFERENCES public.payment_plan_occurrences(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payment_plans_user_status
  ON public.payment_plans(user_id, plan_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_plans_household_status
  ON public.payment_plans(household_id, plan_status)
  WHERE household_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_plans_type_status
  ON public.payment_plans(payment_plan_type, plan_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_plan_occurrences_plan_date
  ON public.payment_plan_occurrences(payment_plan_id, scheduled_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_plan_occurrences_status_date
  ON public.payment_plan_occurrences(status, scheduled_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_plan_payments_plan_date
  ON public.payment_plan_payments(payment_plan_id, payment_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_plan_payments_idempotency
  ON public.payment_plan_payments(payment_plan_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Trigger wiring --------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_payment_plans_updated_at ON public.payment_plans;
CREATE TRIGGER trg_payment_plans_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_payment_plan_occurrences_updated_at ON public.payment_plan_occurrences;
CREATE TRIGGER trg_payment_plan_occurrences_updated_at
  BEFORE UPDATE ON public.payment_plan_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS ------------------------------------------------------------------------
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read payment plans by scope" ON public.payment_plans;
CREATE POLICY "Users can read payment plans by scope"
  ON public.payment_plans
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR (
        household_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.household_members hm
          WHERE hm.household_id = payment_plans.household_id
            AND hm.user_id = auth.uid()
        )
        AND (
          privacy_scope IS NULL
          OR privacy_scope IN ('full', 'balances_only')
          OR user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can read payment plan occurrences by scope" ON public.payment_plan_occurrences;
CREATE POLICY "Users can read payment plan occurrences by scope"
  ON public.payment_plan_occurrences
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.payment_plans pp
      WHERE pp.id = payment_plan_occurrences.payment_plan_id
        AND pp.deleted_at IS NULL
        AND (
          pp.user_id = auth.uid()
          OR (
            pp.household_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.household_members hm
              WHERE hm.household_id = pp.household_id
                AND hm.user_id = auth.uid()
            )
            AND (
              pp.privacy_scope IS NULL
              OR pp.privacy_scope IN ('full', 'balances_only')
              OR pp.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can read payment plan payments by scope" ON public.payment_plan_payments;
CREATE POLICY "Users can read payment plan payments by scope"
  ON public.payment_plan_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.payment_plans pp
      WHERE pp.id = payment_plan_payments.payment_plan_id
        AND pp.deleted_at IS NULL
        AND (
          pp.user_id = auth.uid()
          OR (
            pp.household_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.household_members hm
              WHERE hm.household_id = pp.household_id
                AND hm.user_id = auth.uid()
            )
            AND (
              pp.privacy_scope IS NULL
              OR pp.privacy_scope IN ('full', 'balances_only')
              OR pp.user_id = auth.uid()
            )
          )
        )
    )
  );

-- Helpers --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.installment_occurrence_date(
  p_anchor date,
  p_frequency text,
  p_interval integer,
  p_index integer
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_interval integer := GREATEST(COALESCE(p_interval, 1), 1);
  v_shift integer := GREATEST(p_index - 1, 0);
BEGIN
  CASE lower(COALESCE(p_frequency, 'monthly'))
    WHEN 'daily' THEN
      RETURN p_anchor + (v_shift * v_interval);
    WHEN 'weekly' THEN
      RETURN p_anchor + (v_shift * (7 * v_interval));
    WHEN 'biweekly' THEN
      RETURN p_anchor + (v_shift * 14 * v_interval);
    WHEN 'yearly' THEN
      RETURN (p_anchor + make_interval(years => v_shift * v_interval))::date;
    ELSE
      RETURN (p_anchor + make_interval(months => v_shift * v_interval))::date;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_installment_plan_summary(
  p_plan_id uuid
)
RETURNS public.payment_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.payment_plans%ROWTYPE;
  v_total_paid bigint;
  v_remaining bigint;
  v_paid_installments integer;
  v_remaining_installments integer;
BEGIN
  SELECT * INTO v_plan
  FROM public.payment_plans
  WHERE id = p_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment plan not found';
  END IF;

  IF v_plan.payment_plan_type <> 'installment' THEN
    RETURN v_plan;
  END IF;

  SELECT COALESCE(SUM(amount_cents), 0)
    INTO v_total_paid
  FROM public.payment_plan_payments
  WHERE payment_plan_id = p_plan_id;

  SELECT COUNT(*)
    INTO v_paid_installments
  FROM public.payment_plan_occurrences
  WHERE payment_plan_id = p_plan_id
    AND deleted_at IS NULL
    AND status IN ('paid', 'settled_early');

  SELECT COUNT(*)
    INTO v_remaining_installments
  FROM public.payment_plan_occurrences
  WHERE payment_plan_id = p_plan_id
    AND deleted_at IS NULL
    AND status IN ('scheduled', 'overdue', 'partially_paid');

  v_remaining := GREATEST(COALESCE(v_plan.total_payable_amount_cents, 0) - v_total_paid, 0);

  UPDATE public.payment_plans
  SET remaining_balance_cents = v_remaining,
      paid_installments_count = v_paid_installments,
      remaining_installments_count = v_remaining_installments,
      plan_status = CASE
        WHEN v_remaining = 0 THEN 'completed'::public.payment_plan_status_enum
        WHEN plan_status = 'completed'::public.payment_plan_status_enum THEN 'active'::public.payment_plan_status_enum
        ELSE plan_status
      END,
      updated_at = now()
  WHERE id = p_plan_id
  RETURNING * INTO v_plan;

  RETURN v_plan;
END;
$$;

COMMENT ON FUNCTION public.recalculate_installment_plan_summary(uuid)
  IS 'Recomputes installment plan remaining balance + status summary';

CREATE OR REPLACE FUNCTION public.mark_occurrence_overdue_if_needed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.payment_plan_occurrences o
  SET status = 'overdue',
      updated_at = now()
  FROM public.payment_plans p
  WHERE o.payment_plan_id = p.id
    AND p.payment_plan_type = 'installment'
    AND p.plan_status = 'active'
    AND o.status = 'scheduled'
    AND o.deleted_at IS NULL
    AND o.scheduled_date < CURRENT_DATE;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- Mutation RPCs --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_installment_plan(
  p_actor_user_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid := gen_random_uuid();
  v_household_id uuid := NULLIF(p_payload->>'householdId', '')::uuid;
  v_contact_id uuid := NULLIF(p_payload->>'contactId', '')::uuid;
  v_category text := COALESCE(NULLIF(p_payload->>'category', ''), 'other');
  v_type text := COALESCE(NULLIF(p_payload->>'type', ''), 'expense');
  v_currency varchar(3) := UPPER(COALESCE(NULLIF(p_payload->>'currency', ''), 'USD'));
  v_privacy public.privacy_scope := COALESCE(NULLIF(p_payload->>'privacyScope', '')::public.privacy_scope, 'full'::public.privacy_scope);
  v_owner public.transaction_owner := COALESCE(NULLIF(p_payload->>'ownerType', '')::public.transaction_owner, 'me'::public.transaction_owner);
  v_payer_user_id uuid := NULLIF(p_payload->>'payerUserId', '')::uuid;
  v_recurrence_rule jsonb := COALESCE(p_payload->'recurrenceRule', '{}'::jsonb);
  v_principal bigint := COALESCE((p_payload->>'principalAmountCents')::bigint, 0);
  v_interest bigint := COALESCE((p_payload->>'interestFeeAmountCents')::bigint, 0);
  v_total bigint := COALESCE((p_payload->>'totalPayableAmountCents')::bigint, 0);
  v_installment_count integer := NULLIF(p_payload->>'installmentCount', '')::integer;
  v_installment_amount bigint := NULLIF(p_payload->>'installmentAmountCents', '')::bigint;
  v_custom_mode boolean := COALESCE((p_payload->>'customScheduleMode')::boolean, false);
  v_allow_partial boolean := COALESCE((p_payload->>'allowPartialPayments')::boolean, true);
  v_custom_schedule jsonb := COALESCE(p_payload->'customSchedule', '[]'::jsonb);
  v_frequency text := COALESCE(v_recurrence_rule->>'frequency', 'monthly');
  v_interval integer := COALESCE((v_recurrence_rule->>'interval')::integer, 1);
  v_anchor date := COALESCE((v_recurrence_rule->>'anchor_date')::date, CURRENT_DATE);
  v_base bigint;
  v_remainder bigint;
  v_due bigint;
  v_sum bigint := 0;
  v_occ_count integer := 0;
  i integer;
  v_occ jsonb;
  v_sched_date date;
BEGIN
  IF v_principal <= 0 THEN
    RAISE EXCEPTION 'principalAmountCents must be > 0';
  END IF;
  IF v_interest < 0 THEN
    RAISE EXCEPTION 'interestFeeAmountCents must be >= 0';
  END IF;
  IF v_total <= 0 OR v_total <> v_principal + v_interest THEN
    RAISE EXCEPTION 'totalPayableAmountCents must equal principal + interest';
  END IF;

  IF v_household_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = v_household_id
        AND hm.user_id = p_actor_user_id
    ) THEN
      RAISE EXCEPTION 'household membership required';
    END IF;
  END IF;

  IF v_custom_mode THEN
    IF jsonb_typeof(v_custom_schedule) <> 'array' OR jsonb_array_length(v_custom_schedule) = 0 THEN
      RAISE EXCEPTION 'custom schedule required for customScheduleMode=true';
    END IF;

    FOR v_occ IN SELECT * FROM jsonb_array_elements(v_custom_schedule)
    LOOP
      v_occ_count := v_occ_count + 1;
      v_sched_date := (v_occ->>'scheduledDate')::date;
      v_due := COALESCE((v_occ->>'dueAmountCents')::bigint, 0);
      IF v_due <= 0 THEN
        RAISE EXCEPTION 'custom schedule dueAmountCents must be > 0';
      END IF;
      IF v_occ_count > 1 AND v_sched_date <= (
        SELECT scheduled_date
        FROM public.payment_plan_occurrences
        WHERE payment_plan_id = v_plan_id
        ORDER BY occurrence_number DESC
        LIMIT 1
      ) THEN
        RAISE EXCEPTION 'custom schedule dates must be increasing';
      END IF;

      INSERT INTO public.payment_plan_occurrences (
        payment_plan_id,
        occurrence_number,
        scheduled_date,
        original_scheduled_date,
        due_amount_cents,
        principal_component_cents,
        interest_component_cents,
        fee_component_cents,
        status,
        paid_amount_cents,
        remaining_amount_cents,
        generated_from_skip,
        metadata
      ) VALUES (
        v_plan_id,
        COALESCE((v_occ->>'occurrenceNumber')::integer, v_occ_count),
        v_sched_date,
        v_sched_date,
        v_due,
        NULLIF(v_occ->>'principalComponentCents', '')::bigint,
        NULLIF(v_occ->>'interestComponentCents', '')::bigint,
        NULLIF(v_occ->>'feeComponentCents', '')::bigint,
        'scheduled',
        0,
        v_due,
        false,
        '{}'::jsonb
      );

      v_sum := v_sum + v_due;
    END LOOP;

    IF v_sum <> v_total THEN
      RAISE EXCEPTION 'custom schedule must sum exactly to total payable';
    END IF;

    v_installment_count := v_occ_count;
  ELSE
    IF v_installment_count IS NULL AND v_installment_amount IS NULL THEN
      RAISE EXCEPTION 'installmentCount or installmentAmountCents is required';
    END IF;

    IF v_installment_count IS NULL THEN
      IF v_installment_amount IS NULL OR v_installment_amount <= 0 THEN
        RAISE EXCEPTION 'installmentAmountCents must be > 0';
      END IF;
      v_installment_count := CEIL(v_total::numeric / v_installment_amount::numeric)::integer;
    END IF;

    IF v_installment_count <= 0 THEN
      RAISE EXCEPTION 'installmentCount must be > 0';
    END IF;

    v_base := FLOOR(v_total::numeric / v_installment_count::numeric)::bigint;
    v_remainder := v_total - (v_base * v_installment_count);

    FOR i IN 1..v_installment_count LOOP
      v_due := v_base + CASE WHEN i <= v_remainder THEN 1 ELSE 0 END;
      v_sched_date := public.installment_occurrence_date(v_anchor, v_frequency, v_interval, i);

      INSERT INTO public.payment_plan_occurrences (
        payment_plan_id,
        occurrence_number,
        scheduled_date,
        original_scheduled_date,
        due_amount_cents,
        status,
        paid_amount_cents,
        remaining_amount_cents,
        generated_from_skip,
        metadata
      ) VALUES (
        v_plan_id,
        i,
        v_sched_date,
        v_sched_date,
        v_due,
        'scheduled',
        0,
        v_due,
        false,
        '{}'::jsonb
      );
    END LOOP;

    v_installment_amount := v_base;
  END IF;

  INSERT INTO public.payment_plans (
    id,
    user_id,
    household_id,
    contact_id,
    category,
    type,
    currency,
    payment_plan_type,
    plan_status,
    privacy_scope,
    owner_type,
    payer_user_id,
    recurrence_rule,
    principal_amount_cents,
    interest_fee_amount_cents,
    total_payable_amount_cents,
    installment_count,
    installment_amount_cents,
    custom_schedule_mode,
    allow_custom_amounts,
    allow_partial_payments,
    remaining_balance_cents,
    paid_installments_count,
    remaining_installments_count,
    metadata
  ) VALUES (
    v_plan_id,
    p_actor_user_id,
    v_household_id,
    v_contact_id,
    v_category,
    v_type,
    v_currency,
    'installment',
    'active',
    v_privacy,
    v_owner,
    v_payer_user_id,
    v_recurrence_rule,
    v_principal,
    v_interest,
    v_total,
    v_installment_count,
    v_installment_amount,
    v_custom_mode,
    v_custom_mode,
    v_allow_partial,
    v_total,
    0,
    v_installment_count,
    jsonb_build_object('idempotency_key', p_payload->>'idempotencyKey')
  );

  PERFORM public.recalculate_installment_plan_summary(v_plan_id);

  RETURN jsonb_build_object(
    'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = v_plan_id),
    'occurrences', (
      SELECT COALESCE(jsonb_agg(row_to_json(o) ORDER BY o.occurrence_number), '[]'::jsonb)
      FROM public.payment_plan_occurrences o
      WHERE o.payment_plan_id = v_plan_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.skip_next_installment_occurrence(
  p_actor_user_id uuid,
  p_plan_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.payment_plans%ROWTYPE;
  v_target public.payment_plan_occurrences%ROWTYPE;
  v_new_occ public.payment_plan_occurrences%ROWTYPE;
  v_next_number integer;
  v_anchor date;
  v_frequency text;
  v_interval integer;
BEGIN
  SELECT * INTO v_plan
  FROM public.payment_plans
  WHERE id = p_plan_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  IF v_plan.payment_plan_type <> 'installment' THEN
    RAISE EXCEPTION 'plan must be installment';
  END IF;

  IF v_plan.plan_status <> 'active' THEN
    RAISE EXCEPTION 'plan must be active';
  END IF;

  IF v_plan.user_id <> p_actor_user_id AND NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = v_plan.household_id
      AND hm.user_id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT * INTO v_target
  FROM public.payment_plan_occurrences
  WHERE payment_plan_id = p_plan_id
    AND deleted_at IS NULL
    AND status IN ('scheduled', 'overdue')
  ORDER BY scheduled_date ASC, occurrence_number ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no pending occurrence to skip';
  END IF;

  IF v_target.paid_amount_cents > 0 THEN
    RAISE EXCEPTION 'cannot skip partially paid occurrence';
  END IF;

  UPDATE public.payment_plan_occurrences
  SET status = 'skipped',
      skipped_reason = p_reason,
      updated_at = now()
  WHERE id = v_target.id;

  SELECT COALESCE(MAX(occurrence_number), 0) + 1 INTO v_next_number
  FROM public.payment_plan_occurrences
  WHERE payment_plan_id = p_plan_id;

  v_anchor := COALESCE((v_plan.recurrence_rule->>'anchor_date')::date, v_target.scheduled_date);
  v_frequency := COALESCE(v_plan.recurrence_rule->>'frequency', 'monthly');
  v_interval := COALESCE((v_plan.recurrence_rule->>'interval')::integer, 1);

  INSERT INTO public.payment_plan_occurrences (
    payment_plan_id,
    occurrence_number,
    scheduled_date,
    original_scheduled_date,
    due_amount_cents,
    status,
    paid_amount_cents,
    remaining_amount_cents,
    generated_from_skip,
    metadata
  ) VALUES (
    p_plan_id,
    v_next_number,
    public.installment_occurrence_date(v_anchor, v_frequency, v_interval, v_next_number),
    public.installment_occurrence_date(v_anchor, v_frequency, v_interval, v_next_number),
    v_target.remaining_amount_cents,
    'scheduled',
    0,
    v_target.remaining_amount_cents,
    true,
    '{}'::jsonb
  ) RETURNING * INTO v_new_occ;

  UPDATE public.payment_plan_occurrences
  SET deferred_to_occurrence_id = v_new_occ.id,
      updated_at = now()
  WHERE id = v_target.id;

  PERFORM public.recalculate_installment_plan_summary(p_plan_id);

  RETURN jsonb_build_object(
    'skippedOccurrenceId', v_target.id,
    'replacementOccurrence', row_to_json(v_new_occ),
    'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = p_plan_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_plan_occurrence_paid(
  p_actor_user_id uuid,
  p_plan_id uuid,
  p_occurrence_id uuid,
  p_amount_cents bigint,
  p_payment_date date,
  p_payment_kind public.payment_plan_payment_kind_enum,
  p_idempotency_key text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.payment_plans%ROWTYPE;
  v_occ public.payment_plan_occurrences%ROWTYPE;
  v_new_paid bigint;
  v_new_remaining bigint;
  v_status public.payment_plan_occurrence_status_enum;
  v_payment public.payment_plan_payments%ROWTYPE;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  SELECT * INTO v_plan
  FROM public.payment_plans
  WHERE id = p_plan_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  IF v_plan.user_id <> p_actor_user_id AND NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = v_plan.household_id
      AND hm.user_id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT * INTO v_occ
  FROM public.payment_plan_occurrences
  WHERE id = p_occurrence_id
    AND payment_plan_id = p_plan_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'occurrence not found';
  END IF;

  IF v_occ.status IN ('cancelled', 'skipped', 'paid', 'settled_early') THEN
    RAISE EXCEPTION 'occurrence cannot accept payment in current status';
  END IF;

  IF p_payment_kind = 'partial' AND p_amount_cents >= v_occ.remaining_amount_cents THEN
    RAISE EXCEPTION 'partial payment must be less than remaining amount';
  END IF;

  IF p_payment_kind <> 'partial' AND p_amount_cents < v_occ.remaining_amount_cents THEN
    RAISE EXCEPTION 'full payment must cover remaining amount';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_payment
    FROM public.payment_plan_payments
    WHERE payment_plan_id = p_plan_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = p_plan_id),
        'occurrence', (SELECT row_to_json(o) FROM public.payment_plan_occurrences o WHERE o.id = p_occurrence_id)
      );
    END IF;
  END IF;

  INSERT INTO public.payment_plan_payments (
    payment_plan_id,
    occurrence_id,
    payment_kind,
    amount_cents,
    payment_date,
    notes,
    created_by,
    idempotency_key
  ) VALUES (
    p_plan_id,
    p_occurrence_id,
    p_payment_kind,
    p_amount_cents,
    p_payment_date,
    p_notes,
    p_actor_user_id,
    p_idempotency_key
  ) RETURNING * INTO v_payment;

  v_new_paid := v_occ.paid_amount_cents + p_amount_cents;
  v_new_remaining := GREATEST(v_occ.due_amount_cents - v_new_paid, 0);
  v_status := CASE WHEN v_new_remaining = 0 THEN 'paid' ELSE 'partially_paid' END;

  UPDATE public.payment_plan_occurrences
  SET paid_amount_cents = v_new_paid,
      remaining_amount_cents = v_new_remaining,
      status = v_status,
      settled_at = CASE WHEN v_new_remaining = 0 THEN now() ELSE settled_at END,
      updated_at = now()
  WHERE id = p_occurrence_id;

  PERFORM public.recalculate_installment_plan_summary(p_plan_id);

  RETURN jsonb_build_object(
    'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = p_plan_id),
    'occurrence', (SELECT row_to_json(o) FROM public.payment_plan_occurrences o WHERE o.id = p_occurrence_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.early_payoff_installment_plan(
  p_actor_user_id uuid,
  p_plan_id uuid,
  p_amount_cents bigint,
  p_payment_date date,
  p_idempotency_key text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.payment_plans%ROWTYPE;
  v_payment public.payment_plan_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_plan
  FROM public.payment_plans
  WHERE id = p_plan_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  IF v_plan.payment_plan_type <> 'installment' THEN
    RAISE EXCEPTION 'plan must be installment';
  END IF;

  IF v_plan.plan_status <> 'active' THEN
    RAISE EXCEPTION 'plan must be active';
  END IF;

  IF v_plan.user_id <> p_actor_user_id AND NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = v_plan.household_id
      AND hm.user_id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  IF COALESCE(v_plan.remaining_balance_cents, 0) <= 0 THEN
    RAISE EXCEPTION 'plan already settled';
  END IF;

  IF p_amount_cents <> v_plan.remaining_balance_cents THEN
    RAISE EXCEPTION 'early payoff amount must equal remaining balance';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_payment
    FROM public.payment_plan_payments
    WHERE payment_plan_id = p_plan_id
      AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = p_plan_id),
        'updatedOccurrences', (
          SELECT COALESCE(jsonb_agg(row_to_json(o) ORDER BY o.occurrence_number), '[]'::jsonb)
          FROM public.payment_plan_occurrences o
          WHERE o.payment_plan_id = p_plan_id
        )
      );
    END IF;
  END IF;

  INSERT INTO public.payment_plan_payments (
    payment_plan_id,
    occurrence_id,
    payment_kind,
    amount_cents,
    payment_date,
    notes,
    created_by,
    idempotency_key
  ) VALUES (
    p_plan_id,
    NULL,
    'early_payoff',
    p_amount_cents,
    p_payment_date,
    p_notes,
    p_actor_user_id,
    p_idempotency_key
  );

  UPDATE public.payment_plan_occurrences
  SET status = CASE
        WHEN status IN ('scheduled', 'overdue', 'partially_paid') THEN 'settled_early'
        ELSE status
      END,
      remaining_amount_cents = CASE
        WHEN status IN ('scheduled', 'overdue', 'partially_paid') THEN 0
        ELSE remaining_amount_cents
      END,
      settled_at = CASE
        WHEN status IN ('scheduled', 'overdue', 'partially_paid') THEN now()
        ELSE settled_at
      END,
      updated_at = now()
  WHERE payment_plan_id = p_plan_id
    AND deleted_at IS NULL;

  UPDATE public.payment_plans
  SET remaining_balance_cents = 0,
      plan_status = 'completed',
      early_payoff_at = now(),
      updated_at = now()
  WHERE id = p_plan_id;

  PERFORM public.recalculate_installment_plan_summary(p_plan_id);

  RETURN jsonb_build_object(
    'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = p_plan_id),
    'updatedOccurrences', (
      SELECT COALESCE(jsonb_agg(row_to_json(o) ORDER BY o.occurrence_number), '[]'::jsonb)
      FROM public.payment_plan_occurrences o
      WHERE o.payment_plan_id = p_plan_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_payment_plan(
  p_actor_user_id uuid,
  p_plan_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.payment_plans%ROWTYPE;
BEGIN
  SELECT * INTO v_plan
  FROM public.payment_plans
  WHERE id = p_plan_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  IF v_plan.user_id <> p_actor_user_id AND NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = v_plan.household_id
      AND hm.user_id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  UPDATE public.payment_plans
  SET plan_status = 'cancelled',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cancel_reason', p_reason),
      updated_at = now()
  WHERE id = p_plan_id;

  UPDATE public.payment_plan_occurrences
  SET status = CASE
        WHEN status IN ('scheduled', 'overdue', 'partially_paid') THEN 'cancelled'
        ELSE status
      END,
      updated_at = now()
  WHERE payment_plan_id = p_plan_id
    AND deleted_at IS NULL;

  RETURN jsonb_build_object(
    'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = p_plan_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_recurring_plan(
  p_actor_user_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid := gen_random_uuid();
  v_household_id uuid := NULLIF(p_payload->>'householdId', '')::uuid;
  v_contact_id uuid := NULLIF(p_payload->>'contactId', '')::uuid;
  v_category text := COALESCE(NULLIF(p_payload->>'category', ''), 'other');
  v_type text := COALESCE(NULLIF(p_payload->>'type', ''), 'expense');
  v_currency varchar(3) := UPPER(COALESCE(NULLIF(p_payload->>'currency', ''), 'USD'));
  v_privacy public.privacy_scope := COALESCE(NULLIF(p_payload->>'privacyScope', '')::public.privacy_scope, 'full'::public.privacy_scope);
  v_owner public.transaction_owner := COALESCE(NULLIF(p_payload->>'ownerType', '')::public.transaction_owner, 'me'::public.transaction_owner);
  v_payer_user_id uuid := NULLIF(p_payload->>'payerUserId', '')::uuid;
  v_recurrence_rule jsonb := COALESCE(p_payload->'recurrenceRule', '{}'::jsonb);
BEGIN
  IF jsonb_typeof(v_recurrence_rule) <> 'object' OR NOT (v_recurrence_rule ? 'frequency') OR NOT (v_recurrence_rule ? 'anchor_date') THEN
    RAISE EXCEPTION 'recurrenceRule must include frequency and anchor_date';
  END IF;

  IF v_household_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = v_household_id
        AND hm.user_id = p_actor_user_id
    ) THEN
      RAISE EXCEPTION 'household membership required';
    END IF;
  END IF;

  INSERT INTO public.payment_plans (
    id,
    user_id,
    household_id,
    contact_id,
    category,
    type,
    currency,
    payment_plan_type,
    plan_status,
    privacy_scope,
    owner_type,
    payer_user_id,
    recurrence_rule,
    custom_schedule_mode,
    allow_custom_amounts,
    allow_partial_payments,
    metadata
  ) VALUES (
    v_plan_id,
    p_actor_user_id,
    v_household_id,
    v_contact_id,
    v_category,
    v_type,
    v_currency,
    'recurring',
    'active',
    v_privacy,
    v_owner,
    v_payer_user_id,
    v_recurrence_rule,
    false,
    false,
    false,
    jsonb_build_object('idempotency_key', p_payload->>'idempotencyKey', 'amount_cents', (p_payload->>'amountCents'))
  );

  RETURN jsonb_build_object(
    'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = v_plan_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.skip_next_recurring_occurrence(
  p_actor_user_id uuid,
  p_plan_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.payment_plans%ROWTYPE;
  v_rule jsonb;
  v_excluded jsonb;
  v_skipped_date date;
BEGIN
  SELECT * INTO v_plan
  FROM public.payment_plans
  WHERE id = p_plan_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  IF v_plan.payment_plan_type <> 'recurring' THEN
    RAISE EXCEPTION 'plan must be recurring';
  END IF;

  IF v_plan.user_id <> p_actor_user_id AND NOT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = v_plan.household_id
      AND hm.user_id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  v_rule := COALESCE(v_plan.recurrence_rule, '{}'::jsonb);
  v_skipped_date := CURRENT_DATE;
  v_excluded := COALESCE(v_rule->'excluded_dates', '[]'::jsonb);
  v_excluded := v_excluded || to_jsonb(v_skipped_date::text);

  UPDATE public.payment_plans
  SET recurrence_rule = jsonb_set(v_rule, '{excluded_dates}', v_excluded, true),
      updated_at = now()
  WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'skippedDate', v_skipped_date,
    'plan', (SELECT row_to_json(pp) FROM public.payment_plans pp WHERE pp.id = p_plan_id)
  );
END;
$$;

-- Read RPCs ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_payment_plan_detail(
  p_plan_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan jsonb;
BEGIN
  SELECT to_jsonb(pp.*) INTO v_plan
  FROM public.payment_plans pp
  WHERE pp.id = p_plan_id
    AND pp.deleted_at IS NULL
    AND (
      pp.user_id = auth.uid()
      OR (
        pp.household_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.household_members hm
          WHERE hm.household_id = pp.household_id
            AND hm.user_id = auth.uid()
        )
      )
    );

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  RETURN jsonb_build_object(
    'plan', v_plan,
    'occurrences', (
      SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.occurrence_number), '[]'::jsonb)
      FROM public.payment_plan_occurrences o
      WHERE o.payment_plan_id = p_plan_id
        AND o.deleted_at IS NULL
    ),
    'payments', (
      SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.created_at DESC), '[]'::jsonb)
      FROM public.payment_plan_payments p
      WHERE p.payment_plan_id = p_plan_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_upcoming_occurrences(
  p_limit integer DEFAULT 50
)
RETURNS SETOF public.payment_plan_occurrences
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.payment_plan_occurrences o
  JOIN public.payment_plans p ON p.id = o.payment_plan_id
  WHERE o.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND p.plan_status = 'active'
    AND o.status IN ('scheduled', 'overdue', 'partially_paid')
    AND (
      p.user_id = auth.uid()
      OR (
        p.household_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.household_members hm
          WHERE hm.household_id = p.household_id
            AND hm.user_id = auth.uid()
        )
      )
    )
  ORDER BY o.scheduled_date ASC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
$$;

CREATE OR REPLACE VIEW public.scheduled_list_items AS
SELECT
  p.id,
  p.payment_plan_type,
  p.type,
  p.category AS title,
  p.category,
  p.currency,
  COALESCE(p.installment_amount_cents, (p.metadata->>'amount_cents')::bigint, p.total_payable_amount_cents, 0) AS display_amount_cents,
  (
    SELECT o.scheduled_date
    FROM public.payment_plan_occurrences o
    WHERE o.payment_plan_id = p.id
      AND o.deleted_at IS NULL
      AND o.status IN ('scheduled', 'overdue', 'partially_paid')
    ORDER BY o.scheduled_date ASC, o.occurrence_number ASC
    LIMIT 1
  ) AS next_due_date,
  p.plan_status::text AS status,
  CASE
    WHEN p.payment_plan_type = 'installment' THEN
      CONCAT(COALESCE(p.paid_installments_count, 0), '/', COALESCE(p.installment_count, 0), ' paid')
    ELSE NULL
  END AS progress_text,
  p.remaining_balance_cents,
  p.household_id
FROM public.payment_plans p
WHERE p.deleted_at IS NULL;

GRANT SELECT ON public.scheduled_list_items TO authenticated;

-- Helpful grants for RPCs ----------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_installment_plan(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.skip_next_installment_occurrence(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_plan_occurrence_paid(uuid, uuid, uuid, bigint, date, public.payment_plan_payment_kind_enum, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.early_payoff_installment_plan(uuid, uuid, bigint, date, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_payment_plan(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_recurring_plan(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.skip_next_recurring_occurrence(uuid, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_payment_plan_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_upcoming_occurrences(integer) TO authenticated;

COMMENT ON TABLE public.payment_plans IS 'Normalized payment plans for recurring and installment plans';
COMMENT ON TABLE public.payment_plan_occurrences IS 'Explicit due occurrences for payment plans (installments materialized upfront)';
COMMENT ON TABLE public.payment_plan_payments IS 'Payment audit rows for payment plan settlements';
