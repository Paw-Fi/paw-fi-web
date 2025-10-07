-- Add expense_categories table for predefined and user-defined categories
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.user_contacts(id) on delete cascade,
  name text not null,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (contact_id, name)
);

comment on table public.expense_categories is 'Expense categories; contact_id null rows are global defaults';

insert into public.expense_categories (contact_id, name, is_default)
select null, x.name, true
from (values
  ('groceries'),
  ('shopping'),
  ('food'),
  ('transport'),
  ('housing'),
  ('utilities'),
  ('entertainment'),
  ('healthcare'),
  ('education'),
  ('travel'),
  ('income'),
  ('other')
) as x(name)
on conflict do nothing;
