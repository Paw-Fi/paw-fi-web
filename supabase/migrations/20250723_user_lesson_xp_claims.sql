-- User Lesson XP Claims Table
-- This table tracks which users have claimed XP for which lessons to prevent duplicate claims

CREATE TABLE IF NOT EXISTS public.user_lesson_xp_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.user_lessons(id) ON DELETE CASCADE,
    xp_claimed INTEGER NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure a user can only claim XP once per lesson
    UNIQUE(user_id, lesson_id)
);

-- Add RLS policies for security
ALTER TABLE public.user_lesson_xp_claims ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own XP claims
CREATE POLICY "Users can view own XP claims" ON public.user_lesson_xp_claims
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own XP claims
CREATE POLICY "Users can insert own XP claims" ON public.user_lesson_xp_claims
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_lesson_xp_claims_user_lesson 
    ON public.user_lesson_xp_claims(user_id, lesson_id);

-- Create index for user-based queries
CREATE INDEX IF NOT EXISTS idx_user_lesson_xp_claims_user_id 
    ON public.user_lesson_xp_claims(user_id);