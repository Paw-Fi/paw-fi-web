-- Distinguish an explicit user correction from an AI-saved preference.
ALTER TABLE public.user_category_preferences
  ADD COLUMN IF NOT EXISTS is_user_confirmed boolean NOT NULL DEFAULT false;

-- Automatic saves must not downgrade or overwrite a confirmed correction,
-- including when concurrent requests read an older snapshot before upsert.
CREATE OR REPLACE FUNCTION public.protect_confirmed_category_preference()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_user_confirmed AND NOT NEW.is_user_confirmed THEN
    NEW.category_name := OLD.category_name;
    NEW.is_user_confirmed := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_confirmed_category_preference
  ON public.user_category_preferences;
CREATE TRIGGER protect_confirmed_category_preference
BEFORE UPDATE ON public.user_category_preferences
FOR EACH ROW EXECUTE FUNCTION public.protect_confirmed_category_preference();

-- Match keys are produced by the server's Unicode-aware normalizer.
ALTER TABLE public.user_category_preferences
  DROP CONSTRAINT IF EXISTS user_category_preferences_match_key_chars_check;
ALTER TABLE public.user_category_preferences
  ADD CONSTRAINT user_category_preferences_match_key_chars_check
  CHECK (match_key !~ '[[:cntrl:]]');
