-- Immutable ownership for App Store purchase lineages.
-- Keep subscriptions as the current entitlement projection, but bind each
-- original transaction id to exactly one internal user.

CREATE TABLE IF NOT EXISTS public.iap_account_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL CHECK (provider IN ('app_store')),
    original_transaction_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_seen_transaction_id TEXT NULL,
    latest_transaction_id TEXT NULL,
    store_product_id TEXT NULL,
    app_store_environment TEXT NULL,
    claim_source TEXT NOT NULL DEFAULT 'verify_purchase',
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS iap_account_bindings_provider_original_transaction_unique
ON public.iap_account_bindings (provider, original_transaction_id);

CREATE INDEX IF NOT EXISTS iap_account_bindings_user_id_idx
ON public.iap_account_bindings (user_id);

ALTER TABLE public.iap_account_bindings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage iap account bindings" ON public.iap_account_bindings;
CREATE POLICY "Service role can manage iap account bindings"
    ON public.iap_account_bindings
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.iap_account_binding_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL CHECK (provider IN ('app_store')),
    original_transaction_id TEXT NOT NULL,
    candidate_user_ids UUID[] NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS iap_account_binding_conflicts_provider_original_transaction_unique
ON public.iap_account_binding_conflicts (provider, original_transaction_id);

ALTER TABLE public.iap_account_binding_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage iap account binding conflicts" ON public.iap_account_binding_conflicts;
CREATE POLICY "Service role can manage iap account binding conflicts"
    ON public.iap_account_binding_conflicts
    FOR ALL
    USING (auth.role() = 'service_role');

WITH unique_owners AS (
    SELECT
        'app_store'::TEXT AS provider,
        s.app_store_original_transaction_id AS original_transaction_id,
        (ARRAY_AGG(DISTINCT s.user_id::TEXT ORDER BY s.user_id::TEXT))[1]::UUID AS user_id,
        MAX(s.app_store_transaction_id) AS latest_transaction_id,
        MAX(s.store_product_id) AS store_product_id,
        MAX(s.app_store_environment) AS app_store_environment,
        COUNT(DISTINCT s.user_id) AS owner_count,
        MIN(COALESCE(s.updated_at, s.created_at, now())) AS first_seen_at,
        MAX(COALESCE(s.updated_at, s.created_at, now())) AS last_seen_at
    FROM public.subscriptions s
    WHERE s.provider = 'app_store'
      AND s.app_store_original_transaction_id IS NOT NULL
      AND s.user_id IS NOT NULL
    GROUP BY s.app_store_original_transaction_id
), inserted_bindings AS (
    INSERT INTO public.iap_account_bindings (
        provider,
        original_transaction_id,
        user_id,
        first_seen_transaction_id,
        latest_transaction_id,
        store_product_id,
        app_store_environment,
        claim_source,
        claimed_at,
        last_verified_at,
        created_at,
        updated_at
    )
    SELECT
        provider,
        original_transaction_id,
        user_id,
        latest_transaction_id,
        latest_transaction_id,
        store_product_id,
        app_store_environment,
        'legacy_backfill',
        first_seen_at,
        last_seen_at,
        first_seen_at,
        last_seen_at
    FROM unique_owners
    WHERE owner_count = 1
    ON CONFLICT (provider, original_transaction_id) DO NOTHING
    RETURNING original_transaction_id
)
INSERT INTO public.iap_account_binding_conflicts (
    provider,
    original_transaction_id,
    candidate_user_ids,
    notes,
    created_at,
    updated_at
)
SELECT
    'app_store',
    s.app_store_original_transaction_id,
    ARRAY_AGG(DISTINCT s.user_id ORDER BY s.user_id),
    'Legacy backfill skipped because multiple internal users share the same App Store original transaction id.',
    now(),
    now()
FROM public.subscriptions s
WHERE s.provider = 'app_store'
  AND s.app_store_original_transaction_id IS NOT NULL
  AND s.user_id IS NOT NULL
GROUP BY s.app_store_original_transaction_id
HAVING COUNT(DISTINCT s.user_id) > 1
ON CONFLICT (provider, original_transaction_id) DO UPDATE
SET candidate_user_ids = EXCLUDED.candidate_user_ids,
    updated_at = EXCLUDED.updated_at,
    notes = EXCLUDED.notes;
