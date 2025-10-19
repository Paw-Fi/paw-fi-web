-- Row Level Security (RLS) Policies
-- Secures user_contacts, daily_budgets, and expenses tables
-- Users can only read their own data; writes are restricted to edge functions (service role)

-- =========================================
-- ENABLE RLS ON ALL SENSITIVE TABLES
-- =========================================

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- =========================================
-- USER_CONTACTS POLICIES
-- =========================================

-- Drop existing policies if any (for clean migration)
DROP POLICY IF EXISTS "Users can view own contact" ON public.user_contacts;
DROP POLICY IF EXISTS "Deny client writes to user_contacts" ON public.user_contacts;

-- Allow users to read only their own contact records
CREATE POLICY "Users can view own contact"
  ON public.user_contacts
  FOR SELECT
  USING (user_id = auth.uid());

-- Deny all direct INSERT/UPDATE/DELETE from client
-- Only edge functions (service role) can write
CREATE POLICY "Deny client writes to user_contacts"
  ON public.user_contacts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- =========================================
-- DAILY_BUDGETS POLICIES
-- =========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own budgets" ON public.daily_budgets;
DROP POLICY IF EXISTS "Deny client writes to daily_budgets" ON public.daily_budgets;

-- Allow users to read only budgets for their own contact
CREATE POLICY "Users can view own budgets"
  ON public.daily_budgets
  FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM public.user_contacts WHERE user_id = auth.uid()
    )
  );

-- Deny all direct INSERT/UPDATE/DELETE from client
-- Only edge functions (service role) can write
CREATE POLICY "Deny client writes to daily_budgets"
  ON public.daily_budgets
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- =========================================
-- EXPENSES POLICIES
-- =========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Deny client writes to expenses" ON public.expenses;

-- Allow users to read only expenses for their own contact
CREATE POLICY "Users can view own expenses"
  ON public.expenses
  FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM public.user_contacts WHERE user_id = auth.uid()
    )
  );

-- Deny all direct INSERT/UPDATE/DELETE from client
-- Only edge functions (service role) can write
CREATE POLICY "Deny client writes to expenses"
  ON public.expenses
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- =========================================
-- VERIFICATION QUERIES (for testing)
-- =========================================

-- Run these manually to verify RLS is working:
-- 
-- 1. As authenticated user (should only see own data):
--    SELECT * FROM user_contacts;
--    SELECT * FROM daily_budgets;
--    SELECT * FROM expenses;
--
-- 2. Try to insert (should fail):
--    INSERT INTO expenses (contact_id, date, amount_cents) 
--    VALUES ('other-user-contact', '2024-01-01', 1000);
--    Expected: ERROR: new row violates row-level security policy
--
-- 3. Service role (edge functions) should bypass RLS and work normally

-- Add comments explaining the policies
COMMENT ON POLICY "Users can view own contact" ON public.user_contacts IS 
  'Users can only SELECT their own contact records. Added 2024-10-19 for security.';

COMMENT ON POLICY "Users can view own budgets" ON public.daily_budgets IS 
  'Users can only SELECT budgets for their own contact. Added 2024-10-19 for security.';

COMMENT ON POLICY "Users can view own expenses" ON public.expenses IS 
  'Users can only SELECT expenses for their own contact. Added 2024-10-19 for security.';
