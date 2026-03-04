-- Atomic, user-scoped custom category rename propagation.

CREATE OR REPLACE FUNCTION public.rename_user_custom_category(
  p_old_name TEXT,
  p_old_transaction_type TEXT,
  p_new_name TEXT,
  p_new_transaction_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_name TEXT := lower(trim(coalesce(p_old_name, '')));
  v_old_type TEXT := lower(trim(coalesce(p_old_transaction_type, '')));
  v_new_name TEXT := lower(trim(coalesce(p_new_name, '')));
  v_new_type TEXT := lower(trim(coalesce(p_new_transaction_type, '')));
  v_old_color_argb BIGINT;
  v_old_icon_key TEXT;
  v_updated_expenses INT := 0;
  v_updated_preferences INT := 0;
  v_updated_remap_to INT := 0;
  v_updated_remap_from INT := 0;
  v_updated_hidden INT := 0;
  v_updated_legacy_categories INT := 0;
  v_has_source BOOLEAN := FALSE;
  v_had_hidden BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_old_type NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'Invalid old transaction type';
  END IF;

  IF v_new_type NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'Invalid new transaction type';
  END IF;

  IF char_length(v_old_name) < 1 OR char_length(v_old_name) > 48 OR
     v_old_name !~ '^[a-z0-9 &/._-]+$' OR v_old_name ~ '`' THEN
    RAISE EXCEPTION 'Invalid old category name';
  END IF;

  IF char_length(v_new_name) < 1 OR char_length(v_new_name) > 48 OR
     v_new_name !~ '^[a-z0-9 &/._-]+$' OR v_new_name ~ '`' THEN
    RAISE EXCEPTION 'Invalid new category name';
  END IF;

  IF v_new_name = 'other' THEN
    RAISE EXCEPTION 'Cannot rename to other';
  END IF;

  SELECT true, color_argb, icon_key
  INTO v_has_source, v_old_color_argb, v_old_icon_key
  FROM public.user_transaction_categories
  WHERE user_id = v_user_id
    AND name = v_old_name
    AND transaction_type = v_old_type
  LIMIT 1;

  IF NOT v_has_source THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Source category not found'
    );
  END IF;

  INSERT INTO public.user_transaction_categories (
    user_id,
    name,
    transaction_type,
    color_argb,
    icon_key
  )
  VALUES (
    v_user_id,
    v_new_name,
    v_new_type,
    v_old_color_argb,
    coalesce(nullif(v_old_icon_key, ''), 'tag')
  )
  ON CONFLICT (user_id, name, transaction_type)
  DO UPDATE SET
    color_argb = coalesce(public.user_transaction_categories.color_argb, EXCLUDED.color_argb),
    icon_key = coalesce(nullif(public.user_transaction_categories.icon_key, ''), EXCLUDED.icon_key),
    updated_at = now();

  IF v_old_type = 'income' THEN
    UPDATE public.expenses
    SET category = v_new_name
    WHERE user_id = v_user_id
      AND category = v_old_name
      AND type = 'income';
  ELSE
    UPDATE public.expenses
    SET category = v_new_name
    WHERE user_id = v_user_id
      AND category = v_old_name
      AND type = 'expense';

    UPDATE public.expenses
    SET category = v_new_name
    WHERE user_id = v_user_id
      AND category = v_old_name
      AND type IS NULL;
  END IF;
  GET DIAGNOSTICS v_updated_expenses = ROW_COUNT;

  UPDATE public.user_category_preferences
  SET category_name = v_new_name,
      updated_at = now()
  WHERE user_id = v_user_id
    AND transaction_type = v_old_type
    AND category_name = v_old_name;
  GET DIAGNOSTICS v_updated_preferences = ROW_COUNT;

  UPDATE public.user_category_remaps
  SET to_category_name = v_new_name,
      updated_at = now()
  WHERE user_id = v_user_id
    AND transaction_type = v_old_type
    AND to_category_name = v_old_name;
  GET DIAGNOSTICS v_updated_remap_to = ROW_COUNT;

  BEGIN
    UPDATE public.user_category_remaps
    SET from_category_name = v_new_name,
        updated_at = now()
    WHERE user_id = v_user_id
      AND transaction_type = v_old_type
      AND from_category_name = v_old_name;
    GET DIAGNOSTICS v_updated_remap_from = ROW_COUNT;
  EXCEPTION
    WHEN unique_violation THEN
      DELETE FROM public.user_category_remaps
      WHERE user_id = v_user_id
        AND transaction_type = v_old_type
        AND from_category_name = v_old_name;
      v_updated_remap_from := 0;
  END;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_hidden_transaction_categories
    WHERE user_id = v_user_id
      AND category_name = v_old_name
      AND transaction_type = v_old_type
  ) INTO v_had_hidden;

  DELETE FROM public.user_hidden_transaction_categories
  WHERE user_id = v_user_id
    AND category_name = v_old_name
    AND transaction_type = v_old_type;

  INSERT INTO public.user_hidden_transaction_categories (
    user_id,
    category_name,
    transaction_type
  )
  SELECT v_user_id, v_new_name, v_new_type
  WHERE v_had_hidden
  ON CONFLICT (user_id, category_name, transaction_type)
  DO UPDATE SET updated_at = now();
  GET DIAGNOSTICS v_updated_hidden = ROW_COUNT;

  UPDATE public.expense_categories ec
  SET name = v_new_name,
      updated_at = now()
  WHERE lower(ec.name) = v_old_name
    AND ec.contact_id IN (
      SELECT uc.id
      FROM public.user_contacts uc
      WHERE uc.user_id = v_user_id
    );
  GET DIAGNOSTICS v_updated_legacy_categories = ROW_COUNT;

  IF v_old_name <> v_new_name OR v_old_type <> v_new_type THEN
    DELETE FROM public.user_transaction_categories
    WHERE user_id = v_user_id
      AND name = v_old_name
      AND transaction_type = v_old_type;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'updatedExpenses', v_updated_expenses,
    'updatedPreferences', v_updated_preferences,
    'updatedRemapsTo', v_updated_remap_to,
    'updatedRemapsFrom', v_updated_remap_from,
    'updatedHidden', v_updated_hidden,
    'updatedLegacyExpenseCategories', v_updated_legacy_categories
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_user_custom_category(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_user_custom_category(TEXT, TEXT, TEXT, TEXT) TO service_role;
