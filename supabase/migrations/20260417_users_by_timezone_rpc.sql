-- Creator Dashboard Users by Timezone RPC
-- Bypasses RLS for creator user analytics

-- Function to get users grouped by timezone
CREATE OR REPLACE FUNCTION public.get_creator_users_by_timezone()
RETURNS TABLE (
    timezone TEXT,
    user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_creator BOOLEAN;
BEGIN
    -- Check if the calling user is a creator/admin
    SELECT users.is_creator INTO v_is_creator
    FROM users
    WHERE users.id = auth.uid();

    IF v_is_creator IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only creators can access user timezone analytics';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(uc.preferred_timezone, 'Unknown')::TEXT as timezone,
        COUNT(*)::BIGINT as user_count
    FROM user_contacts uc
    WHERE uc.preferred_timezone IS NOT NULL
    GROUP BY COALESCE(uc.preferred_timezone, 'Unknown')
    ORDER BY user_count DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_creator_users_by_timezone() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_users_by_timezone() TO service_role;

COMMENT ON FUNCTION public.get_creator_users_by_timezone() IS 'Returns users grouped by timezone for creator dashboard. Bypasses RLS via SECURITY DEFINER.';
