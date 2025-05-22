-- USERS TABLE
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  avatar_url text,
  is_creator boolean default false,
  creator_profile jsonb,
  total_xp int4 default 0,
  level int4 default 1,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CHAT_SESSIONS TABLE
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  session_id text,
  model text,
  system_prompt jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CHAT_MESSAGES TABLE
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid references public.chat_sessions(id) on delete cascade,
  role text not null, -- 'user' or 'assistant'
  content text,
  metadata jsonb,
  timestamp timestamptz default now()
);

-- Indexes for performance (optional but recommended)
create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id);

-- Automatically insert into public.users when a new user signs up in auth.users
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, created_at, updated_at)
  values (
    new.id,
    new.email,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create index if not exists idx_chat_messages_chat_session_id on public.chat_messages(chat_session_id);