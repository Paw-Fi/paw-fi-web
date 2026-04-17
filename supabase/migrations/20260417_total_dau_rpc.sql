-- Creator Dashboard Total DAU RPC
-- Bypasses RLS for creator DAU analytics

-- Function to get total DAU count
CREATE OR REPLACE FUNCTION public.get_creator_total_dau()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_creator BOOLEAN;
    v_today_start TIMESTAMPTZ;
    v_count BIGINT;
BEGIN
    -- Check if the calling user is a creator/admin
    SELECT users.is_creator INTO v_is_creator
    FROM users
    WHERE users.id = auth.uid();

    IF v_is_creator IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only creators can access DAU analytics';
    END IF;

    -- Get today's date boundaries in UTC
    v_today_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');

    -- Count unique active users today
    SELECT COUNT(DISTINCT contact_id)::BIGINT INTO v_count
    FROM expenses
    WHERE updated_at >= v_today_start;

    RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_creator_total_dau() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_total_dau() TO service_role;

COMMENT ON FUNCTION public.get_creator_total_dau() IS 'Returns total daily active users count for creator dashboard. Bypasses RLS via SECURITY DEFINER.';
