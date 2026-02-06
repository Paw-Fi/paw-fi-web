-- Telegram bot integration schema updates

-- chat_sessions: add channel discriminator
alter table public.chat_sessions
  add column if not exists channel text not null default 'whatsapp';

-- user_contacts: add Telegram identifiers
alter table public.user_contacts
  add column if not exists telegram_user_id text null;

alter table public.user_contacts
  add column if not exists telegram_chat_id text null;

create unique index if not exists user_contacts_telegram_chat_id_unique
  on public.user_contacts (telegram_chat_id)
  where telegram_chat_id is not null;

create index if not exists user_contacts_telegram_user_id_idx
  on public.user_contacts (telegram_user_id)
  where telegram_user_id is not null;

-- whatsapp_verifications: generalize for multi-channel
alter table public.whatsapp_verifications
  add column if not exists channel text not null default 'whatsapp';

alter table public.whatsapp_verifications
  add column if not exists subject text null;

update public.whatsapp_verifications
  set subject = phone_e164
  where subject is null;

alter table public.whatsapp_verifications
  alter column phone_e164 drop not null;

alter table public.whatsapp_verifications
  alter column subject set not null;

create index if not exists whatsapp_verifications_channel_subject_idx
  on public.whatsapp_verifications (channel, subject);

create index if not exists whatsapp_verifications_code_idx
  on public.whatsapp_verifications (verification_code);

create index if not exists whatsapp_verifications_user_idx
  on public.whatsapp_verifications (user_id);

create index if not exists whatsapp_verifications_expires_at_idx
  on public.whatsapp_verifications (expires_at);

-- RPC: Telegram context lookup
create or replace function public.get_telegram_context(p_telegram_chat_id text)
returns table (
  contact_id uuid,
  user_id uuid,
  verified boolean,
  preferred_currency text,
  preferred_language text,
  preferred_timezone text,
  subscription_plan text,
  subscription_status text,
  households jsonb,
  chat_session_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with contact_row as (
    select uc.*
    from user_contacts uc
    where uc.telegram_chat_id = p_telegram_chat_id
    order by uc.created_at desc
    limit 1
  ),
  households_agg as (
    select jsonb_agg(
      jsonb_build_object(
        'household_id', hm.household_id,
        'name', h.name
      )
      order by h.name
    ) as households
    from contact_row c
    join household_members hm on hm.user_id = c.user_id
    join households h on h.id = hm.household_id
  ),
  last_chat as (
    select cs.id
    from contact_row c
    join chat_sessions cs
      on cs.user_id = c.user_id
     and cs.session_id = 'telegram:' || p_telegram_chat_id
    order by cs.updated_at desc
    limit 1
  )
  select
    c.id as contact_id,
    c.user_id,
    c.verified,
    coalesce(c.preferred_currency, 'USD')::text as preferred_currency,
    coalesce(c.preferred_language, 'en')::text as preferred_language,
    coalesce(c.preferred_timezone, 'UTC')::text as preferred_timezone,
    s.plan::text as subscription_plan,
    s.status::text as subscription_status,
    coalesce(h.households, '[]'::jsonb) as households,
    lc.id as chat_session_id
  from contact_row c
  left join subscriptions s on s.user_id = c.user_id
  left join households_agg h on true
  left join last_chat lc on true;
end;
$$;

comment on function public.get_telegram_context(text) is
  'Fetch Telegram context in one call: contact info, subscription, households, and last telegram chat session id.';
