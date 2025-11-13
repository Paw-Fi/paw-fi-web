-- Fix settlement semantics: is_settled tracks payment status (not acceptance)
-- Default should be FALSE; lines become settled only after users settle up.

-- Set default to false for future rows
ALTER TABLE public.expense_split_lines 
  ALTER COLUMN is_settled SET DEFAULT false;

-- Clarify comments
COMMENT ON COLUMN public.expense_split_lines.is_settled IS 
  'Whether this split line has been settled/paid; defaults to false until settled up';

COMMENT ON COLUMN public.expense_split_lines.settled_at IS 
  'Timestamp when the split line was marked as settled/paid; NULL if not yet settled';
