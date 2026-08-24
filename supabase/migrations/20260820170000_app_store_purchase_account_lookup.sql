-- Read-only forensic lookup for correlating an App Store invoice time with the
-- durable account-mapping evidence retained by the subscription system.
CREATE OR REPLACE FUNCTION public.find_app_store_purchase_accounts(
    p_started_at TIMESTAMPTZ,
    p_ended_at TIMESTAMPTZ
)
RETURNS TABLE (
    evidence_source TEXT,
    evidence_at TIMESTAMPTZ,
    user_id UUID,
    email TEXT,
    original_transaction_id TEXT,
    transaction_id TEXT,
    store_product_id TEXT,
    environment TEXT,
    subscription_plan TEXT,
    subscription_status TEXT,
    mapping_status TEXT,
    details JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH account_emails AS (
        SELECT
            u.id,
            COALESCE(p.email, u.email) AS email
        FROM auth.users u
        LEFT JOIN public.users p ON p.id = u.id
    )
    SELECT
        'subscription_created'::TEXT AS evidence_source,
        s.created_at AS evidence_at,
        s.user_id,
        e.email,
        s.app_store_original_transaction_id,
        s.app_store_transaction_id,
        s.store_product_id,
        s.app_store_environment,
        s.plan,
        s.status,
        'resolved'::TEXT AS mapping_status,
        jsonb_build_object(
            'subscription_id', s.id,
            'current_period_end', s.current_period_end,
            'cancel_at_period_end', s.cancel_at_period_end
        ) AS details
    FROM public.subscriptions s
    LEFT JOIN account_emails e ON e.id = s.user_id
    WHERE s.provider = 'app_store'
      AND s.created_at >= p_started_at
      AND s.created_at < p_ended_at

    UNION ALL

    SELECT
        'subscription_updated'::TEXT,
        s.updated_at,
        s.user_id,
        e.email,
        s.app_store_original_transaction_id,
        s.app_store_transaction_id,
        s.store_product_id,
        s.app_store_environment,
        s.plan,
        s.status,
        'resolved'::TEXT,
        jsonb_build_object(
            'subscription_id', s.id,
            'current_period_end', s.current_period_end,
            'cancel_at_period_end', s.cancel_at_period_end
        )
    FROM public.subscriptions s
    LEFT JOIN account_emails e ON e.id = s.user_id
    WHERE s.provider = 'app_store'
      AND s.updated_at >= p_started_at
      AND s.updated_at < p_ended_at
      AND s.updated_at IS DISTINCT FROM s.created_at

    UNION ALL

    SELECT
        'iap_purchase_verified'::TEXT,
        i.created_at,
        i.user_id,
        e.email,
        NULL::TEXT,
        i.event_key,
        i.store_product_id,
        NULL::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        'resolved'::TEXT,
        jsonb_build_object(
            'iap_event_id', i.id,
            'event_key', i.event_key,
            'event_key_is_transaction_or_original_transaction_id', true
        )
    FROM public.iap_events i
    LEFT JOIN account_emails e ON e.id = i.user_id
    WHERE i.provider = 'app_store'
      AND i.created_at >= p_started_at
      AND i.created_at < p_ended_at

    UNION ALL

    SELECT
        'ownership_binding_claimed'::TEXT,
        b.claimed_at,
        b.user_id,
        e.email,
        b.original_transaction_id,
        b.first_seen_transaction_id,
        b.store_product_id,
        b.app_store_environment,
        NULL::TEXT,
        NULL::TEXT,
        'resolved'::TEXT,
        jsonb_build_object(
            'claim_source', b.claim_source,
            'latest_transaction_id', b.latest_transaction_id,
            'last_verified_at', b.last_verified_at
        )
    FROM public.iap_account_bindings b
    LEFT JOIN account_emails e ON e.id = b.user_id
    WHERE b.provider = 'app_store'
      AND b.claimed_at >= p_started_at
      AND b.claimed_at < p_ended_at

    UNION ALL

    SELECT
        'notification_backlog_first_seen'::TEXT,
        b.first_seen_at,
        b.resolved_user_id,
        e.email,
        b.original_transaction_id,
        b.transaction_id,
        b.store_product_id,
        b.notification_environment,
        NULL::TEXT,
        NULL::TEXT,
        CASE WHEN b.resolved_at IS NULL THEN 'pending' ELSE 'resolved' END,
        jsonb_build_object(
            'last_seen_at', b.last_seen_at,
            'resolved_at', b.resolved_at,
            'resolution_source', b.resolution_source,
            'candidate_app_account_token', b.candidate_app_account_token,
            'user_id_source', b.user_id_source,
            'pending_attempts', b.pending_attempts,
            'last_error', b.last_error
        )
    FROM public.app_store_notification_backlog b
    LEFT JOIN account_emails e ON e.id = b.resolved_user_id
    WHERE b.first_seen_at >= p_started_at
      AND b.first_seen_at < p_ended_at

    UNION ALL

    SELECT
        'ownership_conflict_detected'::TEXT,
        c.detected_at,
        NULL::UUID,
        NULL::TEXT,
        c.original_transaction_id,
        NULL::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        'conflict'::TEXT,
        jsonb_build_object(
            'candidate_user_ids', c.candidate_user_ids,
            'resolved_at', c.resolved_at,
            'notes', c.notes
        )
    FROM public.iap_account_binding_conflicts c
    WHERE c.provider = 'app_store'
      AND c.detected_at >= p_started_at
      AND c.detected_at < p_ended_at;
$$;

REVOKE ALL ON FUNCTION public.find_app_store_purchase_accounts(TIMESTAMPTZ, TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.find_app_store_purchase_accounts(TIMESTAMPTZ, TIMESTAMPTZ)
TO service_role;

COMMENT ON FUNCTION public.find_app_store_purchase_accounts(TIMESTAMPTZ, TIMESTAMPTZ)
IS 'Returns durable App Store subscription, ownership-binding, backlog, and conflict evidence within a timestamp window. Service-role only.';
