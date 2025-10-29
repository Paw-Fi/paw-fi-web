-- WhatsApp budgeting tables for free-text updates via LLM

-- 1) Contacts linked by phone (for pre-auth data capture)
create table if not exists public.user_contacts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  whatsapp_user_id text,
  user_id uuid references public.users(id) on delete set null,
  verified boolean default false,
  preferred_currency text,
  preferred_language text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.user_contacts is 'Maps WhatsApp/phone contacts to users for syncing later';
comment on column public.user_contacts.preferred_language is 'Preferred language code (e.g., en, zh). Used by clients to personalize UI and communications.';

-- 2) Daily budgets per contact
create table if not exists public.daily_budgets (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.user_contacts(id) on delete cascade,
  date date not null,
  amount_cents integer not null,
  currency text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (contact_id, date)
);

comment on table public.daily_budgets is 'Daily budget amounts per contact';

-- 3) Categories per contact (predefined or user-defined)
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

-- Seed some global defaults (idempotent)
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

-- 4) Expenses per contact
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.user_contacts(id) on delete cascade,
  date date not null,
  amount_cents integer not null,
  currency text default 'USD',
  category text,
  raw_text text,
  receipt_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_expenses_contact_date on public.expenses(contact_id, date);

comment on table public.expenses is 'Individual expense entries extracted from free text';
comment on column public.expenses.receipt_image_url is 'Supabase Storage URL for receipt image if uploaded via WhatsApp';
