-- Ensure account deletion is not blocked by NO ACTION foreign keys.
--
-- Existing deployments may still have old FK actions that prevent deleting
-- rows from auth.users during delete_user_account().
--
-- Target behavior:
-- - early_access_claims.user_id           -> ON DELETE CASCADE
-- - couple_budgeting_waitlist.user_id     -> ON DELETE CASCADE
-- - expense_split_lines.settled_by_user_id-> ON DELETE SET NULL

alter table if exists public.early_access_claims
  drop constraint if exists early_access_claims_user_id_fkey;

alter table if exists public.early_access_claims
  add constraint early_access_claims_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

alter table if exists public.couple_budgeting_waitlist
  drop constraint if exists couple_budgeting_waitlist_user_id_fkey;

alter table if exists public.couple_budgeting_waitlist
  add constraint couple_budgeting_waitlist_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

alter table if exists public.expense_split_lines
  drop constraint if exists expense_split_lines_settled_by_user_id_fkey;

alter table if exists public.expense_split_lines
  add constraint expense_split_lines_settled_by_user_id_fkey
  foreign key (settled_by_user_id)
  references auth.users(id)
  on delete set null;
