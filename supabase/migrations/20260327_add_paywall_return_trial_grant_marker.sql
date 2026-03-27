alter table public.users
add column if not exists paywall_return_trial_granted_at timestamptz;

alter table public.users
add column if not exists paywall_return_trial_exit_at timestamptz;

comment on column public.users.paywall_return_trial_granted_at is
  'First time a paywall return trial was granted to this user; used for idempotent eligibility checks.';

comment on column public.users.paywall_return_trial_exit_at is
  'Most recent server-recorded paywall exit time used to validate return-trial eligibility window.';
