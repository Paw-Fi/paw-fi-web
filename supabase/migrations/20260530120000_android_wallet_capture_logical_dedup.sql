CREATE TABLE IF NOT EXISTS public.wallet_capture_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  scope_key TEXT NOT NULL,
  household_id UUID,
  is_portfolio BOOLEAN NOT NULL DEFAULT FALSE,
  account_id UUID,
  capture_source TEXT NOT NULL,
  source_package TEXT,
  source_app_label TEXT,
  exact_event_key TEXT NOT NULL,
  logical_fingerprint TEXT NOT NULL,
  merchant_key TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  notification_posted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'saved', 'duplicate', 'failed')),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  duplicate_of_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  result JSONB,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_capture_events_exact_active
  ON public.wallet_capture_events(user_id, exact_event_key)
  WHERE status IN ('processing', 'saved', 'duplicate');

CREATE INDEX IF NOT EXISTS idx_wallet_capture_events_logical_lookup
  ON public.wallet_capture_events(
    user_id,
    scope_key,
    transaction_type,
    amount_cents,
    currency,
    transaction_date,
    notification_posted_at
  )
  WHERE status = 'saved';

CREATE INDEX IF NOT EXISTS idx_wallet_capture_events_expense_id
  ON public.wallet_capture_events(expense_id)
  WHERE expense_id IS NOT NULL;

ALTER TABLE public.wallet_capture_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.wallet_capture_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_android_wallet_source(
  p_package TEXT,
  p_app_label TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_package, '')) IN (
      'com.google.android.apps.walletnfcrel',
      'com.google.android.apps.wallet',
      'com.google.android.apps.nbu.paisa.user',
      'com.samsung.android.spay',
      'com.samsung.android.samsungpay.gear',
      'com.garmin.android.apps.gcs',
      'com.fitbit.fitbitmobile'
    )
    OR (
      lower(coalesce(p_package, '')) LIKE 'com.google.android.apps.%'
      AND lower(coalesce(p_app_label, '')) ~ '\m(?:google wallet|google pay|wallet|pay)\M'
    )
    OR lower(coalesce(p_app_label, '')) ~ '\m(?:google wallet|google pay|samsung wallet|samsung pay|garmin pay|fitbit pay)\M';
$$;

