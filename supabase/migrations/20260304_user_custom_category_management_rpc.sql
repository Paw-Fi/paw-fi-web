-- Backend-managed custom category lifecycle operations.

CREATE OR REPLACE FUNCTION public.upsert_user_custom_category(
  p_name TEXT,
  p_transaction_type TEXT,
  p_color_argb BIGINT DEFAULT NULL,
  p_icon_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := lower(trim(coalesce(p_name, '')));
  v_type TEXT := lower(trim(coalesce(p_transaction_type, 'expense')));
  v_color BIGINT := p_color_argb;
  v_icon TEXT := nullif(trim(coalesce(p_icon_key, '')), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_type NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF char_length(v_name) < 1 OR char_length(v_name) > 48 OR
     v_name !~ '^[a-z0-9 &/._-]+$' OR v_name ~ '`' OR v_name = 'other' THEN
    RAISE EXCEPTION 'Invalid category name';
  END IF;

  IF v_color IS NOT NULL AND (v_color < 0 OR v_color > 4294967295) THEN
    RAISE EXCEPTION 'Invalid color_argb';
  END IF;

  IF v_icon IS NOT NULL AND (char_length(v_icon) > 32 OR v_icon !~ '^[a-z0-9_]+$') THEN
    RAISE EXCEPTION 'Invalid icon_key';
  END IF;

  INSERT INTO public.user_transaction_categories (
    user_id, name, transaction_type, color_argb, icon_key
  )
  VALUES (
    v_user_id,
    v_name,
    v_type,
    v_color,
    coalesce(v_icon, 'tag')
  )
  ON CONFLICT (user_id, name, transaction_type)
  DO UPDATE SET
    color_argb = coalesce(EXCLUDED.color_argb, public.user_transaction_categories.color_argb),
    icon_key = coalesce(EXCLUDED.icon_key, public.user_transaction_categories.icon_key),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_custom_category_style(
  p_name TEXT,
  p_transaction_type TEXT,
  p_color_argb BIGINT,
  p_icon_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := lower(trim(coalesce(p_name, '')));
  v_type TEXT := lower(trim(coalesce(p_transaction_type, 'expense')));
  v_icon TEXT := trim(coalesce(p_icon_key, ''));
  v_updated INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_type NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF char_length(v_name) < 1 OR char_length(v_name) > 48 OR
     v_name !~ '^[a-z0-9 &/._-]+$' OR v_name ~ '`' OR v_name = 'other' THEN
    RAISE EXCEPTION 'Invalid category name';
  END IF;

  IF p_color_argb < 0 OR p_color_argb > 4294967295 THEN
    RAISE EXCEPTION 'Invalid color_argb';
  END IF;

  IF char_length(v_icon) < 1 OR char_length(v_icon) > 32 OR v_icon !~ '^[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid icon_key';
  END IF;

  UPDATE public.user_transaction_categories
  SET color_argb = p_color_argb,
      icon_key = v_icon,
      updated_at = now()
  WHERE user_id = v_user_id
    AND name = v_name
    AND transaction_type = v_type;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('success', v_updated > 0, 'updated', v_updated);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_category_hidden(
  p_category_name TEXT,
  p_transaction_type TEXT,
  p_hidden BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := lower(trim(coalesce(p_category_name, '')));
  v_type TEXT := lower(trim(coalesce(p_transaction_type, 'expense')));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_type NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF char_length(v_name) < 1 OR char_length(v_name) > 48 OR
     v_name !~ '^[a-z0-9 &/._-]+$' OR v_name ~ '`' OR v_name IN ('other', 'uncategorized') THEN
    RAISE EXCEPTION 'Invalid category name';
  END IF;

  IF p_hidden THEN
    INSERT INTO public.user_hidden_transaction_categories (
      user_id, category_name, transaction_type
    ) VALUES (
      v_user_id, v_name, v_type
    )
    ON CONFLICT (user_id, category_name, transaction_type)
    DO UPDATE SET updated_at = now();
  ELSE
    DELETE FROM public.user_hidden_transaction_categories
    WHERE user_id = v_user_id
      AND category_name = v_name
      AND transaction_type = v_type;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_custom_category(
  p_name TEXT,
  p_transaction_type TEXT,
  p_fallback_category TEXT DEFAULT 'other'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_name TEXT := lower(trim(coalesce(p_name, '')));
  v_type TEXT := lower(trim(coalesce(p_transaction_type, 'expense')));
  v_fallback TEXT := lower(trim(coalesce(p_fallback_category, 'other')));
  v_updated_expenses INT := 0;
  v_updated_preferences INT := 0;
  v_updated_remaps_to INT := 0;
  v_deleted_remaps_from INT := 0;
  v_deleted_hidden INT := 0;
  v_deleted_custom INT := 0;
  v_deleted_legacy_categories INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_type NOT IN ('expense', 'income') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  IF char_length(v_name) < 1 OR char_length(v_name) > 48 OR
     v_name !~ '^[a-z0-9 &/._-]+$' OR v_name ~ '`' OR v_name = 'other' THEN
    RAISE EXCEPTION 'Invalid category name';
  END IF;

  IF char_length(v_fallback) < 1 OR char_length(v_fallback) > 48 OR
     v_fallback !~ '^[a-z0-9 &/._-]+$' OR v_fallback ~ '`' THEN
    RAISE EXCEPTION 'Invalid fallback category';
  END IF;

  IF v_type = 'income' THEN
    UPDATE public.expenses
    SET category = v_fallback
    WHERE user_id = v_user_id
      AND category = v_name
      AND type = 'income';
  ELSE
    UPDATE public.expenses
    SET category = v_fallback
    WHERE user_id = v_user_id
      AND category = v_name
      AND type = 'expense';

    UPDATE public.expenses
    SET category = v_fallback
    WHERE user_id = v_user_id
      AND category = v_name
      AND type IS NULL;
  END IF;
  GET DIAGNOSTICS v_updated_expenses = ROW_COUNT;

  UPDATE public.user_category_preferences
  SET category_name = v_fallback,
      updated_at = now()
  WHERE user_id = v_user_id
    AND transaction_type = v_type
    AND category_name = v_name;
  GET DIAGNOSTICS v_updated_preferences = ROW_COUNT;

  UPDATE public.user_category_remaps
  SET to_category_name = v_fallback,
      updated_at = now()
  WHERE user_id = v_user_id
    AND transaction_type = v_type
    AND to_category_name = v_name;
  GET DIAGNOSTICS v_updated_remaps_to = ROW_COUNT;

  DELETE FROM public.user_category_remaps
  WHERE user_id = v_user_id
    AND transaction_type = v_type
    AND from_category_name = v_name;
  GET DIAGNOSTICS v_deleted_remaps_from = ROW_COUNT;

  DELETE FROM public.user_hidden_transaction_categories
  WHERE user_id = v_user_id
    AND category_name = v_name
    AND transaction_type = v_type;
  GET DIAGNOSTICS v_deleted_hidden = ROW_COUNT;

  DELETE FROM public.user_transaction_categories
  WHERE user_id = v_user_id
    AND name = v_name
    AND transaction_type = v_type;
  GET DIAGNOSTICS v_deleted_custom = ROW_COUNT;

  DELETE FROM public.expense_categories ec
  WHERE lower(ec.name) = v_name
    AND ec.contact_id IN (
      SELECT uc.id
      FROM public.user_contacts uc
      WHERE uc.user_id = v_user_id
    );
  GET DIAGNOSTICS v_deleted_legacy_categories = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updatedExpenses', v_updated_expenses,
    'updatedPreferences', v_updated_preferences,
    'updatedRemapsTo', v_updated_remaps_to,
    'deletedRemapsFrom', v_deleted_remaps_from,
    'deletedHidden', v_deleted_hidden,
    'deletedCustomCategories', v_deleted_custom,
    'deletedLegacyExpenseCategories', v_deleted_legacy_categories
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_custom_category(TEXT, TEXT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_custom_category(TEXT, TEXT, BIGINT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.set_user_custom_category_style(TEXT, TEXT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_custom_category_style(TEXT, TEXT, BIGINT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.set_user_category_hidden(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_category_hidden(TEXT, TEXT, BOOLEAN) TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_user_custom_category(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_custom_category(TEXT, TEXT, TEXT) TO service_role;
