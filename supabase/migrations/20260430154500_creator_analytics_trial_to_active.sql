-- Extend creator subscription analytics with trial-to-active conversion count.
-- This supports creator dashboard "Paying After Trial" metric.

DROP FUNCTION IF EXISTS public.get_creator_subscription_analytics();

CREATE OR REPLACE FUNCTION public.get_creator_subscription_analytics()
RETURNS TABLE (
    plan_type TEXT,
    billing_interval TEXT,
    status TEXT,
    provider TEXT,
    count BIGINT,
    trial_to_active_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_creator BOOLEAN;
BEGIN
    SELECT users.is_creator INTO v_is_creator
    FROM users
    WHERE users.id = auth.uid();

    IF v_is_creator IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only creators can access subscription analytics';
    END IF;

    RETURN QUERY
    WITH lifecycle AS (
        SELECT
            s.plan::TEXT AS plan_type,
            s.billing_interval::TEXT AS billing_interval,
            s.provider::TEXT AS provider,
            s.trial_start,
            s.trial_end,
            s.updated_at,
            CASE
                WHEN s.ended_at IS NOT NULL THEN 'canceled'::TEXT
                WHEN s.plan = 'free' THEN 'canceled'::TEXT
                WHEN s.status = 'trialing'
                     AND s.trial_end IS NOT NULL
                     AND s.trial_end <= NOW() THEN 'canceled'::TEXT
                WHEN s.status IN ('active', 'trialing')
                     AND s.plan <> 'lifetime'
                     AND s.current_period_end IS NOT NULL
                     AND s.current_period_end <= NOW() THEN 'canceled'::TEXT
                WHEN s.status IN ('canceled', 'cancelled', 'unpaid', 'incomplete_expired', 'inactive') THEN 'canceled'::TEXT
                ELSE s.status::TEXT
            END AS status
        FROM subscriptions s
        WHERE s.provider IN ('stripe', 'app_store')
    )
    SELECT
        lifecycle.plan_type,
        lifecycle.billing_interval,
        lifecycle.status,
        lifecycle.provider,
        COUNT(*)::BIGINT AS count,
        COUNT(*) FILTER (
            WHERE lifecycle.status = 'active'
              AND lifecycle.trial_start IS NOT NULL
              AND lifecycle.trial_end IS NOT NULL
              AND lifecycle.updated_at >= lifecycle.trial_end
              AND (
                (lifecycle.plan_type = 'plus' AND lifecycle.billing_interval IN ('monthly', 'yearly'))
                OR lifecycle.plan_type = 'lifetime'
              )
        )::BIGINT AS trial_to_active_count
    FROM lifecycle
    GROUP BY
        lifecycle.plan_type,
        lifecycle.billing_interval,
        lifecycle.status,
        lifecycle.provider
    ORDER BY
        lifecycle.plan_type,
        lifecycle.billing_interval,
        lifecycle.status,
        lifecycle.provider;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_subscription_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_subscription_analytics() TO service_role;

COMMENT ON FUNCTION public.get_creator_subscription_analytics() IS 'Returns subscription counts grouped by plan, billing interval, effective lifecycle status, and provider, including trial-to-active counts, for creator dashboard.';
