-- ====================
-- HOUSEHOLDS (JOINT ACCOUNTS) SYSTEM - Database Migration
-- Created: 2025-10-21
-- Purpose: Enable collaborative financial management for couples, families, and roommates
-- Features: Shared budgets, privacy controls, expense splitting, invitations, and notifications
-- ====================

-- ====================
-- ENUMS
-- ====================

-- Household member roles
CREATE TYPE household_role AS ENUM ('owner', 'admin', 'member');

-- Invitation status
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- Expense split type
CREATE TYPE split_type AS ENUM ('equal', 'percentage', 'amount', 'shares');

-- Device platform
CREATE TYPE device_platform AS ENUM ('ios', 'android', 'web');

-- Budget period
CREATE TYPE budget_period AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- Notification event type
CREATE TYPE notification_event_type AS ENUM (
  'invite_sent',
  'invite_accepted',
  'invite_revoked',
  'member_joined',
  'member_left',
  'member_removed',
  'budget_warn',
  'budget_alert',
  'split_created',
  'split_settled',
  'expense_added',
  'expense_edited',
  'expense_deleted',
  'income_added',
  'income_edited',
  'member_reminded'
);

-- ====================
-- HOUSEHOLDS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Optional customization
  cover_image_url TEXT, -- URL to household cover image
  theme_color VARCHAR(7), -- Hex color code

  -- Base currency (immutable)
  currency VARCHAR(3) NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT households_currency_format CHECK (currency ~ '^[A-Z]{3}$')
);

-- ====================
-- HOUSEHOLD MEMBERS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role household_role NOT NULL DEFAULT 'member',

  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_household_member UNIQUE (household_id, user_id)
);

-- ====================
-- INVITES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) NOT NULL UNIQUE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL until accepted

  -- Status and lifecycle
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ, -- NULL means unlimited
  accepted_at TIMESTAMPTZ,

  -- Optional invitation details
  invited_email VARCHAR(255), -- For tracking before registration
  personal_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT accepted_requires_user CHECK (
    (status = 'accepted' AND invited_user_id IS NOT NULL AND accepted_at IS NOT NULL) OR
    (status != 'accepted')
  )
);

-- ====================
-- DEVICES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Device identification
  platform device_platform NOT NULL,
  push_token TEXT NOT NULL,
  device_model VARCHAR(255),
  os_version VARCHAR(100),
  app_version VARCHAR(100),

  -- Localization
  locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_push_token UNIQUE (user_id, push_token),
  CONSTRAINT push_token_not_empty CHECK (LENGTH(TRIM(push_token)) > 0)
);

-- ====================
-- ALTER EXPENSES TABLE
-- (Moneko uses 'expenses' table for transaction tracking)
-- ====================

-- DATA MODEL DECISION: Using 'expenses' table
-- ==========================================
-- This migration extends the existing 'expenses' table with household sharing fields.
-- The mobile app (moneko-mobile) and existing analytics already use 'expenses' for all expense tracking.
--
-- Key changes:
-- 1. Add 'user_id' to map contact_id → user_id for household membership checks
-- 2. Add household sharing fields: share_scope, household_id, shared_member_ids, split_group_id
-- 3. Update RLS policies to respect household sharing rules
-- 4. Edge Functions (households-compute-splits, households-summary) query 'expenses' table
-- ==========================================

-- Add household sharing fields to expenses
DO $$
BEGIN
  -- Add user_id column (for direct user ownership and household membership)
  -- This complements contact_id which is used for WhatsApp integration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

    -- Backfill user_id from contact_id → user_contacts.user_id
    UPDATE public.expenses e
    SET user_id = uc.user_id
    FROM public.user_contacts uc
    WHERE e.contact_id = uc.id AND e.user_id IS NULL;

    -- For expenses without contact_id (imported expenses, legacy data, etc.):
    -- We DON'T set NOT NULL constraint to avoid breaking existing data
    -- Application logic will handle assigning user_id to current user on first access/edit
    -- Future constraint enforced at application level: new expenses must have user_id

    -- Add index for query performance
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id) WHERE user_id IS NOT NULL;
  END IF;

  -- Add household_id column
  -- NOTE: No share_scope or shared_member_ids columns - all household members can see all expenses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'household_id'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ====================
-- EXPENSE SPLIT GROUPS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.expense_split_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Split configuration
  split_type split_type NOT NULL,
  currency VARCHAR(3) NOT NULL,
  total_amount_cents BIGINT NOT NULL,

  -- Optional description
  description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_amount CHECK (total_amount_cents > 0),
  CONSTRAINT unique_expense_split UNIQUE (expense_id)
);

