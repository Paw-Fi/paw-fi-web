-- Pockets v4 keeps monthly envelope rows as compatibility facts while making
-- rollover_group_id the only persistent pocket lineage key for new behavior.

create extension if not exists pgcrypto with schema extensions;

-- Freeze writes while normalizing legacy identities and installing the unique
-- index. Without this, an older app client could insert a duplicate between
-- the repair below and the new database invariant.
lock table public.budget_envelopes in share row exclusive mode;

update public.budget_envelopes
set rollover_group_id = gen_random_uuid()
where rollover_group_id is null;

alter table public.budget_envelopes
  alter column rollover_group_id set default gen_random_uuid(),
  alter column rollover_group_id set not null;

-- A legacy monthly copy could create two envelope rows with the same rollover
-- group inside one budget. v4 gives that UUID the stricter meaning of one
-- persistent pocket identity, so retain the oldest envelope's history and
-- split every additional same-month row into its own lineage. This preserves
-- all envelope IDs, allocations, category links, and transaction history;
-- only an ambiguous legacy identity is disambiguated.
with ranked_duplicate_lineages as (
  select
    envelope.id,
    row_number() over (
      partition by envelope.budget_id, envelope.rollover_group_id
      order by envelope.created_at asc, envelope.id asc
    ) as lineage_rank
  from public.budget_envelopes envelope
)
update public.budget_envelopes envelope
set rollover_group_id = gen_random_uuid()
from ranked_duplicate_lineages duplicate
where duplicate.id = envelope.id
  and duplicate.lineage_rank > 1;

create unique index if not exists budget_envelopes_budget_lineage_unique
  on public.budget_envelopes(budget_id, rollover_group_id);

comment on column public.budget_envelopes.rollover_group_id is
  'Persistent pocket lineage UUID. New lifecycle and carry APIs identify pockets only by this value, never by display name.';

create or replace function public.can_access_pocket_scope_v1(
  p_owner_user_id uuid,
  p_household_id uuid,
  p_scope text
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.role() = 'service_role' then true
    when auth.uid() is null then false
    when lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'personal'
      then p_household_id is null and auth.uid() = p_owner_user_id
    when lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'household'
      then p_household_id is not null
        and exists (
          select 1
          from public.household_members membership
          where membership.household_id = p_household_id
            and membership.user_id = auth.uid()
        )
    when lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'portfolio'
      then p_household_id is not null
        and auth.uid() = p_owner_user_id
        and exists (
          select 1
          from public.households household
          where household.id = p_household_id
            and coalesce(household.is_portfolio, false)
            and household.owner_id = auth.uid()
        )
    else false
  end;
$$;

-- Reads are intentionally broader than writes: household members can see a
-- shared plan, but only its owner or an administrator can change it.
create or replace function public.can_edit_pocket_scope_v1(
  p_owner_user_id uuid,
  p_household_id uuid,
  p_scope text
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.role() = 'service_role' then true
    when auth.uid() is null then false
    when lower(coalesce(nullif(trim(p_scope), ''), 'personal')) = 'personal'
      then p_household_id is null and auth.uid() = p_owner_user_id
    when lower(coalesce(nullif(trim(p_scope), ''), 'personal')) in ('household', 'portfolio')
      then p_household_id is not null and exists (
        select 1 from public.household_members membership
        where membership.household_id = p_household_id
          and membership.user_id = auth.uid()
          and membership.role in ('owner', 'admin')
      )
    else false
  end;
$$;

create table public.pocket_lineages (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  scope text not null check (scope in ('personal', 'household', 'portfolio')),
  currency text not null,
  name text not null,
  icon text,
  color text,
  rollover_enabled boolean not null default false,
  rollover_negative boolean not null default false,
  rollover_cap_cents bigint,
  funding_policy text not null default 'decide_each_cycle'
    check (funding_policy in ('refill_to', 'add_every_cycle', 'decide_each_cycle')),
  funding_target_cents bigint,
  activated_on date not null,
  status text not null default 'active' check (status in ('active', 'dormant', 'retired')),
  activation_reason text not null default 'latest_cycle'
    check (activation_reason in ('latest_cycle', 'rollover_continuation', 'user_restored', 'uncertain_history')),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'personal' and household_id is null)
    or (scope in ('household', 'portfolio') and household_id is not null)
  )
);

with envelope_history as (
  select
    e.*,
    b.period_month,
    coalesce(h.is_portfolio, false) as is_portfolio,
    min(date_trunc('month', b.period_month)::date) over (
      partition by e.rollover_group_id
    ) as first_active_month,
    row_number() over (
      partition by e.rollover_group_id
      order by b.period_month desc, e.updated_at desc nulls last, e.created_at desc, e.id desc
    ) as recency
  from public.budget_envelopes e
  join public.budgets b on b.id = e.budget_id
  left join public.households h on h.id = e.household_id
)
insert into public.pocket_lineages (
  id,
  owner_user_id,
  household_id,
  scope,
  currency,
  name,
  icon,
  color,
  rollover_enabled,
  rollover_negative,
  rollover_cap_cents,
  activated_on
)
select
  e.rollover_group_id,
  e.user_id,
  e.household_id,
  case
    when e.household_id is null then 'personal'
    when e.is_portfolio then 'portfolio'
    else 'household'
  end,
  upper(coalesce(nullif(trim(e.currency), ''), 'USD')),
  e.name,
  e.icon,
  e.color,
  coalesce(e.rollover_enabled, false),
  coalesce(e.rollover_negative, false),
  e.rollover_cap_cents,
  e.first_active_month
from envelope_history e
where e.recency = 1
on conflict (id) do nothing;

