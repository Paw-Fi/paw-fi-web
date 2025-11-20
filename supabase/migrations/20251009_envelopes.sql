-- Zero-Based Budgeting (Envelope System)
-- Date: 2025-10-09 (rewritten to introduce shared budgets table)

-- 1) Budgets per user/household (holds the total amount for the month/currency)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid,
  period_month date not null default date_trunc('month', now())::date, -- YYYY-MM-01
  currency text not null default 'USD',
  total_budget_cents bigint not null default 0 check (total_budget_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_scope_unique unique (user_id, household_id, currency, period_month)
);

comment on table public.budgets is 'Top-level monthly budget per user/household and currency';
comment on column public.budgets.total_budget_cents is 'Total budget for the month in cents';

create index if not exists idx_budgets_user_month on public.budgets(user_id, period_month);
create index if not exists idx_budgets_household_month on public.budgets(household_id, period_month);

-- 2) Envelopes bound to a budget (multiple envelopes per budget)
create table if not exists public.budget_envelopes (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid,
  name text not null,
  budget_percentage decimal(5,2) not null default 0.00 check (budget_percentage >= 0 and budget_percentage <= 100),
  currency text not null default 'USD',
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_envelopes_budget_scope_unique unique (budget_id, name)
);

comment on table public.budget_envelopes is 'Zero-based budget envelopes bound to a budget (user or household scoped)';
comment on column public.budget_envelopes.budget_percentage is 'Percentage of budget.total_budget_cents allocated to this envelope (0-100)';
comment on column public.budget_envelopes.icon is 'Material icon name for the envelope';
comment on column public.budget_envelopes.color is 'Hex color code for the envelope';

-- 3) Monthly allocations per envelope (optional forward-looking amounts)
create table if not exists public.envelope_allocations (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.budget_envelopes(id) on delete cascade,
  period_month date not null, -- first day of month (YYYY-MM-01)
  amount_cents integer not null,
  carryover_policy text not null default 'carryover', -- 'none' | 'carryover'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (envelope_id, period_month)
);

comment on table public.envelope_allocations is 'Per-month allocation for envelopes';

-- 4) Link categories to envelopes (category names are lowercased text, mapped from expenses.category)
create table if not exists public.envelope_category_links (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.budget_envelopes(id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (envelope_id, category)
);

comment on table public.envelope_category_links is 'Maps expense categories to envelopes';

-- Helpful indexes
create index if not exists idx_envelopes_budget on public.budget_envelopes(budget_id);
create index if not exists idx_envelopes_user on public.budget_envelopes(user_id);
create index if not exists idx_envelopes_household on public.budget_envelopes(household_id);
create index if not exists idx_allocations_envelope_month on public.envelope_allocations(envelope_id, period_month);
create index if not exists idx_links_envelope on public.envelope_category_links(envelope_id);

-- Row Level Security: allow only owners (via user_id) to access
alter table public.budgets enable row level security;
alter table public.budget_envelopes enable row level security;
alter table public.envelope_allocations enable row level security;
alter table public.envelope_category_links enable row level security;

-- budgets policies
drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own" on public.budgets
for select using (budgets.user_id = auth.uid());

drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets
for insert with check (budgets.user_id = auth.uid());

drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets
for update using (budgets.user_id = auth.uid());

drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own" on public.budgets
for delete using (budgets.user_id = auth.uid());

-- budget_envelopes policies
drop policy if exists "envelopes_select_own" on public.budget_envelopes;
create policy "envelopes_select_own" on public.budget_envelopes
for select using (budget_envelopes.user_id = auth.uid());

drop policy if exists "envelopes_insert_own" on public.budget_envelopes;
create policy "envelopes_insert_own" on public.budget_envelopes
for insert with check (budget_envelopes.user_id = auth.uid());

drop policy if exists "envelopes_update_own" on public.budget_envelopes;
create policy "envelopes_update_own" on public.budget_envelopes
for update using (budget_envelopes.user_id = auth.uid());

drop policy if exists "envelopes_delete_own" on public.budget_envelopes;
create policy "envelopes_delete_own" on public.budget_envelopes
for delete using (budget_envelopes.user_id = auth.uid());

-- envelope_allocations policies (via envelope -> user)
drop policy if exists "allocations_select_own" on public.envelope_allocations;
create policy "allocations_select_own" on public.envelope_allocations
for select using (
  exists (
    select 1 from public.budget_envelopes e
    where e.id = envelope_allocations.envelope_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists "allocations_mutate_own" on public.envelope_allocations;
create policy "allocations_mutate_own" on public.envelope_allocations
for all using (
  exists (
    select 1 from public.budget_envelopes e
    where e.id = envelope_allocations.envelope_id
      and e.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.budget_envelopes e
    where e.id = envelope_allocations.envelope_id
      and e.user_id = auth.uid()
  )
);

-- envelope_category_links policies (via envelope -> user)
drop policy if exists "links_select_own" on public.envelope_category_links;
create policy "links_select_own" on public.envelope_category_links
for select using (
  exists (
    select 1 from public.budget_envelopes e
    where e.id = envelope_category_links.envelope_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists "links_mutate_own" on public.envelope_category_links;
create policy "links_mutate_own" on public.envelope_category_links
for all using (
  exists (
    select 1 from public.budget_envelopes e
    where e.id = envelope_category_links.envelope_id
      and e.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.budget_envelopes e
    where e.id = envelope_category_links.envelope_id
      and e.user_id = auth.uid()
  )
);

-- Optional helper view: monthly envelope spend from expenses
-- Uses category links to aggregate spend per envelope for a given month
create or replace view public.v_envelope_monthly_spend as
select
  e.id as envelope_id,
  date_trunc('month', ex.date)::date as period_month,
  sum(ex.amount_cents) as spent_cents
from public.budget_envelopes e
join public.envelope_category_links l on l.envelope_id = e.id
join public.user_contacts uc on uc.user_id = e.user_id
join public.expenses ex on ex.contact_id = uc.id 
  and lower(coalesce(ex.category,'uncategorized')) = lower(l.category)
  and ex.currency = e.currency
group by e.id, date_trunc('month', ex.date)::date;

comment on view public.v_envelope_monthly_spend is 'Aggregated monthly spend per envelope using user_id, category links and expenses';
