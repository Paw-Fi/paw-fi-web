-- Allow the compatibility projection row to become provider-neutral when
-- projected access resolves to free. Durable provider lineage remains in
-- subscription_entitlement_sources.

ALTER TABLE public.subscriptions
ALTER COLUMN provider DROP NOT NULL;

COMMENT ON COLUMN public.subscriptions.provider IS
  'Current projected entitlement provider; NULL means the compatibility row currently resolves to free/no active provider.';