-- A historical record alone is not evidence that a pocket should reappear.
-- Keep uncertain history dormant; latest pockets and uninterrupted rollover
-- lineages remain active.
update public.pocket_lineages lineage
set status = case
  when exists (
    select 1
    from public.budget_envelopes envelope
    join public.budgets budget on budget.id = envelope.budget_id
    where envelope.rollover_group_id = lineage.id
      and budget.period_month = (
        select max(latest_budget.period_month)
        from public.budget_envelopes latest_envelope
        join public.budgets latest_budget on latest_budget.id = latest_envelope.budget_id
        where latest_envelope.user_id = lineage.owner_user_id
          and latest_envelope.household_id is not distinct from lineage.household_id
          and upper(latest_envelope.currency) = lineage.currency
      )
  ) then 'active'
  when lineage.rollover_enabled then 'active'
  else 'dormant'
end,
activation_reason = case
  when exists (
    select 1 from public.budget_envelopes envelope
    join public.budgets budget on budget.id = envelope.budget_id
    where envelope.rollover_group_id = lineage.id
      and budget.period_month = (
        select max(latest_budget.period_month)
        from public.budget_envelopes latest_envelope
        join public.budgets latest_budget on latest_budget.id = latest_envelope.budget_id
        where latest_envelope.user_id = lineage.owner_user_id
          and latest_envelope.household_id is not distinct from lineage.household_id
          and upper(latest_envelope.currency) = lineage.currency
      )
  ) then 'latest_cycle'
  when lineage.rollover_enabled then 'rollover_continuation'
  else 'uncertain_history'
end;

create table public.pocket_lineage_category_assignments (
  id uuid primary key default gen_random_uuid(),
  lineage_id uuid not null references public.pocket_lineages(id) on delete cascade,
  category text not null check (trim(category) <> ''),
  effective_from date not null,
  effective_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_until is null or effective_until >= effective_from),
  unique (lineage_id, category, effective_from)
);

-- A missing envelope is a gap, not a category removal. A category interval
-- closes only when a later materialized month explicitly omits that category.
with snapshot_months as (
  select distinct
    envelope.rollover_group_id as lineage_id,
    date_trunc('month', budget.period_month)::date as budget_month
  from public.budget_envelopes envelope
  join public.budgets budget on budget.id = envelope.budget_id
), snapshot_categories as (
  select distinct
    envelope.rollover_group_id as lineage_id,
    date_trunc('month', budget.period_month)::date as budget_month,
    lower(trim(link.category)) as category
  from public.budget_envelopes envelope
  join public.budgets budget on budget.id = envelope.budget_id
  join public.envelope_category_links link on link.envelope_id = envelope.id
  where trim(link.category) <> ''
), interval_starts as (
  select category.lineage_id, category.category, category.budget_month
  from snapshot_categories category
  left join lateral (
    select snapshot.budget_month
    from snapshot_months snapshot
    where snapshot.lineage_id = category.lineage_id
      and snapshot.budget_month < category.budget_month
    order by snapshot.budget_month desc
    limit 1
  ) previous_snapshot on true
  left join snapshot_categories previous_category
    on previous_category.lineage_id = category.lineage_id
   and previous_category.category = category.category
   and previous_category.budget_month = previous_snapshot.budget_month
  where previous_category.lineage_id is null
)
insert into public.pocket_lineage_category_assignments (
  lineage_id, category, effective_from, effective_until
)
select
  start.lineage_id,
  start.category,
  start.budget_month,
  case when next_missing.budget_month is null then null
    else (next_missing.budget_month - interval '1 day')::date end
from interval_starts start
left join lateral (
  select snapshot.budget_month
  from snapshot_months snapshot
  where snapshot.lineage_id = start.lineage_id
    and snapshot.budget_month > start.budget_month
    and not exists (
      select 1 from snapshot_categories category
      where category.lineage_id = start.lineage_id
        and category.category = start.category
        and category.budget_month = snapshot.budget_month
    )
  order by snapshot.budget_month
  limit 1
) next_missing on true;

create table public.pocket_month_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  scope text not null check (scope in ('personal', 'household', 'portfolio')),
  scope_key uuid generated always as (coalesce(household_id, owner_user_id)) stored,
  budget_month date not null,
  currency text not null,
  setup_revision integer not null default 0 check (setup_revision >= 0),
  status text not null default 'unreviewed'
    check (status in ('unreviewed', 'draft', 'pending_sync', 'confirmed', 'conflicted')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'personal' and household_id is null)
    or (scope in ('household', 'portfolio') and household_id is not null)
  ),
  unique (scope, scope_key, currency, budget_month)
);

