-- One-time server nonce for Plaid update-mode completion.

create table if not exists public.plaid_link_update_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  connection_id uuid,
  nonce text not null unique,
  mode text not null,
  expires_at timestamptz not null,
  processing_started_at timestamptz,
  completed_at timestamptz,
  consumed_at timestamptz,
  link_request_id text,
  link_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plaid_link_update_sessions_lookup
  on public.plaid_link_update_sessions(user_id, connection_id, nonce)
  where consumed_at is null;

create index if not exists idx_plaid_link_update_sessions_new_link_lookup
  on public.plaid_link_update_sessions(user_id, nonce)
  where connection_id is null and consumed_at is null;

alter table public.plaid_link_update_sessions enable row level security;

drop policy if exists "Plaid link update sessions service role only" on public.plaid_link_update_sessions;
create policy "Plaid link update sessions service role only"
  on public.plaid_link_update_sessions
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.claim_plaid_link_completion_session(
  p_user_id uuid,
  p_connection_id uuid,
  p_nonce text,
  p_mode text,
  p_lease_minutes int default 5
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_lease_minutes < 1 or p_lease_minutes > 15 then
    raise exception 'invalid link completion lease minutes';
  end if;

  return query
  update public.plaid_link_update_sessions session
  set
    processing_started_at = now(),
    updated_at = now()
  where session.user_id = p_user_id
    and (
      (p_connection_id is null and session.connection_id is null)
      or session.connection_id = p_connection_id
    )
    and session.nonce = p_nonce
    and session.mode = p_mode
    and session.consumed_at is null
    and session.expires_at > now()
    and (
      session.processing_started_at is null
      or session.processing_started_at < now() - (p_lease_minutes || ' minutes')::interval
    )
  returning session.id;
end;
$$;

revoke all on function public.claim_plaid_link_completion_session(uuid, uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.claim_plaid_link_completion_session(uuid, uuid, text, text, int) to service_role;
