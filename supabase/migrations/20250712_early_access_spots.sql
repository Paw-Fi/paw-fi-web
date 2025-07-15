-- Create early access spots tracking table
CREATE TABLE IF NOT EXISTS early_access_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    referral_source VARCHAR(100),
    experience_level VARCHAR(100),
    financial_goals TEXT[], -- Array of financial goals
    interested_features TEXT[], -- Array of interested features
    interests TEXT[], -- Legacy field for backward compatibility
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_early_access_claims_user_id ON early_access_claims(user_id);

-- Add RLS policies
ALTER TABLE early_access_claims ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (for claiming spots)
CREATE POLICY "Allow public to insert early access claims" ON early_access_claims
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Allow authenticated users to read their own claims
CREATE POLICY "Users can read their own claims" ON early_access_claims
    FOR SELECT TO authenticated
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
        OR user_id = auth.uid()
    );

-- Create function to get remaining spots count
CREATE OR REPLACE FUNCTION get_remaining_spots()
RETURNS INTEGER AS $$
DECLARE
    total_spots INTEGER := 100; -- Set your total spots limit here
    claimed_spots INTEGER;
BEGIN
    SELECT COUNT(*) INTO claimed_spots FROM early_access_claims;
    RETURN GREATEST(0, total_spots - claimed_spots);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_remaining_spots() TO anon, authenticated;

-- Create function to claim a spot
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
    remaining_spots INTEGER;
    result JSON;
BEGIN
    -- Check if spots are available
    SELECT get_remaining_spots() INTO remaining_spots;
    
    IF remaining_spots <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No spots remaining',
            'remaining_spots', 0
        );
    END IF;
    
    -- Check if user has already claimed (by user_id if provided, otherwise by email)
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM early_access_claims WHERE user_id = p_user_id) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You have already claimed a spot',
                'remaining_spots', remaining_spots
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
    
    -- Get updated remaining spots
    SELECT get_remaining_spots() INTO remaining_spots;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Spot claimed successfully!',
        'remaining_spots', remaining_spots
    );
    
EXCEPTION
    WHEN unique_violation THEN
        -- Check if it's email or user_id violation
        IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM early_access_claims WHERE user_id = p_user_id) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You have already claimed a spot',
                'remaining_spots', remaining_spots
            );
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Email already claimed a spot',
                'remaining_spots', remaining_spots
            );
        END IF;
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An error occurred while claiming spot',
            'remaining_spots', remaining_spots
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION claim_early_access_spot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[], UUID) TO anon, authenticated;

-- Add trigger to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_early_access_claims_updated_at
    BEFORE UPDATE ON early_access_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();