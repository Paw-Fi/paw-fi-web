-- Create couple budgeting waitlist table
CREATE TABLE IF NOT EXISTS couple_budgeting_waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    referral_source VARCHAR(100),
    budgeting_method VARCHAR(100),
    mobile_app_priorities TEXT[], -- Array of mobile app priorities
    interested_mobile_features TEXT[], -- Array of interested mobile features
    device_preference VARCHAR(50), -- ios, android, desktop
    user_id UUID REFERENCES auth.users(id),
    waitlist_type VARCHAR(50) DEFAULT 'couple_budgeting', -- To distinguish from other waitlists
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_couple_budgeting_waitlist_user_id ON couple_budgeting_waitlist(user_id);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_couple_budgeting_waitlist_email ON couple_budgeting_waitlist(email);

-- Add RLS policies
ALTER TABLE couple_budgeting_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (for claiming spots)
CREATE POLICY "Allow public to insert couple budgeting waitlist" ON couple_budgeting_waitlist
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Allow authenticated users to read their own claims
CREATE POLICY "Users can read their own couple budgeting claims" ON couple_budgeting_waitlist
    FOR SELECT TO authenticated
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR user_id = auth.uid()
    );

-- Allow authenticated users to update their own claims
CREATE POLICY "Users can update their own couple budgeting claims" ON couple_budgeting_waitlist
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to delete their own claims
CREATE POLICY "Users can delete their own couple budgeting claims" ON couple_budgeting_waitlist
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Create function to get couple budgeting waitlist count
CREATE OR REPLACE FUNCTION get_couple_budgeting_waitlist_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM couple_budgeting_waitlist);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_couple_budgeting_waitlist_count() TO anon, authenticated;

-- Create function to join couple budgeting waitlist
CREATE OR REPLACE FUNCTION join_couple_budgeting_waitlist(
    p_email TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_referral_source TEXT DEFAULT NULL,
    p_budgeting_method TEXT DEFAULT NULL,
    p_mobile_app_priorities TEXT[] DEFAULT NULL,
    p_interested_mobile_features TEXT[] DEFAULT NULL,
    p_device_preference TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    waitlist_count INTEGER;
    result JSON;
BEGIN
    -- Check if user has already joined (by user_id if provided, otherwise by email)
    IF p_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM couple_budgeting_waitlist WHERE user_id = p_user_id) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You have already joined the couple budgeting waitlist',
                'waitlist_count', (SELECT get_couple_budgeting_waitlist_count())
            );
        END IF;
    END IF;

    -- Try to insert the claim
    INSERT INTO couple_budgeting_waitlist (
        email,
        first_name,
        last_name,
        referral_source,
        budgeting_method,
        mobile_app_priorities,
        interested_mobile_features,
        device_preference,
        user_id,
        waitlist_type
    )
    VALUES (
        p_email,
        p_first_name,
        p_last_name,
        p_referral_source,
        p_budgeting_method,
        p_mobile_app_priorities,
        p_interested_mobile_features,
        p_device_preference,
        p_user_id,
        'couple_budgeting'
    );

    -- Get updated waitlist count
    SELECT get_couple_budgeting_waitlist_count() INTO waitlist_count;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined the couple budgeting waitlist!',
        'waitlist_count', waitlist_count
    );

EXCEPTION
    WHEN unique_violation THEN
        -- Check if it's email or user_id violation
        IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM couple_budgeting_waitlist WHERE user_id = p_user_id) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You have already joined the couple budgeting waitlist',
                'waitlist_count', waitlist_count
            );
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Email already joined the waitlist',
                'waitlist_count', waitlist_count
            );
        END IF;
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An error occurred while joining the waitlist',
            'waitlist_count', waitlist_count
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION join_couple_budgeting_waitlist(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, UUID) TO anon, authenticated;

-- Create function to check if user has joined couple budgeting waitlist
CREATE OR REPLACE FUNCTION check_couple_budgeting_waitlist_claim(
    p_user_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check by user_id if provided
    IF p_user_id IS NOT NULL THEN
        RETURN EXISTS (SELECT 1 FROM couple_budgeting_waitlist WHERE user_id = p_user_id);
    END IF;

    -- Check by email if provided
    IF p_email IS NOT NULL THEN
        RETURN EXISTS (SELECT 1 FROM couple_budgeting_waitlist WHERE email = p_email);
    END IF;

    -- If neither provided, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION check_couple_budgeting_waitlist_claim(UUID, TEXT) TO anon, authenticated;

-- Add trigger to update timestamp
CREATE TRIGGER update_couple_budgeting_waitlist_updated_at
    BEFORE UPDATE ON couple_budgeting_waitlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
