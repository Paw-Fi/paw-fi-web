-- Fix creator analytics lifecycle classification:
-- - Do not mark active subscriptions as canceled just because historic trial_end exists.
-- - Normalize terminal/non-access statuses to canceled for dashboard aggregation.
-- - Preserve plan/interval/provider grouping for monthly/yearly/lifetime analytics.

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
            CASE
                -- Explicit end marker always wins
                WHEN s.ended_at IS NOT NULL THEN 'canceled'::TEXT
                -- Free plan should not appear as active subscription in creator metrics
                WHEN s.plan = 'free' THEN 'canceled'::TEXT
                -- Trial expires only while still trialing
                WHEN s.status = 'trialing'
                     AND s.trial_end IS NOT NULL
                     AND s.trial_end <= NOW() THEN 'canceled'::TEXT
                -- Recurring subscriptions expire if current period has ended while status still grants access
                WHEN s.status IN ('active', 'trialing')
                     AND s.plan <> 'lifetime'
                     AND s.current_period_end IS NOT NULL
                     AND s.current_period_end <= NOW() THEN 'canceled'::TEXT
                -- Normalize non-access statuses into canceled bucket for dashboard
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
        COUNT(*)::BIGINT AS count
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

COMMENT ON FUNCTION public.get_creator_subscription_analytics() IS 'Returns subscription counts grouped by plan, billing interval, effective lifecycle status, and provider for creator dashboard. Bypasses RLS via SECURITY DEFINER.';
