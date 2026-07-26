ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS payment_interval TEXT
CHECK (payment_interval IN ('monthly', 'yearly'));

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS commitment_months INTEGER
CHECK (commitment_months IS NULL OR commitment_months > 0);

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS commitment_end TIMESTAMPTZ;
