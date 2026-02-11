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
--
-- IMPORTANT:
-- - Newer schemas include public.user_contacts.user_id with ON DELETE SET NULL.
-- - For full account erasure, we explicitly delete user_contacts rows (if table
--   exists) before deleting auth.users.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid;
  deleted_contacts_count int := 0;
BEGIN
  -- Get the ID of the currently authenticated user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Best-effort explicit contact deletion for schemas where user_contacts
  -- exists and keeps rows via ON DELETE SET NULL.
  IF to_regclass('public.user_contacts') IS NOT NULL THEN
    EXECUTE
      'WITH deleted_contacts AS (DELETE FROM public.user_contacts WHERE user_id = $1 RETURNING id) '
      || 'SELECT count(*) FROM deleted_contacts'
      INTO deleted_contacts_count
      USING current_user_id;
  END IF;
  
  -- Delete the user from auth.users (this will trigger the cascade deletion)
  DELETE FROM auth.users WHERE id = current_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account deleted successfully',
    'deleted_contacts', deleted_contacts_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM public;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_delete_auth_user() IS 
  'Automatically deletes the corresponding record from public.users when a user is deleted from auth.users.';

COMMENT ON FUNCTION public.delete_user_account() IS 
  'Allows authenticated users to delete their own accounts. Includes explicit user_contacts cleanup when that table exists, then deletes auth.users.';
