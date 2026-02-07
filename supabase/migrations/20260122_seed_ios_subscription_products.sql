-- Seed iOS subscription products for Plan Selection
-- Created: 2026-01-22
-- Notes:
--   - Actual charge price is controlled by App Store Connect.
--   - display_price_usd/original_price_usd are used for marketing + fallback display.

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
SELECT
  x.platform,
  x.plan,
  x.billing_interval,
  x.store_product_id,
  x.display_name,
  x.tagline,
  x.badge_text,
  x.is_popular,
  x.display_price_usd,
  x.original_price_usd,
  x.is_active,
  x.sort_order
FROM (
  VALUES
    -- Monthly subscription
    (
      'ios',
      'plus',
      'monthly',
      'monthly',
      'Monthly',
      'Flexible. Cancel anytime.',
      NULL,
      FALSE,
      5.99::numeric,
      7.99::numeric,
      TRUE,
      0
    ),
    -- Yearly subscription (best value)
    (
      'ios',
      'plus',
      'yearly',
      'yearly',
      'Yearly',
      'Best value for 12 months.',
      'SAVE 50%',
      TRUE,
      29.99::numeric,
      59.99::numeric,
      TRUE,
      10
    ),
    -- Lifetime early bird: one-time purchase, will be removed after sale
    (
      'ios',
      'lifetime',
      NULL,
      'lifetime_earlybird',
      'Lifetime',
      'Pay once, own it forever.',
      'EARLY BIRD',
      FALSE,
      39.99::numeric,
      NULL::numeric,
      TRUE,
      20
    )
) AS x(
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
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscription_products sp
  WHERE sp.platform = x.platform
    AND sp.store_product_id = x.store_product_id
);
