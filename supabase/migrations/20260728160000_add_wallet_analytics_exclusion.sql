alter table public.accounts
  add column if not exists exclude_from_analytics boolean not null default false;