create table public.pocket_lineage_balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  lineage_id uuid not null references public.pocket_lineages(id) on delete cascade,
  effective_month date not null,
  amount_cents bigint not null check (amount_cents <> 0),
  reason text not null check (trim(reason) <> ''),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.pocket_lineage_retirements (
  id uuid primary key default gen_random_uuid(),
  lineage_id uuid not null unique references public.pocket_lineages(id) on delete cascade,
  effective_month date not null,
  reason text,
  retired_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index pocket_lineages_scope_currency_active_idx
  on public.pocket_lineages(scope, owner_user_id, household_id, currency, status);
create index pocket_lineage_categories_effective_idx
  on public.pocket_lineage_category_assignments(lineage_id, effective_from, effective_until);
create index pocket_lineage_adjustments_effective_idx
  on public.pocket_lineage_balance_adjustments(lineage_id, effective_month);

-- All future envelope creation produces a lineage before the row is stored.
-- The later foreign key prevents an orphan monthly envelope.
create or replace function public.ensure_pocket_lineage_for_envelope_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_budget public.budgets%rowtype;
  v_scope text;
begin
  if new.rollover_group_id is null then
    new.rollover_group_id := gen_random_uuid();
  end if;
  select * into v_budget from public.budgets where id = new.budget_id;
  if not found then
    raise exception 'Unknown budget for pocket envelope' using errcode = '23503';
  end if;
  v_scope := case
    when new.household_id is null then 'personal'
    when exists (
      select 1 from public.households household
      where household.id = new.household_id
        and coalesce(household.is_portfolio, false)
    ) then 'portfolio'
    else 'household'
  end;
  insert into public.pocket_lineages (
    id, owner_user_id, household_id, scope, currency, name, icon, color,
    rollover_enabled, rollover_negative, rollover_cap_cents, activated_on
  ) values (
    new.rollover_group_id, new.user_id, new.household_id, v_scope,
    upper(coalesce(nullif(trim(new.currency), ''), 'USD')), new.name, new.icon,
    new.color, coalesce(new.rollover_enabled, false),
    coalesce(new.rollover_negative, false), new.rollover_cap_cents,
    date_trunc('month', v_budget.period_month)::date
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger budget_envelopes_ensure_pocket_lineage_v1
before insert or update of name, icon, color, currency, rollover_group_id,
  rollover_enabled, rollover_negative, rollover_cap_cents
on public.budget_envelopes
for each row execute function public.ensure_pocket_lineage_for_envelope_v1();

alter table public.budget_envelopes
  add constraint budget_envelopes_lineage_fk
  foreign key (rollover_group_id) references public.pocket_lineages(id)
  deferrable initially deferred;

alter table public.pocket_lineages enable row level security;
alter table public.pocket_lineage_category_assignments enable row level security;
alter table public.pocket_month_reviews enable row level security;
alter table public.pocket_lineage_balance_adjustments enable row level security;
alter table public.pocket_lineage_retirements enable row level security;

create policy pocket_lineages_scope_access on public.pocket_lineages
  for select
  using (public.can_access_pocket_scope_v1(owner_user_id, household_id, scope));

create policy pocket_lineage_categories_scope_access on public.pocket_lineage_category_assignments
  for select
  using (exists (
    select 1 from public.pocket_lineages lineage
    where lineage.id = lineage_id
      and public.can_access_pocket_scope_v1(lineage.owner_user_id, lineage.household_id, lineage.scope)
  ));

create policy pocket_month_reviews_scope_access on public.pocket_month_reviews
  for select
  using (public.can_access_pocket_scope_v1(owner_user_id, household_id, scope));

create policy pocket_lineage_adjustments_scope_access on public.pocket_lineage_balance_adjustments
  for select
  using (exists (
    select 1 from public.pocket_lineages lineage
    where lineage.id = lineage_id
      and public.can_access_pocket_scope_v1(lineage.owner_user_id, lineage.household_id, lineage.scope)
  ));

create policy pocket_lineage_retirements_scope_access on public.pocket_lineage_retirements
  for select
  using (exists (
    select 1 from public.pocket_lineages lineage
    where lineage.id = lineage_id
      and public.can_access_pocket_scope_v1(lineage.owner_user_id, lineage.household_id, lineage.scope)
  ));

create or replace function public.get_pockets_month_v4(
  p_user_id uuid,
  p_scope text,
  p_budget_month date,
  p_household_id uuid default null,
  p_currency text default null,
  p_include_projected_recurring boolean default true,
  p_allow_currency_fallback boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_month date := date_trunc('month', p_budget_month)::date;
  v_payload jsonb;
  v_currency text;
  v_review jsonb;
  v_can_edit boolean;
  v_is_current_period boolean;
begin
  if p_budget_month is null or v_scope not in ('personal', 'household', 'portfolio') then
    raise exception 'Invalid pockets month request' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Client user does not match authenticated user' using errcode = '42501';
  end if;
  if not public.can_access_pocket_scope_v1(p_user_id, p_household_id, v_scope) then
    raise exception 'Unauthorized pockets access' using errcode = '42501';
  end if;
  v_can_edit := public.can_edit_pocket_scope_v1(
    p_user_id, p_household_id, v_scope
  );
  v_is_current_period := v_month = public.financial_cycle_start_for_month(
    current_date,
    public.user_financial_month_start_day(p_user_id)
  );

  v_payload := public.get_pockets_month_v3(
    p_user_id, v_scope, v_month, p_household_id, p_currency,
    p_include_projected_recurring, p_allow_currency_fallback
  );
  v_currency := upper(coalesce(nullif(v_payload ->> 'selected_currency', ''), p_currency, 'USD'));

  select to_jsonb(review)
  into v_review
  from public.pocket_month_reviews review
  where (v_scope = 'household' or review.owner_user_id = p_user_id)
    and review.household_id is not distinct from p_household_id
    and review.scope = v_scope
    and review.currency = v_currency
    and review.budget_month = v_month;

  return v_payload || jsonb_build_object(
    'normalized_calculation_facts', jsonb_build_array(
      jsonb_build_object(
        'id', 'fact:monthly_budget_cents',
        'value_cents', coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0)
      ),
      jsonb_build_object(
        'id', 'fact:allocated_cents',
        'value_cents', coalesce((select sum((item ->> 'amount_cents')::bigint)
          from jsonb_array_elements(coalesce(v_payload -> 'allocations', '[]'::jsonb)) item), 0)
      ),
      jsonb_build_object(
        'id', 'fact:unassigned_cents',
        'value_cents', greatest(
          coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0) -
          coalesce((select sum((item ->> 'amount_cents')::bigint)
            from jsonb_array_elements(coalesce(v_payload -> 'allocations', '[]'::jsonb)) item), 0),
          0
        )
      )
    ),
    'pockets_v4', jsonb_build_object(
       'can_edit', v_can_edit,
       'is_current_period', v_is_current_period,
       'setup_revision', coalesce((v_review ->> 'setup_revision')::integer, 0),
       -- A missing monthly budget has no review state. Do not manufacture a
       -- zero-budget review for readers or historical cycles.
       'review', case
         when nullif(v_payload -> 'budget' ->> 'id', '') is null then null
         else coalesce(v_review, '{}'::jsonb) || jsonb_build_object(
         'monthly_budget_cents', coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0),
         'current_allocations', coalesce(v_payload -> 'allocations', '[]'::jsonb),
         'unassigned_cents', greatest(
           coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0) -
           coalesce((select sum((item ->> 'amount_cents')::bigint)
             from jsonb_array_elements(coalesce(v_payload -> 'allocations', '[]'::jsonb)) item), 0), 0
         ),
         'facts', jsonb_build_object(
           'monthly_budget_cents', coalesce((v_payload -> 'budget' ->> 'total_budget_cents')::bigint, 0)
         ),
         'suggestions', coalesce((
           select jsonb_agg(jsonb_build_object(
             'lineage_id', lineage.id,
             'envelope_id', envelope.id,
             'label', lineage.name,
             'amount_cents', case lineage.funding_policy
               when 'add_every_cycle' then coalesce(lineage.funding_target_cents, 0)
               when 'refill_to' then greatest(
                 coalesce(lineage.funding_target_cents, 0) -
                   greatest(coalesce((carry.value ->> 'carry_cents')::bigint, 0), 0) +
                   case when lineage.rollover_negative
                     then greatest(-coalesce((carry.value ->> 'carry_cents')::bigint, 0), 0)
                     else 0 end,
                 0
               )
               else coalesce(current_allocation.amount_cents, last_allocation.amount_cents, 0)
             end,
             'incoming_carry_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0),
             'funding_policy', lineage.funding_policy,
             'reason_code', case lineage.funding_policy
               when 'add_every_cycle' then 'monthly_contribution'
               when 'refill_to' then 'refill_after_carry'
               else 'last_confirmed_allocation'
             end
           ) order by lineage.created_at, lineage.id)
           from public.pocket_lineages lineage
           left join public.budget_envelopes envelope
             on envelope.budget_id = (v_payload -> 'budget' ->> 'id')::uuid
            and envelope.rollover_group_id = lineage.id
           left join public.envelope_allocations current_allocation
             on current_allocation.envelope_id = envelope.id
            and current_allocation.period_month = v_month
           left join lateral (
             select allocation.amount_cents
             from public.budget_envelopes historical_envelope
             join public.envelope_allocations allocation
               on allocation.envelope_id = historical_envelope.id
             where historical_envelope.rollover_group_id = lineage.id
               and allocation.period_month < v_month
             order by allocation.period_month desc
             limit 1
           ) last_allocation on true
           left join lateral (
             select public.calculate_pocket_cycle_carry_v3(
               p_user_id, v_scope, p_household_id, v_currency, lineage.id, v_month
             ) as value
           ) carry on true
           where lineage.scope = v_scope
             and lineage.household_id is not distinct from p_household_id
             and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
             and lineage.currency = v_currency
             and lineage.status = 'active'
             and lineage.activated_on <= v_month
          ), '[]'::jsonb)
        ) end,
      'lifecycle_virtual_rows', coalesce((
        select jsonb_agg(jsonb_build_object(
           'id', lineage.id,
           'rollover_group_id', lineage.id,
           'pocket_lineage_id', lineage.id,
           'is_virtual', true,
           'name', lineage.name,
           'icon', lineage.icon,
           'color', lineage.color,
           'currency', lineage.currency,
           'rollover_enabled', lineage.rollover_enabled,
           'rollover_negative', lineage.rollover_negative,
           'rollover_cap_cents', lineage.rollover_cap_cents,
           'funding_policy', lineage.funding_policy,
           'funding_target_cents', lineage.funding_target_cents,
           'incoming_carry_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0),
           'available_budget_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0) + coalesce(adjustments.amount_cents, 0),
           'remaining_cents', coalesce((carry.value ->> 'carry_cents')::bigint, 0) + coalesce(adjustments.amount_cents, 0),
          'status', lineage.status,
          'activated_on', lineage.activated_on,
          'retired_effective_month', retirement.effective_month,
          'categories', coalesce(categories.rows, '[]'::jsonb),
          'balance_adjustments_cents', coalesce(adjustments.amount_cents, 0)
        ) order by lineage.created_at, lineage.id), '[]'::jsonb)
        from public.pocket_lineages lineage
        left join public.pocket_lineage_retirements retirement on retirement.lineage_id = lineage.id
         left join lateral (
          select jsonb_agg(assignment.category order by assignment.category) as rows
          from public.pocket_lineage_category_assignments assignment
          where assignment.lineage_id = lineage.id
            and assignment.effective_from <= v_month
            and (assignment.effective_until is null or assignment.effective_until >= v_month)
        ) categories on true
        left join lateral (
          select sum(adjustment.amount_cents)::bigint as amount_cents
          from public.pocket_lineage_balance_adjustments adjustment
          where adjustment.lineage_id = lineage.id
             and adjustment.effective_month = v_month
         ) adjustments on true
         left join lateral (
           select public.calculate_pocket_cycle_carry_v3(
             p_user_id, v_scope, p_household_id, v_currency, lineage.id, v_month
           ) as value
         ) carry on true
        where (v_scope = 'household' or lineage.owner_user_id = p_user_id)
          and lineage.household_id is not distinct from p_household_id
          and lineage.scope = v_scope
           and lineage.currency = v_currency
           and lineage.activated_on <= v_month
           and lineage.status = 'active'
          and not exists (
            select 1
            from jsonb_array_elements(coalesce(v_payload -> 'envelopes', '[]'::jsonb)) envelope
            where nullif(envelope ->> 'rollover_group_id', '')::uuid = lineage.id
          )
      ), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.calculate_pocket_cycle_carry_v3(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_currency text,
  p_lineage_id uuid,
  p_budget_month date
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_month date := date_trunc('month', p_budget_month)::date;
  v_lineage public.pocket_lineages%rowtype;
  v_cycle_month date;
  v_cycle_start date;
  v_cycle_end date;
  v_base_cents bigint;
  v_spent_cents bigint;
  v_adjustment_cents bigint;
  v_carry_cents bigint := 0;
begin
  select * into v_lineage
  from public.pocket_lineages
  where id = p_lineage_id;
  if not found
     or (v_scope <> 'household' and v_lineage.owner_user_id is distinct from p_user_id)
     or v_lineage.household_id is distinct from p_household_id
     or v_lineage.scope <> v_scope
     or v_lineage.currency <> upper(coalesce(nullif(trim(p_currency), ''), 'USD')) then
    raise exception 'Unknown pocket lineage for scope' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Client user does not match authenticated user' using errcode = '42501';
  end if;
  if not public.can_access_pocket_scope_v1(p_user_id, p_household_id, v_scope) then
    raise exception 'Unauthorized pocket carry access' using errcode = '42501';
  end if;

  -- Iterate every canonical budget anchor, including periods that never had a
  -- materialized envelope. A skipped period has zero funding, but still spends
  -- against the category assignment effective for that period.
  v_cycle_month := date_trunc('month', v_lineage.activated_on)::date;
  while v_cycle_month < v_month loop
    v_cycle_start := public.financial_cycle_start_for_month(
      v_cycle_month, public.user_financial_month_start_day(p_user_id)
    );
    v_cycle_end := public.next_financial_cycle_start(
      v_cycle_start, public.user_financial_month_start_day(p_user_id)
    );
    select coalesce(allocation.amount_cents, envelope.budget_amount_cents, 0)::bigint
    into v_base_cents
    from public.budgets budget
    join public.budget_envelopes envelope on envelope.budget_id = budget.id
    left join public.envelope_allocations allocation
      on allocation.envelope_id = envelope.id
     and allocation.period_month = v_cycle_month
    where budget.period_month = v_cycle_month
      and envelope.rollover_group_id = p_lineage_id
    order by envelope.updated_at desc nulls last
    limit 1;
    v_base_cents := coalesce(v_base_cents, 0);
    select coalesce(sum(adjustment.amount_cents), 0)::bigint
    into v_adjustment_cents
    from public.pocket_lineage_balance_adjustments adjustment
    where adjustment.lineage_id = p_lineage_id
      and adjustment.effective_month = v_cycle_month;
    select coalesce(sum(
      abs(expense.amount_cents) * expense.analytics_spending_multiplier
    ), 0)::bigint
    into v_spent_cents
    from public.expenses expense
    where expense.analytics_is_final is true
      and expense.analytics_spending_multiplier <> 0
      and upper(coalesce(expense.currency, '')) = v_lineage.currency
      and expense.deleted_at is null
      and expense.date >= v_cycle_start
      and expense.date < v_cycle_end
      and exists (
        select 1 from public.pocket_lineage_category_assignments assignment
        where assignment.lineage_id = p_lineage_id
          and lower(trim(assignment.category)) = lower(trim(coalesce(expense.category, '')))
          and assignment.effective_from <= v_cycle_month
          and (assignment.effective_until is null or assignment.effective_until >= v_cycle_month)
      )
      and (
        (v_scope = 'household' and expense.household_id = p_household_id)
        or (v_scope = 'personal' and expense.user_id = p_user_id and expense.household_id is null)
        or (v_scope = 'portfolio' and expense.user_id = p_user_id and expense.household_id = p_household_id)
      );
    if v_lineage.rollover_enabled then
      v_carry_cents := v_base_cents + v_carry_cents + v_adjustment_cents - v_spent_cents;
      if v_carry_cents < 0 and not v_lineage.rollover_negative then
        v_carry_cents := 0;
      elsif v_lineage.rollover_cap_cents is not null
        and v_carry_cents > v_lineage.rollover_cap_cents then
        v_carry_cents := v_lineage.rollover_cap_cents;
      end if;
    else
      v_carry_cents := 0;
    end if;
    v_cycle_month := (v_cycle_month + interval '1 month')::date;
  end loop;

  return jsonb_build_object(
    'lineage_id', p_lineage_id,
    'is_virtual', true,
    'carry_cents', v_carry_cents,
    'retired', v_lineage.status = 'retired'
  );
end;
$$;

create or replace function public.confirm_pockets_month_setup_v1(
  p_user_id uuid,
  p_scope text,
  p_budget_month date,
  p_household_id uuid,
  p_currency text,
  p_expected_setup_revision integer,
  p_allocations jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_month date := date_trunc('month', p_budget_month)::date;
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'USD'));
  v_review public.pocket_month_reviews%rowtype;
  v_item jsonb;
  v_lineage_id uuid;
  v_amount_cents bigint;
  v_envelope_id uuid;
  v_budget_id uuid;
  v_owner_user_id uuid;
  v_budget_total_cents bigint;
  v_final_allocated_cents bigint;
begin
  if p_budget_month is null
     or p_expected_setup_revision is null
     or p_expected_setup_revision < 0
     or jsonb_typeof(coalesce(p_allocations, '[]'::jsonb)) <> 'array'
     or v_scope not in ('personal', 'household', 'portfolio') then
    raise exception 'Invalid pocket setup request' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Client user does not match authenticated user' using errcode = '42501';
  end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then
    raise exception 'Unauthorized pocket setup access' using errcode = '42501';
  end if;
  if v_month is distinct from public.financial_cycle_start_for_month(
    current_date,
    public.user_financial_month_start_day(p_user_id)
  ) then
    raise exception 'Pocket setup reviews are available only for the current financial cycle'
      using errcode = '22023';
  end if;

  select budget.id, budget.user_id, budget.total_budget_cents
  into v_budget_id, v_owner_user_id, v_budget_total_cents
  from public.budgets budget
  where budget.period_month = v_month
    and upper(budget.currency) = v_currency
    and (
      (v_scope = 'personal' and budget.household_id is null and budget.user_id = p_user_id)
      or (v_scope = 'household' and budget.household_id = p_household_id)
      or (v_scope = 'portfolio' and budget.household_id = p_household_id and budget.user_id = p_user_id)
    )
  for update;
  if v_budget_id is null then
    raise exception 'No authoritative budget exists for this pockets month' using errcode = '22023';
  end if;

  insert into public.pocket_month_reviews (
    owner_user_id, household_id, scope, budget_month, currency, setup_revision
  ) values (v_owner_user_id, p_household_id, v_scope, v_month, v_currency, 0)
  on conflict (scope, scope_key, currency, budget_month) do nothing;

  select * into v_review
  from public.pocket_month_reviews
  where (v_scope in ('household', 'portfolio') or owner_user_id = p_user_id)
    and household_id is not distinct from p_household_id
    and scope = v_scope
    and budget_month = v_month
    and currency = v_currency
  for update;

  if v_review.setup_revision <> p_expected_setup_revision then
    raise exception 'POCKET_SETUP_STALE_REVISION'
      using errcode = '40001',
        detail = jsonb_build_object(
          'code', 'POCKET_SETUP_STALE_REVISION',
          'expected_setup_revision', p_expected_setup_revision,
          'current_setup_revision', v_review.setup_revision
        )::text;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_allocations) item
    group by nullif(item ->> 'lineage_id', '')
    having count(*) > 1
  ) then
    raise exception 'Each active pocket lineage may appear only once' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.pocket_lineages lineage
    where lineage.scope = v_scope
      and lineage.household_id is not distinct from p_household_id
      and lineage.currency = v_currency
      and lineage.status = 'active'
      and lineage.activated_on <= v_month
      and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
      and not exists (
        select 1
        from jsonb_array_elements(p_allocations) item
        where nullif(item ->> 'lineage_id', '')::uuid = lineage.id
      )
  ) then
    raise exception 'Missing active pocket lineage from setup snapshot' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_allocations) value loop
    v_lineage_id := nullif(v_item ->> 'lineage_id', '')::uuid;
    v_amount_cents := (v_item ->> 'amount_cents')::bigint;
    if v_lineage_id is null or v_amount_cents is null or v_amount_cents < 0 then
      raise exception 'Each allocation requires lineage_id and amount_cents' using errcode = '22023';
    end if;

    select envelope.id into v_envelope_id
    from public.budgets budget
    join public.budget_envelopes envelope on envelope.budget_id = budget.id
    join public.pocket_lineages lineage on lineage.id = envelope.rollover_group_id
    where budget.id = v_budget_id
      and envelope.rollover_group_id = v_lineage_id
      and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
      and lineage.household_id is not distinct from p_household_id
      and lineage.scope = v_scope
      and lineage.currency = v_currency
      and lineage.status = 'active'
      and (
        (v_scope = 'personal' and budget.household_id is null and budget.user_id = p_user_id)
        or (v_scope = 'household' and budget.household_id = p_household_id)
        or (v_scope = 'portfolio' and budget.household_id = p_household_id and budget.user_id = p_user_id)
      );
       if v_envelope_id is null then
      -- Continuing a lineage never copies last month's funding. It only
      -- materializes identity and presentation metadata for this cycle.
      insert into public.budget_envelopes (
        budget_id, user_id, household_id, name, currency, icon, color,
        rollover_group_id, rollover_enabled, rollover_negative,
        rollover_cap_cents
      )
      select
        v_budget_id, lineage.owner_user_id, lineage.household_id,
        lineage.name, lineage.currency, lineage.icon, lineage.color,
        lineage.id, lineage.rollover_enabled, lineage.rollover_negative,
        lineage.rollover_cap_cents
      from public.pocket_lineages lineage
      where lineage.id = v_lineage_id
        and lineage.household_id is not distinct from p_household_id
        and lineage.scope = v_scope
        and lineage.currency = v_currency
        and lineage.status = 'active'
        and lineage.activated_on <= v_month
      on conflict (budget_id, rollover_group_id) do update
        set updated_at = public.budget_envelopes.updated_at
      returning id into v_envelope_id;
      if v_envelope_id is null then
        raise exception 'Allocation lineage % is not active for this pockets scope', v_lineage_id using errcode = '22023';
       end if;
       insert into public.envelope_category_links (envelope_id, category)
       select v_envelope_id, assignment.category
       from public.pocket_lineage_category_assignments assignment
       where assignment.lineage_id = v_lineage_id
         and assignment.effective_from <= v_month
         and (assignment.effective_until is null or assignment.effective_until >= v_month)
       on conflict (envelope_id, category) do nothing;
    end if;

    insert into public.envelope_allocations (envelope_id, period_month, amount_cents)
    values (v_envelope_id, v_month, v_amount_cents)
    on conflict (envelope_id, period_month)
    do update set amount_cents = excluded.amount_cents, updated_at = now();
  end loop;

  select coalesce(sum(allocation.amount_cents), 0)::bigint
  into v_final_allocated_cents
  from public.budget_envelopes envelope
  left join public.envelope_allocations allocation
    on allocation.envelope_id = envelope.id
   and allocation.period_month = v_month
  where envelope.budget_id = v_budget_id
    and upper(envelope.currency) = v_currency;
  if v_final_allocated_cents > v_budget_total_cents then
    raise exception 'Pocket allocations exceed the authoritative monthly budget' using errcode = '22023';
  end if;

  update public.pocket_month_reviews
  set setup_revision = setup_revision + 1,
      status = 'confirmed',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = v_review.id
  returning * into v_review;

  return public.get_pockets_month_v4(
    p_user_id, v_scope, v_month, p_household_id, v_currency, true, false
  ) || jsonb_build_object(
    'success', true,
    'code', 'POCKET_SETUP_CONFIRMED'
  );
