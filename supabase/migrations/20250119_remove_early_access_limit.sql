-- Remove early access spot limit by updating the functions

-- Update get_remaining_spots to always return unlimited spots (represented as -1)
CREATE OR REPLACE FUNCTION get_remaining_spots()
RETURNS INTEGER AS $$
BEGIN
    -- Return -1 to indicate unlimited spots available
    RETURN -1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update claim_early_access_spot to remove spot limit checking
CREATE OR REPLACE FUNCTION claim_early_access_spot(
    p_email TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_referral_source TEXT DEFAULT NULL,
    p_experience_level TEXT DEFAULT NULL,
    p_financial_goals TEXT[] DEFAULT NULL,
    p_interested_features TEXT[] DEFAULT NULL,
    p_interests TEXT[] DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has already claimed (by user_id if provided, otherwise by email)
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM early_access_claims WHERE user_id = p_user_id) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You have already claimed a spot',
                'remaining_spots', -1
            );
        END IF;
    END IF;
    
    -- Try to insert the claim
    INSERT INTO early_access_claims (
        email, 
        first_name, 
        last_name, 
        referral_source, 
        experience_level, 
        financial_goals, 
        interested_features, 
        interests,
        user_id
    )
    VALUES (
        p_email, 
        p_first_name, 
        p_last_name, 
        p_referral_source, 
        p_experience_level, 
        p_financial_goals, 
        p_interested_features, 
        p_interests,
        p_user_id
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Spot claimed successfully!',
        'remaining_spots', -1
    );
    
EXCEPTION
    WHEN unique_violation THEN
        -- Check if it's email or user_id violation
        IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM early_access_claims WHERE user_id = p_user_id) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You have already claimed a spot',
                'remaining_spots', -1
            );
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Email already claimed a spot',
                'remaining_spots', -1
            );
        END IF;
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An error occurred while claiming spot',
            'remaining_spots', -1
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
