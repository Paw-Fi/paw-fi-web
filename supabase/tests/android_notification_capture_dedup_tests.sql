BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(7);

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_account_id UUID;
  v_bank_claim JSONB;
  v_sms_processing JSONB;
  v_sms_duplicate JSONB;
  v_expense_id UUID;
  v_ai_claim JSONB;
  v_ai_retry JSONB;
BEGIN
  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'authenticated',
    'authenticated',
    'android-notification-dedup@example.com',
    '',
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW()
  );

  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE user_id = v_user_id
    AND household_id IS NULL
    AND currency = 'USD'
    AND is_system = TRUE
  LIMIT 1;

  v_bank_claim := public.claim_android_wallet_capture_event_v2(
    v_user_id,
    'personal',
    NULL,
    FALSE,
    v_account_id,
    'android_notification_listener',
    'com.bank.app',
    'Bank',
    'bank-event-key',
    'same-logical-fingerprint',
    'cafe bloom',
    'expense',
    1299,
    'USD',
    CURRENT_DATE,
    NOW(),
    'USD',
    'explicit_code',
    FALSE
  );

  v_sms_processing := public.claim_android_wallet_capture_event_v2(
    v_user_id,
    'personal',
    NULL,
    FALSE,
    v_account_id,
    'android_notification_listener',
    'com.google.android.apps.messaging',
    'Messages',
    'sms-event-key',
    'same-logical-fingerprint',
    'cafe bloom',
    'expense',
    1299,
    'USD',
    CURRENT_DATE,
    NOW(),
    'USD',
    'explicit_code',
    FALSE
  );

  INSERT INTO public.expenses (
    user_id,
    account_id,
    type,
    amount_cents,
    currency,
    category,
    date,
    wallet_capture_idempotency_key
  ) VALUES (
    v_user_id,
    v_account_id,
    'expense',
    1299,
    'USD',
    'other',
    CURRENT_DATE,
    'bank-event-key'
  ) RETURNING id INTO v_expense_id;

  PERFORM public.finalize_android_wallet_capture_event(
    (v_bank_claim ->> 'claimId')::UUID,
    v_expense_id,
    jsonb_build_object('success', TRUE)
  );

  v_sms_duplicate := public.claim_android_wallet_capture_event_v2(
    v_user_id,
    'personal',
    NULL,
    FALSE,
    v_account_id,
    'android_notification_listener',
    'com.google.android.apps.messaging',
    'Messages',
    'sms-event-key',
    'same-logical-fingerprint',
    'cafe bloom',
    'expense',
    1299,
    'USD',
    CURRENT_DATE,
    NOW(),
    'USD',
    'explicit_code',
    FALSE
  );

  v_ai_claim := public.claim_notification_capture_classification(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    1
  );
  UPDATE public.notification_capture_classifications
  SET status = 'failed', updated_at = NOW()
  WHERE id = (v_ai_claim ->> 'eventId')::UUID;
  v_ai_retry := public.claim_notification_capture_classification(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    1
  );

  PERFORM set_config('test.android_bank_claim', v_bank_claim::TEXT, FALSE);
  PERFORM set_config('test.android_sms_processing', v_sms_processing::TEXT, FALSE);
  PERFORM set_config('test.android_sms_duplicate', v_sms_duplicate::TEXT, FALSE);
  PERFORM set_config('test.android_user_id', v_user_id::TEXT, FALSE);
  PERFORM set_config('test.android_ai_claim', v_ai_claim::TEXT, FALSE);
  PERFORM set_config('test.android_ai_retry', v_ai_retry::TEXT, FALSE);
END;
$$;

SELECT is(
  current_setting('test.android_bank_claim')::JSONB ->> 'status',
  'claimed',
  'bank notification wins the first database claim'
);

SELECT is(
  current_setting('test.android_sms_processing')::JSONB ->> 'status',
  'processing',
  'simultaneous SMS notification cannot claim the same transaction'
);

SELECT is(
  current_setting('test.android_sms_duplicate')::JSONB ->> 'status',
  'duplicate',
  'SMS retry resolves to the bank notification expense'
);

SELECT is(
  (
    SELECT COUNT(*)::INTEGER
    FROM public.expenses
    WHERE user_id = current_setting('test.android_user_id')::UUID
      AND amount_cents = 1299
      AND currency = 'USD'
  ),
  1,
  'bank and SMS notifications create exactly one transaction'
);

SELECT is(
  current_setting('test.android_ai_claim')::JSONB ->> 'status',
  'claimed',
  'first AI attempt is claimed'
);

SELECT is(
  current_setting('test.android_ai_retry')::JSONB ->> 'status',
  'rate_limited',
  'failed-event retry still counts against the strict AI cap'
);

SELECT is(
  (
    SELECT COUNT(*)::INTEGER
    FROM public.notification_capture_ai_attempts
    WHERE user_id = current_setting('test.android_user_id')::UUID
  ),
  1,
  'rate-limited retry does not create another AI attempt'
);

SELECT * FROM finish();
ROLLBACK;
