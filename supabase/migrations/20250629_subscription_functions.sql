-- Create subscriptions table to store all subscription-related data
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Add index for faster lookups by stripe_subscription_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Add index for faster lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);

-- Create a user_stripe_mapping table instead of modifying auth.users
CREATE TABLE IF NOT EXISTS public.user_stripe_mapping (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create RLS policies for the subscriptions table
-- Allow users to read only their own subscription data
CREATE POLICY IF NOT EXISTS "Users can view their own subscriptions"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only allow service role to insert/update/delete subscription data
CREATE POLICY IF NOT EXISTS "Service role can manage all subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the user_stripe_mapping table
CREATE POLICY IF NOT EXISTS "Users can view their own stripe mapping"
    ON public.user_stripe_mapping
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only allow service role to insert/update/delete stripe mapping data
CREATE POLICY IF NOT EXISTS "Service role can manage all stripe mappings"
    ON public.user_stripe_mapping
    FOR ALL
    USING (auth.role() = 'service_role');

-- Enable Row Level Security
ALTER TABLE public.user_stripe_mapping ENABLE ROW LEVEL SECURITY;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for active subscriptions
CREATE OR REPLACE VIEW public.active_subscriptions AS
SELECT 
    s.*,
    u.email
FROM 
    public.subscriptions s
JOIN 
    auth.users u ON s.user_id = u.id
WHERE 
    s.status IN ('active', 'trialing')
    AND (s.current_period_end > now() OR s.status = 'trialing');

-- Function to get current subscription information for a user
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    plan TEXT,
    status TEXT,
    current_period_end TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.plan,
        s.status,
        s.current_period_end,
        CASE 
            WHEN s.cancel_at_period_end THEN NULL
            ELSE s.current_period_end
        END as next_payment_date,
        s.cancel_at_period_end,
        s.stripe_subscription_id,
        s.stripe_customer_id,
        s.created_at,
        s.updated_at
    FROM 
        public.subscriptions s
    WHERE 
        s.user_id = p_user_id
    ORDER BY 
        s.created_at DESC
    LIMIT 1;
END;
$$;

-- Function to check if a user has an active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_active BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE 
            s.user_id = p_user_id
            AND s.status IN ('active', 'trialing')
            AND (s.current_period_end > now() OR s.status = 'trialing')
    ) INTO v_has_active;
    
    RETURN v_has_active;
END;
$$;

-- Function to get subscription plan features
CREATE OR REPLACE FUNCTION public.get_subscription_plan_features(p_plan TEXT)
RETURNS TABLE (
    feature TEXT,
    included BOOLEAN,
    limit_value INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This is a placeholder. In a real implementation, you would have a plan_features table
    -- and query that table based on the plan name.
    
    -- For now, we'll return hardcoded features for demonstration
    RETURN QUERY
    SELECT 'Advanced Analytics'::TEXT, 
           CASE WHEN p_plan IN ('premium', 'plus') THEN TRUE ELSE FALSE END,
           NULL::INTEGER
    UNION ALL
    SELECT 'Custom Dashboards'::TEXT,
           CASE WHEN p_plan = 'premium' THEN TRUE ELSE FALSE END,
           NULL::INTEGER
    UNION ALL
    SELECT 'Learning Modules'::TEXT,
           TRUE,
           CASE 
               WHEN p_plan = 'premium' THEN NULL -- Unlimited
               WHEN p_plan = 'plus' THEN 10
               ELSE 3
           END;
END;
$$;

-- Function to get user's stripe customer ID
CREATE OR REPLACE FUNCTION public.get_user_stripe_customer_id(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stripe_customer_id TEXT;
BEGIN
    SELECT stripe_customer_id INTO v_stripe_customer_id
    FROM public.subscriptions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN v_stripe_customer_id;
END;
$$;
