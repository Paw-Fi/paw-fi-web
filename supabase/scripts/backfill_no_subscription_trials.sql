-- One-time repair for users who failed to receive the onboarding trial.
-- Grants a 7-day Plus trial starting at execution time to every user present
-- in both auth.users and public.users with no existing public.subscriptions row.

-- Preview affected users before running the backfill.
select count(*) as eligible_user_count
from auth.users au
join public.users u on u.id = au.id
where not exists (
  select 1
  from public.subscriptions s
  where s.user_id = au.id
);

-- Public profile rows whose auth user no longer exists are ignored. They cannot
-- receive subscriptions because public.subscriptions.user_id references auth.users.
select count(*) as orphan_public_user_count
from public.users u
where not exists (
  select 1
  from auth.users au
  where au.id = u.id
);

-- Auth users missing a public profile row are also ignored by this repair.
-- Investigate these separately before creating profile rows automatically.
select count(*) as auth_users_missing_public_profile_count
from auth.users au
where not exists (
  select 1
  from public.users u
  where u.id = au.id
);

begin;

with params as (
  select
    now() as trial_start,
    now() + interval '7 days' as trial_end
), eligible_users as (
  select
    au.id as user_id,
    p.trial_start,
    p.trial_end
  from auth.users au
  join public.users u on u.id = au.id
  cross join params p
  where not exists (
    select 1
    from public.subscriptions s
    where s.user_id = au.id
  )
), inserted_trials as (
  insert into public.subscriptions (
    user_id,
    plan,
    status,
    billing_interval,
    current_period_end,
    trial_start,
    trial_end,
    provider,
    store_product_id,
    cancel_at_period_end,
    stripe_subscription_id,
    stripe_customer_id,
    bound_to_user_id,
    bound_to_household_id
  )
  select
    user_id,
    'plus',
    'trialing',
    'yearly',
    trial_end,
    trial_start,
    trial_end,
    'stripe',
    null,
    false,
    null,
    null,
    null,
    null
  from eligible_users
  on conflict (user_id) do nothing
  returning user_id
), marked_users as (
  update public.users u
  set
    paywall_return_trial_granted_at = p.trial_start,
    paywall_return_trial_exit_at = null,
    updated_at = p.trial_start
  from inserted_trials i
  cross join params p
  where u.id = i.user_id
  returning u.id
)
select
  (select count(*) from eligible_users) as eligible_user_count,
  (select count(*) from inserted_trials) as granted_trial_count,
  (select count(*) from marked_users) as marked_user_count;

commit;

-- Verification after commit.
select count(*) as active_backfilled_trial_count
from public.subscriptions s
where s.status = 'trialing'
  and s.plan = 'plus'
  and s.billing_interval = 'yearly'
  and s.stripe_subscription_id is null
  and s.current_period_end > now()
  and s.trial_start >= now() - interval '10 minutes';
