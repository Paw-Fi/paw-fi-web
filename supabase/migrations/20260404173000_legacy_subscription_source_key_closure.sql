-- Normalize deterministically recoverable legacy source keys after the initial
-- source-table rollout. This is intentionally conservative: if a canonical key
-- is already occupied, leave the older row in place for runtime reconciliation
-- instead of deleting it during migration.

UPDATE public.subscription_entitlement_sources AS src
SET source_key = 'app_store:' || src.app_store_original_transaction_id,
    updated_at = now()
WHERE src.provider = 'app_store'
  AND src.app_store_original_transaction_id IS NOT NULL
  AND src.source_key <> 'app_store:' || src.app_store_original_transaction_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscription_entitlement_sources AS target
    WHERE target.provider = 'app_store'
      AND target.source_key = 'app_store:' || src.app_store_original_transaction_id
      AND target.id <> src.id
  );

UPDATE public.subscription_entitlement_sources AS src
SET source_key = 'app_store_legacy_transaction:' || src.app_store_transaction_id,
    updated_at = now()
WHERE src.provider = 'app_store'
  AND src.app_store_original_transaction_id IS NULL
  AND src.app_store_transaction_id IS NOT NULL
  AND src.source_key <>
    'app_store_legacy_transaction:' || src.app_store_transaction_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscription_entitlement_sources AS target
    WHERE target.provider = 'app_store'
      AND target.source_key =
        'app_store_legacy_transaction:' || src.app_store_transaction_id
      AND target.id <> src.id
  );

UPDATE public.subscription_entitlement_sources AS src
SET source_key = 'app_store_legacy_user:' || src.user_id::TEXT,
    updated_at = now()
WHERE src.provider = 'app_store'
  AND src.app_store_original_transaction_id IS NULL
  AND src.app_store_transaction_id IS NULL
  AND src.source_key <> 'app_store_legacy_user:' || src.user_id::TEXT
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscription_entitlement_sources AS target
    WHERE target.provider = 'app_store'
      AND target.source_key = 'app_store_legacy_user:' || src.user_id::TEXT
      AND target.id <> src.id
  );

UPDATE public.subscription_entitlement_sources AS src
SET source_key = 'stripe_subscription:' || src.stripe_subscription_id,
    updated_at = now()
WHERE src.provider = 'stripe'
  AND src.stripe_subscription_id IS NOT NULL
  AND src.source_key <> 'stripe_subscription:' || src.stripe_subscription_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscription_entitlement_sources AS target
    WHERE target.provider = 'stripe'
      AND target.source_key =
        'stripe_subscription:' || src.stripe_subscription_id
      AND target.id <> src.id
  );

UPDATE public.subscription_entitlement_sources AS src
SET source_key = 'stripe_lifetime:' || src.stripe_customer_id,
    updated_at = now()
WHERE src.provider = 'stripe'
  AND src.plan = 'lifetime'
  AND src.stripe_customer_id IS NOT NULL
  AND src.source_key <> 'stripe_lifetime:' || src.stripe_customer_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscription_entitlement_sources AS target
    WHERE target.provider = 'stripe'
      AND target.source_key = 'stripe_lifetime:' || src.stripe_customer_id
      AND target.id <> src.id
  );
