CREATE TABLE IF NOT EXISTS public.app_store_notification_backlog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL DEFAULT 'app_store' CHECK (provider = 'app_store'),
    original_transaction_id TEXT NOT NULL,
    transaction_id TEXT NULL,
    transaction_key TEXT GENERATED ALWAYS AS (COALESCE(transaction_id, '')) STORED,
    store_product_id TEXT NULL,
    notification_environment TEXT NULL,
    candidate_app_account_token TEXT NULL,
    user_id_source TEXT NULL,
    pending_attempts INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ NULL,
    resolved_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_source TEXT NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_store_notification_backlog_unique_idx
ON public.app_store_notification_backlog (provider, original_transaction_id, transaction_key);

CREATE INDEX IF NOT EXISTS app_store_notification_backlog_resolved_idx
ON public.app_store_notification_backlog (resolved_at, last_seen_at);

ALTER TABLE public.app_store_notification_backlog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage app store notification backlog"
ON public.app_store_notification_backlog;

CREATE POLICY "Service role can manage app store notification backlog"
    ON public.app_store_notification_backlog
    FOR ALL
    USING (auth.role() = 'service_role');
