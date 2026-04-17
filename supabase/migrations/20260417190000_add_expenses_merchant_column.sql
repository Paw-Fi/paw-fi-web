alter table if exists public.expenses
  add column if not exists merchant text;