CREATE OR REPLACE FUNCTION public.claim_android_wallet_capture_event(
  p_user_id UUID,
  p_scope_key TEXT,
  p_household_id UUID,
  p_is_portfolio BOOLEAN,
  p_account_id UUID,
  p_capture_source TEXT,
  p_source_package TEXT,
  p_source_app_label TEXT,
  p_exact_event_key TEXT,
  p_logical_fingerprint TEXT,
  p_merchant_key TEXT,
  p_transaction_type TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_transaction_date DATE,
  p_notification_posted_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_existing public.wallet_capture_events%ROWTYPE;
  v_duplicate RECORD;
  v_claim_id UUID;
  v_lock_key TEXT;
  v_source_package TEXT := nullif(lower(trim(coalesce(p_source_package, ''))), '');
  v_source_app_label TEXT := nullif(trim(coalesce(p_source_app_label, '')), '');
  v_merchant_key TEXT := nullif(trim(coalesce(p_merchant_key, '')), '');
BEGIN
  IF p_capture_source <> 'android_notification_listener' THEN
    RAISE EXCEPTION 'claim_android_wallet_capture_event only supports android_notification_listener';
  END IF;

  IF p_user_id IS NULL OR nullif(trim(coalesce(p_scope_key, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Missing wallet capture scope';
  END IF;

  IF nullif(trim(coalesce(p_exact_event_key, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Missing wallet capture exact event key';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Invalid wallet capture amount';
  END IF;

  v_lock_key := concat_ws(
    '|',
    p_user_id::TEXT,
    p_scope_key,
    coalesce(p_account_id::TEXT, 'no-account'),
    p_transaction_type,
    p_amount_cents::TEXT,
    upper(p_currency),
    p_transaction_date::TEXT
  );

  PERFORM pg_advisory_xact_lock(hashtext(v_lock_key)::BIGINT);

  SELECT *
  INTO v_existing
  FROM public.wallet_capture_events
  WHERE user_id = p_user_id
    AND exact_event_key = p_exact_event_key
    AND status IN ('processing', 'saved', 'duplicate')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.status = 'processing' AND v_existing.created_at < v_now - INTERVAL '10 minutes' THEN
      UPDATE public.wallet_capture_events
      SET status = 'failed',
          error_text = 'stale_processing_claim_released',
          updated_at = v_now
      WHERE id = v_existing.id;
    ELSIF v_existing.status = 'processing' THEN
      RETURN jsonb_build_object('status', 'processing', 'claimId', v_existing.id);
    ELSE
      SELECT e.id, e.category, e.amount_cents, e.currency
      INTO v_duplicate
      FROM public.expenses e
      WHERE e.id = coalesce(v_existing.expense_id, v_existing.duplicate_of_expense_id)
      LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'status', 'duplicate',
          'reason', 'exact_event_key',
          'expenseId', v_duplicate.id,
          'category', v_duplicate.category,
          'amountCents', v_duplicate.amount_cents,
          'currency', v_duplicate.currency
        );
      END IF;

      UPDATE public.wallet_capture_events
      SET status = 'failed',
          error_text = 'exact_event_missing_expense',
          updated_at = v_now
      WHERE id = v_existing.id;
    END IF;
  END IF;

  SELECT w.id,
         w.status,
         e.id AS expense_id,
         e.category,
         e.amount_cents,
         e.currency
  INTO v_duplicate
  FROM public.wallet_capture_events w
  JOIN public.expenses e
    ON e.id = w.expense_id
    OR e.wallet_capture_idempotency_key = w.exact_event_key
  WHERE (
      w.status = 'saved'
      OR (w.status = 'processing' AND w.created_at < v_now - INTERVAL '10 minutes')
    )
    AND w.user_id = p_user_id
    AND w.scope_key = p_scope_key
    AND w.account_id IS NOT DISTINCT FROM p_account_id
    AND w.transaction_type = p_transaction_type
    AND w.amount_cents = p_amount_cents
    AND w.currency = upper(p_currency)
    AND w.source_package IS DISTINCT FROM v_source_package
    AND w.notification_posted_at BETWEEN p_notification_posted_at - INTERVAL '5 minutes'
                                     AND p_notification_posted_at + INTERVAL '5 minutes'
    AND (
      public.is_android_wallet_source(w.source_package, w.source_app_label) <> public.is_android_wallet_source(v_source_package, v_source_app_label)
      AND (
        public.is_android_wallet_source(w.source_package, w.source_app_label)
        OR public.is_android_wallet_source(v_source_package, v_source_app_label)
      )
      AND abs(extract(epoch FROM (w.notification_posted_at - p_notification_posted_at))) <= 120
      AND abs(w.transaction_date - p_transaction_date) <= 1
    )
  ORDER BY abs(extract(epoch FROM (w.notification_posted_at - p_notification_posted_at))) ASC,
           w.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    IF v_duplicate.status = 'processing' THEN
      UPDATE public.wallet_capture_events
      SET status = 'saved',
          expense_id = v_duplicate.expense_id,
          updated_at = v_now
      WHERE id = v_duplicate.id;
    END IF;

    INSERT INTO public.wallet_capture_events (
      user_id,
      scope_key,
      household_id,
      is_portfolio,
      account_id,
      capture_source,
      source_package,
      source_app_label,
      exact_event_key,
      logical_fingerprint,
      merchant_key,
      transaction_type,
      amount_cents,
      currency,
      transaction_date,
      notification_posted_at,
      status,
      duplicate_of_expense_id,
      result,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_scope_key,
      p_household_id,
      p_is_portfolio,
      p_account_id,
      p_capture_source,
      v_source_package,
      v_source_app_label,
      p_exact_event_key,
      p_logical_fingerprint,
      v_merchant_key,
      p_transaction_type,
      p_amount_cents,
      upper(p_currency),
      p_transaction_date,
      p_notification_posted_at,
      'duplicate',
      v_duplicate.expense_id,
      jsonb_build_object('reason', 'android_logical_duplicate'),
      v_now,
      v_now
    )
    RETURNING id INTO v_claim_id;

    RETURN jsonb_build_object(
      'status', 'duplicate',
      'reason', 'android_logical_duplicate',
      'claimId', v_claim_id,
      'expenseId', v_duplicate.expense_id,
      'category', v_duplicate.category,
      'amountCents', v_duplicate.amount_cents,
      'currency', v_duplicate.currency
    );
  END IF;

  SELECT w.id
  INTO v_claim_id
  FROM public.wallet_capture_events w
  WHERE w.status = 'processing'
    AND w.created_at >= v_now - INTERVAL '10 minutes'
    AND w.user_id = p_user_id
    AND w.scope_key = p_scope_key
    AND w.account_id IS NOT DISTINCT FROM p_account_id
    AND w.transaction_type = p_transaction_type
    AND w.amount_cents = p_amount_cents
    AND w.currency = upper(p_currency)
    AND w.source_package IS DISTINCT FROM v_source_package
    AND w.notification_posted_at BETWEEN p_notification_posted_at - INTERVAL '5 minutes'
                                     AND p_notification_posted_at + INTERVAL '5 minutes'
    AND (
      public.is_android_wallet_source(w.source_package, w.source_app_label) <> public.is_android_wallet_source(v_source_package, v_source_app_label)
      AND (
        public.is_android_wallet_source(w.source_package, w.source_app_label)
        OR public.is_android_wallet_source(v_source_package, v_source_app_label)
      )
      AND abs(extract(epoch FROM (w.notification_posted_at - p_notification_posted_at))) <= 120
      AND abs(w.transaction_date - p_transaction_date) <= 1
    )
  ORDER BY abs(extract(epoch FROM (w.notification_posted_at - p_notification_posted_at))) ASC,
           w.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('status', 'processing', 'claimId', v_claim_id);
  END IF;

  INSERT INTO public.wallet_capture_events (
    user_id,
    scope_key,
    household_id,
    is_portfolio,
    account_id,
    capture_source,
    source_package,
    source_app_label,
    exact_event_key,
    logical_fingerprint,
    merchant_key,
    transaction_type,
    amount_cents,
    currency,
    transaction_date,
    notification_posted_at,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_scope_key,
    p_household_id,
    p_is_portfolio,
    p_account_id,
    p_capture_source,
    v_source_package,
    v_source_app_label,
    p_exact_event_key,
    p_logical_fingerprint,
    v_merchant_key,
    p_transaction_type,
    p_amount_cents,
    upper(p_currency),
    p_transaction_date,
    p_notification_posted_at,
    'processing',
    v_now,
    v_now
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object('status', 'claimed', 'claimId', v_claim_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_android_wallet_capture_event(
  p_claim_id UUID,
  p_expense_id UUID,
  p_result JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallet_capture_events
  SET status = 'saved',
      expense_id = p_expense_id,
      result = p_result,
      error_text = NULL,
      updated_at = now()
  WHERE id = p_claim_id
    AND status = 'processing';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_android_wallet_capture_event(
  p_claim_id UUID,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallet_capture_events
  SET status = 'failed',
      error_text = nullif(trim(coalesce(p_error, '')), ''),
      updated_at = now()
  WHERE id = p_claim_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION public.is_android_wallet_source(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_android_wallet_capture_event(UUID, TEXT, UUID, BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_android_wallet_capture_event(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_android_wallet_capture_event(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_android_wallet_capture_event(UUID, TEXT, UUID, BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_android_wallet_capture_event(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_android_wallet_capture_event(UUID, TEXT) TO service_role;