end;
$$;

create or replace function public.update_pocket_lineage_funding_policy_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_lineage_id uuid,
  p_expected_revision integer,
  p_funding_policy text,
  p_funding_target_cents bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_policy text := lower(coalesce(nullif(trim(p_funding_policy), ''), ''));
  v_lineage public.pocket_lineages%rowtype;
begin
  if p_expected_revision is null or p_expected_revision < 0
     or v_policy not in ('refill_to', 'add_every_cycle', 'decide_each_cycle')
     or p_funding_target_cents < 0 then
    raise exception 'Invalid pocket funding policy' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Client user does not match authenticated user' using errcode = '42501';
  end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then
    raise exception 'Unauthorized pocket funding policy access' using errcode = '42501';
  end if;
  select * into v_lineage
  from public.pocket_lineages lineage
  where lineage.id = p_lineage_id
    and lineage.scope = v_scope
    and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
  for update;
  if not found then
    raise exception 'Unknown pocket lineage for scope' using errcode = '22023';
  end if;
  if v_lineage.revision <> p_expected_revision then
    raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001';
  end if;
  if v_policy = 'decide_each_cycle' and p_funding_target_cents is not null then
    raise exception 'decide_each_cycle does not accept a funding target' using errcode = '22023';
  end if;
  update public.pocket_lineages
  set funding_policy = v_policy,
      funding_target_cents = p_funding_target_cents,
      revision = revision + 1,
      updated_at = now()
  where id = v_lineage.id
  returning * into v_lineage;
  return jsonb_build_object(
    'lineage_id', v_lineage.id,
    'funding_policy', v_lineage.funding_policy,
    'funding_target_cents', v_lineage.funding_target_cents,
    'revision', v_lineage.revision
  );
