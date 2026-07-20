CREATE OR REPLACE FUNCTION public.finalize_posted_user_override_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.provider = 'plaid'
    AND OLD.classification_source = 'user_override'
    AND OLD.provider_pending IS TRUE
    AND NEW.provider_pending IS FALSE THEN
    NEW.analytics_is_final := TRUE;
    NEW.analytics_spending_multiplier := CASE
      WHEN NEW.analytics_class = 'consumer_spend' THEN 1
      WHEN NEW.analytics_class = 'refund_or_reversal' THEN -1
      ELSE 0
    END;
    NEW.analytics_counts_toward_income := NEW.analytics_class = 'income';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finalize_posted_user_override_v1
  ON public.expenses;
CREATE TRIGGER finalize_posted_user_override_v1
BEFORE UPDATE OF provider_pending ON public.expenses
FOR EACH ROW
WHEN (OLD.provider_pending IS DISTINCT FROM NEW.provider_pending)
EXECUTE FUNCTION public.finalize_posted_user_override_v1();

REVOKE ALL ON FUNCTION public.finalize_posted_user_override_v1()
  FROM PUBLIC, anon, authenticated, service_role;
