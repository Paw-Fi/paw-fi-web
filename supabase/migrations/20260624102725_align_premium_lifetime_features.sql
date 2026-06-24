-- Align Premium launch semantics across feature display RPCs and creator analytics.

UPDATE public.subscription_products
SET
    display_price_usd = NULL,
    original_price_usd = NULL
WHERE display_price_usd IS NOT NULL
   OR original_price_usd IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_subscription_plan_features(p_plan TEXT)
RETURNS TABLE (
    feature TEXT,
    included BOOLEAN,
    limit_value INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan TEXT := lower(coalesce(p_plan, 'free'));
    v_is_paid BOOLEAN := lower(coalesce(p_plan, 'free')) IN ('plus', 'premium', 'lifetime');
    v_is_premium_tier BOOLEAN := lower(coalesce(p_plan, 'free')) IN ('premium', 'lifetime');
BEGIN
    RETURN QUERY
    SELECT 'Advanced Analytics'::TEXT,
           v_is_paid,
           NULL::INTEGER
    UNION ALL
    SELECT 'Custom Dashboards'::TEXT,
           v_is_premium_tier,
           NULL::INTEGER
    UNION ALL
    SELECT 'Learning Modules'::TEXT,
           TRUE,
           CASE
               WHEN v_is_premium_tier THEN NULL
               WHEN v_plan = 'plus' THEN 10
               ELSE 3
           END;
END;
$$;

COMMENT ON FUNCTION public.get_subscription_plan_features(TEXT) IS
  'Returns display features for a subscription plan. Premium and Lifetime are Premium-tier for feature lists.';

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
                (lifecycle.plan_type IN ('plus', 'premium') AND lifecycle.billing_interval IN ('monthly', 'yearly'))
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

COMMENT ON FUNCTION public.get_creator_subscription_analytics() IS
  'Returns subscription counts grouped by plan, billing interval, effective lifecycle status, and provider, including trial-to-active counts, for creator dashboard.';

DROP FUNCTION IF EXISTS public.get_creator_subscription_daily_trends(TEXT, TEXT);

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
        SELECT
            DATE(se.created_at)::TEXT AS c_date,
            s.provider::TEXT AS c_provider,
            se.subscription_id AS sub_id
        FROM subscription_events se
        JOIN subscriptions s ON se.subscription_id = s.id
        WHERE se.new_status IN ('canceled', 'cancelled', 'unpaid', 'incomplete_expired', 'inactive')
          AND se.created_at >= p_start_date::date
          AND se.created_at < (p_end_date::date + interval '1 day')

        UNION

        SELECT
            DATE(s.canceled_at)::TEXT AS c_date,
            s.provider::TEXT AS c_provider,
            s.id AS sub_id
        FROM subscriptions s
        WHERE s.canceled_at IS NOT NULL
          AND s.provider IN ('stripe', 'app_store')
          AND s.canceled_at >= p_start_date::date
          AND s.canceled_at < (p_end_date::date + interval '1 day')
    )
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

    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'premium_monthly_active'::TEXT AS metric,
        s.provider::TEXT AS provider,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.provider IN ('stripe', 'app_store')
      AND s.plan = 'premium'
      AND s.billing_interval = 'monthly'
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at), s.provider

    UNION ALL

    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'premium_yearly_active'::TEXT AS metric,
        s.provider::TEXT AS provider,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.provider IN ('stripe', 'app_store')
      AND s.plan = 'premium'
      AND s.billing_interval = 'yearly'
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at), s.provider

    UNION ALL

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

    SELECT
        c_date AS metric_date,
        'cancelled'::TEXT AS metric,
        c_provider AS provider,
        COUNT(*)::BIGINT AS count
    FROM cancelled_combined
    GROUP BY c_date, c_provider

    UNION ALL

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

COMMENT ON FUNCTION public.get_creator_subscription_daily_trends IS
  'Returns daily subscription counts by metric and provider for creator dashboard trend charts. Bypasses RLS via SECURITY DEFINER.';
