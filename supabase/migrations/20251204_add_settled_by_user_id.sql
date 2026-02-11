-- Track which user initiated a settlement for each split line
-- Run this in Supabase (or via supabase CLI migrations).

ALTER TABLE public.expense_split_lines
  ADD COLUMN IF NOT EXISTS settled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.expense_split_lines.settled_by_user_id IS
  'User who initiated/confirmed settlement for this split line.';

CREATE INDEX IF NOT EXISTS idx_split_lines_settled_by
  ON public.expense_split_lines(settled_by_user_id)
  WHERE settled_by_user_id IS NOT NULL;
