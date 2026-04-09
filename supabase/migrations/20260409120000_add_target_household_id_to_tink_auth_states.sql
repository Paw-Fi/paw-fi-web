alter table public.tink_auth_states
  add column if not exists target_household_id uuid null
  references public.households(id) on delete cascade;

comment on column public.tink_auth_states.target_household_id is
  'Optional household scope chosen when starting the Tink bank-link flow.';

create index if not exists idx_tink_auth_states_target_household
  on public.tink_auth_states(target_household_id)
  where target_household_id is not null;
