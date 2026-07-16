-- Paid Subscriptions Daily Counts (Excluding Bound/Household-Shared)
-- Created: 2026-07-16
-- Returns daily counts of NEW paid subscriptions by plan type (monthly/yearly/lifetime).
-- Excludes all bound (household-shared) subscriptions — only direct paying subscribers.

DROP FUNCTION IF EXISTS public.get_paid_subscriptions_daily(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_paid_subscriptions_daily(
    p_start_date TEXT,
    p_end_date TEXT
)
RETURNS TABLE (
    metric_date TEXT,
    subscription_type TEXT,
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
    -- Monthly
    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'monthly'::TEXT AS subscription_type,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.bound_to_user_id IS NULL
      AND s.stripe_subscription_id IS NOT NULL
      AND s.provider IN ('stripe', 'app_store', 'play_store')
      AND s.plan IN ('plus', 'premium')
      AND s.billing_interval = 'monthly'
      AND s.status NOT IN ('incomplete', 'incomplete_expired')
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at)

    UNION ALL

    -- Yearly
    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'yearly'::TEXT AS subscription_type,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.bound_to_user_id IS NULL
      AND s.stripe_subscription_id IS NOT NULL
      AND s.provider IN ('stripe', 'app_store', 'play_store')
      AND s.plan IN ('plus', 'premium')
      AND s.billing_interval = 'yearly'
      AND s.status NOT IN ('incomplete', 'incomplete_expired')
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at)

    UNION ALL

    -- Lifetime
    SELECT
        DATE(s.created_at)::TEXT AS metric_date,
        'lifetime'::TEXT AS subscription_type,
        COUNT(*)::BIGINT AS count
    FROM subscriptions s
    WHERE s.bound_to_user_id IS NULL
      AND s.stripe_subscription_id IS NOT NULL
      AND s.provider IN ('stripe', 'app_store', 'play_store')
      AND s.plan = 'lifetime'
      AND s.status NOT IN ('incomplete', 'incomplete_expired')
      AND s.created_at >= p_start_date::date
      AND s.created_at < (p_end_date::date + interval '1 day')
    GROUP BY DATE(s.created_at)

    ORDER BY metric_date, subscription_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_paid_subscriptions_daily(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paid_subscriptions_daily(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.get_paid_subscriptions_daily IS
    'Daily counts of new paid subscriptions by type (monthly/yearly/lifetime). Excludes bound household-shared subscriptions.';
