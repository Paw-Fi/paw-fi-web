-- Per-user explicit category-to-category remaps (user-confirmed)

CREATE TABLE IF NOT EXISTS public.user_category_remaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  from_category_name TEXT NOT NULL,
  to_category_name TEXT NOT NULL,
  use_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_category_remaps_type_check CHECK (
    transaction_type IN ('expense', 'income')
  ),
  CONSTRAINT user_category_remaps_unique UNIQUE (
    user_id,
    transaction_type,
    from_category_name
  )
);

DO $$
BEGIN
  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_from_length_check
      CHECK (char_length(from_category_name) BETWEEN 1 AND 48);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_from_chars_check
      CHECK (from_category_name ~ '^[a-z0-9 &/._-]+$' AND from_category_name !~ '`');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_to_length_check
      CHECK (char_length(to_category_name) BETWEEN 1 AND 48);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_to_chars_check
      CHECK (to_category_name ~ '^[a-z0-9 &/._-]+$' AND to_category_name !~ '`');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_use_count_positive_check
      CHECK (use_count >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_category_remaps_user_id
  ON public.user_category_remaps(user_id);

CREATE INDEX IF NOT EXISTS idx_user_category_remaps_lookup
  ON public.user_category_remaps(user_id, transaction_type, from_category_name);

DROP TRIGGER IF EXISTS user_category_remaps_updated_at ON public.user_category_remaps;
CREATE TRIGGER user_category_remaps_updated_at
BEFORE UPDATE ON public.user_category_remaps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_category_remaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User category remaps readable"
  ON public.user_category_remaps
  FOR SELECT
  USING (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User category remaps insertable"
  ON public.user_category_remaps
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User category remaps updatable"
  ON public.user_category_remaps
  FOR UPDATE
  USING (auth.role() = 'service_role' OR user_id = auth.uid())
  WITH CHECK (auth.role() = 'service_role' OR user_id = auth.uid());

CREATE POLICY "User category remaps deletable"
  ON public.user_category_remaps
  FOR DELETE
  USING (auth.role() = 'service_role' OR user_id = auth.uid());
