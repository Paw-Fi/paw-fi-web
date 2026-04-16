-- Creator Dashboard DAU Analytics RPC
-- Bypasses RLS for creator DAU metrics

-- Function to get DAU (Daily Active Users) by timezone
CREATE OR REPLACE FUNCTION public.get_creator_dau_by_timezone()
RETURNS TABLE (
    timezone TEXT,
    active_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_creator BOOLEAN;
    v_today_start TIMESTAMPTZ;
    v_today_end TIMESTAMPTZ;
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
    v_today_end := v_today_start + INTERVAL '1 day';

    RETURN QUERY
    SELECT
        COALESCE(uc.preferred_timezone, 'UTC')::TEXT as timezone,
        COUNT(DISTINCT e.contact_id)::BIGINT as active_users
    FROM expenses e
    LEFT JOIN user_contacts uc ON e.contact_id = uc.id
    WHERE e.updated_at >= v_today_start
      AND e.updated_at < v_today_end
    GROUP BY COALESCE(uc.preferred_timezone, 'UTC')
    ORDER BY active_users DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_creator_dau_by_timezone() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_dau_by_timezone() TO service_role;

COMMENT ON FUNCTION public.get_creator_dau_by_timezone() IS 'Returns daily active users grouped by timezone for creator dashboard. Bypasses RLS via SECURITY DEFINER.';
