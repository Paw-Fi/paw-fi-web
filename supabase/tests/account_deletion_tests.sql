BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(11);

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

END;
$$;

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
  ),
  'new auth users do not get an automatic spending wallet'
);

INSERT INTO public.expenses (
  user_id,
  date,
  amount_cents,
  currency,
  category,
  account_id
)
VALUES (
  current_setting('test.account_deletion_user_id')::UUID,
  CURRENT_DATE,
  500,
  'USD',
  'other',
  NULL
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
      AND amount_cents = 500
      AND account_id IS NULL
  ),
  'wallet-less expenses remain unbound without creating a spending wallet'
);

DO $$
DECLARE
  v_household_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.households (id, name, owner_id, currency)
  VALUES (
    v_household_id,
    'No default wallet household',
    current_setting('test.account_deletion_user_id')::UUID,
    'USD'
  );
  PERFORM set_config('test.account_deletion_household_id', v_household_id::text, false);
END;
$$;

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE household_id = current_setting('test.account_deletion_household_id')::UUID
  ),
  'new households do not get an automatic spending wallet'
);

DO $$
DECLARE
  v_account_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.accounts (
    id,
    user_id,
    name,
    icon,
    color,
    currency,
    opening_balance_cents,
    is_default,
    is_system,
    is_archived
  )
  VALUES (
    v_account_id,
    current_setting('test.account_deletion_user_id')::UUID,
    'Spending',
    'wallet',
    '#6B7280',
    'USD',
    0,
    TRUE,
    TRUE,
    FALSE
  );

  PERFORM set_config('test.account_deletion_wallet_id', v_account_id::text, false);

  INSERT INTO public.expenses (
    user_id,
    date,
    amount_cents,
    currency,
    category,
    account_id
  )
  VALUES (
    current_setting('test.account_deletion_user_id')::UUID,
    CURRENT_DATE,
    1234,
    'USD',
    'other',
    v_account_id
  );
END;
$$;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
      AND account_id IS NOT NULL
  ),
  'test user has an expense attached to the legacy spending wallet'
);

UPDATE public.accounts
SET
  is_archived = TRUE,
  updated_at = NOW()
WHERE id = current_setting('test.account_deletion_wallet_id')::UUID;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.accounts
    WHERE id = current_setting('test.account_deletion_wallet_id')::UUID
      AND is_system = TRUE
      AND is_archived = TRUE
      AND is_default = FALSE
  ),
  'system spending wallets can be archived without changing their identity'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.expenses
    WHERE user_id = current_setting('test.account_deletion_user_id')::UUID
      AND amount_cents = 1234
      AND account_id = current_setting('test.account_deletion_wallet_id')::UUID
      AND deleted_at IS NULL
  ),
  'archiving a system wallet preserves its active transaction bindings'
);

SELECT is(
  (public.delete_wallet_hard(
    current_setting('test.account_deletion_wallet_id')::UUID,
    current_setting('test.account_deletion_user_id')::UUID
  ) ->> 'success')::BOOLEAN,
  FALSE,
  'system wallets remain protected from hard deletion'
);

SELECT throws_ok(
  format(
    'DELETE FROM public.accounts WHERE id = %L',
    current_setting('test.account_deletion_wallet_id')
  ),
  'System account cannot be deleted',
  'direct deletion of system wallets remains blocked'
);

SELECT is(
  (
    SELECT is_archived
    FROM public.accounts
    WHERE id = current_setting('test.account_deletion_wallet_id')::UUID
  ),
  TRUE,
  'failed deletion leaves the system wallet archived'
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
  'delete_user_account deletes users without a spending wallet'
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
