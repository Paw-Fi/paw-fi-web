-- Create a lightweight RPC to fetch WhatsApp context in a single call.
-- Returns contact info, subscription status, households, and last WhatsApp chat session id.

create or replace function public.get_whatsapp_context(p_phone_e164 text)
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
    where uc.phone_e164 = p_phone_e164
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
     and cs.session_id = 'whatsapp:' || p_phone_e164
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

comment on function public.get_whatsapp_context(text) is
  'Fetch WhatsApp context in one call: contact info, subscription, households, and last whatsapp chat session id.';
