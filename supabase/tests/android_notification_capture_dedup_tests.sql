BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(13);

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
  v_ai_context_reclaim JSONB;
  v_ai_retry_two JSONB;
  v_ai_retry_three JSONB;
  v_ai_exhausted JSONB;
  v_stale_owner_status TEXT;
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

  v_ai_claim := public.claim_notification_capture_classification_v2(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    100,
    'android_notification_classifier_v5',
    repeat('a', 64),
    3
  );
  UPDATE public.notification_capture_classifications
  SET status = 'failed',
      result = jsonb_build_object(
        'success', FALSE,
        'error', 'Classification failed',
        'diagnosticCode', 'INVALID_VERIFICATION_RESPONSE',
        'retryable', FALSE,
        'pipelineVersion', 'android_notification_classifier_v5'
      ),
      updated_at = NOW()
  WHERE id = (v_ai_claim ->> 'eventId')::UUID;
  v_ai_retry := public.claim_notification_capture_classification_v2(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    100,
    'android_notification_classifier_v5',
    repeat('a', 64),
    3
  );
  v_ai_context_reclaim := public.claim_notification_capture_classification_v2(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    100,
    'android_notification_classifier_v5',
    repeat('b', 64),
    3
  );

  UPDATE public.notification_capture_classifications
  SET status = 'saved'
  WHERE id = (v_ai_context_reclaim ->> 'eventId')::UUID
    AND processing_token = gen_random_uuid()
    AND status = 'processing';
  SELECT status INTO v_stale_owner_status
  FROM public.notification_capture_classifications
  WHERE id = (v_ai_context_reclaim ->> 'eventId')::UUID;

  UPDATE public.notification_capture_classifications
  SET status = 'failed',
      result = jsonb_build_object(
        'success', FALSE,
        'error', 'Classification failed',
        'diagnosticCode', 'NOTIFICATION_CLASSIFICATION_TIMEOUT',
        'retryable', TRUE,
        'pipelineVersion', 'android_notification_classifier_v5'
      ),
      updated_at = NOW()
  WHERE id = (v_ai_context_reclaim ->> 'eventId')::UUID;
  v_ai_retry_two := public.claim_notification_capture_classification_v2(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    100,
    'android_notification_classifier_v5',
    repeat('b', 64),
    3
  );

  UPDATE public.notification_capture_classifications
  SET status = 'failed',
      result = jsonb_build_object(
        'success', FALSE,
        'error', 'Classification failed',
        'diagnosticCode', 'NOTIFICATION_CLASSIFICATION_TIMEOUT',
        'retryable', TRUE,
        'pipelineVersion', 'android_notification_classifier_v5'
      ),
      updated_at = NOW()
  WHERE id = (v_ai_retry_two ->> 'eventId')::UUID;
  v_ai_retry_three := public.claim_notification_capture_classification_v2(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    100,
    'android_notification_classifier_v5',
    repeat('b', 64),
    3
  );

  UPDATE public.notification_capture_classifications
  SET status = 'failed',
      result = jsonb_build_object(
        'success', FALSE,
        'error', 'Classification failed',
        'diagnosticCode', 'NOTIFICATION_CLASSIFICATION_TIMEOUT',
        'retryable', TRUE,
        'pipelineVersion', 'android_notification_classifier_v5'
      ),
      updated_at = NOW()
  WHERE id = (v_ai_retry_three ->> 'eventId')::UUID;
  v_ai_exhausted := public.claim_notification_capture_classification_v2(
    v_user_id,
    'classification-event-key',
    'com.bank.app',
    'Bank',
    100,
    'android_notification_classifier_v5',
    repeat('b', 64),
    3
  );

  PERFORM set_config('test.android_bank_claim', v_bank_claim::TEXT, FALSE);
  PERFORM set_config('test.android_sms_processing', v_sms_processing::TEXT, FALSE);
  PERFORM set_config('test.android_sms_duplicate', v_sms_duplicate::TEXT, FALSE);
  PERFORM set_config('test.android_user_id', v_user_id::TEXT, FALSE);
  PERFORM set_config('test.android_ai_claim', v_ai_claim::TEXT, FALSE);
  PERFORM set_config('test.android_ai_retry', v_ai_retry::TEXT, FALSE);
  PERFORM set_config('test.android_ai_context_reclaim', v_ai_context_reclaim::TEXT, FALSE);
  PERFORM set_config('test.android_ai_retry_two', v_ai_retry_two::TEXT, FALSE);
  PERFORM set_config('test.android_ai_retry_three', v_ai_retry_three::TEXT, FALSE);
  PERFORM set_config('test.android_ai_exhausted', v_ai_exhausted::TEXT, FALSE);
  PERFORM set_config('test.android_stale_owner_status', v_stale_owner_status, FALSE);
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
  'cached',
  'non-retryable failed AI classification returns its cached terminal result'
);

SELECT is(
  current_setting('test.android_ai_context_reclaim')::JSONB ->> 'status',
  'claimed',
  'a changed classification context bypasses an old terminal cache'
);

SELECT is(
  current_setting('test.android_stale_owner_status'),
  'processing',
  'a stale processing token cannot finalize the active claim'
);

SELECT is(
  current_setting('test.android_ai_retry_two')::JSONB ->> 'status',
  'claimed',
  'the second same-context transient attempt is claimed'
);

SELECT is(
  current_setting('test.android_ai_retry_three')::JSONB ->> 'status',
  'claimed',
  'the third same-context transient attempt is claimed'
);

SELECT is(
  current_setting('test.android_ai_exhausted')::JSONB ->> 'status',
  'cached',
  'a fourth same-context transient attempt is terminally cached'
);

SELECT is(
  current_setting('test.android_ai_exhausted')::JSONB -> 'result' ->> 'diagnosticCode',
  'CLASSIFICATION_RETRY_EXHAUSTED',
  'retry exhaustion records a stable terminal diagnostic'
);

SELECT is(
  (
    SELECT COUNT(*)::INTEGER
    FROM public.notification_capture_ai_attempts
    WHERE user_id = current_setting('test.android_user_id')::UUID
  ),
  4,
  'terminal caching and retry exhaustion bound AI attempts per context'
);

SELECT * FROM finish();
ROLLBACK;
