-- Fix upsert_bank_connection_with_household RPC function
-- The original migration used incorrect column names for the households table:
-- - `created_by` should be `owner_id`
-- - `image_url` should be `cover_image_url`
-- - Missing required `currency` column
--
-- This migration replaces the function with the corrected version.

CREATE OR REPLACE FUNCTION public.upsert_bank_connection_with_household(
  p_user_id UUID,
  p_provider TEXT,
  p_provider_item_id TEXT,
  p_access_token_encrypted TEXT,
  p_refresh_token_encrypted TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_institution_name TEXT DEFAULT 'Bank Account',
  p_institution_logo TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  connection_id UUID,
  household_id UUID,
  is_new_connection BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_connection_id UUID;
  v_household_id UUID;
  v_is_new BOOLEAN := FALSE;
  v_existing_household_id UUID;
  v_lock_key BIGINT;
  v_user_currency TEXT;
BEGIN
  -- Generate a deterministic lock key from the unique constraint columns
  -- Using hashtext to convert the composite key to a bigint for pg_advisory_xact_lock
  v_lock_key := hashtext(p_user_id::text || '|' || p_provider || '|' || p_provider_item_id);
  
  -- Acquire transaction-scoped advisory lock to serialize concurrent first-link attempts
  -- This lock is automatically released when the transaction commits/rollbacks
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Now safely check for existing connection (we hold the lock, so no race)
  SELECT bc.id, bc.household_id INTO v_connection_id, v_existing_household_id
  FROM public.bank_connections bc
  WHERE bc.user_id = p_user_id
    AND bc.provider = p_provider
    AND bc.provider_item_id = p_provider_item_id
  FOR UPDATE;

  IF v_connection_id IS NOT NULL THEN
    -- Connection exists - this is a reconnect
    v_household_id := v_existing_household_id;
    
    -- Update the connection with new tokens
    -- MERGE metadata: existing keys preserved, new keys added/overwritten
    UPDATE public.bank_connections
    SET
      access_token_encrypted = p_access_token_encrypted,
      plaid_access_token_encrypted = p_access_token_encrypted,
      refresh_token_encrypted = COALESCE(p_refresh_token_encrypted, refresh_token_encrypted),
      expires_at = COALESCE(p_expires_at, expires_at),
      status = 'active',
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb)
    WHERE id = v_connection_id;
    
  ELSE
    -- New connection - create household first, then connection
    v_is_new := TRUE;
    
    -- Get user's preferred currency (from user_contacts or default to USD)
    SELECT COALESCE(
      (
        SELECT UPPER(uc.preferred_currency)
        FROM public.user_contacts uc
        WHERE uc.user_id = p_user_id
        ORDER BY uc.updated_at DESC NULLS LAST, uc.created_at DESC NULLS LAST
        LIMIT 1
      ),
      'USD'
    ) INTO v_user_currency;
    
    -- Create the household with correct column names:
    -- - owner_id (not created_by)
    -- - cover_image_url (not image_url)
    -- - currency is required
    INSERT INTO public.households (name, owner_id, is_portfolio, cover_image_url, currency)
    VALUES (p_institution_name, p_user_id, TRUE, p_institution_logo, v_user_currency)
    RETURNING id INTO v_household_id;
    
    -- Add user as owner
    INSERT INTO public.household_members (household_id, user_id, role, joined_at)
    SELECT v_household_id, p_user_id, 'owner', NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = v_household_id
        AND hm.user_id = p_user_id
    );
    
    -- Create the connection
    -- The advisory lock ensures this INSERT won't race with another transaction
    INSERT INTO public.bank_connections (
      user_id,
      provider,
      provider_item_id,
      plaid_item_id,
      access_token_encrypted,
      plaid_access_token_encrypted,
      refresh_token_encrypted,
      expires_at,
      status,
      country_code,
      idempotency_key,
      household_id,
      metadata
    ) VALUES (
      p_user_id,
      p_provider,
      p_provider_item_id,
      p_provider_item_id,
      p_access_token_encrypted,
      p_access_token_encrypted,
      p_refresh_token_encrypted,
      p_expires_at,
      'active',
      p_country_code,
      p_idempotency_key,
      v_household_id,
      p_metadata
    )
    RETURNING id INTO v_connection_id;
  END IF;
  
  RETURN QUERY SELECT v_connection_id, v_household_id, v_is_new;

EXCEPTION
  WHEN unique_violation THEN
    -- Unique violation can occur from:
    -- 1. (user_id, provider, provider_item_id) - primary connection key (unlikely with advisory lock)
    -- 2. (user_id, idempotency_key) - concurrent retries with same idempotency key
    --
    -- In either case, clean up any orphan household we created, then look up the
    -- winning connection and return it (making the API idempotent for the client).
    IF v_household_id IS NOT NULL AND v_is_new THEN
      DELETE FROM public.household_members hm WHERE hm.household_id = v_household_id;
      DELETE FROM public.households WHERE id = v_household_id;
    END IF;
    
    -- Look up the winning connection (the one that was inserted by the other transaction)
    SELECT bc.id, bc.household_id INTO v_connection_id, v_household_id
    FROM public.bank_connections bc
    WHERE bc.user_id = p_user_id
      AND bc.provider = p_provider
      AND bc.provider_item_id = p_provider_item_id;
    
    IF v_connection_id IS NOT NULL THEN
      -- Return the winning connection as if we created it (idempotent behavior)
      RETURN QUERY SELECT v_connection_id, v_household_id, FALSE;
    ELSE
      -- Shouldn't happen, but re-raise if we can't find the winning connection
      RAISE;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.upsert_bank_connection_with_household IS 
'Atomically creates or updates a bank connection with its associated household. 
Uses advisory locks to prevent race conditions that could create orphan households 
on concurrent first-link attempts. Fixed to use correct column names (owner_id, 
cover_image_url) and include required currency field.';
