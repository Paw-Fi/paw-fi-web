DO $$
BEGIN
  IF to_regprocedure(
    'public.apply_plaid_sync_batch_v2_legacy(uuid,uuid,integer,text,jsonb,jsonb,text[],uuid[],uuid[],jsonb,uuid[],jsonb,jsonb,boolean,boolean,uuid,uuid)'
  ) IS NULL THEN
    ALTER FUNCTION public.apply_plaid_sync_batch_v2(
      UUID, UUID, INTEGER, TEXT, JSONB, JSONB, TEXT[], UUID[], UUID[], JSONB,
      UUID[], JSONB, JSONB, BOOLEAN, BOOLEAN, UUID, UUID
    ) RENAME TO apply_plaid_sync_batch_v2_legacy;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_plaid_sync_batch_v2(
  p_user_id UUID,
  p_bank_connection_id UUID,
  p_expected_cursor_generation INTEGER,
  p_next_cursor TEXT,
  p_expense_inserts JSONB,
  p_expense_updates JSONB,
  p_removed_provider_transaction_ids TEXT[],
  p_removed_bank_account_ids UUID[],
  p_processed_bank_account_ids UUID[],
  p_account_upserts JSONB,
  p_inactive_bank_account_ids UUID[],
  p_raw_transactions JSONB,
  p_sync_status JSONB,
  p_is_ready BOOLEAN,
  p_recurring_refresh_required BOOLEAN,
  p_lock_token UUID,
  p_audit_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.apply_plaid_sync_batch_v2_legacy(
    p_user_id,
    p_bank_connection_id,
    p_expected_cursor_generation,
    p_next_cursor,
    p_expense_inserts,
    p_expense_updates,
    p_removed_provider_transaction_ids,
    CASE WHEN COALESCE(p_is_ready, FALSE)
      THEN p_removed_bank_account_ids ELSE '{}'::UUID[] END,
    CASE WHEN COALESCE(p_is_ready, FALSE)
      THEN p_processed_bank_account_ids ELSE '{}'::UUID[] END,
    CASE WHEN COALESCE(p_is_ready, FALSE)
      THEN p_account_upserts ELSE '[]'::JSONB END,
    CASE WHEN COALESCE(p_is_ready, FALSE)
      THEN p_inactive_bank_account_ids ELSE '{}'::UUID[] END,
    p_raw_transactions,
    p_sync_status,
    p_is_ready,
    p_recurring_refresh_required,
    p_lock_token,
    p_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_plaid_sync_batch_v2(
  UUID, UUID, INTEGER, TEXT, JSONB, JSONB, TEXT[], UUID[], UUID[], JSONB,
  UUID[], JSONB, JSONB, BOOLEAN, BOOLEAN, UUID, UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_plaid_sync_batch_v2(
  UUID, UUID, INTEGER, TEXT, JSONB, JSONB, TEXT[], UUID[], UUID[], JSONB,
  UUID[], JSONB, JSONB, BOOLEAN, BOOLEAN, UUID, UUID
) TO service_role;
REVOKE ALL ON FUNCTION public.apply_plaid_sync_batch_v2_legacy(
  UUID, UUID, INTEGER, TEXT, JSONB, JSONB, TEXT[], UUID[], UUID[], JSONB,
  UUID[], JSONB, JSONB, BOOLEAN, BOOLEAN, UUID, UUID
) FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_plaid_not_ready_visibility_v1
  ON public.expenses;
DROP FUNCTION IF EXISTS public.guard_plaid_not_ready_visibility_v1();

NOTIFY pgrst, 'reload schema';
