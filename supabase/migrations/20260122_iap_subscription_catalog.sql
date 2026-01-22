-- In-App Purchase Catalog + Subscription Provider Support
-- Created: 2026-01-22
-- Purpose:
--   1) Store IAP product IDs in DB so offerings can be changed without app releases
--   2) Extend subscriptions table to support App Store / Play Store purchases

-- ============================================================================
-- 1. Subscription products (catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    plan TEXT NOT NULL CHECK (plan IN ('plus', 'lifetime')),
    billing_interval TEXT NULL CHECK (billing_interval IN ('monthly', 'yearly')),

    -- Store product identifier (App Store Connect product id / Play Console product id)
    store_product_id TEXT NOT NULL,

    -- Marketing fields (do not affect actual store price)
    display_name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    badge_text TEXT NULL,
    is_popular BOOLEAN NOT NULL DEFAULT false,

    -- Optional pricing for fallback display and marketing anchors.
    -- NOTE: Actual purchase price is always determined by the store.
    display_price_usd NUMERIC(10, 2) NULL,
    original_price_usd NUMERIC(10, 2) NULL,

    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active offering per plan/interval/platform (swap SKU by inserting a new row and toggling is_active)
CREATE UNIQUE INDEX IF NOT EXISTS subscription_products_one_active_per_tier
ON public.subscription_products (platform, plan, billing_interval)
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_products_platform_store_product_id
ON public.subscription_products (platform, store_product_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trigger_subscription_products_updated_at ON public.subscription_products;
CREATE TRIGGER trigger_subscription_products_updated_at
BEFORE UPDATE ON public.subscription_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.subscription_products ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read the catalog
DROP POLICY IF EXISTS "Authenticated users can read subscription products" ON public.subscription_products;
CREATE POLICY "Authenticated users can read subscription products"
    ON public.subscription_products
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Service role manages catalog
DROP POLICY IF EXISTS "Service role can manage subscription products" ON public.subscription_products;
CREATE POLICY "Service role can manage subscription products"
    ON public.subscription_products
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. Extend subscriptions to support IAP providers
-- ============================================================================

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'app_store', 'play_store'));

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS store_product_id TEXT;

-- Apple identifiers
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS app_store_transaction_id TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS app_store_original_transaction_id TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS app_store_environment TEXT;

-- Google identifiers
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS play_purchase_token TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS play_order_id TEXT;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS play_package_name TEXT;

-- ============================================================================
-- 3. IAP event idempotency
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.iap_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL CHECK (provider IN ('app_store', 'play_store')),
    event_key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_product_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS iap_events_provider_event_key_unique
ON public.iap_events (provider, event_key);

ALTER TABLE public.iap_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage iap events" ON public.iap_events;
CREATE POLICY "Service role can manage iap events"
    ON public.iap_events
    FOR ALL
    USING (auth.role() = 'service_role');
