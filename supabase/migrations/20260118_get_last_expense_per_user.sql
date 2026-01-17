-- Create RPC helper to fetch latest expense per user for daily nudges
-- Returns last expense created_at per user (expense type only)

CREATE OR REPLACE FUNCTION public.get_last_expense_per_user(p_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  last_created_at timestamptz,
  last_amount_cents bigint,
  last_currency text,
  last_category text,
  last_source text,
  last_raw_text text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ON (user_id)
    user_id,
    created_at AS last_created_at,
    amount_cents AS last_amount_cents,
    currency AS last_currency,
    category AS last_category,
    source AS last_source,
    raw_text AS last_raw_text
  FROM public.expenses
  WHERE user_id = ANY(p_user_ids)
    AND type = 'expense'
  ORDER BY user_id, created_at DESC;
$$;

COMMENT ON FUNCTION public.get_last_expense_per_user(uuid[]) IS
  'Returns latest expense created_at per user for daily reminder batching.';
