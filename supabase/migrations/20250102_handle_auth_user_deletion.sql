-- Migration: Handle cascade deletion from auth.users to public.users
-- This migration creates an RPC function that allows users to delete their own accounts
-- from the client-side without requiring admin privileges.

-- Create function to handle auth user deletion (trigger)
CREATE OR REPLACE FUNCTION public.handle_delete_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the corresponding user from public.users
  -- This will cascade to all tables that reference public.users(id)
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create trigger to execute the function when a user is deleted from auth.users
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_delete_auth_user();

-- Create RPC function to allow users to delete their own account
-- This function can be called from the client side: supabase.rpc('delete_user_account')
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the ID of the currently authenticated user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;
  
  -- Delete the user from auth.users (this will trigger the cascade deletion)
  DELETE FROM auth.users WHERE id = current_user_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Account deleted successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_delete_auth_user() IS 
  'Automatically deletes the corresponding record from public.users when a user is deleted from auth.users. This ensures proper cascade deletion of all user-related data.';

COMMENT ON FUNCTION public.delete_user_account() IS 
  'Allows authenticated users to delete their own accounts. This function can be called from the client-side using supabase.rpc("delete_user_account").';
