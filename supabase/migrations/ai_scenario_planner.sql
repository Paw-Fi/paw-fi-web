-- 1) Create history table
create table if not exists public.ai_scenario_history (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,

  -- scenario content
  question text not null,
  answer   text not null,

  -- optional metadata
  target_date date,
  currency    text,  -- e.g. 'USD', 'EUR'
  mode        text not null default 'personal' 
              check (mode in ('personal', 'household')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_scenario_history is
  'Saved AI scenario planner questions and answers per user/household.';

comment on column public.ai_scenario_history.mode is
  '''personal'' or ''household'' – matches view mode used in the client.';

-- 2) Indexes for common queries
create index if not exists idx_ai_scenario_history_user_created
  on public.ai_scenario_history(user_id, created_at desc);

create index if not exists idx_ai_scenario_history_household_created
  on public.ai_scenario_history(household_id, created_at desc)
  where household_id is not null;

-- 3) Enable RLS
alter table public.ai_scenario_history enable row level security;

-- 4) RLS policies
-- Personal scenarios: only the owner can see/manage
-- Household scenarios: any household member (via is_member_of_household) can see,
-- but only the creating user manages (update/delete).

drop policy if exists "ai_history_select" on public.ai_scenario_history;
create policy "ai_history_select" on public.ai_scenario_history
for select using (
  user_id = auth.uid()
  or (
    household_id is not null
    and public.is_member_of_household(household_id)
  )
);

drop policy if exists "ai_history_insert" on public.ai_scenario_history;
create policy "ai_history_insert" on public.ai_scenario_history
for insert with check (
  user_id = auth.uid()
  and (
    household_id is null
    or public.is_member_of_household(household_id)
  )
);

drop policy if exists "ai_history_update" on public.ai_scenario_history;
create policy "ai_history_update" on public.ai_scenario_history
for update using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

drop policy if exists "ai_history_delete" on public.ai_scenario_history;
create policy "ai_history_delete" on public.ai_scenario_history
for delete using (
  user_id = auth.uid()
);