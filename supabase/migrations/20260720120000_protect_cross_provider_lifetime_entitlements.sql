-- Keep the effective subscription row safe when provider webhooks arrive out
-- of order. Lifetime is the dominant entitlement and may only be revoked by
-- the provider purchase that granted it (or by an explicit administrative
-- operation outside the generic webhook write path).

alter table public.subscriptions
  add column if not exists lifetime_source text null,
  add column if not exists lifetime_source_id text null;

alter table public.subscriptions
  drop constraint if exists subscriptions_lifetime_source_valid;

alter table public.subscriptions
  add constraint subscriptions_lifetime_source_valid
  check (
    lifetime_source is null
    or lifetime_source in ('stripe', 'app_store', 'play_store', 'manual')
  );

update public.subscriptions
set
  lifetime_source = case
    when provider = 'app_store' then 'app_store'
    when provider = 'play_store' then 'play_store'
    when coalesce(last_event_id, '') like 'manual_upgrade_script%'
      or coalesce(stripe_customer_id, '') like 'manual_lifetime_%'
      then 'manual'
    else 'stripe'
  end,
  lifetime_source_id = case
    when provider = 'app_store' then app_store_original_transaction_id
    when provider = 'play_store' then coalesce(play_purchase_token, play_order_id)
    when coalesce(last_event_id, '') like 'manual_upgrade_script%'
      or coalesce(stripe_customer_id, '') like 'manual_lifetime_%'
      then user_id::text
    else null
  end
where plan = 'lifetime'
  and status = 'active'
  and lifetime_source is null;

alter table public.subscriptions
  drop constraint if exists subscriptions_active_lifetime_source_required;

alter table public.subscriptions
  add constraint subscriptions_active_lifetime_source_required
  check (
    bound_to_user_id is not null
    or plan is distinct from 'lifetime'
    or status is distinct from 'active'
    or lifetime_source is not null
  ) not valid;

alter table public.subscriptions
  validate constraint subscriptions_active_lifetime_source_required;

create or replace function public.protect_active_lifetime_entitlement()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_source_verified_revocation boolean :=
    coalesce(current_setting('moneko.allow_lifetime_revocation', true), '') = 'on';
  v_manual_override boolean :=
    auth.role() = 'service_role'
    and (
      new.last_event_id = 'manual_downgrade_script'
      or (
        new.plan = 'lifetime'
        and new.status = 'active'
        and new.last_event_id like 'manual_upgrade_script%'
      )
    );
  v_new_is_terminal boolean :=
    new.status in ('canceled', 'incomplete_expired', 'unpaid');
begin
  if not v_source_verified_revocation
     and not v_manual_override
     and old.bound_to_user_id is null
     and old.plan = 'lifetime'
     and old.status = 'active'
     and (
       new.plan is distinct from 'lifetime'
       or new.status is distinct from 'active'
       or new.lifetime_source is distinct from old.lifetime_source
       or new.lifetime_source_id is distinct from old.lifetime_source_id
     )
  then
    raise exception using
      errcode = '23514',
      message = 'Active lifetime entitlement requires source-verified mutation';
  end if;

  -- This is a database-level race guard. The Edge Function policy normally
  -- ignores these stale events before writing, while this check closes the
  -- read/decision/write window between concurrent provider deliveries.
  if not v_source_verified_revocation
     and not v_manual_override
     and old.bound_to_user_id is null
     and old.plan is distinct from 'free'
     and old.status in ('active', 'trialing', 'past_due')
     and v_new_is_terminal
     and new.provider is distinct from old.provider
  then
    raise exception using
      errcode = '23514',
      message = 'Terminal provider event does not own the current entitlement';
  end if;

  if not v_source_verified_revocation
     and not v_manual_override
     and old.bound_to_user_id is null
     and v_new_is_terminal
     and old.provider = 'stripe'
     and new.provider = 'stripe'
     and old.stripe_subscription_id is not null
     and new.stripe_subscription_id is distinct from old.stripe_subscription_id
  then
    raise exception using
      errcode = '23514',
      message = 'Terminal Stripe event does not own the current purchase';
  end if;

  if not v_source_verified_revocation
     and not v_manual_override
     and old.bound_to_user_id is null
     and v_new_is_terminal
     and old.provider = 'app_store'
     and new.provider = 'app_store'
     and old.app_store_original_transaction_id is not null
     and new.app_store_original_transaction_id is distinct from
       old.app_store_original_transaction_id
  then
    raise exception using
      errcode = '23514',
      message = 'Terminal App Store event does not own the current purchase';
  end if;

  return new;
end;
$$;

drop trigger if exists subscriptions_protect_active_lifetime on public.subscriptions;
create trigger subscriptions_protect_active_lifetime
before update on public.subscriptions
for each row
execute function public.protect_active_lifetime_entitlement();

create or replace function public.revoke_lifetime_entitlement_v1(
  p_user_id uuid,
  p_source text,
  p_source_id text,
  p_event_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.subscriptions%rowtype;
begin
  if p_user_id is null
     or p_source not in ('stripe', 'app_store', 'play_store')
     or nullif(trim(p_source_id), '') is null
     or nullif(trim(p_event_id), '') is null
  then
    raise exception 'Invalid lifetime revocation request';
  end if;

  select *
  into v_subscription
  from public.subscriptions
  where user_id = p_user_id
  for update;

  if not found
     or v_subscription.plan <> 'lifetime'
     or v_subscription.status <> 'active'
  then
    return false;
  end if;

  -- Legacy Lifetime rows without a durable purchase key are intentionally not
  -- auto-revoked. They require review instead of risking removal of a newer or
  -- manually granted Lifetime entitlement.
  if v_subscription.lifetime_source is distinct from p_source
     or nullif(trim(v_subscription.lifetime_source_id), '') is null
     or v_subscription.lifetime_source_id is distinct from p_source_id
  then
    return false;
  end if;

  perform set_config('moneko.allow_lifetime_revocation', 'on', true);

  update public.subscriptions
  set
    provider = p_source,
    plan = 'free',
    status = 'canceled',
    billing_interval = null,
    current_period_end = null,
    cancel_at_period_end = false,
    trial_start = null,
    trial_end = null,
    stripe_subscription_id = null,
    store_product_id = null,
    app_store_transaction_id = null,
    app_store_original_transaction_id = null,
    app_store_environment = null,
    play_purchase_token = null,
    play_order_id = null,
    play_package_name = null,
    ended_at = now(),
    last_event_id = p_event_id,
    updated_at = now()
  where user_id = p_user_id;

  -- Keep owner revocation and dependent household cancellation in the same
  -- transaction. A retry can therefore never observe a revoked owner whose
  -- borrowed entitlements were left active by a failed second RPC.
  perform public.cascade_subscription_cancellation(p_user_id);

  return true;
end;
$$;

revoke all on function public.revoke_lifetime_entitlement_v1(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.revoke_lifetime_entitlement_v1(uuid, text, text, text)
to service_role;

comment on column public.subscriptions.lifetime_source is
  'Authoritative source of the current or most recently source-revoked Lifetime grant. Generic provider lifecycle events cannot revoke it.';
comment on column public.subscriptions.lifetime_source_id is
  'Durable provider purchase identifier used to authorize exact Lifetime revocation and failed-refund restoration.';