end;
$$;

create or replace function public.set_pocket_lineage_categories_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_lineage_id uuid,
  p_expected_revision integer,
  p_effective_month date,
  p_categories text[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_month date := date_trunc('month', p_effective_month)::date;
  v_lineage public.pocket_lineages%rowtype;
  v_envelope_id uuid;
begin
  if p_effective_month is null or p_expected_revision is null
     or p_expected_revision < 0 or p_categories is null
     or exists (select 1 from unnest(p_categories) category where trim(category) = '')
     or cardinality(p_categories) <> cardinality(array(
       select distinct lower(trim(category)) from unnest(p_categories) category
     )) then
    raise exception 'Invalid pocket category assignment' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Client user does not match authenticated user' using errcode = '42501';
  end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then
    raise exception 'Unauthorized pocket category assignment' using errcode = '42501';
  end if;
  select * into v_lineage
  from public.pocket_lineages lineage
  where lineage.id = p_lineage_id
    and lineage.scope = v_scope
    and lineage.household_id is not distinct from p_household_id
    and (v_scope = 'household' or lineage.owner_user_id = p_user_id)
  for update;
  if not found then
    raise exception 'Unknown pocket lineage for scope' using errcode = '22023';
  end if;
  if v_lineage.revision <> p_expected_revision then
    raise exception 'POCKET_LINEAGE_STALE_REVISION' using errcode = '40001';
  end if;
  update public.pocket_lineage_category_assignments
  set effective_until = (v_month - interval '1 day')::date,
      updated_at = now()
  where lineage_id = p_lineage_id
    and effective_until is null;
  insert into public.pocket_lineage_category_assignments (
    lineage_id, category, effective_from
  )
  select p_lineage_id, lower(trim(category)), v_month
  from unnest(p_categories) category;
  update public.pocket_lineages
  set revision = revision + 1, updated_at = now()
  where id = p_lineage_id
  returning * into v_lineage;
  select envelope.id into v_envelope_id
  from public.budgets budget
  join public.budget_envelopes envelope on envelope.budget_id = budget.id
  where envelope.rollover_group_id = p_lineage_id
    and budget.period_month = v_month
  limit 1;
  if v_envelope_id is not null then
    delete from public.envelope_category_links where envelope_id = v_envelope_id;
    insert into public.envelope_category_links (envelope_id, category)
    select v_envelope_id, lower(trim(category)) from unnest(p_categories) category;
  end if;
  return jsonb_build_object(
    'lineage_id', v_lineage.id,
    'revision', v_lineage.revision,
    'categories', to_jsonb(array(
      select lower(trim(category)) from unnest(p_categories) category order by 1
    ))
  );
end;
$$;

create or replace function public.retire_pocket_lineage_v1(
  p_user_id uuid,
  p_scope text,
  p_household_id uuid,
  p_lineage_id uuid,
  p_effective_month date,
  p_expected_revision integer,
  p_reason text default null,
  p_disposition text default null,
  p_target_lineage_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text := lower(coalesce(nullif(trim(p_scope), ''), 'personal'));
  v_lineage public.pocket_lineages%rowtype;
  v_target public.pocket_lineages%rowtype;
  v_balance_cents bigint;
  v_disposition text := lower(coalesce(nullif(trim(p_disposition), ''), ''));
begin
  if p_effective_month is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid pocket retirement request' using errcode = '22023';
  end if;
  if auth.role() <> 'service_role' and p_user_id is distinct from auth.uid() then
    raise exception 'Client user does not match authenticated user' using errcode = '42501';
  end if;
  if not public.can_edit_pocket_scope_v1(p_user_id, p_household_id, v_scope) then
    raise exception 'Unauthorized pocket retirement access' using errcode = '42501';
  end if;

  select * into v_lineage
  from public.pocket_lineages
  where id = p_lineage_id
    and (v_scope = 'household' or owner_user_id = p_user_id)
    and household_id is not distinct from p_household_id
    and scope = v_scope
  for update;
  if not found then
    raise exception 'Unknown pocket lineage for scope' using errcode = '22023';
  end if;
  if v_lineage.revision <> p_expected_revision then
    raise exception 'Pocket lineage revision conflict' using errcode = '40001';
  end if;
  if v_lineage.status = 'retired' then
    raise exception 'Pocket lineage is already retired' using errcode = '22023';
  end if;
  v_balance_cents := coalesce((public.calculate_pocket_cycle_carry_v3(
    p_user_id, v_scope, p_household_id, v_lineage.currency, p_lineage_id,
    date_trunc('month', p_effective_month)::date
  ) ->> 'carry_cents')::bigint, 0);
  if v_disposition = 'keep_active' then
    return jsonb_build_object(
      'lineage_id', v_lineage.id,
      'status', v_lineage.status,
      'balance_cents', v_balance_cents,
      'code', 'POCKET_LINEAGE_REMAINS_ACTIVE'
    );
  end if;
  if (v_balance_cents > 0 and v_disposition not in ('transfer_positive', 'release_positive'))
     or (v_balance_cents < 0 and v_disposition not in ('cover_negative', 'transfer_negative'))
     or (v_balance_cents = 0 and v_disposition <> 'retire_zero') then
    raise exception 'Retirement disposition does not resolve the pocket balance' using errcode = '22023';
  end if;
  if v_disposition in ('transfer_positive', 'cover_negative', 'transfer_negative') then
    select * into v_target
    from public.pocket_lineages target
    where target.id = p_target_lineage_id
      and target.id <> p_lineage_id
      and target.scope = v_scope
      and target.household_id is not distinct from p_household_id
      and target.currency = v_lineage.currency
      and target.status = 'active'
      and (v_scope = 'household' or target.owner_user_id = p_user_id)
    for update;
    if not found then
      raise exception 'Retirement disposition requires an active same-scope target pocket' using errcode = '22023';
    end if;
  elsif p_target_lineage_id is not null then
    raise exception 'This retirement disposition does not accept a target pocket' using errcode = '22023';
  end if;
  if v_balance_cents <> 0 then
    insert into public.pocket_lineage_balance_adjustments (
      lineage_id, effective_month, amount_cents, reason, created_by
    ) values (
      p_lineage_id, date_trunc('month', p_effective_month)::date,
      -v_balance_cents, 'retirement:' || v_disposition, auth.uid()
    );
    if v_target.id is not null then
      insert into public.pocket_lineage_balance_adjustments (
        lineage_id, effective_month, amount_cents, reason, created_by
      ) values (
        v_target.id, date_trunc('month', p_effective_month)::date,
        v_balance_cents, 'retirement_transfer:' || p_lineage_id::text, auth.uid()
      );
    end if;
  end if;

  insert into public.pocket_lineage_retirements (
    lineage_id, effective_month, reason, retired_by
  ) values (
    p_lineage_id, date_trunc('month', p_effective_month)::date, nullif(trim(p_reason), ''), auth.uid()
  );

  update public.pocket_lineages
  set status = 'retired', revision = revision + 1, updated_at = now()
  where id = p_lineage_id
  returning * into v_lineage;

  return jsonb_build_object(
    'lineage_id', v_lineage.id,
    'status', v_lineage.status,
    'revision', v_lineage.revision
  );
end;
$$;

revoke all on function public.can_access_pocket_scope_v1(uuid, uuid, text) from public;
revoke all on function public.get_pockets_month_v4(uuid, text, date, uuid, text, boolean, boolean) from public, anon;
revoke all on function public.calculate_pocket_cycle_carry_v3(uuid, text, uuid, text, uuid, date) from public, anon;
revoke all on function public.confirm_pockets_month_setup_v1(uuid, text, date, uuid, text, integer, jsonb) from public, anon;
revoke all on function public.retire_pocket_lineage_v1(uuid, text, uuid, uuid, date, integer, text, text, uuid) from public, anon;
revoke all on function public.update_pocket_lineage_funding_policy_v1(uuid, text, uuid, uuid, integer, text, bigint) from public, anon;
revoke all on function public.set_pocket_lineage_categories_v1(uuid, text, uuid, uuid, integer, date, text[]) from public, anon;

grant select on public.pocket_lineages,
  public.pocket_lineage_category_assignments,
  public.pocket_month_reviews,
  public.pocket_lineage_balance_adjustments,
  public.pocket_lineage_retirements to authenticated;
grant select, insert, update, delete on public.pocket_lineages,
  public.pocket_lineage_category_assignments,
  public.pocket_month_reviews,
  public.pocket_lineage_balance_adjustments,
  public.pocket_lineage_retirements to service_role;
grant execute on function public.get_pockets_month_v4(uuid, text, date, uuid, text, boolean, boolean) to authenticated, service_role;
grant execute on function public.calculate_pocket_cycle_carry_v3(uuid, text, uuid, text, uuid, date) to authenticated, service_role;
grant execute on function public.confirm_pockets_month_setup_v1(uuid, text, date, uuid, text, integer, jsonb) to authenticated, service_role;
grant execute on function public.retire_pocket_lineage_v1(uuid, text, uuid, uuid, date, integer, text, text, uuid) to authenticated, service_role;
grant execute on function public.update_pocket_lineage_funding_policy_v1(uuid, text, uuid, uuid, integer, text, bigint) to authenticated, service_role;
grant execute on function public.set_pocket_lineage_categories_v1(uuid, text, uuid, uuid, integer, date, text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
