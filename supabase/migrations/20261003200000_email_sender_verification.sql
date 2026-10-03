begin;

alter table public.email_import_sender_whitelist
  add column verified_at timestamptz,
  add column verification_requested_at timestamptz;

-- Preserve shipped authorizations only; new rows have no verified_at default.
update public.email_import_sender_whitelist set verified_at = created_at;
alter table public.email_import_sender_whitelist
  drop constraint email_import_sender_whitelist_email_unique,
  add constraint email_import_sender_whitelist_user_email_unique
    unique (user_id, normalized_sender_email);

-- Clients can observe their grants, but cannot mark an address verified themselves.
revoke insert, update, delete on public.email_import_sender_whitelist
  from public, anon, authenticated;
grant select on public.email_import_sender_whitelist to authenticated;
grant all on public.email_import_sender_whitelist to service_role;

create table public.email_import_sender_verifications (
  id uuid primary key default gen_random_uuid(),
  whitelist_id uuid not null references public.email_import_sender_whitelist(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  normalized_sender_email text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  consumed_at timestamptz
);
create index email_sender_verifications_user_created_idx
  on public.email_import_sender_verifications(user_id, created_at);
create index email_sender_verifications_email_created_idx
  on public.email_import_sender_verifications(normalized_sender_email, created_at);
alter table public.email_import_sender_verifications enable row level security;
revoke all on public.email_import_sender_verifications from public, anon, authenticated;
grant all on public.email_import_sender_verifications to service_role;

create function public.request_email_import_sender_verification(
  p_user_id uuid, p_email text, p_token_hash text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sender public.email_import_sender_whitelist%rowtype;
  verification_id uuid;
begin
  if p_user_id is null or p_email is null or p_email <> lower(trim(p_email))
     or length(p_email) > 320 or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_SENDER_VERIFICATION_REQUEST';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('email-sender:user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('email-sender:email:' || p_email, 0));
  select * into sender from public.email_import_sender_whitelist
    where user_id = p_user_id and normalized_sender_email = p_email for update;
  if found and sender.verified_at is not null then
    return jsonb_build_object('status', 'already_verified');
  end if;
  if (sender.verification_requested_at > now() - interval '1 minute')
     or (select count(*) from public.email_import_sender_verifications
         where user_id = p_user_id and created_at > now() - interval '1 hour') >= 10
     or (select count(*) from public.email_import_sender_verifications
         where normalized_sender_email = p_email and created_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  insert into public.email_import_sender_whitelist
    (user_id, sender_email, normalized_sender_email, verification_requested_at)
    values (p_user_id, p_email, p_email, now())
    on conflict (user_id, normalized_sender_email) do update
      set verification_requested_at = now(), updated_at = now()
    returning * into sender;
  insert into public.email_import_sender_verifications
    (whitelist_id, user_id, normalized_sender_email, token_hash)
    values (sender.id, p_user_id, p_email, p_token_hash)
    returning id into verification_id;
  return jsonb_build_object('status', 'pending', 'verificationId', verification_id);
end;
$$;

create function public.confirm_email_import_sender_verification(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  verification public.email_import_sender_verifications%rowtype;
  sender public.email_import_sender_whitelist%rowtype;
begin
  select * into verification from public.email_import_sender_verifications
    where token_hash = p_token_hash;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  -- Match deletion's parent-before-child lock order to avoid a revoke/confirm deadlock.
  select * into sender from public.email_import_sender_whitelist
    where id = verification.whitelist_id and user_id = verification.user_id for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into verification from public.email_import_sender_verifications
    where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if verification.consumed_at is null and verification.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;
  update public.email_import_sender_whitelist
    set verified_at = coalesce(verified_at, now()), updated_at = now()
    where id = sender.id returning * into sender;
  update public.email_import_sender_verifications
    set consumed_at = coalesce(consumed_at, now()) where id = verification.id;
  return jsonb_build_object(
    'status', 'verified', 'userId', sender.user_id,
    'sender', jsonb_build_object('id', sender.id, 'email', sender.sender_email,
      'normalizedEmail', sender.normalized_sender_email, 'verified', true,
      'verifiedAt', sender.verified_at)
  );
end;
$$;

create function public.email_import_sender_accounts(p_email text, p_received_at timestamptz)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(user_id order by user_id), '[]'::jsonb) from (
    select id as user_id from public.users
      where lower(trim(email)) = p_email and created_at <= p_received_at
    union
    select user_id from public.email_import_sender_whitelist
      where normalized_sender_email = p_email and verified_at <= p_received_at
  ) as authorized;
$$;

revoke all on function public.request_email_import_sender_verification(uuid, text, text) from public, anon, authenticated;
revoke all on function public.confirm_email_import_sender_verification(text) from public, anon, authenticated;
revoke all on function public.email_import_sender_accounts(text, timestamptz) from public, anon, authenticated;
grant execute on function public.request_email_import_sender_verification(uuid, text, text) to service_role;
grant execute on function public.confirm_email_import_sender_verification(text) to service_role;
grant execute on function public.email_import_sender_accounts(text, timestamptz) to service_role;

-- A receipt has an independent lease/finality boundary for each destination account.
alter table public.email_import_events
  add column delivery_user_id uuid references public.users(id) on delete cascade;
update public.email_import_events set delivery_user_id = user_id where user_id is not null;
alter table public.email_import_events drop constraint email_import_events_provider_email_id_key;
create unique index email_import_events_account_delivery_unique
  on public.email_import_events(provider_email_id, delivery_user_id) where delivery_user_id is not null;
create unique index email_import_events_unresolved_delivery_unique
  on public.email_import_events(provider_email_id) where delivery_user_id is null;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public'
         and tablename = 'email_import_sender_whitelist') then
    alter publication supabase_realtime add table public.email_import_sender_whitelist;
  end if;
end $$;

commit;
