-- Migration: Fix ambiguous column reference in get_or_create_referral_code function
-- Issue: Column names in RETURN QUERY were ambiguous with function return type column names
-- Fix: Add explicit type casts to disambiguate column references

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

    -- Return with explicit type casts to avoid ambiguity
    RETURN QUERY SELECT v_code::TEXT, v_created_at::TIMESTAMPTZ, v_count::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
