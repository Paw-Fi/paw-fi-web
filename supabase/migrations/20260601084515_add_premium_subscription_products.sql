-- Add Premium as a catalog-supported recurring plan.
-- Existing subscriptions already allow plan = 'premium'; this migration enables
-- App Store / Play Store product catalog rows to map to Premium.

ALTER TABLE public.subscription_products
DROP CONSTRAINT IF EXISTS subscription_products_plan_check;

ALTER TABLE public.subscription_products
ADD CONSTRAINT subscription_products_plan_check
CHECK (plan IN ('plus', 'premium', 'lifetime'));

INSERT INTO public.subscription_products (
  platform,
  plan,
  billing_interval,
  store_product_id,
  display_name,
  tagline,
  badge_text,
  is_popular,
  display_price_usd,
  original_price_usd,
  is_active,
  sort_order
)
VALUES
  (
    'ios',
    'premium',
    'monthly',
    'premium_monthly',
    'Premium Monthly',
    'Higher-tier monthly subscription.',
    NULL,
    FALSE,
    NULL,
    NULL,
    FALSE,
    30
  ),
  (
    'ios',
    'premium',
    'yearly',
    'premium_yearly',
    'Premium Yearly',
    'Higher-tier annual subscription.',
    NULL,
    FALSE,
    NULL,
    NULL,
    FALSE,
    40
  ),
  (
    'android',
    'premium',
    'monthly',
    'premium_monthly',
    'Premium Monthly',
    'Higher-tier monthly subscription.',
    NULL,
    FALSE,
    NULL,
    NULL,
    FALSE,
    30
  ),
  (
    'android',
    'premium',
    'yearly',
    'premium_yearly',
    'Premium Yearly',
    'Higher-tier annual subscription.',
    NULL,
    FALSE,
    NULL,
    NULL,
    FALSE,
    40
  )
ON CONFLICT (platform, store_product_id) DO NOTHING;
