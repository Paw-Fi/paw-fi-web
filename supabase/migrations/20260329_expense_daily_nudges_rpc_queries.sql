-- RPC helpers for expense-daily-nudges to avoid oversized PostgREST GET URLs
-- when filtering large user_id lists with `in (...)`.

CREATE OR REPLACE FUNCTION public.get_recent_log_expense_reminder_users(
  p_user_ids uuid[],
  p_since timestamptz
)
RETURNS TABLE(
  user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ne.user_id
  FROM public.notification_events ne
  WHERE ne.event_type = 'log_expense_reminder'
    AND ne.created_at >= p_since
    AND ne.user_id = ANY(p_user_ids);
$$;

COMMENT ON FUNCTION public.get_recent_log_expense_reminder_users(uuid[], timestamptz) IS
  'Returns users who already received log_expense_reminder since p_since.';

CREATE OR REPLACE FUNCTION public.get_log_expense_reminder_stats(
  p_user_ids uuid[],
  p_since timestamptz
)
RETURNS TABLE(
  user_id uuid,
  reminder_count bigint,
  last_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    ne.user_id,
    COUNT(*)::bigint AS reminder_count,
    MAX(ne.created_at) AS last_at
  FROM public.notification_events ne
  WHERE ne.event_type = 'log_expense_reminder'
    AND ne.created_at >= p_since
    AND ne.user_id = ANY(p_user_ids)
  GROUP BY ne.user_id;
$$;

COMMENT ON FUNCTION public.get_log_expense_reminder_stats(uuid[], timestamptz) IS
  'Returns per-user reminder count and latest reminder timestamp since p_since.';
