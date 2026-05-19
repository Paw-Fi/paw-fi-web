create table if not exists public.currency_rate_snapshots (
  base_currency text primary key,
  rates jsonb not null,
  source text not null default 'open.er-api.com',
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint currency_rate_snapshots_base_currency_format
    check (base_currency ~ '^[A-Z]{3}$'),
  constraint currency_rate_snapshots_rates_object
    check (jsonb_typeof(rates) = 'object')
);

alter table public.currency_rate_snapshots enable row level security;

drop policy if exists currency_rate_snapshots_read_authenticated
  on public.currency_rate_snapshots;

create policy currency_rate_snapshots_read_authenticated
  on public.currency_rate_snapshots
  for select
  to authenticated
  using (true);

create index if not exists idx_currency_rate_snapshots_expires_at
  on public.currency_rate_snapshots(expires_at);
