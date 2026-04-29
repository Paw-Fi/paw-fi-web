-- Creator Dashboard Users by Timezones RPC
-- Returns users in selected timezone buckets for country marker detail modal

CREATE OR REPLACE FUNCTION public.get_creator_users_by_timezones(
    p_timezones TEXT[],
    p_daily_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    preferred_timezone TEXT,
    created_at TIMESTAMPTZ
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
        RAISE EXCEPTION 'Unauthorized: Only creators can access user details';
    END IF;

    RETURN QUERY
    SELECT
        u.id as user_id,
        u.email::TEXT,
        u.full_name::TEXT,
        uc.preferred_timezone::TEXT,
        u.created_at
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
    WHERE uc.preferred_timezone = ANY(p_timezones)
      AND (
          NOT p_daily_only
          OR (u.created_at AT TIME ZONE 'UTC')::DATE = (NOW() AT TIME ZONE 'UTC')::DATE
      )
    ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_creator_users_by_timezones(TEXT[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_users_by_timezones(TEXT[], BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.get_creator_users_by_timezones(TEXT[], BOOLEAN) IS 'Returns users by selected timezones for creator dashboard marker detail modal. Bypasses RLS via SECURITY DEFINER.';
