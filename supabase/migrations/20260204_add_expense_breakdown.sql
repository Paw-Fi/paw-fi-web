-- Adds receipt breakdown list to expenses

alter table public.expenses
  add column if not exists breakdown jsonb;

comment on column public.expenses.breakdown is 'Receipt line item breakdown entries';
