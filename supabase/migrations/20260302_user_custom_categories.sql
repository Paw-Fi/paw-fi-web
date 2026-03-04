-- Per-user custom categories and learned category preferences

-- ====================
-- USER TRANSACTION CATEGORIES
-- ====================

CREATE TABLE IF NOT EXISTS public.user_transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'expense',
  color_argb BIGINT,
  icon_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_transaction_categories_type_check CHECK (
    transaction_type IN ('expense', 'income')
  ),
  CONSTRAINT user_transaction_categories_unique UNIQUE (user_id, name, transaction_type)
);


DO $$
BEGIN
  ALTER TABLE public.user_transaction_categories
    ADD CONSTRAINT user_transaction_categories_name_length_check
      CHECK (char_length(name) BETWEEN 1 AND 96);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_transaction_categories
    ADD CONSTRAINT user_transaction_categories_name_chars_check
      CHECK (position('`' in name) = 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_transaction_categories
    ADD CONSTRAINT user_transaction_categories_color_argb_range_check
      CHECK (color_argb IS NULL OR (color_argb >= 0 AND color_argb <= 4294967295));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_transaction_categories
    ADD CONSTRAINT user_transaction_categories_icon_key_length_check
      CHECK (icon_key IS NULL OR char_length(icon_key) BETWEEN 1 AND 32);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_transaction_categories
    ADD CONSTRAINT user_transaction_categories_icon_key_chars_check
      CHECK (icon_key IS NULL OR icon_key ~ '^[a-z0-9_]+$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_transaction_categories_user_id
  ON public.user_transaction_categories(user_id);

DROP TRIGGER IF EXISTS user_transaction_categories_updated_at ON public.user_transaction_categories;
CREATE TRIGGER user_transaction_categories_updated_at
BEFORE UPDATE ON public.user_transaction_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User transaction categories readable"
  ON public.user_transaction_categories
  FOR SELECT
  USING (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User transaction categories insertable"
  ON public.user_transaction_categories
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User transaction categories updatable"
  ON public.user_transaction_categories
  FOR UPDATE
  USING (auth.role() = 'service_role' OR user_id = auth.uid())
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User transaction categories deletable"
  ON public.user_transaction_categories
  FOR DELETE
  USING (auth.role() = 'service_role' OR user_id = auth.uid());

-- ====================
-- USER CATEGORY PREFERENCES (LEARNING)
-- ====================

CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  match_key TEXT NOT NULL,
  category_name TEXT NOT NULL,
  use_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_category_preferences_type_check CHECK (
    transaction_type IN ('expense', 'income')
  ),
  CONSTRAINT user_category_preferences_unique UNIQUE (user_id, transaction_type, match_key)
);


DO $$
BEGIN
  ALTER TABLE public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_match_key_length_check
      CHECK (char_length(match_key) BETWEEN 1 AND 80);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_match_key_chars_check
      CHECK (match_key ~ '^[a-z0-9 ]+$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_category_name_length_check
      CHECK (char_length(category_name) BETWEEN 1 AND 96);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_category_name_chars_check
      CHECK (position('`' in category_name) = 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_use_count_positive_check
      CHECK (use_count >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id
  ON public.user_category_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_category_preferences_lookup
  ON public.user_category_preferences(user_id, transaction_type, match_key);

DROP TRIGGER IF EXISTS user_category_preferences_updated_at ON public.user_category_preferences;
CREATE TRIGGER user_category_preferences_updated_at
BEFORE UPDATE ON public.user_category_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User category preferences readable"
  ON public.user_category_preferences
  FOR SELECT
  USING (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User category preferences insertable"
  ON public.user_category_preferences
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User category preferences updatable"
  ON public.user_category_preferences
  FOR UPDATE
  USING (auth.role() = 'service_role' OR user_id = auth.uid())
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User category preferences deletable"
  ON public.user_category_preferences
  FOR DELETE
  USING (auth.role() = 'service_role' OR user_id = auth.uid());
