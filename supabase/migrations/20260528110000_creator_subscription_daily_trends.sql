-- Add daily subscription trend data for creator dashboard charts.
-- Returns daily counts for each metric so charts show actual daily amounts
-- instead of synthetic cumulative interpolation.

CREATE OR REPLACE FUNCTION public.get_creator_subscription_daily_trends(
    p_start_date TEXT,
    p_end_date TEXT
)
RETURNS TABLE (
    metric_date TEXT,
    metric TEXT,
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
    WITH cancelled_combined AS (
        -- Status changes to cancelled states
        SELECT
            DATE(se.created_at)::TEXT AS c_date,
            s.provider::TEXT AS provider,
            se.subscription_id AS sub_id
        FROM subscription_events se
        JOIN subscriptions s ON se.subscription_id = s.id
        WHERE se.new_status IN ('canceled', 'cancelled', 'unpaid', 'incomplete_expired', 'inactive')
          AND se.created_at >= p_start_date::date
          AND se.created_at < (p_end_date::date + interval '1 day')

        UNION

        -- Direct cancellations via canceled_at (deduplicated by UNION with event rows)
        SELECT
            DATE(s.canceled_at)::TEXT AS c_date,
            s.provider::TEXT AS provider,
            s.id AS sub_id
        FROM subscriptions s
        WHERE s.canceled_at IS NOT NULL
          AND s.provider IN ('stripe', 'app_store')
          AND s.canceled_at >= p_start_date::date
          AND s.canceled_at < (p_end_date::date + interval '1 day')
    )
    -- 1. New monthly subscriptions by creation date
    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'monthly_active'::TEXT AS metric,
        s.provider::TEXT AS provider,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.provider IN ('stripe', 'app_store')
      AND s.plan = 'plus'
      AND s.billing_interval = 'monthly'
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at), s.provider

    UNION ALL

    -- 2. New yearly subscriptions by creation date
    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'yearly_active'::TEXT AS metric,
        s.provider::TEXT AS provider,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.provider IN ('stripe', 'app_store')
      AND s.plan = 'plus'
      AND s.billing_interval = 'yearly'
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at), s.provider

    UNION ALL

    -- 3. New lifetime subscriptions by creation date
    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'lifetime_active'::TEXT AS metric,
        s.provider::TEXT AS provider,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.provider IN ('stripe', 'app_store')
      AND s.plan = 'lifetime'
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at), s.provider

    UNION ALL

    -- 4. Cancellations from subscription_events status changes + subscriptions.canceled_at fallback
    SELECT
        c_date AS metric_date,
        'cancelled'::TEXT AS metric,
        provider,
        COUNT(*)::BIGINT AS count
    FROM cancelled_combined
    GROUP BY c_date, provider

    UNION ALL

    -- 5. Trial-to-active conversions from subscription_events
    SELECT
        DATE(se.created_at)::TEXT AS metric_date,
        'trial_to_active'::TEXT AS metric,
        s.provider::TEXT AS provider,
        COUNT(*)::BIGINT AS count
    FROM subscription_events se
    JOIN subscriptions s ON se.subscription_id = s.id
    WHERE se.old_status = 'trialing'
      AND se.new_status = 'active'
      AND se.created_at >= p_start_date::date
      AND se.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(se.created_at), s.provider

    ORDER BY metric_date, metric, provider;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_subscription_daily_trends(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_subscription_daily_trends(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.get_creator_subscription_daily_trends IS 'Returns daily subscription counts by metric and provider for creator dashboard trend charts. Bypasses RLS via SECURITY DEFINER.';
