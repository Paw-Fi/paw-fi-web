-- Relax custom category constraints for multilingual names.
-- Supports broader Unicode usage by removing ASCII-only regex checks
-- and increasing max length from 48 to 96.

DO $$
BEGIN
  ALTER TABLE public.user_transaction_categories
    DROP CONSTRAINT IF EXISTS user_transaction_categories_name_length_check;
  ALTER TABLE public.user_transaction_categories
    DROP CONSTRAINT IF EXISTS user_transaction_categories_name_chars_check;

  ALTER TABLE public.user_transaction_categories
    ADD CONSTRAINT user_transaction_categories_name_length_check
      CHECK (char_length(name) BETWEEN 1 AND 96);

  ALTER TABLE public.user_transaction_categories
    ADD CONSTRAINT user_transaction_categories_name_chars_check
      CHECK (position('`' in name) = 0);
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_preferences
    DROP CONSTRAINT IF EXISTS user_category_preferences_category_name_length_check;
  ALTER TABLE public.user_category_preferences
    DROP CONSTRAINT IF EXISTS user_category_preferences_category_name_chars_check;

  ALTER TABLE public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_category_name_length_check
      CHECK (char_length(category_name) BETWEEN 1 AND 96);

  ALTER TABLE public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_category_name_chars_check
      CHECK (position('`' in category_name) = 0);
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_category_remaps
    DROP CONSTRAINT IF EXISTS user_category_remaps_from_length_check;
  ALTER TABLE public.user_category_remaps
    DROP CONSTRAINT IF EXISTS user_category_remaps_from_chars_check;
  ALTER TABLE public.user_category_remaps
    DROP CONSTRAINT IF EXISTS user_category_remaps_to_length_check;
  ALTER TABLE public.user_category_remaps
    DROP CONSTRAINT IF EXISTS user_category_remaps_to_chars_check;

  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_from_length_check
      CHECK (char_length(from_category_name) BETWEEN 1 AND 96);

  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_from_chars_check
      CHECK (position('`' in from_category_name) = 0);

  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_to_length_check
      CHECK (char_length(to_category_name) BETWEEN 1 AND 96);

  ALTER TABLE public.user_category_remaps
    ADD CONSTRAINT user_category_remaps_to_chars_check
      CHECK (position('`' in to_category_name) = 0);
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_hidden_transaction_categories
    DROP CONSTRAINT IF EXISTS user_hidden_transaction_categories_name_length_check;
  ALTER TABLE public.user_hidden_transaction_categories
    DROP CONSTRAINT IF EXISTS user_hidden_transaction_categories_name_chars_check;

  ALTER TABLE public.user_hidden_transaction_categories
    ADD CONSTRAINT user_hidden_transaction_categories_name_length_check
      CHECK (char_length(category_name) BETWEEN 1 AND 96);

  ALTER TABLE public.user_hidden_transaction_categories
    ADD CONSTRAINT user_hidden_transaction_categories_name_chars_check
      CHECK (position('`' in category_name) = 0);
END $$;
