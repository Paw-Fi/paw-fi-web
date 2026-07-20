-- bank_connections and bank_accounts are intentionally not directly readable
-- by authenticated clients. The review RPC validates the caller and every
-- requested connection/account scope before reading those protected tables.

ALTER FUNCTION public.get_plaid_sync_review_transactions_v2(
  UUID, UUID, UUID[], UUID, BOOLEAN, DATE, TIMESTAMPTZ, UUID, INTEGER
) SECURITY DEFINER;

ALTER FUNCTION public.get_plaid_sync_review_transactions_v2(
  UUID, UUID, UUID[], UUID, BOOLEAN, DATE, TIMESTAMPTZ, UUID, INTEGER
) SET search_path = '';

REVOKE ALL ON FUNCTION public.get_plaid_sync_review_transactions_v2(
  UUID, UUID, UUID[], UUID, BOOLEAN, DATE, TIMESTAMPTZ, UUID, INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_plaid_sync_review_transactions_v2(
  UUID, UUID, UUID[], UUID, BOOLEAN, DATE, TIMESTAMPTZ, UUID, INTEGER
) TO authenticated;
