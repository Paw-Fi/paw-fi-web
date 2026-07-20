CREATE OR REPLACE FUNCTION public.get_plaid_duplicate_inventory_v1()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH active_accounts AS (
    SELECT
      account.id AS bank_account_id,
      account.user_id,
      account.bank_connection_id,
      connection.household_id,
      NULLIF(TRIM(connection.metadata ->> 'institution_id'), '') AS institution_id,
      CASE
        WHEN account.provider_persistent_account_id IS NOT NULL
          THEN 'persistent:' || account.provider_persistent_account_id
        ELSE 'signature:' ||
          COALESCE(NULLIF(TRIM(connection.metadata ->> 'institution_id'), ''), '') || ':' ||
          LOWER(TRIM(COALESCE(account.name, ''))) || ':' ||
          LOWER(TRIM(COALESCE(account.mask, ''))) || ':' ||
          LOWER(TRIM(COALESCE(account.type, ''))) || ':' ||
          LOWER(TRIM(COALESCE(account.subtype, '')))
      END AS identity_key,
      account.provider_persistent_account_id,
      account.provider_account_id,
      account.name,
      account.mask,
      account.type,
      account.subtype
    FROM public.bank_accounts account
    JOIN public.bank_connections connection
      ON connection.id = account.bank_connection_id
    WHERE account.provider = 'plaid'
      AND connection.provider = 'plaid'
      AND connection.removed_at IS NULL
      AND connection.status IS DISTINCT FROM 'disabled'
      AND (
        account.provider_persistent_account_id IS NOT NULL
        OR NULLIF(TRIM(COALESCE(account.name, '')), '') IS NOT NULL
        OR NULLIF(TRIM(COALESCE(account.mask, '')), '') IS NOT NULL
      )
  ), duplicate_keys AS (
    SELECT user_id, household_id, identity_key
    FROM active_accounts
    GROUP BY user_id, household_id, identity_key
    HAVING COUNT(DISTINCT bank_connection_id) > 1
  )
  SELECT COALESCE(JSONB_AGG(JSONB_BUILD_OBJECT(
    'user_id', duplicate_key.user_id,
    'household_id', duplicate_key.household_id,
    'identity_key', duplicate_key.identity_key,
    'accounts', (
      SELECT JSONB_AGG(TO_JSONB(account_row) ORDER BY account_row.bank_connection_id, account_row.bank_account_id)
      FROM active_accounts account_row
      WHERE account_row.user_id = duplicate_key.user_id
        AND account_row.household_id IS NOT DISTINCT FROM duplicate_key.household_id
        AND account_row.identity_key = duplicate_key.identity_key
    )
  ) ORDER BY duplicate_key.user_id, duplicate_key.identity_key), '[]'::JSONB)
  FROM duplicate_keys duplicate_key;
$$;

REVOKE ALL ON FUNCTION public.get_plaid_duplicate_inventory_v1()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_plaid_duplicate_inventory_v1()
  TO service_role;