-- ====================
-- EXPENSE SPLIT LINES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.expense_split_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_group_id UUID NOT NULL REFERENCES public.expense_split_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Amount allocation
  amount_cents BIGINT, -- Actual amount in cents (for 'amount' and 'equal' types)
  percentage DECIMAL(5,2), -- Percentage (0-100, for 'percentage' type)
  shares INTEGER, -- Number of shares (for 'shares' type)

  -- Settlement tracking (auto-accepted by default for better UX)
  is_settled BOOLEAN DEFAULT true,
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  settled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settlement_note TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_split_user UNIQUE (split_group_id, user_id),
  CONSTRAINT valid_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  CONSTRAINT valid_shares CHECK (shares IS NULL OR shares > 0),
  CONSTRAINT valid_amount CHECK (amount_cents IS NULL OR amount_cents >= 0)
);

-- ====================
-- ADD SPLIT_GROUP_ID TO EXPENSES (after expense_split_groups exists)
-- ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'split_group_id'
  ) THEN
    ALTER TABLE public.expenses
    ADD COLUMN split_group_id UUID REFERENCES public.expense_split_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ====================
-- SHARED BUDGETS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.shared_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,

  -- Budget details
  name VARCHAR(255) NOT NULL,
  period budget_period NOT NULL,
  currency VARCHAR(3) NOT NULL,
  amount_cents BIGINT NOT NULL,

  -- Nudge thresholds (as percentages: 0.0 - 1.0)
  warn_threshold DECIMAL(3,2) DEFAULT 0.80, -- Warning at 80%
  alert_threshold DECIMAL(3,2) DEFAULT 1.00, -- Alert at 100%

  -- Period timing (for tracking)
  period_start DATE,
  period_end DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_budget CHECK (amount_cents > 0),
  CONSTRAINT valid_thresholds CHECK (
    warn_threshold >= 0 AND warn_threshold <= 1 AND
    alert_threshold >= 0 AND alert_threshold <= 1 AND
    warn_threshold <= alert_threshold
  ),
  CONSTRAINT unique_household_currency_period UNIQUE (household_id, currency, period)
);

-- ====================
-- SHARING PREFERENCES TABLE (NUDGE PREFERENCES ONLY)
-- ====================
CREATE TABLE IF NOT EXISTS public.sharing_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,

  -- Nudge preferences (budget notification settings)
  enable_nudges BOOLEAN DEFAULT true,
  nudge_quiet_hours_start TIME, -- e.g., '22:00'
  nudge_quiet_hours_end TIME,   -- e.g., '08:00'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_household_prefs UNIQUE (user_id, household_id)
);

-- ====================
-- NOTIFICATION EVENTS TABLE (Audit Log)
-- ====================
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type notification_event_type NOT NULL,
  payload JSONB DEFAULT '{}',

  -- Tracking
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Retry tracking (for webhook fallback)
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  delivery_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT sent_requires_timestamp CHECK (
    (is_sent = true AND sent_at IS NOT NULL) OR
    (is_sent = false)
  )
);

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Households
CREATE INDEX IF NOT EXISTS idx_households_owner_id ON public.households(owner_id);
CREATE INDEX IF NOT EXISTS idx_households_created_at ON public.households(created_at);

-- Household Members
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON public.household_members(household_id, role);

-- Invites
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invites_household_id ON public.invites(household_id);
CREATE INDEX IF NOT EXISTS idx_invites_inviter_id ON public.invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_invited_user_id ON public.invites(invited_user_id) WHERE invited_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON public.invites(expires_at) WHERE status = 'pending';

