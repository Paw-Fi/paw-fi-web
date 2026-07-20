UPDATE public.plaid_offboarding_jobs
SET token_expires_at = LEAST(
      COALESCE(token_expires_at, created_at + INTERVAL '30 days'),
      created_at + INTERVAL '30 days'
    ),
    updated_at = NOW()
WHERE access_token_encrypted IS NOT NULL
   OR plaid_access_token_encrypted IS NOT NULL;

UPDATE public.plaid_offboarding_jobs
SET status = 'failed',
    access_token_encrypted = NULL,
    plaid_access_token_encrypted = NULL,
    processing_started_at = NULL,
    processed_at = COALESCE(processed_at, NOW()),
    last_error = COALESCE(last_error, 'Plaid credential escrow expired'),
    last_error_at = COALESCE(last_error_at, NOW()),
    updated_at = NOW()
WHERE token_expires_at <= NOW()
  AND (
    access_token_encrypted IS NOT NULL
    OR plaid_access_token_encrypted IS NOT NULL
  );
