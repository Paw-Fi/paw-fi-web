-- Per-user hidden categories (affects allowed category lists for AI + UI)

CREATE TABLE IF NOT EXISTS public.user_hidden_transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'expense',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_hidden_transaction_categories_type_check CHECK (
    transaction_type IN ('expense', 'income')
  ),
  CONSTRAINT user_hidden_transaction_categories_unique
    UNIQUE (user_id, category_name, transaction_type)
);

DO $$
BEGIN
  ALTER TABLE public.user_hidden_transaction_categories
    ADD CONSTRAINT user_hidden_transaction_categories_name_length_check
      CHECK (char_length(category_name) BETWEEN 1 AND 48);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_hidden_transaction_categories
    ADD CONSTRAINT user_hidden_transaction_categories_name_chars_check
      CHECK (category_name ~ '^[a-z0-9 &/._-]+$' AND category_name !~ '`');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_hidden_transaction_categories_user_id
  ON public.user_hidden_transaction_categories(user_id);

DROP TRIGGER IF EXISTS user_hidden_transaction_categories_updated_at
  ON public.user_hidden_transaction_categories;
CREATE TRIGGER user_hidden_transaction_categories_updated_at
BEFORE UPDATE ON public.user_hidden_transaction_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_hidden_transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User hidden categories readable"
  ON public.user_hidden_transaction_categories
  FOR SELECT
  USING (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User hidden categories insertable"
  ON public.user_hidden_transaction_categories
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User hidden categories updatable"
  ON public.user_hidden_transaction_categories
  FOR UPDATE
  USING (auth.role() = 'service_role' OR user_id = auth.uid())
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User hidden categories deletable"
  ON public.user_hidden_transaction_categories
  FOR DELETE
  USING (auth.role() = 'service_role' OR user_id = auth.uid());