-- Devices
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_push_token ON public.devices(push_token);
CREATE INDEX IF NOT EXISTS idx_devices_active ON public.devices(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_devices_platform ON public.devices(platform);

-- Expenses (household queries)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_household_id ON public.expenses(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_household_date ON public.expenses(household_id, date) WHERE household_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_split_group_id ON public.expenses(split_group_id) WHERE split_group_id IS NOT NULL;

-- Expense Split Groups
CREATE INDEX IF NOT EXISTS idx_split_groups_household_id ON public.expense_split_groups(household_id);
CREATE INDEX IF NOT EXISTS idx_split_groups_expense_id ON public.expense_split_groups(expense_id);
CREATE INDEX IF NOT EXISTS idx_split_groups_payer ON public.expense_split_groups(payer_user_id);
CREATE INDEX IF NOT EXISTS idx_split_groups_currency ON public.expense_split_groups(household_id, currency);

-- Expense Split Lines
CREATE INDEX IF NOT EXISTS idx_split_lines_split_group_id ON public.expense_split_lines(split_group_id);
CREATE INDEX IF NOT EXISTS idx_split_lines_user_id ON public.expense_split_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_split_lines_settled_by ON public.expense_split_lines(settled_by_user_id) WHERE settled_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_split_lines_unsettled ON public.expense_split_lines(user_id, is_settled) WHERE is_settled = false;

-- Shared Budgets
CREATE INDEX IF NOT EXISTS idx_shared_budgets_household_id ON public.shared_budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_shared_budgets_currency ON public.shared_budgets(household_id, currency);
CREATE INDEX IF NOT EXISTS idx_shared_budgets_active ON public.shared_budgets(household_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shared_budgets_period ON public.shared_budgets(household_id, period);

-- Sharing Preferences
CREATE INDEX IF NOT EXISTS idx_sharing_prefs_user_id ON public.sharing_prefs(user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_prefs_household_id ON public.sharing_prefs(household_id);

-- Notification Events
CREATE INDEX IF NOT EXISTS idx_notification_events_household_id ON public.notification_events(household_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_user_id ON public.notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON public.notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_events_unsent ON public.notification_events(created_at) WHERE is_sent = false;

-- ====================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================

-- Helper functions to avoid RLS recursion across policies
-- These functions run as the table owner and therefore bypass RLS safely.
-- IMPORTANT: Keep search_path locked to public to avoid SQL injection via function arguments.
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

-- Enable RLS on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_split_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_split_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- ========== HOUSEHOLDS RLS ==========

-- Members can view their households (break cross-table recursion via helper)
CREATE POLICY "Members can view their households" ON public.households
  FOR SELECT USING (
    auth.uid() = owner_id
    OR public.is_member_of_household(households.id)
  );

-- Authenticated users can create households (they become the owner)
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners and admins can update household details (use helper)
CREATE POLICY "Owners and admins can update households" ON public.households
  FOR UPDATE USING (
    public.is_admin_or_owner_of_household(households.id)
  );

-- Only owners can delete households
CREATE POLICY "Only owners can delete households" ON public.households
  FOR DELETE USING (public.is_owner_of_household(households.id));

-- ========== HOUSEHOLD MEMBERS RLS ==========

-- Simple policies without recursion - members can see their own row
CREATE POLICY "Users can view their own membership" ON public.household_members
  FOR SELECT USING (user_id = auth.uid());

-- Members can view all members of households they belong to (via helper, no recursion)
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (
    public.is_member_of_household(household_members.household_id)
  );

-- Allow household member insertion (for triggers and edge functions)
CREATE POLICY "Allow household member insertion" ON public.household_members
  FOR INSERT WITH CHECK (
    -- Allow if the authenticated user is the one being added (self-insert via trigger)
    user_id = auth.uid()
    -- OR if being inserted by service role (edge functions)
    -- Service role bypasses RLS, so this is implicitly allowed
  );

-- Owners can remove members (except cannot remove owner) using helpers
CREATE POLICY "Owners can remove members" ON public.household_members
  FOR DELETE USING (
    NOT public.is_owner_of_household(household_members.household_id, household_members.user_id)
    AND public.is_owner_of_household(household_members.household_id)
  );

-- Members can leave households (but owner cannot leave without transferring ownership)
CREATE POLICY "Members can leave households" ON public.household_members
  FOR DELETE USING (
    user_id = auth.uid()
    AND NOT public.is_owner_of_household(household_members.household_id, user_id)
  );

-- Owners and admins can update member roles (except cannot change owner role)
CREATE POLICY "Owners and admins can update member roles" ON public.household_members
  FOR UPDATE USING (
    NOT public.is_owner_of_household(household_members.household_id, household_members.user_id)
    AND public.is_admin_or_owner_of_household(household_members.household_id)
  );

-- ========== INVITES RLS ==========

-- Inviters can view their sent invites
CREATE POLICY "Inviters can view their invites" ON public.invites
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = invites.household_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can create invites
CREATE POLICY "Owners and admins can create invites" ON public.invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members AS hm
      WHERE hm.household_id = invites.household_id
        AND hm.user_id = auth.uid()
        AND hm.role IN ('owner', 'admin')
    )
  );

-- Inviters, owners, and admins can revoke invites
CREATE POLICY "Authorized users can revoke invites" ON public.invites
  FOR UPDATE USING (
    inviter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = invites.household_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ========== DEVICES RLS ==========

-- Users can only view and manage their own devices
CREATE POLICY "Users can view their own devices" ON public.devices
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices" ON public.devices
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices" ON public.devices
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own devices" ON public.devices
  FOR DELETE USING (user_id = auth.uid());

-- ========== EXPENSE SPLIT GROUPS RLS ==========

-- Household members can view split groups for their household
CREATE POLICY "Members can view household split groups" ON public.expense_split_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = expense_split_groups.household_id
        AND user_id = auth.uid()
    )
  );

-- Household members can create split groups
CREATE POLICY "Members can create split groups" ON public.expense_split_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members AS hm
      WHERE hm.household_id = expense_split_groups.household_id
        AND hm.user_id = auth.uid()
    )
  );

