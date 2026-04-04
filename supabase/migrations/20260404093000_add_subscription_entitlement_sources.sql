-- Durable per-provider subscription entitlement sources.
-- Keep public.subscriptions as the compatibility projection that clients read,
-- but persist each provider lineage independently so mixed-platform accounts
-- cannot overwrite each other's source state.

CREATE TABLE IF NOT EXISTS public.subscription_entitlement_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'app_store', 'play_store')),
    source_key TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('free', 'plus', 'premium', 'lifetime')),
    status TEXT NOT NULL CHECK (
        status IN (
            'active',
            'trialing',
            'past_due',
            'canceled',
            'incomplete',
            'incomplete_expired',
            'unpaid',
            'paused'
        )
    ),
    billing_interval TEXT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    current_period_end TIMESTAMPTZ NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    trial_start TIMESTAMPTZ NULL,
    trial_end TIMESTAMPTZ NULL,
    stripe_customer_id TEXT NULL,
    stripe_subscription_id TEXT NULL,
    store_product_id TEXT NULL,
    app_store_transaction_id TEXT NULL,
    app_store_original_transaction_id TEXT NULL,
    app_store_environment TEXT NULL,
    play_purchase_token TEXT NULL,
    play_order_id TEXT NULL,
    play_package_name TEXT NULL,
    current_price_id TEXT NULL,
    original_price_id TEXT NULL,
    previous_plan TEXT NULL CHECK (previous_plan IN ('free', 'plus', 'premium', 'lifetime')),
    previous_interval TEXT NULL CHECK (previous_interval IN ('monthly', 'yearly')),
    last_event_id TEXT NULL,
    source_created_at TIMESTAMPTZ NULL,
    source_updated_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_entitlement_sources_provider_source_key_unique
ON public.subscription_entitlement_sources (provider, source_key);

CREATE INDEX IF NOT EXISTS subscription_entitlement_sources_user_id_idx
ON public.subscription_entitlement_sources (user_id);

DROP TRIGGER IF EXISTS trigger_subscription_entitlement_sources_updated_at
ON public.subscription_entitlement_sources;

CREATE TRIGGER trigger_subscription_entitlement_sources_updated_at
BEFORE UPDATE ON public.subscription_entitlement_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subscription_entitlement_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage subscription entitlement sources"
ON public.subscription_entitlement_sources;

CREATE POLICY "Service role can manage subscription entitlement sources"
    ON public.subscription_entitlement_sources
    FOR ALL
    USING (auth.role() = 'service_role');

INSERT INTO public.subscription_entitlement_sources (
    user_id,
    provider,
    source_key,
    plan,
    status,
    billing_interval,
    current_period_end,
    cancel_at_period_end,
    trial_start,
    trial_end,
    stripe_customer_id,
    stripe_subscription_id,
    store_product_id,
    app_store_transaction_id,
    app_store_original_transaction_id,
    app_store_environment,
    play_purchase_token,
    play_order_id,
    play_package_name,
    current_price_id,
    original_price_id,
    previous_plan,
    previous_interval,
    last_event_id,
    source_created_at,
    source_updated_at,
    created_at,
    updated_at
)
SELECT
    s.user_id,
    s.provider,
    CASE
        WHEN s.provider = 'stripe' AND s.stripe_subscription_id IS NOT NULL
            THEN 'stripe_subscription:' || s.stripe_subscription_id
        WHEN s.provider = 'stripe' AND s.plan = 'lifetime'
            THEN 'stripe_lifetime:' || COALESCE(s.stripe_customer_id, s.user_id::TEXT)
        WHEN s.provider = 'app_store' AND s.app_store_original_transaction_id IS NOT NULL
            THEN 'app_store:' || s.app_store_original_transaction_id
        WHEN s.provider = 'play_store' AND s.play_purchase_token IS NOT NULL
            THEN 'play_store:' || s.play_purchase_token
        ELSE s.provider || ':legacy:' || s.user_id::TEXT
    END AS source_key,
    s.plan,
    s.status,
    s.billing_interval,
    s.current_period_end,
    s.cancel_at_period_end,
    s.trial_start,
    s.trial_end,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.store_product_id,
    s.app_store_transaction_id,
    s.app_store_original_transaction_id,
    s.app_store_environment,
    s.play_purchase_token,
    s.play_order_id,
    s.play_package_name,
    s.current_price_id,
    s.original_price_id,
    s.previous_plan,
    s.previous_interval,
    s.last_event_id,
    s.created_at,
    COALESCE(s.updated_at, s.created_at),
    s.created_at,
    COALESCE(s.updated_at, s.created_at)
FROM public.subscriptions s
ON CONFLICT (provider, source_key) DO UPDATE
SET plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    billing_interval = EXCLUDED.billing_interval,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    store_product_id = EXCLUDED.store_product_id,
    app_store_transaction_id = EXCLUDED.app_store_transaction_id,
    app_store_original_transaction_id = EXCLUDED.app_store_original_transaction_id,
    app_store_environment = EXCLUDED.app_store_environment,
    play_purchase_token = EXCLUDED.play_purchase_token,
    play_order_id = EXCLUDED.play_order_id,
    play_package_name = EXCLUDED.play_package_name,
    current_price_id = EXCLUDED.current_price_id,
    original_price_id = EXCLUDED.original_price_id,
    previous_plan = EXCLUDED.previous_plan,
    previous_interval = EXCLUDED.previous_interval,
    last_event_id = EXCLUDED.last_event_id,
    source_created_at = EXCLUDED.source_created_at,
    source_updated_at = EXCLUDED.source_updated_at,
    updated_at = EXCLUDED.updated_at;
