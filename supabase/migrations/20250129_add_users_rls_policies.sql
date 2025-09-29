-- Enable Row Level Security on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Policy: Users can update their own profile  
CREATE POLICY "Users can update their own profile"
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Allow service role to access all user profiles (for admin operations)
CREATE POLICY "Service role can access all user profiles"
ON public.users 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Allow inserts for new user creation (handled by trigger)
CREATE POLICY "Allow user creation"
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;

-- Comments for documentation
COMMENT ON POLICY "Users can view their own profile" ON public.users IS 'Users can only view their own profile data';
COMMENT ON POLICY "Users can update their own profile" ON public.users IS 'Users can only update their own profile data';
COMMENT ON POLICY "Service role can access all user profiles" ON public.users IS 'Service role can access all user profiles for admin operations';
COMMENT ON POLICY "Allow user creation" ON public.users IS 'Allow authenticated users to create their own profile record';