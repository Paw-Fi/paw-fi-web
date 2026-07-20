ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS plaid_not_ready_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plaid_not_ready_retry_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.guard_plaid_not_ready_visibility_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_reason = 'bank_account_inactive'
    AND NEW.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.bank_accounts account
      JOIN public.bank_connections connection
        ON connection.id = account.bank_connection_id
      WHERE account.id = NEW.bank_account_id
        AND connection.provider = 'plaid'
        AND connection.metadata -> 'plaid_sync_status' ->>
          'transactions_update_status' = 'NOT_READY'
    ) THEN
    NEW.deleted_at := OLD.deleted_at;
    NEW.deleted_reason := OLD.deleted_reason;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_plaid_not_ready_visibility_v1
  ON public.expenses;
CREATE TRIGGER guard_plaid_not_ready_visibility_v1
BEFORE UPDATE OF deleted_at, deleted_reason ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.guard_plaid_not_ready_visibility_v1();

CREATE OR REPLACE FUNCTION public.set_plaid_not_ready_backoff_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status TEXT := NEW.metadata -> 'plaid_sync_status' ->>
    'transactions_update_status';
BEGIN
  IF NEW.provider = 'plaid' AND v_status = 'NOT_READY'
    AND (
      OLD.metadata -> 'plaid_sync_status' ->> 'updated_at'
      IS DISTINCT FROM
      NEW.metadata -> 'plaid_sync_status' ->> 'updated_at'
    ) THEN
    NEW.plaid_not_ready_attempt_count :=
      LEAST(COALESCE(OLD.plaid_not_ready_attempt_count, 0) + 1, 10);
    NEW.plaid_not_ready_retry_at := NOW() + MAKE_INTERVAL(
      secs => LEAST(
        3600,
        30 * POWER(2, LEAST(NEW.plaid_not_ready_attempt_count - 1, 7))::INTEGER
      )
    );
  ELSIF NEW.last_successful_sync_at IS DISTINCT FROM OLD.last_successful_sync_at
    OR v_status IS DISTINCT FROM 'NOT_READY' THEN
    NEW.plaid_not_ready_attempt_count := 0;
    NEW.plaid_not_ready_retry_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_plaid_not_ready_backoff_v1
  ON public.bank_connections;
CREATE TRIGGER set_plaid_not_ready_backoff_v1
BEFORE UPDATE OF metadata, last_successful_sync_at ON public.bank_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_plaid_not_ready_backoff_v1();

CREATE INDEX IF NOT EXISTS idx_bank_connections_plaid_not_ready_retry
  ON public.bank_connections (plaid_not_ready_retry_at)
  WHERE provider = 'plaid'
    AND plaid_not_ready_retry_at IS NOT NULL
    AND removed_at IS NULL;

REVOKE ALL ON FUNCTION public.guard_plaid_not_ready_visibility_v1()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_plaid_not_ready_backoff_v1()
  FROM PUBLIC, anon, authenticated, service_role;
