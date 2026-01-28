-- Backfill missing household_id for Tink bank connections

DO $$
DECLARE
  rec RECORD;
  v_household_id UUID;
  v_currency TEXT;
  v_name TEXT;
  v_logo TEXT;
BEGIN
  FOR rec IN
    SELECT bc.id AS connection_id,
      bc.user_id,
      COALESCE(bc.metadata->>'institution_name', 'Bank Account') AS name,
      bc.metadata->>'institution_logo' AS logo
    FROM public.bank_connections bc
    WHERE bc.provider = 'tink'
      AND bc.household_id IS NULL
  LOOP
    SELECT COALESCE(
      (
        SELECT UPPER(uc.preferred_currency)
        FROM public.user_contacts uc
        WHERE uc.user_id = rec.user_id
        ORDER BY uc.updated_at DESC NULLS LAST, uc.created_at DESC NULLS LAST
        LIMIT 1
      ),
      'USD'
    ) INTO v_currency;

    v_name := rec.name;
    v_logo := rec.logo;

    INSERT INTO public.households (name, owner_id, is_portfolio, cover_image_url, currency)
    VALUES (v_name, rec.user_id, TRUE, v_logo, v_currency)
    RETURNING id INTO v_household_id;

    INSERT INTO public.household_members (household_id, user_id, role, joined_at)
    SELECT v_household_id, rec.user_id, 'owner', NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = v_household_id
        AND hm.user_id = rec.user_id
    );

    UPDATE public.bank_connections
    SET household_id = v_household_id,
        metadata = COALESCE(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'institution_name', v_name,
            'institution_logo', v_logo
          )
    WHERE id = rec.connection_id;
  END LOOP;
END $$;
