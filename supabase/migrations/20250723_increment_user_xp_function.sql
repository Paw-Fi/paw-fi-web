-- Function to safely increment user's total XP
CREATE OR REPLACE FUNCTION increment_user_xp(user_id UUID, xp_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the user's total_xp column in the public.users table
    UPDATE public.users 
    SET total_xp = COALESCE(total_xp, 0) + xp_amount,
        updated_at = now()
    WHERE id = user_id;
    
    -- If no rows were affected, the user doesn't exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$$;