-- Payer or admins can update split groups
CREATE POLICY "Payer or admins can update split groups" ON public.expense_split_groups
  FOR UPDATE USING (
    payer_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = expense_split_groups.household_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ========== EXPENSE SPLIT LINES RLS ==========

-- Users can view split lines they're involved in
CREATE POLICY "Users can view their split lines" ON public.expense_split_lines
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.expense_split_groups AS esg
      JOIN public.household_members AS hm ON hm.household_id = esg.household_id
      WHERE esg.id = expense_split_lines.split_group_id
        AND hm.user_id = auth.uid()
    )
  );

-- Users can update their own split lines (for settlement)
CREATE POLICY "Users can update their split lines" ON public.expense_split_lines
  FOR UPDATE USING (user_id = auth.uid());

-- Payers can also settle split lines they paid (express netting)
CREATE POLICY "Payers can settle split lines they paid" ON public.expense_split_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.expense_split_groups esg
      WHERE esg.id = expense_split_lines.split_group_id
        AND esg.payer_user_id = auth.uid()
    )
  );

-- ========== SHARED BUDGETS RLS ==========

-- Household members can view shared budgets
CREATE POLICY "Members can view shared budgets" ON public.shared_budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = shared_budgets.household_id
        AND user_id = auth.uid()
    )
  );

-- Owners and admins can manage shared budgets
CREATE POLICY "Owners and admins can create budgets" ON public.shared_budgets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members AS hm
      WHERE hm.household_id = shared_budgets.household_id
        AND hm.user_id = auth.uid()
        AND hm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update budgets" ON public.shared_budgets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = shared_budgets.household_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete budgets" ON public.shared_budgets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = shared_budgets.household_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ========== SHARING PREFERENCES RLS ==========

-- Users can view and manage their own sharing preferences
CREATE POLICY "Users can view their sharing prefs" ON public.sharing_prefs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their sharing prefs" ON public.sharing_prefs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their sharing prefs" ON public.sharing_prefs
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their sharing prefs" ON public.sharing_prefs
  FOR DELETE USING (user_id = auth.uid());

-- ========== NOTIFICATION EVENTS RLS ==========

-- Users can view their own notification events
CREATE POLICY "Users can view their notifications" ON public.notification_events
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = notification_events.household_id
        AND user_id = auth.uid()
    )
  );

-- ====================
-- UPDATED EXPENSES RLS
-- (Update existing RLS policies to respect household sharing)
-- ====================

-- Note: We need to update existing expense RLS policies
-- This assumes expenses table has user_id field for ownership

-- Drop existing expense SELECT policy if it exists and recreate with household logic
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
  DROP POLICY IF EXISTS "Users can select their own expenses" ON public.expenses;
  DROP POLICY IF EXISTS "Users can view expenses they created" ON public.expenses;
END $$;

-- Users can view:
-- 1. Their own expenses (where user_id = auth.uid())
-- 2. ALL expenses from households they're a member of (no privacy restrictions)
CREATE POLICY "Users can view their expenses and household expenses" ON public.expenses
  FOR SELECT USING (
    user_id = auth.uid() -- Own expenses
    OR (
      household_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = expenses.household_id
          AND user_id = auth.uid()
      )
    )
  );

-- ====================
-- DATABASE FUNCTIONS & TRIGGERS
-- ====================

-- Function to automatically expire pending invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
  UPDATE public.invites
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER households_updated_at BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Household currency is immutable after creation
CREATE OR REPLACE FUNCTION prevent_household_currency_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.currency IS DISTINCT FROM OLD.currency THEN
    RAISE EXCEPTION 'household currency is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER households_currency_immutable
BEFORE UPDATE ON public.households
FOR EACH ROW EXECUTE FUNCTION prevent_household_currency_update();

CREATE TRIGGER household_members_updated_at BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER invites_updated_at BEFORE UPDATE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER devices_updated_at BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER split_groups_updated_at BEFORE UPDATE ON public.expense_split_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER split_lines_updated_at BEFORE UPDATE ON public.expense_split_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shared_budgets_updated_at BEFORE UPDATE ON public.shared_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sharing_prefs_updated_at BEFORE UPDATE ON public.sharing_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure owner is added as a member when creating household
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER household_add_owner_member AFTER INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();

