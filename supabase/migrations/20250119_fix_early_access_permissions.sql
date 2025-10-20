-- Fix permission denied error by granting necessary permissions
-- The claim_early_access_spot function needs to access auth.users indirectly through RLS policies

-- Grant SELECT permission on auth.users to the postgres role (function owner)
-- This allows the SECURITY DEFINER function to evaluate RLS policies that reference auth.users
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO postgres;

-- Alternatively, we can simplify the RLS policy to avoid accessing auth.users
-- Drop the old policy
DROP POLICY IF EXISTS "Users can read their own claims" ON early_access_claims;

-- Create a simpler policy that doesn't need to query auth.users
-- Users can only see claims that match their user_id
CREATE POLICY "Users can read their own claims" ON early_access_claims
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Ensure the insert policy allows authenticated users to insert
DROP POLICY IF EXISTS "Allow public to insert early access claims" ON early_access_claims;

CREATE POLICY "Allow authenticated to insert early access claims" ON early_access_claims
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
