BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(6);

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  PERFORM set_config('test.account_deletion_user_id', v_user_id::text, false);

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
  )
  VALUES (
    v_user_id,
    'authenticated',
    'authenticated',
    'account-deletion-test@example.com',
    '',
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW()
  );

  INSERT INTO public.expenses (
    user_id,
    date,
    amount_cents,
    currency,
    category,
    account_id
  )
  SELECT
    v_user_id,
    CURRENT_DATE,
    1234,
    'USD',
    'other',
    a.id
  FROM public.accounts a
  WHERE a.user_id = v_user_id
    AND a.household_id IS NULL
    AND a.is_system = TRUE
  LIMIT 1;
END;
$$;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
      AND household_id IS NULL
      AND is_system = TRUE
  ),
  'new auth users get a personal system spending account'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
      AND account_id IS NOT NULL
  ),
  'test user has an expense attached to the personal system account'
);

SELECT throws_ok(
  format(
    'DELETE FROM public.accounts WHERE user_id = %L AND household_id IS NULL AND is_system = TRUE',
    current_setting('test.account_deletion_user_id')
  ),
  'System account cannot be deleted',
  'direct deletion of personal system accounts remains blocked'
);

DO $$
BEGIN
  PERFORM set_config(
    'request.jwt.claim.sub',
    current_setting('test.account_deletion_user_id'),
    true
  );
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

SELECT is(
  (public.delete_user_account() ->> 'success')::BOOLEAN,
  TRUE,
  'delete_user_account deletes users that have a personal system account'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
  ),
  'delete_user_account removes the personal system account through auth cascade'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
  ),
  'delete_user_account removes user expenses before account cleanup'
);

SELECT * FROM finish();
ROLLBACK;
