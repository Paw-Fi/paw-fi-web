-- User Activities Table
-- This table tracks user activities with flexible JSON data structure

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for security
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own activities
CREATE POLICY "Users can view own activities" ON public.user_activities
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only service role (edge functions) can insert activities
CREATE POLICY "Service role can insert activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Enable realtime on user_activities table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activities;