-- Function to create default sharing preferences when user joins household
CREATE OR REPLACE FUNCTION create_default_sharing_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sharing_prefs (user_id, household_id)
  VALUES (NEW.user_id, NEW.household_id)
  ON CONFLICT (user_id, household_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER household_member_create_prefs AFTER INSERT ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION create_default_sharing_prefs();

-- Function to validate split amounts sum to transaction total
CREATE OR REPLACE FUNCTION validate_split_sum(split_group_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_cents BIGINT;
  calculated_sum BIGINT;
  split_type_val split_type;
BEGIN
  -- Get the split group details
  SELECT total_amount_cents, split_type INTO total_cents, split_type_val
  FROM public.expense_split_groups
  WHERE id = split_group_id_param;

  -- Calculate sum based on split type
  IF split_type_val = 'amount' OR split_type_val = 'equal' THEN
    SELECT COALESCE(SUM(amount_cents), 0) INTO calculated_sum
    FROM public.expense_split_lines
    WHERE split_group_id = split_group_id_param;

    RETURN calculated_sum = total_cents;

  ELSIF split_type_val = 'percentage' THEN
    SELECT COALESCE(SUM(percentage), 0) INTO calculated_sum
    FROM public.expense_split_lines
    WHERE split_group_id = split_group_id_param;

    RETURN calculated_sum = 100.00;

  ELSIF split_type_val = 'shares' THEN
    -- Shares just need to have at least one share
    SELECT COUNT(*) INTO calculated_sum
    FROM public.expense_split_lines
    WHERE split_group_id = split_group_id_param AND shares > 0;

    RETURN calculated_sum > 0;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================
-- COMMENTS FOR DOCUMENTATION
-- ====================

COMMENT ON TABLE public.households IS 'Shared financial spaces for couples, families, and roommates';
COMMENT ON TABLE public.household_members IS 'Members belonging to households with their roles';
COMMENT ON TABLE public.invites IS 'Pending and historical household invitations';
COMMENT ON TABLE public.devices IS 'User devices for push notifications';
COMMENT ON TABLE public.expense_split_groups IS 'Groups of split expenses within households';
COMMENT ON TABLE public.expense_split_lines IS 'Individual member allocations in expense splits';
COMMENT ON TABLE public.shared_budgets IS 'Household budgets with nudge thresholds';
COMMENT ON TABLE public.sharing_prefs IS 'User notification preferences per household (nudges and quiet hours)';
COMMENT ON TABLE public.notification_events IS 'Audit log of notification events';

COMMENT ON COLUMN public.households.cover_image_url IS 'URL to household cover image stored in Supabase storage';
COMMENT ON COLUMN public.invites.token IS 'Unique token for invitation URLs (single-use)';
COMMENT ON COLUMN public.devices.push_token IS 'FCM/APNs push notification token';
COMMENT ON COLUMN public.shared_budgets.warn_threshold IS 'Budget percentage (0-1) to trigger warning nudge';
COMMENT ON COLUMN public.shared_budgets.alert_threshold IS 'Budget percentage (0-1) to trigger alert nudge';

-- ====================
-- STORAGE BUCKET SETUP
-- ====================

-- Create public storage bucket for household images and user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public',
  'public',
  true, -- Make bucket public so files are accessible via public URLs
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] -- Only allow images
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Storage policies for the public bucket
CREATE POLICY "Public bucket files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

CREATE POLICY "Authenticated users can upload to public bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'public'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ====================
-- NOTIFICATION HELPERS & REALTIME TRIGGER (Included in baseline)
-- ====================

-- Create helper function to notify household members on expense events
CREATE OR REPLACE FUNCTION public.notify_household_members_expense(
  p_household_id UUID,
  p_expense_id UUID,
  p_actor_user_id UUID,
  p_event_type notification_event_type,
  p_expense_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
BEGIN
  FOR v_member IN
    SELECT user_id
    FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id <> p_actor_user_id
  LOOP
    INSERT INTO public.notification_events (
      household_id,
      user_id,
      event_type,
      payload,
      created_at
    ) VALUES (
      p_household_id,
      v_member.user_id,
      p_event_type,
      jsonb_build_object(
        'expense_id', p_expense_id,
        'actor_user_id', p_actor_user_id,
        'expense_data', p_expense_data
      ),
      NOW()
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.notify_household_members_expense IS 'Creates notification events for all household members except the actor on expense add/edit';
