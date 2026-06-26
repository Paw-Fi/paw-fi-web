-- Add Premium as an inactive, catalog-driven IAP offering.
-- Provider products must be created and smoke-tested before these rows are activated.

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
    'More power, billed monthly.',
    NULL,
    FALSE,
    NULL,
    NULL,
    FALSE,
    20
  ),
  (
    'ios',
    'premium',
    'yearly',
    'premium_yearly',
    'Premium Yearly',
    'More power, best value for 12 months.',
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
    'monthly',
    'premium_monthly',
    'Premium Monthly',
    'More power, billed monthly.',
    NULL,
    FALSE,
    NULL,
    NULL,
    FALSE,
    20
  ),
  (
    'android',
    'premium',
    'yearly',
    'premium_yearly',
    'Premium Yearly',
    'More power, best value for 12 months.',
    NULL,
    FALSE,
    NULL,
    NULL,
    FALSE,
    30
  )
ON CONFLICT DO NOTHING;
