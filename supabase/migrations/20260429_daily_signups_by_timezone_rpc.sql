-- Creator Dashboard Daily Signups by Timezone RPC
-- Returns today's new signups grouped by timezone for creator dashboard map

CREATE OR REPLACE FUNCTION public.get_creator_daily_signups_by_timezone()
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
        uc.preferred_timezone::TEXT as timezone,
        COUNT(*)::BIGINT as user_count
    FROM users u
    JOIN LATERAL (
        SELECT user_contacts.preferred_timezone
        FROM user_contacts
        WHERE user_contacts.user_id = u.id
          AND user_contacts.preferred_timezone IS NOT NULL
        ORDER BY user_contacts.updated_at DESC NULLS LAST,
                 user_contacts.created_at DESC NULLS LAST
        LIMIT 1
    ) uc ON TRUE
    WHERE (u.created_at AT TIME ZONE 'UTC')::DATE = (NOW() AT TIME ZONE 'UTC')::DATE
    GROUP BY uc.preferred_timezone
    ORDER BY user_count DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_creator_daily_signups_by_timezone() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_daily_signups_by_timezone() TO service_role;

COMMENT ON FUNCTION public.get_creator_daily_signups_by_timezone() IS 'Returns daily new signups grouped by timezone for creator dashboard. Bypasses RLS via SECURITY DEFINER.';
