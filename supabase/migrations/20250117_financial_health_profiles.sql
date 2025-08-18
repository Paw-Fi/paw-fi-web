create table if not exists public.financial_health_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique,
  profile_description text not null,
  quiz_answers jsonb not null,
  profile_data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for performance
create index if not exists idx_financial_health_profiles_user_id on public.financial_health_profiles(user_id);
create index if not exists idx_financial_health_profiles_created_at on public.financial_health_profiles(created_at);

-- Add row-level security (RLS) policies
alter table public.financial_health_profiles enable row level security;

-- Policy: Users can only access their own financial health profiles
create policy "Users can view their own financial health profiles"
on public.financial_health_profiles for select
using (auth.uid() = user_id);

-- Policy: Users can insert their own financial health profiles
create policy "Users can insert their own financial health profiles"
on public.financial_health_profiles for insert
with check (auth.uid() = user_id);

-- Policy: Users can update their own financial health profiles
create policy "Users can update their own financial health profiles"
on public.financial_health_profiles for update
using (auth.uid() = user_id);

-- Optional: Function to get the latest financial health profile for a user
create or replace function public.get_latest_financial_health_profile(target_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  profile_description text,
  quiz_answers jsonb,
  profile_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
) as $$
begin
  return query
  select 
    fhp.id,
    fhp.user_id,
    fhp.profile_description,
    fhp.quiz_answers,
    fhp.profile_data,
    fhp.created_at,
    fhp.updated_at
  from public.financial_health_profiles fhp
  where fhp.user_id = target_user_id
  order by fhp.created_at desc
  limit 1;
end;
$$ language plpgsql security definer;

-- Grant usage on the function to authenticated users
grant execute on function public.get_latest_financial_health_profile(uuid) to authenticated;

-- Comments for documentation
comment on table public.financial_health_profiles is 'Stores AI-generated financial profiles based on user quiz responses';
comment on column public.financial_health_profiles.user_id is 'References the user who completed the quiz';
comment on column public.financial_health_profiles.profile_description is 'AI-generated professional financial profile description';
comment on column public.financial_health_profiles.quiz_answers is 'Original quiz answers from the financial health assessment';
comment on column public.financial_health_profiles.profile_data is 'Structured data sent to AI for profile generation';
comment on function public.get_latest_financial_health_profile(uuid) is 'Returns the most recent financial health profile for a user';