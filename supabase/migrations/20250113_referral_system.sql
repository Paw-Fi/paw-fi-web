-- ============================================================================
-- Referral System Migration
-- ============================================================================
-- Creates tables and functions for user referral system where users can
-- invite others and both parties receive lifetime access upon acceptance.
-- ============================================================================

-- ============================================================================
-- 1. Create referral_codes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    -- Each user can only have one ACTIVE referral code at a time (see partial unique index below)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id
    ON public.referral_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code
    ON public.referral_codes(code)
    WHERE is_active = true;

-- Ensure at most one ACTIVE referral code per user (allows historical rotation)
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_codes_user_active
    ON public.referral_codes(user_id)
    WHERE is_active = true;

-- ============================================================================
-- 2. Create referral_acceptances table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.referral_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
    referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    stripe_checkout_session_id TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent user from accepting the same code multiple times
    CONSTRAINT unique_referee_code UNIQUE(referee_user_id, referral_code_id),

    -- Prevent user from using their own referral code
    CONSTRAINT different_users CHECK (referrer_user_id != referee_user_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_acceptances_referrer
    ON public.referral_acceptances(referrer_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_acceptances_referee
    ON public.referral_acceptances(referee_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_acceptances_code_id
    ON public.referral_acceptances(referral_code_id);

CREATE INDEX IF NOT EXISTS idx_referral_acceptances_status
    ON public.referral_acceptances(status);

CREATE INDEX IF NOT EXISTS idx_referral_acceptances_session_id
    ON public.referral_acceptances(stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;

-- Prevent a user from having multiple active (pending/completed) acceptances across different codes
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_acceptances_referee_active
    ON public.referral_acceptances(referee_user_id)
    WHERE status IN ('pending', 'completed');

-- ============================================================================
-- 3. Create function to generate unique referral code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code (uppercase only for readability)
        new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM public.referral_codes WHERE code = new_code
        ) INTO code_exists;

        -- Exit loop if code is unique
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;

        -- Prevent infinite loop
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Create function to get or create referral code for user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id UUID)
RETURNS TABLE (
    code TEXT,
    created_at TIMESTAMPTZ,
    acceptance_count BIGINT
) AS $$
DECLARE
    v_code TEXT;
    v_created_at TIMESTAMPTZ;
    v_count BIGINT;
BEGIN
    -- Try to get existing code
    SELECT rc.code, rc.created_at
    INTO v_code, v_created_at
    FROM public.referral_codes rc
    WHERE rc.user_id = p_user_id AND rc.is_active = true
    LIMIT 1;

    -- If no code exists, create one
    IF v_code IS NULL THEN
        v_code := public.generate_unique_referral_code();

        INSERT INTO public.referral_codes (user_id, code)
        VALUES (p_user_id, v_code)
        RETURNING public.referral_codes.created_at INTO v_created_at;
    END IF;

    -- Get acceptance count
    SELECT COUNT(*)
    INTO v_count
    FROM public.referral_acceptances ra
    WHERE ra.referrer_user_id = p_user_id AND ra.status = 'completed';

    -- Return with explicit column aliases to avoid ambiguity
    RETURN QUERY SELECT v_code::TEXT AS code, v_created_at::TIMESTAMPTZ AS created_at, v_count::BIGINT AS acceptance_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Create trigger function to auto-generate code for new users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_referral_code_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate referral code for new user
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.id, public.generate_unique_referral_code());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for new user creation
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON auth.users;

CREATE TRIGGER trigger_auto_generate_referral_code
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_referral_code_for_new_user();

-- ============================================================================
-- 6. Create updated_at trigger for referral_codes
-- ============================================================================

DROP TRIGGER IF EXISTS update_referral_codes_updated_at ON public.referral_codes;

CREATE TRIGGER update_referral_codes_updated_at
BEFORE UPDATE ON public.referral_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. Create RLS policies for referral_codes
-- ============================================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral codes
CREATE POLICY "Users can view their own referral codes"
    ON public.referral_codes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all referral codes
CREATE POLICY "Service role can manage all referral codes"
    ON public.referral_codes
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. Create RLS policies for referral_acceptances
-- ============================================================================

ALTER TABLE public.referral_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view acceptances where they are the referrer
CREATE POLICY "Users can view their referrals"
    ON public.referral_acceptances
    FOR SELECT
    USING (auth.uid() = referrer_user_id);

-- Users can view acceptances where they are the referee
CREATE POLICY "Users can view their accepted referrals"
    ON public.referral_acceptances
    FOR SELECT
    USING (auth.uid() = referee_user_id);

-- Service role can manage all referral acceptances
CREATE POLICY "Service role can manage all referral acceptances"
    ON public.referral_acceptances
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 9. Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.referral_codes IS 'Stores unique referral codes for each user';
COMMENT ON TABLE public.referral_acceptances IS 'Tracks when users accept referral invitations';

COMMENT ON COLUMN public.referral_codes.code IS 'Unique 8-character alphanumeric referral code';
COMMENT ON COLUMN public.referral_codes.is_active IS 'Whether the referral code is currently active';

COMMENT ON COLUMN public.referral_acceptances.status IS 'Status of referral acceptance: pending (waiting for payment), completed (both upgraded), failed (payment failed)';
COMMENT ON COLUMN public.referral_acceptances.stripe_checkout_session_id IS 'Stripe checkout session ID for the referral acceptance payment';
COMMENT ON COLUMN public.referral_acceptances.referral_code_text IS 'Denormalized copy of the referral code for historical tracking';

-- ============================================================================
-- 10. Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referral_acceptances TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_unique_referral_code() TO service_role;
