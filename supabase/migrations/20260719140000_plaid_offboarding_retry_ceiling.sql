CREATE OR REPLACE FUNCTION public.claim_pending_plaid_offboarding_jobs(
  p_batch_size INTEGER DEFAULT 20
) RETURNS SETOF public.plaid_offboarding_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_exhausted_connection_ids UUID[];
BEGIN
  WITH exhausted AS (
    UPDATE public.plaid_offboarding_jobs job
    SET status = 'failed',
        processing_started_at = NULL,
        next_attempt_at = NULL,
        processed_at = COALESCE(job.processed_at, NOW()),
        last_error = COALESCE(job.last_error, 'Plaid removal retry limit exhausted'),
        last_error_at = COALESCE(job.last_error_at, NOW()),
        access_token_encrypted = NULL,
        plaid_access_token_encrypted = NULL,
        updated_at = NOW()
    WHERE job.attempt_count >= job.max_attempts
      AND (
        job.status = 'pending'
        OR (
          job.status = 'processing'
          AND job.processing_started_at < NOW() - INTERVAL '15 minutes'
        )
      )
    RETURNING job.connection_id
  )
  SELECT ARRAY_AGG(connection_id) FILTER (WHERE connection_id IS NOT NULL)
  INTO v_exhausted_connection_ids
  FROM exhausted;

  IF COALESCE(ARRAY_LENGTH(v_exhausted_connection_ids, 1), 0) > 0 THEN
    UPDATE public.bank_connections connection
    SET access_token_encrypted = NULL,
        plaid_access_token_encrypted = NULL,
        updated_at = NOW()
    WHERE connection.id = ANY(v_exhausted_connection_ids);

    DELETE FROM public.bank_connection_tokens token
    WHERE token.bank_connection_id = ANY(v_exhausted_connection_ids);
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT job.id
    FROM public.plaid_offboarding_jobs job
    WHERE (
        (
          job.status = 'pending'
          AND (job.next_attempt_at IS NULL OR job.next_attempt_at <= NOW())
        )
        OR (
          job.status = 'processing'
          AND job.processing_started_at IS NOT NULL
          AND job.processing_started_at < NOW() - INTERVAL '15 minutes'
        )
      )
      AND job.attempt_count < job.max_attempts
      AND (job.token_expires_at IS NULL OR job.token_expires_at > NOW())
    ORDER BY COALESCE(job.next_attempt_at, job.created_at), job.created_at
    LIMIT GREATEST(COALESCE(p_batch_size, 20), 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.plaid_offboarding_jobs job
  SET status = 'processing',
      attempt_count = job.attempt_count + 1,
      processing_started_at = NOW(),
      updated_at = NOW()
  FROM claimed
  WHERE job.id = claimed.id
  RETURNING job.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.preserve_terminal_plaid_connection_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.provider = 'plaid' AND (
    NEW.item_status = 'removed' OR NEW.removed_at IS NOT NULL
  ) THEN
    IF NEW.status IS DISTINCT FROM 'disabled'
      OR NEW.item_status IS DISTINCT FROM 'removed'
      OR NEW.removed_at IS NULL
      OR NEW.access_token_encrypted IS NOT NULL
      OR NEW.plaid_access_token_encrypted IS NOT NULL THEN
      RAISE EXCEPTION 'Removed Plaid connections require disabled state, removed_at, and sanitized tokens'
        USING ERRCODE = '23514';
    END IF;
    DELETE FROM public.bank_connection_tokens token
    WHERE token.bank_connection_id = NEW.id;
    NEW.item_health_state := 'removed';
    NEW.relink_state := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD.provider = 'plaid' AND (
    OLD.removed_at IS NOT NULL
    OR OLD.status = 'disabled'
    OR OLD.item_status IN ('removed', 'pending_removal')
  ) THEN
    NEW.status := OLD.status;
    NEW.item_status := OLD.item_status;
    NEW.item_health_state := OLD.item_health_state;
    NEW.relink_state := OLD.relink_state;
    NEW.removed_at := OLD.removed_at;
    NEW.access_token_encrypted := CASE
      WHEN NEW.access_token_encrypted IS NULL THEN NULL
      ELSE OLD.access_token_encrypted
    END;
    NEW.plaid_access_token_encrypted := CASE
      WHEN NEW.plaid_access_token_encrypted IS NULL THEN NULL
      ELSE OLD.plaid_access_token_encrypted
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_terminal_plaid_connection_v1
  ON public.bank_connections;
CREATE TRIGGER preserve_terminal_plaid_connection_v1
BEFORE INSERT OR UPDATE ON public.bank_connections
FOR EACH ROW
EXECUTE FUNCTION public.preserve_terminal_plaid_connection_v1();

UPDATE public.plaid_offboarding_jobs
SET status = 'failed',
    processing_started_at = NULL,
    next_attempt_at = NULL,
    processed_at = COALESCE(processed_at, NOW()),
    last_error = COALESCE(last_error, 'Plaid removal retry limit exhausted'),
    last_error_at = COALESCE(last_error_at, NOW()),
    access_token_encrypted = NULL,
    plaid_access_token_encrypted = NULL,
    updated_at = NOW()
WHERE status IN ('pending', 'processing')
  AND attempt_count >= max_attempts;

UPDATE public.bank_connections connection
SET access_token_encrypted = NULL,
    plaid_access_token_encrypted = NULL,
    updated_at = NOW()
WHERE connection.id IN (
  SELECT job.connection_id
  FROM public.plaid_offboarding_jobs job
  WHERE job.status = 'failed'
    AND job.attempt_count >= job.max_attempts
    AND job.connection_id IS NOT NULL
);

DELETE FROM public.bank_connection_tokens token
WHERE token.bank_connection_id IN (
  SELECT job.connection_id
  FROM public.plaid_offboarding_jobs job
  WHERE job.status = 'failed'
    AND job.attempt_count >= job.max_attempts
    AND job.connection_id IS NOT NULL
);
