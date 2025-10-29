-- ====================
-- FIX: Household/Household Members RLS Infinite Recursion
-- Created: 2025-10-22
-- Purpose: Replace cross-table references in policies with SECURITY DEFINER helpers
-- This patch is safe to run multiple times.
-- ====================

-- Drop the broken policies
-- Drop possibly-recursive policies on household_members
DROP POLICY IF EXISTS "Users can view their own membership" ON public.household_members;
DROP POLICY IF EXISTS "Members can view household members via households" ON public.household_members;
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.household_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.household_members;
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON public.household_members;
DROP POLICY IF EXISTS "Members can leave households" ON public.household_members;

-- Drop households policies that referenced household_members directly
DROP POLICY IF EXISTS "Members can view their households" ON public.households;
DROP POLICY IF EXISTS "Owners and admins can update households" ON public.households;
DROP POLICY IF EXISTS "Only owners can delete households" ON public.households;

-- Helper functions (idempotent) to avoid recursion
CREATE OR REPLACE FUNCTION public.is_member_of_household(hh_id uuid, uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = hh_id
      AND hm.user_id = COALESCE(uid, auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner_of_household(hh_id uuid, uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.households h
    WHERE h.id = hh_id
      AND h.owner_id = COALESCE(uid, auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner_of_household(hh_id uuid, uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = hh_id
      AND hm.user_id = COALESCE(uid, auth.uid())
      AND hm.role IN ('owner', 'admin')
  );
$$;

-- Create fixed policies without recursion

-- Recreate non-recursive policies

-- Simple policy: members can see their own row
CREATE POLICY "Users can view their own membership" ON public.household_members
  FOR SELECT USING (user_id = auth.uid());

-- Members can view all members of households they belong to (via helper)
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (
    public.is_member_of_household(household_members.household_id)
  );

-- Owners can remove members (except cannot remove owner)
CREATE POLICY "Owners can remove members" ON public.household_members
  FOR DELETE USING (
    NOT public.is_owner_of_household(household_members.household_id, household_members.user_id)
    AND public.is_owner_of_household(household_members.household_id)
  );

-- Owners and admins can update member roles (except cannot change owner role)
CREATE POLICY "Owners and admins can update member roles" ON public.household_members
  FOR UPDATE USING (
    NOT public.is_owner_of_household(household_members.household_id, household_members.user_id)
    AND public.is_admin_or_owner_of_household(household_members.household_id)
  );

-- Members can leave households (but owner cannot leave)
CREATE POLICY "Members can leave households" ON public.household_members
  FOR DELETE USING (
    user_id = auth.uid()
    AND NOT public.is_owner_of_household(household_members.household_id, user_id)
  );

-- Recreate households policies using helpers
CREATE POLICY "Members can view their households" ON public.households
  FOR SELECT USING (
    auth.uid() = owner_id OR public.is_member_of_household(households.id)
  );

CREATE POLICY "Owners and admins can update households" ON public.households
  FOR UPDATE USING (public.is_admin_or_owner_of_household(households.id));

CREATE POLICY "Only owners can delete households" ON public.households
  FOR DELETE USING (public.is_owner_of_household(households.id));
