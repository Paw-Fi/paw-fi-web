-- Fix missing INSERT policy for household_members table
-- This policy allows the add_owner_as_member() trigger to work
-- and also allows edge functions to add members when accepting invites

CREATE POLICY "Allow household member insertion" ON public.household_members
  FOR INSERT WITH CHECK (
    -- Allow if the authenticated user is the one being added (self-insert via trigger)
    user_id = auth.uid()
    -- OR if being inserted by service role (edge functions)
    -- Service role bypasses RLS, so this is implicitly allowed
  );
