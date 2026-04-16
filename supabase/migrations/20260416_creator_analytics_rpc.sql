-- Creator Dashboard Analytics RPC
-- Bypasses RLS for creator performance metrics
-- Subscriptions with expired end dates (trial_end or current_period_end) are treated as cancelled

-- Function to get subscription counts by plan/billing interval
CREATE OR REPLACE FUNCTION public.get_creator_subscription_analytics()
RETURNS TABLE (
    plan_type TEXT,
    billing_interval TEXT,
    status TEXT,
    provider TEXT,
    count BIGINT
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
        RAISE EXCEPTION 'Unauthorized: Only creators can access subscription analytics';
    END IF;

    RETURN QUERY
    SELECT
        s.plan::TEXT as plan_type,
        s.billing_interval::TEXT,
        -- Determine effective status: if expired, treat as cancelled
        CASE
            WHEN s.ended_at IS NOT NULL THEN 'canceled'::TEXT
            WHEN s.trial_end IS NOT NULL AND s.trial_end <= NOW() THEN 'canceled'::TEXT
            WHEN s.current_period_end IS NOT NULL AND s.current_period_end <= NOW() THEN 'canceled'::TEXT
            ELSE s.status::TEXT
        END as status,
        s.provider::TEXT,
        COUNT(*)::BIGINT as count
    FROM subscriptions s
    WHERE s.provider IN ('stripe', 'app_store')
    GROUP BY
        s.plan,
        s.billing_interval,
        CASE
            WHEN s.ended_at IS NOT NULL THEN 'canceled'::TEXT
            WHEN s.trial_end IS NOT NULL AND s.trial_end <= NOW() THEN 'canceled'::TEXT
            WHEN s.current_period_end IS NOT NULL AND s.current_period_end <= NOW() THEN 'canceled'::TEXT
            ELSE s.status::TEXT
        END,
        s.provider
    ORDER BY s.plan, s.billing_interval, status, s.provider;
END;
$$;

-- Function to get trialing users
CREATE OR REPLACE FUNCTION public.get_creator_trialing_users()
RETURNS TABLE (
    subscription_id UUID,
    user_id UUID,
    plan TEXT,
    provider TEXT,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    email TEXT,
    full_name TEXT
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
        RAISE EXCEPTION 'Unauthorized: Only creators can access trialing users';
    END IF;

    RETURN QUERY
    SELECT
        s.id as subscription_id,
        s.user_id,
        s.plan::TEXT,
        s.provider::TEXT,
        s.trial_start,
        s.trial_end,
        u.email::TEXT,
        u.full_name::TEXT
    FROM subscriptions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.status = 'trialing'
    ORDER BY s.trial_end ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_creator_subscription_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_subscription_analytics() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_creator_trialing_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_trialing_users() TO service_role;

COMMENT ON FUNCTION public.get_creator_subscription_analytics() IS 'Returns subscription counts grouped by plan, billing interval, status, and provider for creator dashboard. Bypasses RLS via SECURITY DEFINER.';
COMMENT ON FUNCTION public.get_creator_trialing_users() IS 'Returns all users currently in trial period for creator dashboard. Bypasses RLS via SECURITY DEFINER.';
