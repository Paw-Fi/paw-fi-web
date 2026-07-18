-- A settlement cycle is closed only by an event that makes the authoritative
-- pairwise balance exactly zero.  Timestamps are deliberately not used as the
-- causal boundary: split writes and settlement events share a DB sequence and
-- the existing household advisory lock.

set statement_timeout = '0';
set lock_timeout = '10s';

-- The cutover is a causal snapshot, so no legacy multi-statement writer may
-- commit a parent/group/event between the sequence backfill and trigger
-- installation.  These modes block INSERT/UPDATE/DELETE while preserving
-- ordinary reads; every lock is transaction-scoped and released atomically
-- with the completed migration.  A busy production writer makes the 10-second
-- lock timeout abort safely instead of producing a half-observed cutover.
lock table public.expenses in share row exclusive mode;
lock table public.expense_split_groups in share row exclusive mode;
lock table public.expense_split_lines in share row exclusive mode;
lock table public.household_settlement_events in share row exclusive mode;
lock table public.household_settlement_event_allocations_v2
  in share row exclusive mode;
lock table public.household_settlement_event_allocation_status_v2
  in share row exclusive mode;

-- Acquiring the locks above waits behind any writer that is mid-statement
-- on these tables. That writer's deferred constraint triggers (e.g. the
-- expense soft-delete split cleanup, or FK checks queued by an in-flight
-- split/settlement write) do not fire until COMMIT or SET CONSTRAINTS
-- IMMEDIATE. If our session inherits/continues any such pending event on
-- these relations, Postgres refuses the ALTER TABLE statements below with
-- 55006 ("pending trigger events"). Flushing immediately here is a no-op
-- when nothing is pending, and otherwise makes the cutover deterministic.
set constraints all immediate;

create sequence if not exists public.household_settlement_ledger_seq;

revoke all on sequence public.household_settlement_ledger_seq
  from public, anon, authenticated, service_role;

-- Split writers use several PostgREST statements. This private durable marker
-- keeps settlement fail-closed across the gaps (including same-total
-- payer/currency changes that a SUM(lines) check alone cannot detect). It is
-- intentionally not stored on the RLS-writable split-group row: only the
-- security-definer guards/finalizer below can mutate this revoked table.
create table if not exists public.household_settlement_finalized_split_groups (
  split_group_id uuid primary key
    references public.expense_split_groups(id) on delete cascade,
  completed_at timestamptz not null default clock_timestamp(),
  validation_profile text not null default 'strict_current',
  legacy_parent_household_mismatch boolean not null default false,
  legacy_parent_currency_mismatch boolean not null default false,
  legacy_parent_amount_mismatch boolean not null default false,
  legacy_rounding_delta_cents bigint not null default 0,
  constraint household_settlement_finalized_split_groups_profile
    check (validation_profile in ('strict_current', 'legacy_structural')),
  constraint household_settlement_finalized_split_groups_strict_flags
    check (
      validation_profile = 'legacy_structural'
      or (
        legacy_parent_household_mismatch is false
        and legacy_parent_currency_mismatch is false
        and legacy_parent_amount_mismatch is false
        and legacy_rounding_delta_cents = 0
      )
    )
);

alter table public.household_settlement_finalized_split_groups
  enable row level security;

revoke all on table public.household_settlement_finalized_split_groups
  from public, anon, authenticated, service_role;

-- New mobile clients submit an immutable request id together with the exact
-- server snapshot they confirmed. Terminal outcomes are retained even for a
-- conflict/no-op so a lost response can never make a later retry apply a
-- different ledger state. The table is private; callers can only interact
-- with it through the security-definer settlement RPC below.
create table if not exists public.household_settlement_requests_v2 (
  actor_user_id uuid not null
    references auth.users(id) on delete cascade,
  client_mutation_id text not null,
  household_id uuid not null
    references public.households(id) on delete cascade,
  member_user_id uuid not null
    references auth.users(id) on delete cascade,
  mode text not null,
  requested_amount_cents bigint not null,
  currency text not null,
  settlement_note text,
  expected_snapshot_token text not null,
  terminal_status text not null,
  settlement_event_id uuid
    references public.household_settlement_events(id) on delete set null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (actor_user_id, client_mutation_id),
  constraint household_settlement_requests_v2_mutation_id_length
    check (length(client_mutation_id) between 1 and 200),
  constraint household_settlement_requests_v2_distinct_users
    check (actor_user_id <> member_user_id),
  constraint household_settlement_requests_v2_mode
    check (mode in ('to_member', 'from_member', 'both')),
  constraint household_settlement_requests_v2_amount_positive
    check (requested_amount_cents > 0),
  constraint household_settlement_requests_v2_currency
    check (currency ~ '^[A-Z]{3}$'),
  constraint household_settlement_requests_v2_snapshot_token
    check (expected_snapshot_token ~ '^v1:[0-9a-f]{64}$'),
  constraint household_settlement_requests_v2_terminal_status
    check (terminal_status in (
      'applied',
      'snapshot_conflict',
      'nothing_to_settle'
    ))
);

alter table public.household_settlement_requests_v2
  enable row level security;

revoke all on table public.household_settlement_requests_v2
  from public, anon, authenticated, service_role;

alter table public.household_settlement_events
  add column if not exists pair_balance_before_cents bigint,
  add column if not exists pair_balance_after_cents bigint,
  add column if not exists cleared_pair_balance boolean,
  add column if not exists cycle_boundary_event_id uuid,
  add column if not exists settlement_ledger_seq bigint;

alter table public.household_settlement_events
  drop constraint if exists
    household_settlement_events_cycle_boundary_event_id_fkey;

-- A single boundary cannot be deleted while later events still point to it.
-- Deferring the self-FK still permits a complete household/auth-user cascade,
-- because all referencing and referenced events are gone by commit time.
alter table public.household_settlement_events
  add constraint household_settlement_events_cycle_boundary_event_id_fkey
  foreign key (cycle_boundary_event_id)
  references public.household_settlement_events(id)
  on delete no action
  deferrable initially deferred;

alter table public.expense_split_lines
  add column if not exists cycle_boundary_event_id uuid,
  add column if not exists settlement_ledger_seq bigint;

alter table public.expense_split_lines
  drop constraint if exists expense_split_lines_cycle_boundary_event_id_fkey;

alter table public.expense_split_lines
  add constraint expense_split_lines_cycle_boundary_event_id_fkey
  foreign key (cycle_boundary_event_id)
  references public.household_settlement_events(id)
  on delete no action
  deferrable initially deferred;

create table if not exists public.household_settlement_cycle_baseline_lines (
  boundary_event_id uuid not null
    references public.household_settlement_events(id) on delete cascade,
  household_id uuid not null
    references public.households(id) on delete cascade,
  split_line_id uuid not null,
  split_group_id uuid not null,
  expense_id uuid,
  payer_user_id uuid not null,
  participant_user_id uuid not null,
  currency text not null,
  amount_cents bigint not null,
  expense_date timestamptz not null,
  expense_description text,
  expense_category text,
  expense_raw_text text,
  expense_type text,
  captured_at timestamptz not null default clock_timestamp(),
  primary key (boundary_event_id, split_line_id),
  constraint household_settlement_cycle_baseline_amount_nonnegative
    check (amount_cents >= 0),
  constraint household_settlement_cycle_baseline_distinct_users
    check (payer_user_id <> participant_user_id)
);

alter table public.household_settlement_cycle_baseline_lines
  enable row level security;

revoke all on table public.household_settlement_cycle_baseline_lines
  from public, anon, authenticated, service_role;

-- Legacy settlement events did not record enough event-time state to prove
-- whether they closed a cycle.  A cutover freezes that unknowable history for
-- one unordered pair/currency without inventing a settlement event.  The
-- actor-independent net is always expressed from ordered user A's point of
-- view: positive means user A owes user B, negative means user B owes user A.
create table if not exists public.household_settlement_legacy_cutovers_v3 (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null
    references public.households(id) on delete cascade,
  user_a_id uuid not null
    references auth.users(id) on delete cascade,
  user_b_id uuid not null
    references auth.users(id) on delete cascade,
  currency text not null,
  cutover_ledger_seq bigint not null,
  carryover_net_user_a_cents bigint not null,
  latest_preceding_full_event_id uuid,
  latest_preceding_full_ledger_seq bigint,
  latest_ambiguous_event_id uuid not null,
  latest_ambiguous_event_ledger_seq bigint not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint household_settlement_legacy_cutovers_v3_ordered_pair
    check (user_a_id::text < user_b_id::text),
  constraint household_settlement_legacy_cutovers_v3_currency
    check (currency ~ '^[A-Z]{3}$'),
  constraint household_settlement_legacy_cutovers_v3_sequence_order
    check (
      latest_ambiguous_event_ledger_seq < cutover_ledger_seq
      and (
        latest_preceding_full_ledger_seq is null
        or latest_preceding_full_ledger_seq
          < latest_ambiguous_event_ledger_seq
      )
    ),
  constraint household_settlement_legacy_cutovers_v3_scope_key
    unique (household_id, user_a_id, user_b_id, currency),
  constraint household_settlement_legacy_cutovers_v3_ledger_key
    unique (cutover_ledger_seq)
);

alter table public.household_settlement_legacy_cutovers_v3
  enable row level security;

revoke all on table public.household_settlement_legacy_cutovers_v3
  from public, anon, authenticated, service_role;

-- This is an immutable copy, not a live foreign-key view.  Source identifiers
-- deliberately remain present after an expense/group/line is deleted so the
-- frozen boundary and its snapshot token cannot be rewritten retroactively.
create table if not exists public.household_settlement_legacy_cutover_lines_v3 (
  cutover_id uuid not null
    references public.household_settlement_legacy_cutovers_v3(id)
    on delete cascade,
  household_id uuid not null,
  split_line_id uuid not null,
  split_group_id uuid not null,
  expense_id uuid,
  payer_user_id uuid not null,
  participant_user_id uuid not null,
  currency text not null,
  amount_cents bigint not null,
  signed_for_user_a_cents bigint not null,
  settlement_ledger_seq bigint not null,
  expense_date timestamptz not null,
  expense_description text,
  expense_category text,
  expense_raw_text text,
  expense_type text,
  captured_at timestamptz not null default clock_timestamp(),
  primary key (cutover_id, split_line_id),
  constraint household_settlement_legacy_cutover_lines_v3_amount
    check (amount_cents >= 0),
  constraint household_settlement_legacy_cutover_lines_v3_pair
    check (payer_user_id <> participant_user_id),
  constraint household_settlement_legacy_cutover_lines_v3_currency
    check (currency ~ '^[A-Z]{3}$'),
  constraint household_settlement_legacy_cutover_lines_v3_signed_amount
    check (abs(signed_for_user_a_cents) = amount_cents)
);

alter table public.household_settlement_legacy_cutover_lines_v3
  enable row level security;

revoke all on table public.household_settlement_legacy_cutover_lines_v3
  from public, anon, authenticated, service_role;

create index if not exists idx_settlement_events_pair_cycle_seq
  on public.household_settlement_events (
    household_id,
    currency,
    cleared_pair_balance,
    settlement_ledger_seq desc
  );

create unique index if not exists idx_settlement_events_ledger_seq
  on public.household_settlement_events (settlement_ledger_seq)
  where settlement_ledger_seq is not null;

create unique index if not exists idx_split_lines_settlement_ledger_seq
  on public.expense_split_lines (settlement_ledger_seq)
  where settlement_ledger_seq is not null;

create index if not exists idx_cycle_baseline_pair
  on public.household_settlement_cycle_baseline_lines (
    boundary_event_id,
    household_id,
    currency,
    payer_user_id,
    participant_user_id
  );

create index if not exists idx_legacy_cutovers_pair_sequence
  on public.household_settlement_legacy_cutovers_v3 (
    household_id,
    user_a_id,
    user_b_id,
    currency,
    cutover_ledger_seq desc
  );

create index if not exists idx_legacy_cutover_lines_pair
  on public.household_settlement_legacy_cutover_lines_v3 (
    cutover_id,
    household_id,
    currency,
    payer_user_id,
    participant_user_id
  );

create or replace function public.households_latest_full_settlement_boundary_v3(
  p_household_id uuid,
  p_user_a uuid,
  p_user_b uuid,
  p_currency text,
  p_before_ledger_seq bigint default null
)
returns uuid
language sql
volatile
security definer
set search_path = ''
as $$
  select event.id
  from public.household_settlement_events event
  where event.household_id = p_household_id
    and upper(event.currency) = upper(p_currency)
    and event.cleared_pair_balance is true
    and event.settlement_ledger_seq is not null
    and (
      p_before_ledger_seq is null
      or event.settlement_ledger_seq < p_before_ledger_seq
    )
    and (
      (
        event.payer_user_id = p_user_a
        and event.participant_user_id = p_user_b
      )
      or
      (
        event.payer_user_id = p_user_b
        and event.participant_user_id = p_user_a
      )
    )
  order by event.settlement_ledger_seq desc
  limit 1;
$$;

revoke all on function public.households_latest_full_settlement_boundary_v3(
  uuid, uuid, uuid, text, bigint
) from public, anon, authenticated;

-- Preserve the causal order of legacy rows as well as their timestamps allow.
-- UUID ordering only resolves exact legacy timestamp ties; all new activity is
-- ordered after taking the household lock and does not depend on timestamps.
do $$
declare
  v_row record;
  v_seq bigint;
begin
  for v_row in
    select ordered.kind, ordered.id
    from (
      select
        'line'::text as kind,
        line.id,
        coalesce(line.created_at, '-infinity'::timestamptz) as occurred_at,
        0 as kind_order
      from public.expense_split_lines line
      where line.settlement_ledger_seq is null

      union all

      select
        'event'::text,
        event.id,
        coalesce(event.created_at, '-infinity'::timestamptz),
        1
      from public.household_settlement_events event
      where event.settlement_ledger_seq is null
    ) ordered
    order by ordered.occurred_at, ordered.kind_order, ordered.id
  loop
    v_seq := nextval('public.household_settlement_ledger_seq');
    if v_row.kind = 'line' then
      update public.expense_split_lines
      set settlement_ledger_seq = v_seq
      where id = v_row.id;
    else
      update public.household_settlement_events
      set settlement_ledger_seq = v_seq
      where id = v_row.id;
    end if;
  end loop;
end;
$$;

-- An older scope-move writer updated the parent before deleting its former
-- split group.  If that request was interrupted, the active transaction is
-- already personal while an unreachable household group remains behind.  It
-- is safe to discard only when neither the group nor its expense has any
-- settlement allocation and no line was ever marked settled.  The personal
-- parent row is preserved exactly; every uncertain shape remains for the
-- fail-fast audit below.
delete from public.expense_split_groups split_group
using public.expenses expense
where expense.id = split_group.expense_id
  and expense.deleted_at is null
  and expense.split_group_id is null
  and expense.household_id is null
  and split_group.household_id is not null
  and not exists (
    select 1
    from public.expense_split_lines split_line
    where split_line.split_group_id = split_group.id
      and split_line.is_settled is true
  )
  and not exists (
    select 1
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.split_group_id = split_group.id
      or allocation.expense_id = expense.id
  );

-- A failed legacy create could leave an active household expense pointing at
-- no group while an empty group row survived.  With no lines and no payment
-- audit, the group has never represented an obligation and is safe to remove.
-- This is deliberately narrower than deleting every malformed unlinked group.
delete from public.expense_split_groups split_group
using public.expenses expense
where expense.id = split_group.expense_id
  and expense.deleted_at is null
  and expense.split_group_id is null
  and not exists (
    select 1
    from public.expense_split_lines split_line
    where split_line.split_group_id = split_group.id
  )
  and not exists (
    select 1
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.split_group_id = split_group.id
      or allocation.expense_id = expense.id
  );

-- One legacy writer could update the parent amount and every split line but
-- miss only the group's cached total.  When the parent and complete line set
-- agree, scope/currency agree, and no settlement audit exists, repairing that
-- metadata cannot change any pairwise balance.  All other parent/group drift
-- is preserved as frozen legacy ledger state below instead of being guessed.
with line_state as (
  select
    split_line.split_group_id,
    count(*)::bigint as line_count,
    count(distinct split_line.user_id)::bigint as distinct_user_count,
    bool_and(split_line.amount_cents is not null) as amounts_are_nonnull,
    bool_and(coalesce(split_line.amount_cents, -1) >= 0)
      as amounts_are_nonnegative,
    sum(split_line.amount_cents)::bigint as line_total_cents
  from public.expense_split_lines split_line
  group by split_line.split_group_id
), safely_repairable as (
  select
    split_group.id as split_group_id,
    abs(expense.amount_cents)::bigint as repaired_total_amount_cents
  from public.expense_split_groups split_group
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
    and expense.split_group_id = split_group.id
  join line_state
    on line_state.split_group_id = split_group.id
  where expense.household_id is not distinct from split_group.household_id
    and upper(expense.currency) = upper(split_group.currency)
    and abs(expense.amount_cents) is distinct from
      split_group.total_amount_cents
    and line_state.line_count > 0
    and line_state.line_count = line_state.distinct_user_count
    and line_state.amounts_are_nonnull
    and line_state.amounts_are_nonnegative
    and line_state.line_total_cents = abs(expense.amount_cents)
    and exists (
      select 1
      from public.expense_split_lines payer_line
      where payer_line.split_group_id = split_group.id
        and payer_line.user_id = split_group.payer_user_id
    )
    and not exists (
      select 1
      from public.expense_split_lines settled_line
      where settled_line.split_group_id = split_group.id
        and settled_line.is_settled is true
    )
    and not exists (
      select 1
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.split_group_id = split_group.id
        or allocation.expense_id = expense.id
    )
)
update public.expense_split_groups split_group
set total_amount_cents = repair.repaired_total_amount_cents
from safely_repairable repair
where split_group.id = repair.split_group_id;

-- Recover the one safe interrupted-write shape before publishing legacy
-- completion markers: an active parent has no link, but exactly one group for
-- that expense is otherwise reciprocal and structurally complete.  Current
-- membership is deliberately irrelevant here; a later join/leave must never
-- rewrite who participated in an historical expense.
with structurally_valid_candidates as (
  select
    expense.id as expense_id,
    split_group.id as split_group_id
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.expense_id = expense.id
  where expense.deleted_at is null
    and expense.split_group_id is null
    and expense.household_id is not distinct from split_group.household_id
    and upper(expense.currency) = upper(split_group.currency)
    and abs(expense.amount_cents) = split_group.total_amount_cents
    and exists (
      select 1
      from public.expense_split_lines split_line
      where split_line.split_group_id = split_group.id
      group by split_line.split_group_id
      having count(*) > 0
        and count(*) = count(distinct split_line.user_id)
        and bool_and(split_line.amount_cents is not null)
        and bool_and(coalesce(split_line.amount_cents, -1) >= 0)
        and abs(
          sum(split_line.amount_cents) - split_group.total_amount_cents
        ) <= greatest(count(*) - 1, 0)
    )
    and exists (
      select 1
      from public.expense_split_lines payer_line
      where payer_line.split_group_id = split_group.id
        and payer_line.user_id = split_group.payer_user_id
    )
), uniquely_relinkable as (
  select
    candidate.expense_id,
    (array_agg(
      candidate.split_group_id order by candidate.split_group_id
    ))[1] as split_group_id
  from structurally_valid_candidates candidate
  group by candidate.expense_id
  having count(*) = 1
)
update public.expenses expense
set split_group_id = repair.split_group_id
from uniquely_relinkable repair
where expense.id = repair.expense_id
  and expense.split_group_id is null;

-- Existing groups predate the durable write marker.  Their split group and
-- line amounts are the ledger facts already used by production settlement
-- balances; the parent expense is the user's current transaction record.
-- Preserve internally complete legacy groups even when an old edit changed
-- the parent's household, currency, or amount without rewriting the split.
-- Those mismatches are recorded privately and never weaken validation for a
-- new or explicitly re-split group.  Bounded per-participant rounding residue
-- is retained at its native amounts rather than silently reallocating cents.
with legacy_line_state as (
  select
    split_line.split_group_id,
    count(*)::bigint as line_count,
    count(distinct split_line.user_id)::bigint as distinct_user_count,
    bool_and(split_line.amount_cents is not null) as amounts_are_nonnull,
    bool_and(coalesce(split_line.amount_cents, -1) >= 0)
      as amounts_are_nonnegative,
    sum(split_line.amount_cents)::bigint as line_total_cents
  from public.expense_split_lines split_line
  group by split_line.split_group_id
)
insert into public.household_settlement_finalized_split_groups (
  split_group_id,
  completed_at,
  validation_profile,
  legacy_parent_household_mismatch,
  legacy_parent_currency_mismatch,
  legacy_parent_amount_mismatch,
  legacy_rounding_delta_cents
)
select
  split_group.id,
  coalesce(split_group.updated_at, split_group.created_at, clock_timestamp()),
  'legacy_structural',
  expense.household_id is distinct from split_group.household_id,
  upper(expense.currency) is distinct from upper(split_group.currency),
  abs(expense.amount_cents) is distinct from split_group.total_amount_cents,
  line_state.line_total_cents - split_group.total_amount_cents
from public.expense_split_groups split_group
join public.expenses expense
  on expense.id = split_group.expense_id
join legacy_line_state line_state
  on line_state.split_group_id = split_group.id
where expense.id = split_group.expense_id
  and expense.deleted_at is null
  and expense.split_group_id = split_group.id
  and line_state.line_count > 0
  and line_state.line_count = line_state.distinct_user_count
  and line_state.amounts_are_nonnull
  and line_state.amounts_are_nonnegative
  and abs(
    line_state.line_total_cents - split_group.total_amount_cents
  ) <= greatest(line_state.line_count - 1, 0)
  and exists (
    select 1
    from public.expense_split_lines payer_line
    where payer_line.split_group_id = split_group.id
      and payer_line.user_id = split_group.payer_user_id
  )
on conflict (split_group_id) do update
set completed_at = excluded.completed_at,
    validation_profile = excluded.validation_profile,
    legacy_parent_household_mismatch =
      excluded.legacy_parent_household_mismatch,
    legacy_parent_currency_mismatch =
      excluded.legacy_parent_currency_mismatch,
    legacy_parent_amount_mismatch =
      excluded.legacy_parent_amount_mismatch,
    legacy_rounding_delta_cents = excluded.legacy_rounding_delta_cents;

-- Do not let production enter a state where one malformed active group blocks
-- all pairwise reads and writes after deployment.  Safe repairs and explicit
-- legacy-structural markers above preserve the production ledger without
-- guessing.  Every remaining unmarked category aborts the whole migration so
-- it can be investigated with the read-only preflight first.
do $$
declare
  v_ambiguous_unlinked_parents bigint := 0;
  v_unrelinked_parents bigint := 0;
  v_missing_parent_groups bigint := 0;
  v_parent_group_mismatches bigint := 0;
  v_nonreciprocal_links bigint := 0;
  v_scope_or_amount_mismatches bigint := 0;
  v_invalid_line_sets bigint := 0;
  v_missing_payer_lines bigint := 0;
begin
  select count(*)::bigint
  into v_ambiguous_unlinked_parents
  from (
    select expense.id
    from public.expenses expense
    join public.expense_split_groups split_group
      on split_group.expense_id = expense.id
    where expense.deleted_at is null
      and expense.split_group_id is null
    group by expense.id
    having count(*) > 1
  ) ambiguous;

  select count(*)::bigint
  into v_unrelinked_parents
  from public.expenses expense
  where expense.deleted_at is null
    and expense.split_group_id is null
    and exists (
      select 1
      from public.expense_split_groups split_group
      where split_group.expense_id = expense.id
    );

  select count(*)::bigint
  into v_missing_parent_groups
  from public.expenses expense
  left join public.expense_split_groups split_group
    on split_group.id = expense.split_group_id
  where expense.deleted_at is null
    and expense.split_group_id is not null
    and split_group.id is null;

  select count(*)::bigint
  into v_parent_group_mismatches
  from public.expenses expense
  join public.expense_split_groups split_group
    on split_group.id = expense.split_group_id
  where expense.deleted_at is null
    and split_group.expense_id is distinct from expense.id;

  select count(*)::bigint
  into v_nonreciprocal_links
  from public.expense_split_groups split_group
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  where expense.split_group_id is distinct from split_group.id;

  select count(*)::bigint
  into v_scope_or_amount_mismatches
  from public.expense_split_groups split_group
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  where (
    expense.household_id is distinct from split_group.household_id
    or upper(expense.currency) is distinct from upper(split_group.currency)
    or abs(expense.amount_cents) is distinct from split_group.total_amount_cents
  )
  and not exists (
    select 1
    from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id = split_group.id
  );

  select count(*)::bigint
  into v_invalid_line_sets
  from public.expense_split_groups split_group
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  where not exists (
    select 1
    from public.expense_split_lines split_line
    where split_line.split_group_id = split_group.id
    group by split_line.split_group_id
      having count(*) > 0
        and count(*) = count(distinct split_line.user_id)
        and bool_and(split_line.amount_cents is not null)
        and bool_and(coalesce(split_line.amount_cents, -1) >= 0)
        and abs(
          sum(split_line.amount_cents) - split_group.total_amount_cents
        ) <= greatest(count(*) - 1, 0)
  );

  select count(*)::bigint
  into v_missing_payer_lines
  from public.expense_split_groups split_group
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  where not exists (
    select 1
    from public.expense_split_lines payer_line
    where payer_line.split_group_id = split_group.id
      and payer_line.user_id = split_group.payer_user_id
  );

  if v_ambiguous_unlinked_parents <> 0
    or v_unrelinked_parents <> 0
    or v_missing_parent_groups <> 0
    or v_parent_group_mismatches <> 0
    or v_nonreciprocal_links <> 0
    or v_scope_or_amount_mismatches <> 0
    or v_invalid_line_sets <> 0
    or v_missing_payer_lines <> 0
  then
    raise exception using
      errcode = '23514',
      message = format(
        'settlement_legacy_preflight_failed: ambiguous_unlinked_parents=%s, unrelinked_parents=%s, missing_parent_groups=%s, parent_group_mismatches=%s, nonreciprocal_links=%s, scope_or_amount_mismatches=%s, invalid_line_sets=%s, missing_payer_lines=%s',
        v_ambiguous_unlinked_parents,
        v_unrelinked_parents,
        v_missing_parent_groups,
        v_parent_group_mismatches,
        v_nonreciprocal_links,
        v_scope_or_amount_mismatches,
        v_invalid_line_sets,
        v_missing_payer_lines
      );
  end if;
end;
$$;

-- Legacy rows did not persist the event-time pair balance. Current split rows
-- are mutable, so reconstructing it now could silently turn an old partial
-- payment into a false cycle boundary. Leave every legacy event ambiguous and
-- freeze those scopes behind the explicit cutover created below unless there
-- is support-confirmed evidence for a one-off repair.
--
-- This event is the reset action investigated for the Homer Home report. The
-- account owner confirmed it was used to clear the stale pre-existing balance;
-- its exact immutable identifiers and allocation audit make this update a
-- narrowly-scoped data repair, not a heuristic applied to other households.
do $$
declare
  v_audited_household_exists boolean;
  v_repaired_count bigint;
begin
  -- A clean development database does not contain this production household.
  -- Once the audited scope exists, however, predicate drift must abort the
  -- migration instead of silently losing the known full-cycle boundary.
  select exists (
    select 1
    from public.households household
    where household.id = 'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
  )
  into v_audited_household_exists;

  update public.household_settlement_events event
  set pair_balance_before_cents = -10000,
      pair_balance_after_cents = 0,
      cleared_pair_balance = true
  where event.id = '99bc3df9-8398-40e4-ac71-d308522ea412'::uuid
    and event.household_id = 'a8ca9095-7c28-46e3-83a0-de9617b7906f'::uuid
    and event.actor_user_id = '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
    and event.payer_user_id = '0ea75fd1-bc13-454b-ade5-2df9f6ae1f40'::uuid
    and event.participant_user_id = '9ca915ec-95b0-4b6e-ae67-68bf2600a245'::uuid
    and upper(event.currency) = 'CAD'
    and event.amount_cents = 10000
    and event.mode = 'both'
    and event.created_at = '2026-07-16 00:53:13.425699+00'::timestamptz
    and exists (
      select 1
      from public.household_settlement_event_allocation_status_v2 status
      where status.settlement_event_id = event.id
        and status.allocated_total_cents = 10000
    )
    and (
      select coalesce(sum(allocation.allocated_amount_cents), 0)
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.settlement_event_id = event.id
    ) = 10000;

  get diagnostics v_repaired_count = row_count;

  if (v_audited_household_exists or v_repaired_count <> 0)
    and v_repaired_count <> 1
  then
    raise exception using
      errcode = '23514',
      message = format(
        'settlement_audited_boundary_repair_failed: expected_matches=1, actual_matches=%s',
        v_repaired_count
      );
  end if;
end;
$$;

update public.household_settlement_events event
set cycle_boundary_event_id = public.households_latest_full_settlement_boundary_v3(
  event.household_id,
  event.payer_user_id,
  event.participant_user_id,
  event.currency,
  event.settlement_ledger_seq
)
where event.settlement_ledger_seq is not null;

update public.expense_split_lines split_line
set cycle_boundary_event_id = public.households_latest_full_settlement_boundary_v3(
  split_group.household_id,
  split_group.payer_user_id,
  split_line.user_id,
  split_group.currency,
  split_line.settlement_ledger_seq
)
from public.expense_split_groups split_group
where split_group.id = split_line.split_group_id
  and split_group.payer_user_id <> split_line.user_id
  and split_line.settlement_ledger_seq is not null;

insert into public.household_settlement_cycle_baseline_lines (
  boundary_event_id,
  household_id,
  split_line_id,
  split_group_id,
  expense_id,
  payer_user_id,
  participant_user_id,
  currency,
  amount_cents,
  expense_date,
  expense_description,
  expense_category,
  expense_raw_text,
  expense_type
)
select
  event.id,
  event.household_id,
  split_line.id,
  split_group.id,
  split_group.expense_id,
  split_group.payer_user_id,
  split_line.user_id,
  upper(split_group.currency),
  abs(coalesce(split_line.amount_cents, 0)),
  coalesce(
    expense.date::timestamp at time zone 'UTC',
    split_group.created_at
  ),
  split_group.description,
  expense.category::text,
  expense.raw_text,
  expense.type::text
from public.household_settlement_events event
join public.expense_split_groups split_group
  on split_group.household_id = event.household_id
  and upper(split_group.currency) = upper(event.currency)
join public.expense_split_lines split_line
  on split_line.split_group_id = split_group.id
  and split_line.settlement_ledger_seq < event.settlement_ledger_seq
join public.expenses expense
  on expense.id = split_group.expense_id
  and expense.deleted_at is null
where event.cleared_pair_balance is true
  and split_line.is_settled = false
  and split_group.payer_user_id <> split_line.user_id
  and (
    (
      split_group.payer_user_id = event.payer_user_id
      and split_line.user_id = event.participant_user_id
    )
    or
    (
      split_group.payer_user_id = event.participant_user_id
      and split_line.user_id = event.payer_user_id
    )
  )
on conflict (boundary_event_id, split_line_id) do nothing;

-- Freeze only scopes whose newest ambiguous legacy event is newer than their
-- newest proven full settlement.  A scope with no settlement events needs no
-- cutover, and the support-audited CAD event above remains a genuine full
-- boundary rather than being converted to carried history.  Each cutover is
-- sequenced after every legacy line/event; the runtime triggers installed
-- below therefore assign all future writes a strictly later sequence.
with ordered_events as (
  select
    event.*,
    case
      when event.payer_user_id::text < event.participant_user_id::text
        then event.payer_user_id
      else event.participant_user_id
    end as user_a_id,
    case
      when event.payer_user_id::text < event.participant_user_id::text
        then event.participant_user_id
      else event.payer_user_id
    end as user_b_id
  from public.household_settlement_events event
  where event.settlement_ledger_seq is not null
), latest_ambiguous as (
  select distinct on (
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency)
  )
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency) as currency,
    event.id as ambiguous_event_id,
    event.settlement_ledger_seq as ambiguous_event_ledger_seq
  from ordered_events event
  where event.pair_balance_before_cents is null
    or event.pair_balance_after_cents is null
    or event.cleared_pair_balance is null
  order by
    event.household_id,
    event.user_a_id,
    event.user_b_id,
    upper(event.currency),
    event.settlement_ledger_seq desc,
    event.id desc
), candidates as (
  select
    ambiguous.*,
    full_event.id as latest_full_event_id,
    full_event.settlement_ledger_seq as latest_full_ledger_seq,
    coalesce(line_state.signed_cents, 0)::bigint
      + coalesce(event_state.signed_cents, 0)::bigint
        as carryover_net_user_a_cents
  from latest_ambiguous ambiguous
  left join lateral (
    select event.id, event.settlement_ledger_seq
    from ordered_events event
    where event.household_id = ambiguous.household_id
      and event.user_a_id = ambiguous.user_a_id
      and event.user_b_id = ambiguous.user_b_id
      and upper(event.currency) = ambiguous.currency
      and event.cleared_pair_balance is true
    order by event.settlement_ledger_seq desc, event.id desc
    limit 1
  ) full_event on true
  left join lateral (
    select coalesce(sum(
      case
        when split_group.payer_user_id = ambiguous.user_b_id
          and split_line.user_id = ambiguous.user_a_id
          then abs(split_line.amount_cents)
        when split_group.payer_user_id = ambiguous.user_a_id
          and split_line.user_id = ambiguous.user_b_id
          then -abs(split_line.amount_cents)
        else 0
      end
    ), 0)::bigint as signed_cents
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    join public.household_settlement_finalized_split_groups finalized
      on finalized.split_group_id = split_group.id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = ambiguous.household_id
      and upper(split_group.currency) = ambiguous.currency
      and split_line.is_settled is false
      and split_line.amount_cents is not null
      and (
        (
          split_group.payer_user_id = ambiguous.user_b_id
          and split_line.user_id = ambiguous.user_a_id
        )
        or (
          split_group.payer_user_id = ambiguous.user_a_id
          and split_line.user_id = ambiguous.user_b_id
        )
      )
  ) line_state on true
  left join lateral (
    select coalesce(sum(
      case
        when event.payer_user_id = ambiguous.user_b_id
          and event.participant_user_id = ambiguous.user_a_id
          then -abs(event.amount_cents)
        when event.payer_user_id = ambiguous.user_a_id
          and event.participant_user_id = ambiguous.user_b_id
          then abs(event.amount_cents)
        else 0
      end
    ), 0)::bigint as signed_cents
    from public.household_settlement_events event
    where event.household_id = ambiguous.household_id
      and upper(event.currency) = ambiguous.currency
      and (
        (
          event.payer_user_id = ambiguous.user_b_id
          and event.participant_user_id = ambiguous.user_a_id
        )
        or (
          event.payer_user_id = ambiguous.user_a_id
          and event.participant_user_id = ambiguous.user_b_id
        )
      )
  ) event_state on true
  where full_event.settlement_ledger_seq is null
    or ambiguous.ambiguous_event_ledger_seq
      > full_event.settlement_ledger_seq
)
insert into public.household_settlement_legacy_cutovers_v3 (
  household_id,
  user_a_id,
  user_b_id,
  currency,
  cutover_ledger_seq,
  carryover_net_user_a_cents,
  latest_preceding_full_event_id,
  latest_preceding_full_ledger_seq,
  latest_ambiguous_event_id,
  latest_ambiguous_event_ledger_seq
)
select
  candidate.household_id,
  candidate.user_a_id,
  candidate.user_b_id,
  candidate.currency,
  nextval('public.household_settlement_ledger_seq'),
  candidate.carryover_net_user_a_cents,
  candidate.latest_full_event_id,
  candidate.latest_full_ledger_seq,
  candidate.ambiguous_event_id,
  candidate.ambiguous_event_ledger_seq
from candidates candidate
order by
  candidate.household_id,
  candidate.user_a_id,
  candidate.user_b_id,
  candidate.currency
on conflict (household_id, user_a_id, user_b_id, currency) do nothing;

insert into public.household_settlement_legacy_cutover_lines_v3 (
  cutover_id,
  household_id,
  split_line_id,
  split_group_id,
  expense_id,
  payer_user_id,
  participant_user_id,
  currency,
  amount_cents,
  signed_for_user_a_cents,
  settlement_ledger_seq,
  expense_date,
  expense_description,
  expense_category,
  expense_raw_text,
  expense_type
)
select
  cutover.id,
  cutover.household_id,
  split_line.id,
  split_group.id,
  split_group.expense_id,
  split_group.payer_user_id,
  split_line.user_id,
  upper(split_group.currency),
  abs(split_line.amount_cents),
  case
    when split_group.payer_user_id = cutover.user_b_id
      and split_line.user_id = cutover.user_a_id
      then abs(split_line.amount_cents)
    else -abs(split_line.amount_cents)
  end,
  split_line.settlement_ledger_seq,
  coalesce(
    expense.date::timestamp at time zone 'UTC',
    split_group.created_at
  ),
  split_group.description,
  expense.category::text,
  expense.raw_text,
  expense.type::text
from public.household_settlement_legacy_cutovers_v3 cutover
join public.expense_split_groups split_group
  on split_group.household_id = cutover.household_id
  and upper(split_group.currency) = cutover.currency
join public.household_settlement_finalized_split_groups finalized
  on finalized.split_group_id = split_group.id
join public.expense_split_lines split_line
  on split_line.split_group_id = split_group.id
  and split_line.settlement_ledger_seq < cutover.cutover_ledger_seq
join public.expenses expense
  on expense.id = split_group.expense_id
  and expense.deleted_at is null
where split_line.is_settled is false
  and split_line.amount_cents is not null
  and (
    (
      split_group.payer_user_id = cutover.user_b_id
      and split_line.user_id = cutover.user_a_id
    )
    or (
      split_group.payer_user_id = cutover.user_a_id
      and split_line.user_id = cutover.user_b_id
    )
  )
on conflict (cutover_id, split_line_id) do nothing;

-- Allocation rows are part of the payment audit.  Deleting or replacing a
-- split must not silently erase that audit while leaving a processed status.
alter table public.household_settlement_event_allocations_v2
  drop constraint if exists household_settlement_event_allocations_v2_split_group_id_fkey,
  drop constraint if exists household_settlement_event_allocations_v2_split_line_id_fkey;

alter table public.household_settlement_event_allocations_v2
  alter column split_group_id drop not null,
  alter column split_line_id drop not null;

alter table public.household_settlement_event_allocations_v2
  add constraint household_settlement_event_allocations_v2_split_group_id_fkey
    foreign key (split_group_id)
    references public.expense_split_groups(id)
    on delete set null,
  add constraint household_settlement_event_allocations_v2_split_line_id_fkey
    foreign key (split_line_id)
    references public.expense_split_lines(id)
    on delete set null;

with actual as (
  select
    status.settlement_event_id,
    status.allocated_total_cents as recorded_cents,
    coalesce(sum(allocation.allocated_amount_cents), 0)::bigint as actual_cents
  from public.household_settlement_event_allocation_status_v2 status
  left join public.household_settlement_event_allocations_v2 allocation
    on allocation.settlement_event_id = status.settlement_event_id
  group by status.settlement_event_id, status.allocated_total_cents
)
update public.household_settlement_event_allocation_status_v2 status
set allocated_total_cents = actual.actual_cents,
    allocation_source = case
      when actual.actual_cents < actual.recorded_cents
        then 'legacy_reconciled_missing_rows'
      else status.allocation_source
    end,
    processed_at = clock_timestamp()
from actual
where status.settlement_event_id = actual.settlement_event_id
  and status.allocated_total_cents <> actual.actual_cents;

-- These older BEFORE triggers run alphabetically before the V3 guards. Make
-- their advisory-lock order identical so a combined scope move cannot take a
-- destination lock first and deadlock an opposite-direction transaction.
create or replace function public.reject_split_group_for_deleted_expense()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  for v_household_id in
    select affected.household_id
    from (
      values
        (case when tg_op = 'UPDATE' then old.household_id else null end),
        (new.household_id)
    ) affected(household_id)
    where affected.household_id is not null
    group by affected.household_id
    order by affected.household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  if exists (
    select 1
    from public.expenses expense
    where expense.id = new.expense_id
      and expense.deleted_at is not null
  ) then
    raise exception 'Cannot create a split for a deleted expense'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_split_group_for_deleted_expense()
  from public, anon, authenticated;

create or replace function public.lock_soft_deleted_expense_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  for v_household_id in
    select affected.household_id
    from (
      select old.household_id
      union
      select new.household_id
      union
      select split_group.household_id
      from public.expense_split_groups split_group
      where split_group.id in (old.split_group_id, new.split_group_id)
    ) affected
    where affected.household_id is not null
    group by affected.household_id
    order by affected.household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.lock_soft_deleted_expense_household()
  from public, anon, authenticated;

create or replace function public.households_guard_split_group_write_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  if tg_op = 'UPDATE' and old.id is distinct from new.id then
    raise exception 'settlement_split_group_id_is_immutable';
  end if;

  if tg_op = 'UPDATE'
    and old.household_id is not distinct from new.household_id
    and old.expense_id is not distinct from new.expense_id
    and old.payer_user_id is not distinct from new.payer_user_id
    and old.split_type is not distinct from new.split_type
    and upper(old.currency) is not distinct from upper(new.currency)
    and old.total_amount_cents is not distinct from new.total_amount_cents
  then
    return new;
  end if;

  -- A released multi-statement writer may still create a brand-new group
  -- before the Edge rollout completes, but it must never rewrite an already
  -- finalized group because it has no explicit re-split intent and cannot
  -- preserve departed historical participants.  Atomic RPCs identify their
  -- transaction with the parent expense id.  Nested/cascade cleanup is safe
  -- because the parent is already being removed or unlinked.
  if tg_op <> 'INSERT'
    and pg_trigger_depth() = 1
    and coalesce(
      current_setting('moneko.settlement_split_write_expense_id', true),
      ''
    ) <> old.expense_id::text
    and exists (
      select 1
      from public.household_settlement_finalized_split_groups finalized
      where finalized.split_group_id = old.id
    )
    and (
      tg_op = 'UPDATE'
      or exists (
        select 1
        from public.expenses expense
        where expense.id = old.expense_id
          and expense.deleted_at is null
          and expense.split_group_id = old.id
      )
    )
  then
    raise exception 'settlement_split_group_requires_atomic_write';
  end if;

  for v_household_id in
    select household_id
    from (
      select case when tg_op = 'INSERT' then new.household_id else old.household_id end
        as household_id
      union
      select new.household_id
      where tg_op = 'UPDATE'
    ) affected
    where household_id is not null
    order by household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  if tg_op = 'DELETE' then
    delete from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id = old.id;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    delete from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id in (old.id, new.id);
  else
    delete from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id = new.id;
  end if;

  new.currency := upper(btrim(new.currency));
  return new;
end;
$$;

revoke all on function public.households_guard_split_group_write_v3()
  from public, anon, authenticated;

drop trigger if exists trg_guard_split_group_write_v3
  on public.expense_split_groups;
create trigger trg_guard_split_group_write_v3
before insert or update or delete on public.expense_split_groups
for each row execute function public.households_guard_split_group_write_v3();

create or replace function public.households_guard_expense_split_parent_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
  v_role text := coalesce(
    nullif((select auth.jwt() ->> 'role'), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_is_atomic_write boolean;
begin
  v_is_atomic_write := coalesce(
    current_setting('moneko.settlement_split_write_expense_id', true),
    ''
  ) = old.id::text;
  if old.household_id is not distinct from new.household_id
    and old.amount_cents is not distinct from new.amount_cents
    and upper(old.currency) is not distinct from upper(new.currency)
    and old.split_group_id is not distinct from new.split_group_id
  then
    if old.account_id is not distinct from new.account_id
      or new.account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = new.account_id
          and account.household_id is not distinct from new.household_id
          and upper(account.currency) = upper(new.currency)
          and account.is_archived is false
      )
    then
      return new;
    end if;
    raise exception 'settlement_split_parent_account_scope_mismatch';
  end if;

  for v_household_id in
    select household_id
    from (
      select old.household_id
      union
      select new.household_id
      union
      select split_group.household_id
      from public.expense_split_groups split_group
      where split_group.id in (old.split_group_id, new.split_group_id)
    ) affected(household_id)
    where household_id is not null
    order by household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  -- ON DELETE SET NULL and the soft-delete cleanup trigger may unlink a
  -- parent while cascading from a group deletion.  The group row is already
  -- disappearing in that nested operation, so there is no multi-statement
  -- split to publish.
  if pg_trigger_depth() > 1
    and old.split_group_id is not null
    and new.split_group_id is null
  then
    delete from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id = old.split_group_id;
    return new;
  end if;

  if (old.split_group_id is not null or new.split_group_id is not null)
    and not v_is_atomic_write
  then
    -- During the database-first rollout, the released Edge writer can only
    -- finish a new group (or move to a separately-created new group) with its
    -- final parent statement.  Same-group edits have no explicit re-split
    -- intent and are rejected so historical participants cannot be replaced
    -- by today's household membership.
    if v_role <> 'service_role'
      or old.split_group_id is not distinct from new.split_group_id
    then
      raise exception 'settlement_split_parent_requires_atomic_write';
    end if;

    if old.split_group_id is not null then
      if not exists (
        select 1
        from public.expense_split_groups split_group
        where split_group.id = old.split_group_id
          and split_group.expense_id = old.id
      ) then
        raise exception 'settlement_previous_split_group_changed_retry';
      end if;

      if exists (
        select 1
        from public.expense_split_lines split_line
        where split_line.split_group_id = old.split_group_id
          and split_line.is_settled is true
      ) or exists (
        select 1
        from public.household_settlement_event_allocations_v2 allocation
        where allocation.split_group_id = old.split_group_id
          or allocation.expense_id = old.id
      ) then
        raise exception 'settlement_split_group_with_payments_is_immutable';
      end if;
    end if;

    if new.account_id is not null
      and not exists (
        select 1
        from public.accounts account
        where account.id = new.account_id
          and account.household_id is not distinct from new.household_id
          and upper(account.currency) = upper(new.currency)
          and account.is_archived is false
      )
    then
      raise exception 'settlement_split_parent_account_scope_mismatch';
    end if;

    if new.split_group_id is not null then
      if coalesce(new.type::text, 'expense') not in ('expense', 'income')
        or new.household_id is null
        or not exists (
          select 1
          from public.expense_split_groups split_group
          join public.households household
            on household.id = split_group.household_id
            and coalesce(household.is_portfolio, false) is false
          where split_group.id = new.split_group_id
            and split_group.expense_id = new.id
            and split_group.household_id = new.household_id
            and upper(split_group.currency) = upper(new.currency)
            and split_group.total_amount_cents = abs(new.amount_cents)
            and public.is_member_of_household(
              split_group.household_id,
              split_group.payer_user_id
            )
            and exists (
              select 1
              from public.expense_split_lines split_line
              where split_line.split_group_id = split_group.id
              group by split_line.split_group_id
              having count(*) > 0
                and count(*) = count(distinct split_line.user_id)
                and bool_and(split_line.amount_cents is not null)
                and bool_and(coalesce(split_line.amount_cents, -1) >= 0)
                and bool_and(split_line.is_settled is false)
                and sum(split_line.amount_cents)
                  = split_group.total_amount_cents
            )
            and not exists (
              select membership.user_id
              from public.household_members membership
              where membership.household_id = split_group.household_id
              except
              select split_line.user_id
              from public.expense_split_lines split_line
              where split_line.split_group_id = split_group.id
            )
            and not exists (
              select split_line.user_id
              from public.expense_split_lines split_line
              where split_line.split_group_id = split_group.id
              except
              select membership.user_id
              from public.household_members membership
              where membership.household_id = split_group.household_id
            )
            and not exists (
              select 1
              from public.household_settlement_event_allocations_v2 allocation
              where allocation.split_group_id = split_group.id
                or allocation.expense_id = new.id
            )
        )
      then
        raise exception 'settlement_legacy_split_link_is_not_finalizable';
      end if;
    end if;
  end if;

  delete from public.household_settlement_finalized_split_groups finalized
  where finalized.split_group_id in (old.split_group_id, new.split_group_id);

  if not v_is_atomic_write and new.split_group_id is not null then
    insert into public.household_settlement_finalized_split_groups (
      split_group_id,
      completed_at,
      validation_profile
    ) values (
      new.split_group_id,
      clock_timestamp(),
      'strict_current'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.households_guard_expense_split_parent_v3()
  from public, anon, authenticated;

drop trigger if exists trg_guard_expense_split_parent_v3 on public.expenses;
create trigger trg_guard_expense_split_parent_v3
before update of household_id, amount_cents, currency, split_group_id, account_id
on public.expenses
for each row execute function public.households_guard_expense_split_parent_v3();

-- The released scope-move writer unlinks the parent before issuing a separate
-- group delete.  Complete that cleanup in the parent transaction so a lost
-- Edge response cannot leave another detached group behind.  The BEFORE guard
-- has already rejected any group with settled lines or payment allocations.
create or replace function public.households_cleanup_replaced_split_group_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.split_group_id is null
    or old.split_group_id is not distinct from new.split_group_id
  then
    return new;
  end if;

  delete from public.expense_split_groups split_group
  where split_group.id = old.split_group_id
    and split_group.expense_id = new.id
    and not exists (
      select 1
      from public.expense_split_lines split_line
      where split_line.split_group_id = split_group.id
        and split_line.is_settled is true
    )
    and not exists (
      select 1
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.split_group_id = split_group.id
        or allocation.expense_id = new.id
    );

  if exists (
    select 1
    from public.expense_split_groups split_group
    where split_group.id = old.split_group_id
      and split_group.expense_id = new.id
  ) then
    raise exception 'settlement_replaced_split_group_cleanup_failed';
  end if;

  return new;
end;
$$;

revoke all on function public.households_cleanup_replaced_split_group_v3()
  from public, anon, authenticated;

drop trigger if exists trg_cleanup_replaced_split_group_v3
  on public.expenses;
create trigger trg_cleanup_replaced_split_group_v3
after update of split_group_id on public.expenses
for each row execute function public.households_cleanup_replaced_split_group_v3();

create or replace function public.households_finalize_expense_split_write_v3(
  p_split_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_role text := coalesce(
    nullif((select auth.jwt() ->> 'role'), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_group public.expense_split_groups%rowtype;
  v_initial_group_household_id uuid;
  v_expense public.expenses%rowtype;
  v_line_count integer;
  v_line_total bigint;
  v_completed_at timestamptz;
begin
  if v_actor_id is null and v_role <> 'service_role' then
    raise exception 'households_finalize_expense_split_write_v3: auth.uid() is null';
  end if;

  select split_group.*
  into v_group
  from public.expense_split_groups split_group
  where split_group.id = p_split_group_id;

  if not found then
    raise exception 'settlement_split_group_not_found';
  end if;
  v_initial_group_household_id := v_group.household_id;

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || v_group.household_id::text, 0)
  );

  select split_group.*
  into v_group
  from public.expense_split_groups split_group
  where split_group.id = p_split_group_id
  for update;

  if not found
    or v_group.household_id is distinct from v_initial_group_household_id
  then
    raise exception 'settlement_split_group_changed_retry';
  end if;

  if v_actor_id is not null
    and not public.is_member_of_household(v_group.household_id, v_actor_id)
  then
    raise exception 'households_finalize_expense_split_write_v3: actor not member of household';
  end if;

  select expense.*
  into v_expense
  from public.expenses expense
  where expense.id = v_group.expense_id
    and expense.deleted_at is null
  for update;

  if not found
    or v_expense.household_id is distinct from v_group.household_id
    or upper(v_expense.currency) is distinct from upper(v_group.currency)
    or abs(v_expense.amount_cents) is distinct from v_group.total_amount_cents
    or v_expense.split_group_id is distinct from v_group.id
  then
    raise exception 'settlement_split_group_expense_mismatch';
  end if;

  -- Recovery may republish only the private completion marker for an already
  -- reciprocal parent/group link. Parent linkage belongs exclusively to the
  -- atomic commit RPC below.

  if not public.is_member_of_household(
    v_group.household_id,
    v_group.payer_user_id
  ) then
    raise exception 'settlement_split_group_payer_not_member';
  end if;

  select count(*)::integer, coalesce(sum(split_line.amount_cents), 0)::bigint
  into v_line_count, v_line_total
  from public.expense_split_lines split_line
  where split_line.split_group_id = v_group.id
    and split_line.amount_cents is not null;

  if v_line_count = 0 or v_line_total <> v_group.total_amount_cents then
    raise exception 'settlement_data_incomplete_split_group';
  end if;

  if exists (
    select 1
    from public.expense_split_lines split_line
    left join public.household_members membership
      on membership.household_id = v_group.household_id
      and membership.user_id = split_line.user_id
    where split_line.split_group_id = v_group.id
      and membership.id is null
  ) or exists (
    select 1
    from public.household_members membership
    left join public.expense_split_lines split_line
      on split_line.split_group_id = v_group.id
      and split_line.user_id = membership.user_id
    where membership.household_id = v_group.household_id
      and split_line.id is null
  ) then
    raise exception 'settlement_split_group_member_set_mismatch';
  end if;

  v_completed_at := clock_timestamp();
  insert into public.household_settlement_finalized_split_groups (
    split_group_id,
    completed_at,
    validation_profile
  ) values (
    v_group.id,
    v_completed_at,
    'strict_current'
  )
  on conflict (split_group_id) do update
  set completed_at = excluded.completed_at,
      validation_profile = 'strict_current',
      legacy_parent_household_mismatch = false,
      legacy_parent_currency_mismatch = false,
      legacy_parent_amount_mismatch = false,
      legacy_rounding_delta_cents = 0;

  return jsonb_build_object(
    'split_group_id', v_group.id,
    'settlement_write_completed_at', v_completed_at
  );
end;
$$;

revoke all on function public.households_finalize_expense_split_write_v3(uuid)
  from public, anon, authenticated;
grant execute on function public.households_finalize_expense_split_write_v3(uuid)
  to service_role;

-- Commit a complete split write in one database transaction. This is the only
-- production writer path: it serializes by household, validates the exact
-- member/amount set, replaces or creates the group and lines, links the parent
-- expense, and publishes the private finalized marker atomically.
create or replace function public.households_commit_expense_split_write_v3(
  p_actor_user_id uuid,
  p_expense_id uuid,
  p_split_group_id uuid,
  p_household_id uuid,
  p_payer_user_id uuid,
  p_split_type text,
  p_currency text,
  p_total_amount_cents bigint,
  p_description text,
  p_lines jsonb,
  p_expected_parent jsonb,
  p_previous_split_group_id uuid default null,
  p_target_account_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif((select auth.jwt() ->> 'role'), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_expense public.expenses%rowtype;
  v_initial_expense_household_id uuid;
  v_previous_group public.expense_split_groups%rowtype;
  v_target_group public.expense_split_groups%rowtype;
  v_initial_previous_group_household_id uuid;
  v_initial_target_group_household_id uuid;
  v_had_previous_group boolean := false;
  v_had_target_group boolean := false;
  v_preserve_historical_participants boolean := false;
  v_source_is_portfolio boolean := false;
  v_target_is_portfolio boolean := false;
  v_target_account public.accounts%rowtype;
  v_effective_previous_group_id uuid;
  v_household_id uuid;
  v_line_count integer;
  v_distinct_user_count integer;
  v_line_total bigint;
  v_completed_at timestamptz;
  v_lines jsonb;
begin
  if v_role <> 'service_role' then
    raise exception 'households_commit_expense_split_write_v3: service role required';
  end if;
  if p_actor_user_id is null then
    raise exception 'households_commit_expense_split_write_v3: actor is required';
  end if;
  if p_expense_id is null or p_split_group_id is null or p_household_id is null then
    raise exception 'households_commit_expense_split_write_v3: identifiers are required';
  end if;
  if p_payer_user_id is null then
    raise exception 'households_commit_expense_split_write_v3: payer is required';
  end if;
  if p_total_amount_cents is null or p_total_amount_cents <= 0 then
    raise exception 'households_commit_expense_split_write_v3: amount must be positive';
  end if;
  if p_split_type not in ('equal', 'amount', 'percentage', 'shares') then
    raise exception 'households_commit_expense_split_write_v3: invalid split type';
  end if;
  if p_currency is null or upper(btrim(p_currency)) !~ '^[A-Z]{3}$' then
    raise exception 'households_commit_expense_split_write_v3: invalid currency';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'households_commit_expense_split_write_v3: lines must be an array';
  end if;
  if p_expected_parent is null
    or jsonb_typeof(p_expected_parent) <> 'object'
    or not p_expected_parent ?& array[
      'household_id',
      'currency',
      'amount_cents',
      'split_group_id',
      'account_id'
    ]
  then
    raise exception 'households_commit_expense_split_write_v3: expected parent snapshot is required';
  end if;

  select expense.household_id
  into v_initial_expense_household_id
  from public.expenses expense
  where expense.id = p_expense_id
    and expense.deleted_at is null;
  if not found then
    raise exception 'settlement_split_group_expense_not_found';
  end if;

  if p_previous_split_group_id is not null then
    select split_group.*
    into v_previous_group
    from public.expense_split_groups split_group
    where split_group.id = p_previous_split_group_id;
    v_had_previous_group := found;
    if not v_had_previous_group then
      raise exception 'settlement_previous_split_group_not_found';
    end if;
    if v_previous_group.expense_id is distinct from p_expense_id then
      raise exception 'settlement_previous_split_group_expense_mismatch';
    end if;
    v_initial_previous_group_household_id := v_previous_group.household_id;
  end if;

  select split_group.*
  into v_target_group
  from public.expense_split_groups split_group
  where split_group.id = p_split_group_id;
  v_had_target_group := found;
  if v_had_target_group then
    if v_target_group.expense_id is distinct from p_expense_id then
      raise exception 'settlement_split_group_expense_mismatch';
    end if;
    v_initial_target_group_household_id := v_target_group.household_id;
  end if;

  for v_household_id in
    select affected.household_id
    from (
      values
        (v_initial_expense_household_id),
        (p_household_id),
        (v_initial_previous_group_household_id),
        (v_initial_target_group_household_id)
    ) affected(household_id)
    where affected.household_id is not null
    group by affected.household_id
    order by affected.household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  select expense.*
  into v_expense
  from public.expenses expense
  where expense.id = p_expense_id
    and expense.deleted_at is null
  for update;
  if not found then
    raise exception 'settlement_split_group_expense_not_found';
  end if;
  if v_expense.household_id is distinct from v_initial_expense_household_id then
    raise exception 'settlement_split_group_expense_changed_retry';
  end if;
  if coalesce(v_expense.type::text, 'expense') not in ('expense', 'income') then
    raise exception 'households_commit_expense_split_write_v3: transaction type cannot be split';
  end if;
  if coalesce(v_expense.household_id::text, '')
      is distinct from coalesce(p_expected_parent ->> 'household_id', '')
    or upper(coalesce(v_expense.currency, ''))
      is distinct from upper(coalesce(p_expected_parent ->> 'currency', ''))
    or v_expense.amount_cents
      is distinct from (p_expected_parent ->> 'amount_cents')::bigint
    or coalesce(v_expense.split_group_id::text, '')
      is distinct from coalesce(p_expected_parent ->> 'split_group_id', '')
    or coalesce(v_expense.account_id::text, '')
      is distinct from coalesce(p_expected_parent ->> 'account_id', '')
  then
    raise exception 'settlement_split_parent_changed_retry';
  end if;

  if p_previous_split_group_id is not null then
    select split_group.*
    into v_previous_group
    from public.expense_split_groups split_group
    where split_group.id = p_previous_split_group_id
    for update;
    if not found
      or v_previous_group.expense_id is distinct from p_expense_id
      or v_previous_group.household_id
        is distinct from v_initial_previous_group_household_id
    then
      raise exception 'settlement_previous_split_group_changed_retry';
    end if;
  end if;

  select split_group.*
  into v_target_group
  from public.expense_split_groups split_group
  where split_group.id = p_split_group_id
  for update;
  if found <> v_had_target_group
    or (
      found
      and (
        v_target_group.expense_id is distinct from p_expense_id
        or v_target_group.household_id
          is distinct from v_initial_target_group_household_id
      )
    )
  then
    raise exception 'settlement_target_split_group_changed_retry';
  end if;

  v_effective_previous_group_id := coalesce(
    p_previous_split_group_id,
    v_expense.split_group_id
  );

  if v_expense.household_id is null then
    if v_expense.user_id is distinct from p_actor_user_id
      and not exists (
        select 1
        from public.user_contacts contact
        where contact.id = v_expense.contact_id
          and contact.user_id = p_actor_user_id
      )
    then
      raise exception 'households_commit_expense_split_write_v3: actor does not own source expense';
    end if;
  else
    select coalesce(household.is_portfolio, false)
    into v_source_is_portfolio
    from public.households household
    where household.id = v_expense.household_id;

    if v_source_is_portfolio then
      if v_expense.user_id is distinct from p_actor_user_id then
        raise exception 'households_commit_expense_split_write_v3: actor does not own portfolio expense';
      end if;
    elsif not public.is_member_of_household(
      v_expense.household_id,
      p_actor_user_id
    ) then
      raise exception 'households_commit_expense_split_write_v3: actor not member of source household';
    end if;
  end if;

  select coalesce(household.is_portfolio, false)
  into v_target_is_portfolio
  from public.households household
  where household.id = p_household_id;
  if not found then
    raise exception 'households_commit_expense_split_write_v3: target household not found';
  end if;
  if v_target_is_portfolio then
    raise exception 'households_commit_expense_split_write_v3: portfolio households cannot have settlement splits';
  end if;

  if not public.is_member_of_household(p_household_id, p_actor_user_id) then
    raise exception 'households_commit_expense_split_write_v3: actor not member of household';
  end if;
  if v_previous_group.household_id is not null
    and v_previous_group.household_id <> p_household_id
    and not public.is_member_of_household(
      v_previous_group.household_id,
      p_actor_user_id
    )
  then
    raise exception 'households_commit_expense_split_write_v3: actor not member of previous household';
  end if;

  if coalesce(p_target_account_id, v_expense.account_id) is not null then
    select account.*
    into v_target_account
    from public.accounts account
    where account.id = coalesce(p_target_account_id, v_expense.account_id)
    for share;

    if not found or v_target_account.is_archived then
      raise exception 'households_commit_expense_split_write_v3: target account is not available';
    end if;
    if v_target_account.household_id is distinct from p_household_id then
      raise exception 'households_commit_expense_split_write_v3: target account is outside household scope';
    end if;
    if upper(v_target_account.currency) is distinct from upper(btrim(p_currency)) then
      raise exception 'households_commit_expense_split_write_v3: target account currency mismatch';
    end if;
  end if;

  -- Structural parent fields participate in the same transaction as the
  -- group/line replacement.  The wrapper below applies non-structural expense
  -- edits only after this commit succeeds, within the same RPC transaction.
  perform set_config(
    'moneko.settlement_split_write_expense_id',
    p_expense_id::text,
    true
  );
  update public.expenses expense
  set household_id = p_household_id,
      currency = upper(btrim(p_currency)),
      amount_cents = p_total_amount_cents,
      account_id = coalesce(p_target_account_id, expense.account_id)
  where expense.id = p_expense_id
  returning expense.* into v_expense;

  -- Keep the transaction-local authorization marker active through the group
  -- and line replacement.  Their guards reject direct rewrites of finalized
  -- history but permit this service-only atomic RPC.

  select
    count(*)::integer,
    count(distinct line.user_id)::integer,
    coalesce(sum(line.amount_cents), 0)::bigint
  into v_line_count, v_distinct_user_count, v_line_total
  from jsonb_to_recordset(p_lines) as line(
    user_id uuid,
    amount_cents bigint,
    percentage numeric,
    shares integer
  );

  if v_line_count = 0
    or v_distinct_user_count <> v_line_count
    or v_line_total <> p_total_amount_cents
    or exists (
      select 1
      from jsonb_to_recordset(p_lines) as line(
        user_id uuid,
        amount_cents bigint,
        percentage numeric,
        shares integer
      )
      where line.user_id is null
        or line.amount_cents is null
        or line.amount_cents < 0
    )
  then
    raise exception 'settlement_data_incomplete_split_group';
  end if;

  -- An implicit edit of the exact reciprocal group may retain its historical
  -- participants and unchanged historical payer after household membership
  -- drift.  Any group, payer, or participant-set change is an explicit
  -- re-split for database purposes and must use today's complete membership.
  v_preserve_historical_participants :=
    v_had_target_group
    and v_expense.split_group_id = p_split_group_id
    and v_effective_previous_group_id = p_split_group_id
    and v_target_group.household_id = p_household_id
    and v_target_group.payer_user_id = p_payer_user_id
    and exists (
      select 1
      from public.household_settlement_finalized_split_groups finalized
      where finalized.split_group_id = p_split_group_id
    )
    and not exists (
      select split_line.user_id
      from public.expense_split_lines split_line
      where split_line.split_group_id = p_split_group_id
      except
      select line.user_id
      from jsonb_to_recordset(p_lines) as line(user_id uuid)
    )
    and not exists (
      select line.user_id
      from jsonb_to_recordset(p_lines) as line(user_id uuid)
      except
      select split_line.user_id
      from public.expense_split_lines split_line
      where split_line.split_group_id = p_split_group_id
    );

  if not v_preserve_historical_participants
    and not public.is_member_of_household(
      p_household_id,
      p_payer_user_id
    )
  then
    raise exception 'settlement_split_group_payer_not_member';
  end if;

  if not v_preserve_historical_participants then
    if exists (
      select membership.user_id
      from public.household_members membership
      where membership.household_id = p_household_id
      except
      select line.user_id
      from jsonb_to_recordset(p_lines) as line(user_id uuid)
    ) or exists (
      select line.user_id
      from jsonb_to_recordset(p_lines) as line(user_id uuid)
      except
      select membership.user_id
      from public.household_members membership
      where membership.household_id = p_household_id
    ) then
      raise exception 'settlement_split_group_member_set_mismatch';
    end if;
  end if;

  if p_split_type = 'percentage' and exists (
    select 1
    from (
      select
        bool_or(line.percentage is null) as has_null,
        coalesce(sum(line.percentage), 0) as total_percentage
      from jsonb_to_recordset(p_lines) as line(percentage numeric)
    ) validation
    where validation.has_null
      or abs(validation.total_percentage - 100) > 0.01
  ) then
    raise exception 'settlement_split_group_invalid_percentages';
  end if;
  if p_split_type = 'shares' and not exists (
    select 1
    from jsonb_to_recordset(p_lines) as line(shares integer)
    where line.shares > 0
  ) then
    raise exception 'settlement_split_group_invalid_shares';
  end if;

  if exists (
    select 1
    from public.expense_split_lines split_line
    where split_line.split_group_id in (
      p_split_group_id,
      v_effective_previous_group_id
    )
      and split_line.is_settled is true
  ) then
    raise exception 'settlement_split_group_with_settled_lines_is_immutable';
  end if;

  if exists (
    select 1
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.expense_id = p_expense_id
      or allocation.split_group_id in (
        p_split_group_id,
        v_effective_previous_group_id
      )
  ) then
    raise exception 'settlement_split_group_with_payments_is_immutable';
  end if;

  if v_effective_previous_group_id is not null
    and v_effective_previous_group_id <> p_split_group_id
  then
    select split_group.*
    into v_previous_group
    from public.expense_split_groups split_group
    where split_group.id = v_effective_previous_group_id
    for update;
    if found then
      if v_previous_group.expense_id is distinct from p_expense_id then
        raise exception 'settlement_previous_split_group_expense_mismatch';
      end if;
      if v_previous_group.household_id <> p_household_id and exists (
        select 1
        from public.household_settlement_event_allocations_v2 allocation
        where allocation.expense_id = p_expense_id
      ) then
        raise exception 'settlement_split_group_with_payments_cannot_move_household';
      end if;
      delete from public.expense_split_groups split_group
      where split_group.id = v_effective_previous_group_id;
    end if;
  end if;

  select split_group.*
  into v_target_group
  from public.expense_split_groups split_group
  where split_group.id = p_split_group_id
  for update;

  if found then
    if v_target_group.expense_id is distinct from p_expense_id then
      raise exception 'settlement_split_group_expense_mismatch';
    end if;
    if v_target_group.household_id <> p_household_id and exists (
      select 1
      from public.household_settlement_event_allocations_v2 allocation
      where allocation.expense_id = p_expense_id
    ) then
      raise exception 'settlement_split_group_with_payments_cannot_move_household';
    end if;
    update public.expense_split_groups split_group
    set household_id = p_household_id,
        expense_id = p_expense_id,
        payer_user_id = p_payer_user_id,
        split_type = p_split_type::public.split_type,
        currency = upper(btrim(p_currency)),
        total_amount_cents = p_total_amount_cents,
        description = p_description,
        updated_at = clock_timestamp()
    where split_group.id = p_split_group_id;
  else
    insert into public.expense_split_groups (
      id,
      household_id,
      expense_id,
      payer_user_id,
      split_type,
      currency,
      total_amount_cents,
      description
    ) values (
      p_split_group_id,
      p_household_id,
      p_expense_id,
      p_payer_user_id,
      p_split_type::public.split_type,
      upper(btrim(p_currency)),
      p_total_amount_cents,
      p_description
    );
  end if;

  insert into public.expense_split_lines (
    split_group_id,
    user_id,
    amount_cents,
    percentage,
    shares,
    is_settled,
    settled_at,
    settled_by_user_id,
    settlement_note
  )
  select
    p_split_group_id,
    line.user_id,
    line.amount_cents,
    case when p_split_type = 'percentage' then line.percentage else null end,
    case when p_split_type = 'shares' then line.shares else null end,
    false,
    null,
    null,
    null
  from jsonb_to_recordset(p_lines) as line(
    user_id uuid,
    amount_cents bigint,
    percentage numeric,
    shares integer
  )
  on conflict (split_group_id, user_id) do update
  set amount_cents = excluded.amount_cents,
      percentage = excluded.percentage,
      shares = excluded.shares,
      is_settled = false,
      settled_at = null,
      settled_by_user_id = null,
      settlement_note = null,
      updated_at = clock_timestamp();

  delete from public.expense_split_lines split_line
  where split_line.split_group_id = p_split_group_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_lines) as line(user_id uuid)
      where line.user_id = split_line.user_id
    );

  perform set_config(
    'moneko.settlement_split_write_expense_id',
    p_expense_id::text,
    true
  );
  update public.expenses expense
  set split_group_id = p_split_group_id,
      household_id = p_household_id
  where expense.id = p_expense_id;
  perform set_config('moneko.settlement_split_write_expense_id', '', true);

  v_completed_at := clock_timestamp();
  insert into public.household_settlement_finalized_split_groups (
    split_group_id,
    completed_at,
    validation_profile
  ) values (
    p_split_group_id,
    v_completed_at,
    'strict_current'
  )
  on conflict (split_group_id) do update
  set completed_at = excluded.completed_at,
      validation_profile = 'strict_current',
      legacy_parent_household_mismatch = false,
      legacy_parent_currency_mismatch = false,
      legacy_parent_amount_mismatch = false,
      legacy_rounding_delta_cents = 0;

  select coalesce(
    jsonb_agg(to_jsonb(split_line) order by split_line.user_id),
    '[]'::jsonb
  )
  into v_lines
  from public.expense_split_lines split_line
  where split_line.split_group_id = p_split_group_id;

  return jsonb_build_object(
    'split_group_id', p_split_group_id,
    'split_lines', v_lines,
    'settlement_write_completed_at', v_completed_at
  );
end;
$$;

revoke all on function public.households_commit_expense_split_write_v3(
  uuid, uuid, uuid, uuid, uuid, text, text, bigint, text, jsonb, jsonb, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.households_commit_expense_split_write_v3(
  uuid, uuid, uuid, uuid, uuid, text, text, bigint, text, jsonb, jsonb, uuid, uuid
) to service_role;

-- Apply only non-structural expense fields.  This helper has no direct grants;
-- the service-only atomic wrappers below invoke it as their definer after the
-- corresponding split mutation succeeds.
create or replace function public.households_apply_expense_patch_v3(
  p_expense_id uuid,
  p_expense_patch jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_patch jsonb := coalesce(p_expense_patch, '{}'::jsonb);
  v_patched_expense_id uuid;
begin
  if jsonb_typeof(v_patch) <> 'object' then
    raise exception 'households_apply_expense_patch_v3: expense patch must be an object';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(v_patch) patch_key(key)
    where patch_key.key not in (
      'category',
      'raw_text',
      'merchant',
      'date',
      'created_at',
      'receipt_image_url',
      'is_recurring',
      'recurrence_rule',
      'source',
      'user_overrides',
      'updated_at'
    )
  ) then
    raise exception 'households_apply_expense_patch_v3: patch contains unsupported or structural fields';
  end if;

  if v_patch ? 'category'
    and jsonb_typeof(v_patch -> 'category') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: category must be text';
  end if;
  if v_patch ? 'raw_text'
    and jsonb_typeof(v_patch -> 'raw_text') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: raw_text must be text or null';
  end if;
  if v_patch ? 'merchant'
    and jsonb_typeof(v_patch -> 'merchant') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: merchant must be text or null';
  end if;
  if v_patch ? 'date'
    and jsonb_typeof(v_patch -> 'date') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: date must be text';
  end if;
  if v_patch ? 'created_at'
    and jsonb_typeof(v_patch -> 'created_at') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: created_at must be text';
  end if;
  if v_patch ? 'receipt_image_url'
    and jsonb_typeof(v_patch -> 'receipt_image_url') not in ('string', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: receipt_image_url must be text or null';
  end if;
  if v_patch ? 'is_recurring'
    and jsonb_typeof(v_patch -> 'is_recurring') <> 'boolean'
  then
    raise exception 'households_apply_expense_patch_v3: is_recurring must be boolean';
  end if;
  if v_patch ? 'recurrence_rule'
    and jsonb_typeof(v_patch -> 'recurrence_rule') not in ('object', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: recurrence_rule must be an object or null';
  end if;
  if v_patch ? 'user_overrides'
    and jsonb_typeof(v_patch -> 'user_overrides') not in ('object', 'null')
  then
    raise exception 'households_apply_expense_patch_v3: user_overrides must be an object or null';
  end if;
  if v_patch ? 'source'
    and jsonb_typeof(v_patch -> 'source') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: source must be text';
  end if;
  if v_patch ? 'updated_at'
    and jsonb_typeof(v_patch -> 'updated_at') <> 'string'
  then
    raise exception 'households_apply_expense_patch_v3: updated_at must be text';
  end if;

  -- Cast typed scalar strings before the update so malformed values fail with
  -- no partially applied field set.
  if v_patch ? 'date' then
    perform (v_patch ->> 'date')::date;
  end if;
  if v_patch ? 'created_at' then
    perform (v_patch ->> 'created_at')::timestamptz;
  end if;
  if v_patch ? 'updated_at' then
    perform (v_patch ->> 'updated_at')::timestamptz;
  end if;

  if v_patch = '{}'::jsonb then
    return;
  end if;

  update public.expenses expense
  set category = case
        when v_patch ? 'category' then v_patch ->> 'category'
        else expense.category
      end,
      raw_text = case
        when v_patch ? 'raw_text' then v_patch ->> 'raw_text'
        else expense.raw_text
      end,
      merchant = case
        when v_patch ? 'merchant' then v_patch ->> 'merchant'
        else expense.merchant
      end,
      date = case
        when v_patch ? 'date' then (v_patch ->> 'date')::date
        else expense.date
      end,
      created_at = case
        when v_patch ? 'created_at'
          then (v_patch ->> 'created_at')::timestamptz
        else expense.created_at
      end,
      receipt_image_url = case
        when v_patch ? 'receipt_image_url'
          then v_patch ->> 'receipt_image_url'
        else expense.receipt_image_url
      end,
      is_recurring = case
        when v_patch ? 'is_recurring'
          then (v_patch ->> 'is_recurring')::boolean
        else expense.is_recurring
      end,
      recurrence_rule = case
        when v_patch ? 'recurrence_rule' then case
          when jsonb_typeof(v_patch -> 'recurrence_rule') = 'null'
            then null
          else v_patch -> 'recurrence_rule'
        end
        else expense.recurrence_rule
      end,
      source = case
        when v_patch ? 'source' then v_patch ->> 'source'
        else expense.source
      end,
      user_overrides = case
        when v_patch ? 'user_overrides' then case
          when jsonb_typeof(v_patch -> 'user_overrides') = 'null'
            then null
          else v_patch -> 'user_overrides'
        end
        else expense.user_overrides
      end,
      updated_at = case
        when v_patch ? 'updated_at'
          then (v_patch ->> 'updated_at')::timestamptz
        else clock_timestamp()
      end
  where expense.id = p_expense_id
    and expense.deleted_at is null
  returning expense.id into v_patched_expense_id;

  if v_patched_expense_id is null then
    raise exception 'households_apply_expense_patch_v3: active expense not found';
  end if;
end;
$$;

revoke all on function public.households_apply_expense_patch_v3(uuid, jsonb)
  from public, anon, authenticated, service_role;

-- Edge expense updates previously wrote cosmetic fields before invoking the
-- atomic split commit.  A later CAS/allocation rejection could therefore
-- leave a partially updated expense.  This service-only wrapper keeps the
-- released commit RPC untouched while committing the split and the explicitly
-- whitelisted non-settlement patch in the same database transaction.
create or replace function public.households_commit_expense_split_write_with_patch_v3(
  p_actor_user_id uuid,
  p_expense_id uuid,
  p_split_group_id uuid,
  p_household_id uuid,
  p_payer_user_id uuid,
  p_split_type text,
  p_currency text,
  p_total_amount_cents bigint,
  p_description text,
  p_lines jsonb,
  p_expected_parent jsonb,
  p_previous_split_group_id uuid,
  p_target_account_id uuid,
  p_expense_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif((select auth.jwt() ->> 'role'), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_commit_result jsonb;
begin
  if v_role <> 'service_role' then
    raise exception 'households_commit_expense_split_write_with_patch_v3: service role required';
  end if;

  v_commit_result := public.households_commit_expense_split_write_v3(
    p_actor_user_id,
    p_expense_id,
    p_split_group_id,
    p_household_id,
    p_payer_user_id,
    p_split_type,
    p_currency,
    p_total_amount_cents,
    p_description,
    p_lines,
    p_expected_parent,
    p_previous_split_group_id,
    p_target_account_id
  );

  perform public.households_apply_expense_patch_v3(
    p_expense_id,
    p_expense_patch
  );

  return v_commit_result;
end;
$$;

revoke all on function public.households_commit_expense_split_write_with_patch_v3(
  uuid, uuid, uuid, uuid, uuid, text, text, bigint, text, jsonb, jsonb, uuid,
  uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.households_commit_expense_split_write_with_patch_v3(
  uuid, uuid, uuid, uuid, uuid, text, text, bigint, text, jsonb, jsonb, uuid,
  uuid, jsonb
) to service_role;

create or replace function public.households_remove_expense_split_v3(
  p_actor_user_id uuid,
  p_expense_id uuid,
  p_split_group_id uuid,
  p_target_household_id uuid,
  p_target_currency text,
  p_target_amount_cents bigint,
  p_target_account_id uuid,
  p_expected_parent jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif((select auth.jwt() ->> 'role'), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
  v_expense public.expenses%rowtype;
  v_group public.expense_split_groups%rowtype;
  v_target_account public.accounts%rowtype;
  v_initial_expense_household_id uuid;
  v_initial_group_household_id uuid;
  v_source_is_portfolio boolean := false;
  v_target_is_portfolio boolean := false;
  v_household_id uuid;
begin
  if v_role <> 'service_role' then
    raise exception 'households_remove_expense_split_v3: service role required';
  end if;
  if p_actor_user_id is null
    or p_expense_id is null
    or p_split_group_id is null
  then
    raise exception 'households_remove_expense_split_v3: identifiers are required';
  end if;
  if p_target_currency is null
    or upper(btrim(p_target_currency)) !~ '^[A-Z]{3}$'
    or p_target_amount_cents is null
    or p_target_amount_cents <= 0
  then
    raise exception 'households_remove_expense_split_v3: invalid amount or currency';
  end if;
  if p_expected_parent is null
    or jsonb_typeof(p_expected_parent) <> 'object'
    or not p_expected_parent ?& array[
      'household_id',
      'currency',
      'amount_cents',
      'split_group_id',
      'account_id'
    ]
  then
    raise exception 'households_remove_expense_split_v3: expected parent snapshot is required';
  end if;

  select expense.*
  into v_expense
  from public.expenses expense
  where expense.id = p_expense_id
    and expense.deleted_at is null;
  select split_group.*
  into v_group
  from public.expense_split_groups split_group
  where split_group.id = p_split_group_id;
  if v_expense.id is null
    or v_group.id is null
    or v_group.expense_id is distinct from p_expense_id
    or v_expense.split_group_id is distinct from p_split_group_id
  then
    raise exception 'settlement_split_group_expense_mismatch';
  end if;
  v_initial_expense_household_id := v_expense.household_id;
  v_initial_group_household_id := v_group.household_id;

  for v_household_id in
    select affected.household_id
    from (
      values
        (v_expense.household_id),
        (v_group.household_id),
        (p_target_household_id)
    ) affected(household_id)
    where affected.household_id is not null
    group by affected.household_id
    order by affected.household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  select expense.*
  into v_expense
  from public.expenses expense
  where expense.id = p_expense_id
    and expense.deleted_at is null
  for update;
  select split_group.*
  into v_group
  from public.expense_split_groups split_group
  where split_group.id = p_split_group_id
  for update;
  if v_expense.id is null
    or v_group.id is null
    or v_group.expense_id is distinct from p_expense_id
    or v_expense.split_group_id is distinct from p_split_group_id
    or v_expense.household_id is distinct from v_initial_expense_household_id
    or v_group.household_id is distinct from v_initial_group_household_id
    or v_expense.household_id is distinct from v_group.household_id
    or upper(v_expense.currency) is distinct from upper(v_group.currency)
    or abs(v_expense.amount_cents) is distinct from v_group.total_amount_cents
  then
    raise exception 'settlement_split_group_expense_changed_retry';
  end if;

  if coalesce(v_expense.household_id::text, '')
      is distinct from coalesce(p_expected_parent ->> 'household_id', '')
    or upper(coalesce(v_expense.currency, ''))
      is distinct from upper(coalesce(p_expected_parent ->> 'currency', ''))
    or v_expense.amount_cents
      is distinct from (p_expected_parent ->> 'amount_cents')::bigint
    or coalesce(v_expense.split_group_id::text, '')
      is distinct from coalesce(p_expected_parent ->> 'split_group_id', '')
    or coalesce(v_expense.account_id::text, '')
      is distinct from coalesce(p_expected_parent ->> 'account_id', '')
  then
    raise exception 'settlement_split_parent_changed_retry';
  end if;

  select coalesce(household.is_portfolio, false)
  into v_source_is_portfolio
  from public.households household
  where household.id = v_group.household_id;

  if v_source_is_portfolio then
    if v_expense.user_id is distinct from p_actor_user_id then
      raise exception 'households_remove_expense_split_v3: actor does not own portfolio expense';
    end if;
  elsif not public.is_member_of_household(
    v_group.household_id,
    p_actor_user_id
  ) then
    raise exception 'households_remove_expense_split_v3: actor not member of source household';
  end if;

  if exists (
    select 1
    from public.expense_split_lines split_line
    where split_line.split_group_id = p_split_group_id
      and split_line.is_settled is true
  ) then
    raise exception 'settlement_split_group_with_settled_lines_is_immutable';
  end if;

  if exists (
    select 1
    from public.household_settlement_event_allocations_v2 allocation
    where allocation.split_group_id = p_split_group_id
      or allocation.expense_id = p_expense_id
  ) then
    raise exception 'settlement_split_group_with_payments_cannot_be_removed';
  end if;

  if p_target_household_id is not null
    and not public.is_member_of_household(
      p_target_household_id,
      p_actor_user_id
    )
  then
    raise exception 'households_remove_expense_split_v3: actor not member of target household';
  end if;

  if p_target_household_id is null then
    if v_expense.user_id is distinct from p_actor_user_id
      and not exists (
        select 1
        from public.user_contacts contact
        where contact.id = v_expense.contact_id
          and contact.user_id = p_actor_user_id
      )
    then
      raise exception 'households_remove_expense_split_v3: actor does not own personal target expense';
    end if;
  else
    select coalesce(household.is_portfolio, false)
    into v_target_is_portfolio
    from public.households household
    where household.id = p_target_household_id;
    if not found then
      raise exception 'households_remove_expense_split_v3: target household not found';
    end if;
    if v_target_is_portfolio
      and v_expense.user_id is distinct from p_actor_user_id
    then
      raise exception 'households_remove_expense_split_v3: actor does not own portfolio target expense';
    end if;
  end if;

  if coalesce(p_target_account_id, v_expense.account_id) is not null then
    select account.*
    into v_target_account
    from public.accounts account
    where account.id = coalesce(p_target_account_id, v_expense.account_id)
    for share;

    if not found or v_target_account.is_archived then
      raise exception 'households_remove_expense_split_v3: target account is not available';
    end if;
    if upper(v_target_account.currency) is distinct from upper(btrim(p_target_currency)) then
      raise exception 'households_remove_expense_split_v3: target account currency mismatch';
    end if;
    if p_target_household_id is null then
      if v_target_account.household_id is not null
        or v_target_account.user_id is distinct from p_actor_user_id
      then
        raise exception 'households_remove_expense_split_v3: target account is outside personal scope';
      end if;
    elsif v_target_account.household_id is distinct from p_target_household_id then
      raise exception 'households_remove_expense_split_v3: target account is outside household scope';
    end if;
  end if;

  perform set_config(
    'moneko.settlement_split_write_expense_id',
    p_expense_id::text,
    true
  );
  update public.expenses expense
  set split_group_id = null,
      household_id = p_target_household_id,
      currency = upper(btrim(p_target_currency)),
      amount_cents = p_target_amount_cents,
      account_id = coalesce(p_target_account_id, expense.account_id)
  where expense.id = p_expense_id;
  perform set_config('moneko.settlement_split_write_expense_id', '', true);

  delete from public.expense_split_groups split_group
  where split_group.id = p_split_group_id;
end;
$$;

revoke all on function public.households_remove_expense_split_v3(
  uuid, uuid, uuid, uuid, text, bigint, uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.households_remove_expense_split_v3(
  uuid, uuid, uuid, uuid, text, bigint, uuid, jsonb
) to service_role;

-- Scope moves and split removals use the same atomic patch boundary as split
-- commits.  A removal rejection therefore cannot leave category, merchant, or
-- other cosmetic fields partially persisted.
create or replace function public.households_remove_expense_split_with_patch_v3(
  p_actor_user_id uuid,
  p_expense_id uuid,
  p_split_group_id uuid,
  p_target_household_id uuid,
  p_target_currency text,
  p_target_amount_cents bigint,
  p_target_account_id uuid,
  p_expected_parent jsonb,
  p_expense_patch jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(
    nullif((select auth.jwt() ->> 'role'), ''),
    nullif(current_setting('request.jwt.claim.role', true), ''),
    ''
  );
begin
  if v_role <> 'service_role' then
    raise exception 'households_remove_expense_split_with_patch_v3: service role required';
  end if;

  perform public.households_remove_expense_split_v3(
    p_actor_user_id,
    p_expense_id,
    p_split_group_id,
    p_target_household_id,
    p_target_currency,
    p_target_amount_cents,
    p_target_account_id,
    p_expected_parent
  );

  perform public.households_apply_expense_patch_v3(
    p_expense_id,
    p_expense_patch
  );
end;
$$;

revoke all on function public.households_remove_expense_split_with_patch_v3(
  uuid, uuid, uuid, uuid, text, bigint, uuid, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.households_remove_expense_split_with_patch_v3(
  uuid, uuid, uuid, uuid, text, bigint, uuid, jsonb, jsonb
) to service_role;

create or replace function public.households_prepare_settlement_event_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.currency := upper(btrim(new.currency));

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || new.household_id::text, 0)
  );

  -- Runtime callers never control causal order. Legacy rows were backfilled
  -- before this trigger was installed.
  new.settlement_ledger_seq := nextval(
    'public.household_settlement_ledger_seq'
  );

  new.cycle_boundary_event_id :=
    public.households_latest_full_settlement_boundary_v3(
      new.household_id,
      new.payer_user_id,
      new.participant_user_id,
      new.currency,
      new.settlement_ledger_seq
    );

  return new;
end;
$$;

revoke all on function public.households_prepare_settlement_event_v3()
  from public, anon, authenticated;

drop trigger if exists trg_prepare_household_settlement_event_v3
  on public.household_settlement_events;
create trigger trg_prepare_household_settlement_event_v3
before insert on public.household_settlement_events
for each row execute function public.households_prepare_settlement_event_v3();

create or replace function public.households_reject_settlement_event_rewrite_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.household_id is distinct from new.household_id
    or old.actor_user_id is distinct from new.actor_user_id
    or old.payer_user_id is distinct from new.payer_user_id
    or old.participant_user_id is distinct from new.participant_user_id
    or upper(old.currency) is distinct from upper(new.currency)
    or old.amount_cents is distinct from new.amount_cents
    or old.mode is distinct from new.mode
    or old.is_express_netting is distinct from new.is_express_netting
    or old.pair_balance_before_cents is distinct from new.pair_balance_before_cents
    or old.pair_balance_after_cents is distinct from new.pair_balance_after_cents
    or old.cleared_pair_balance is distinct from new.cleared_pair_balance
    or old.cycle_boundary_event_id is distinct from new.cycle_boundary_event_id
    or old.settlement_ledger_seq is distinct from new.settlement_ledger_seq
    or old.created_at is distinct from new.created_at
  then
    raise exception 'settlement_event_accounting_fields_are_immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.households_reject_settlement_event_rewrite_v3()
  from public, anon, authenticated;

drop trigger if exists trg_reject_settlement_event_rewrite_v3
  on public.household_settlement_events;
create trigger trg_reject_settlement_event_rewrite_v3
before update on public.household_settlement_events
for each row execute function public.households_reject_settlement_event_rewrite_v3();

create or replace function public.households_prepare_split_line_cycle_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_group public.expense_split_groups%rowtype;
  v_new_group public.expense_split_groups%rowtype;
  v_old_household_id uuid;
  v_new_household_id uuid;
  v_household_id uuid;
begin
  if tg_op = 'UPDATE'
    and old.split_group_id is not distinct from new.split_group_id
    and old.user_id is not distinct from new.user_id
    and old.amount_cents is not distinct from new.amount_cents
    and old.percentage is not distinct from new.percentage
    and old.shares is not distinct from new.shares
    and old.is_settled is not distinct from new.is_settled
  then
    return new;
  end if;

  if tg_op <> 'INSERT' then
    select split_group.*
    into v_old_group
    from public.expense_split_groups split_group
    where split_group.id = old.split_group_id;
    if found then
      v_old_household_id := v_old_group.household_id;
    end if;
  end if;

  if tg_op <> 'DELETE' then
    select split_group.*
    into v_new_group
    from public.expense_split_groups split_group
    where split_group.id = new.split_group_id;
    if not found then
      raise exception 'settlement_split_group_not_found';
    end if;
    v_new_household_id := v_new_group.household_id;
  end if;

  for v_household_id in
    select household_id
    from (
      values (v_old_household_id), (v_new_household_id)
    ) affected(household_id)
    where household_id is not null
    group by household_id
    order by household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  if pg_trigger_depth() = 1
    and tg_op <> 'INSERT'
    and coalesce(
      current_setting('moneko.settlement_split_write_expense_id', true),
      ''
    ) <> v_old_group.expense_id::text
    and exists (
      select 1
      from public.household_settlement_finalized_split_groups finalized
      where finalized.split_group_id = old.split_group_id
    )
  then
    raise exception 'settlement_split_lines_require_atomic_write';
  end if;

  if pg_trigger_depth() = 1
    and tg_op <> 'DELETE'
    and coalesce(
      current_setting('moneko.settlement_split_write_expense_id', true),
      ''
    ) <> v_new_group.expense_id::text
    and exists (
      select 1
      from public.household_settlement_finalized_split_groups finalized
      where finalized.split_group_id = new.split_group_id
    )
  then
    raise exception 'settlement_split_lines_require_atomic_write';
  end if;

  if v_old_household_id is not null then
    delete from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id = old.split_group_id;
  end if;

  if v_new_household_id is not null
    and (
      tg_op = 'INSERT'
      or old.split_group_id is distinct from new.split_group_id
    )
  then
    delete from public.household_settlement_finalized_split_groups finalized
    where finalized.split_group_id = new.split_group_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.settlement_ledger_seq := nextval(
    'public.household_settlement_ledger_seq'
  );
  new.cycle_boundary_event_id := case
    when v_new_group.payer_user_id = new.user_id then null
    else public.households_latest_full_settlement_boundary_v3(
      v_new_group.household_id,
      v_new_group.payer_user_id,
      new.user_id,
      v_new_group.currency,
      new.settlement_ledger_seq
    )
  end;

  return new;
end;
$$;

revoke all on function public.households_prepare_split_line_cycle_v3()
  from public, anon, authenticated;

drop trigger if exists trg_prepare_split_line_cycle_v3
  on public.expense_split_lines;
create trigger trg_prepare_split_line_cycle_v3
before insert or delete or update of
  split_group_id,
  user_id,
  amount_cents,
  percentage,
  shares,
  is_settled
on public.expense_split_lines
for each row execute function public.households_prepare_split_line_cycle_v3();

-- Authenticated split editors retain RLS-mediated UPDATE access to line rows,
-- but causal order is server-owned. Material edits pass through the prepare
-- trigger above, which overwrites caller-supplied causal values. Causal-only
-- client rewrites are rejected. Nested updates emitted by the authoritative
-- group/expense reclassification triggers below are allowed.
create or replace function public.households_reject_split_line_causal_rewrite_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if old.id is distinct from new.id then
    raise exception 'settlement_split_line_id_is_immutable';
  end if;

  if old.settlement_ledger_seq is distinct from new.settlement_ledger_seq
    or old.cycle_boundary_event_id is distinct from new.cycle_boundary_event_id
  then
    if old.split_group_id is not distinct from new.split_group_id
      and old.user_id is not distinct from new.user_id
      and old.amount_cents is not distinct from new.amount_cents
      and old.percentage is not distinct from new.percentage
      and old.shares is not distinct from new.shares
      and old.is_settled is not distinct from new.is_settled
    then
      raise exception 'settlement_split_line_causal_fields_are_server_managed';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.households_reject_split_line_causal_rewrite_v3()
  from public, anon, authenticated;

drop trigger if exists trg_reject_split_line_causal_rewrite_v3
  on public.expense_split_lines;
create trigger trg_reject_split_line_causal_rewrite_v3
before update on public.expense_split_lines
for each row execute function public.households_reject_split_line_causal_rewrite_v3();

create or replace function public.households_reclassify_split_group_lines_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.household_id is not distinct from new.household_id
    and old.payer_user_id is not distinct from new.payer_user_id
    and upper(old.currency) is not distinct from upper(new.currency)
  then
    return new;
  end if;

  -- The BEFORE group guard acquired every affected household lock in
  -- deterministic order and marked the multi-statement write incomplete.
  update public.expense_split_lines split_line
  set settlement_ledger_seq = nextval(
        'public.household_settlement_ledger_seq'
      ),
      cycle_boundary_event_id = case
        when new.payer_user_id = split_line.user_id then null
        else public.households_latest_full_settlement_boundary_v3(
          new.household_id,
          new.payer_user_id,
          split_line.user_id,
          new.currency,
          null
        )
      end
  where split_line.split_group_id = new.id;

  return new;
end;
$$;

revoke all on function public.households_reclassify_split_group_lines_v3()
  from public, anon, authenticated;

drop trigger if exists trg_reclassify_split_group_lines_v3
  on public.expense_split_groups;
create trigger trg_reclassify_split_group_lines_v3
after update of household_id, payer_user_id, currency
on public.expense_split_groups
for each row execute function public.households_reclassify_split_group_lines_v3();

create or replace function public.households_lock_expense_visibility_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household_id uuid;
begin
  if old.deleted_at is not distinct from new.deleted_at then
    return new;
  end if;

  for v_household_id in
    select household_id
    from (
      select old.household_id
      union
      select new.household_id
      union
      select split_group.household_id
      from public.expense_split_groups split_group
      where split_group.expense_id = old.id
    ) affected(household_id)
    where household_id is not null
    order by household_id::text
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || v_household_id::text, 0)
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.households_lock_expense_visibility_v3()
  from public, anon, authenticated;

drop trigger if exists trg_lock_expense_visibility_v3 on public.expenses;
create trigger trg_lock_expense_visibility_v3
before update of deleted_at on public.expenses
for each row execute function public.households_lock_expense_visibility_v3();

create or replace function public.households_reclassify_expense_visibility_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is not distinct from new.deleted_at then
    return new;
  end if;

  if new.household_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('household:' || new.household_id::text, 0)
    );
  end if;

  update public.expense_split_lines split_line
  set settlement_ledger_seq = nextval(
        'public.household_settlement_ledger_seq'
      ),
      cycle_boundary_event_id = case
        when split_group.payer_user_id = split_line.user_id then null
        else public.households_latest_full_settlement_boundary_v3(
          split_group.household_id,
          split_group.payer_user_id,
          split_line.user_id,
          split_group.currency,
          null
        )
      end
  from public.expense_split_groups split_group
  where split_group.expense_id = new.id
    and split_line.split_group_id = split_group.id;

  return new;
end;
$$;

revoke all on function public.households_reclassify_expense_visibility_v3()
  from public, anon, authenticated;

drop trigger if exists trg_reclassify_expense_visibility_v3
  on public.expenses;
create trigger trg_reclassify_expense_visibility_v3
after update of deleted_at on public.expenses
for each row execute function public.households_reclassify_expense_visibility_v3();

create or replace function public.households_capture_full_settlement_cycle_v3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cleared_pair_balance is not true then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || new.household_id::text, 0)
  );

  insert into public.household_settlement_cycle_baseline_lines (
    boundary_event_id,
    household_id,
    split_line_id,
    split_group_id,
    expense_id,
    payer_user_id,
    participant_user_id,
    currency,
    amount_cents,
    expense_date,
    expense_description,
    expense_category,
    expense_raw_text,
    expense_type
  )
  select
    new.id,
    new.household_id,
    split_line.id,
    split_group.id,
    split_group.expense_id,
    split_group.payer_user_id,
    split_line.user_id,
    upper(split_group.currency),
    abs(coalesce(split_line.amount_cents, 0)),
    coalesce(
      expense.date::timestamp at time zone 'UTC',
      split_group.created_at
    ),
    split_group.description,
    expense.category::text,
    expense.raw_text,
    expense.type::text
  from public.expense_split_lines split_line
  join public.expense_split_groups split_group
    on split_group.id = split_line.split_group_id
  join public.household_settlement_finalized_split_groups finalized
    on finalized.split_group_id = split_group.id
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  where split_group.household_id = new.household_id
    and upper(split_group.currency) = upper(new.currency)
    and split_line.is_settled = false
    and split_line.settlement_ledger_seq < new.settlement_ledger_seq
    and split_group.payer_user_id <> split_line.user_id
    and (
      (
        split_group.payer_user_id = new.payer_user_id
        and split_line.user_id = new.participant_user_id
      )
      or
      (
        split_group.payer_user_id = new.participant_user_id
        and split_line.user_id = new.payer_user_id
      )
    )
  on conflict (boundary_event_id, split_line_id) do update
  set amount_cents = excluded.amount_cents,
      expense_date = excluded.expense_date,
      expense_description = excluded.expense_description,
      expense_category = excluded.expense_category,
      expense_raw_text = excluded.expense_raw_text,
      expense_type = excluded.expense_type,
      captured_at = clock_timestamp();

  return new;
end;
$$;

revoke all on function public.households_capture_full_settlement_cycle_v3()
  from public, anon, authenticated;

drop trigger if exists trg_capture_full_settlement_cycle_v3
  on public.household_settlement_events;
create trigger trg_capture_full_settlement_cycle_v3
after insert on public.household_settlement_events
for each row execute function public.households_capture_full_settlement_cycle_v3();

-- Allocation remains an audit/detail aid; the canonical balance continues to
-- be live obligations minus immutable settlement events.  Restricting by the
-- explicit cycle and causal sequence prevents an older/full event from ever
-- consuming a later or backdated obligation.
create or replace function public.households_allocate_settlement_event_v2(
  p_event_id uuid,
  p_allocation_source text default 'runtime'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.household_settlement_events%rowtype;
  v_remaining bigint := 0;
  v_allocated bigint := 0;
  v_order integer := 0;
  v_candidate record;
begin
  select event.*
  into v_event
  from public.household_settlement_events event
  where event.id = p_event_id;

  if not found then
    return 0;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || v_event.household_id::text, 0)
  );

  -- Allocation is an immutable event-time audit. Re-running an older event
  -- must never delete/rebuild it on top of allocations from later events.
  select status.allocated_total_cents
  into v_allocated
  from public.household_settlement_event_allocation_status_v2 status
  where status.settlement_event_id = p_event_id;

  if found then
    return v_allocated;
  end if;

  select coalesce(sum(allocation.allocated_amount_cents), 0)::bigint
  into v_allocated
  from public.household_settlement_event_allocations_v2 allocation
  where allocation.settlement_event_id = p_event_id;

  if v_allocated > 0 then
    insert into public.household_settlement_event_allocation_status_v2 (
      settlement_event_id,
      allocated_total_cents,
      allocation_source,
      processed_at
    ) values (
      p_event_id,
      v_allocated,
      'recovered_existing_audit',
      clock_timestamp()
    )
    on conflict (settlement_event_id) do nothing;
    return v_allocated;
  end if;

  v_allocated := 0;

  v_remaining := abs(coalesce(v_event.amount_cents, 0));

  for v_candidate in
    select
      split_line.id as split_line_id,
      split_group.id as split_group_id,
      split_group.expense_id,
      greatest(
        abs(coalesce(split_line.amount_cents, 0))
          - coalesce(baseline.amount_cents, 0)
          - coalesce(existing.allocated_cents, 0),
        0
      )::bigint as remaining_cents
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    join public.household_settlement_finalized_split_groups finalized
      on finalized.split_group_id = split_group.id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    left join public.household_settlement_cycle_baseline_lines baseline
      on baseline.boundary_event_id = v_event.cycle_boundary_event_id
      and baseline.split_line_id = split_line.id
      and baseline.payer_user_id = split_group.payer_user_id
      and baseline.participant_user_id = split_line.user_id
      and upper(baseline.currency) = upper(split_group.currency)
    left join lateral (
      select coalesce(sum(allocation.allocated_amount_cents), 0) as allocated_cents
      from public.household_settlement_event_allocations_v2 allocation
      join public.household_settlement_events prior_event
        on prior_event.id = allocation.settlement_event_id
      where allocation.split_line_id = split_line.id
        and allocation.settlement_event_id <> p_event_id
        and prior_event.household_id = v_event.household_id
        and upper(prior_event.currency) = upper(v_event.currency)
        and prior_event.payer_user_id = v_event.payer_user_id
        and prior_event.participant_user_id = v_event.participant_user_id
        and prior_event.cycle_boundary_event_id
          is not distinct from v_event.cycle_boundary_event_id
        and prior_event.settlement_ledger_seq < v_event.settlement_ledger_seq
    ) existing on true
    where split_group.household_id = v_event.household_id
      and upper(split_group.currency) = upper(v_event.currency)
      and split_group.payer_user_id = v_event.payer_user_id
      and split_line.user_id = v_event.participant_user_id
      and split_line.is_settled = false
      and abs(coalesce(split_line.amount_cents, 0)) > 0
      and split_line.settlement_ledger_seq < v_event.settlement_ledger_seq
      and split_line.cycle_boundary_event_id
        is not distinct from v_event.cycle_boundary_event_id
    order by
      split_line.settlement_ledger_seq asc,
      coalesce(
        expense.date::timestamp at time zone 'UTC',
        split_group.created_at
      ) asc,
      split_line.id asc
  loop
    exit when v_remaining <= 0;
    if v_candidate.remaining_cents <= 0 then
      continue;
    end if;

    v_order := v_order + 1;

    insert into public.household_settlement_event_allocations_v2 (
      household_id,
      settlement_event_id,
      split_group_id,
      split_line_id,
      expense_id,
      currency,
      payer_user_id,
      participant_user_id,
      allocated_amount_cents,
      allocation_order,
      allocation_source
    ) values (
      v_event.household_id,
      v_event.id,
      v_candidate.split_group_id,
      v_candidate.split_line_id,
      v_candidate.expense_id,
      upper(v_event.currency),
      v_event.payer_user_id,
      v_event.participant_user_id,
      least(v_remaining, v_candidate.remaining_cents),
      v_order,
      coalesce(nullif(btrim(p_allocation_source), ''), 'runtime')
    );

    v_allocated := v_allocated
      + least(v_remaining, v_candidate.remaining_cents);
    v_remaining := v_remaining
      - least(v_remaining, v_candidate.remaining_cents);
  end loop;

  insert into public.household_settlement_event_allocation_status_v2 (
    settlement_event_id,
    allocated_total_cents,
    allocation_source,
    processed_at
  ) values (
    v_event.id,
    v_allocated,
    coalesce(nullif(btrim(p_allocation_source), ''), 'runtime'),
    clock_timestamp()
  )
  on conflict (settlement_event_id)
  do update set
    allocated_total_cents = excluded.allocated_total_cents,
    allocation_source = excluded.allocation_source,
    processed_at = excluded.processed_at;

  return v_allocated;
end;
$$;

revoke all on function public.households_allocate_settlement_event_v2(uuid, text)
  from public, anon, authenticated;

-- Pairwise balances are the settlement feature's public source of truth, not
-- merely an internal helper. Make them fail closed too, so an older mobile
-- client cannot render or act on a group between multi-statement write steps.
create or replace function public.households_get_pairwise_settlement_balances_v2(
  p_household_id uuid,
  p_currency text default null
)
returns table (
  other_user_id uuid,
  currency text,
  split_to_cents bigint,
  split_from_cents bigint,
  paid_to_cents bigint,
  paid_from_cents bigint,
  net_cents bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_currency text;
begin
  if v_actor_id is null then
    raise exception 'households_get_pairwise_settlement_balances_v2: auth.uid() is null';
  end if;
  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_get_pairwise_settlement_balances_v2: actor not member of household';
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select upper(household.currency)
    into v_currency
    from public.households household
    where household.id = p_household_id;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || p_household_id::text, 0)
  );

  if exists (
    select 1
    from public.expense_split_groups split_group
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and upper(split_group.currency) = v_currency
      and not exists (
        select 1
        from public.household_settlement_finalized_split_groups finalized
        where finalized.split_group_id = split_group.id
      )
  ) then
    raise exception 'settlement_data_incomplete_split_group';
  end if;

  return query
  with deltas as (
    select
      split_group.payer_user_id as other_user_id,
      abs(coalesce(split_line.amount_cents, 0)) as split_to_delta,
      0::bigint as split_from_delta,
      0::bigint as paid_to_delta,
      0::bigint as paid_from_delta
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and split_line.is_settled = false
      and split_group.payer_user_id <> v_actor_id
      and split_line.user_id = v_actor_id
      and upper(split_group.currency) = v_currency

    union all

    select
      split_line.user_id,
      0::bigint,
      abs(coalesce(split_line.amount_cents, 0)),
      0::bigint,
      0::bigint
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and split_line.is_settled = false
      and split_group.payer_user_id = v_actor_id
      and split_line.user_id <> v_actor_id
      and upper(split_group.currency) = v_currency

    union all

    select
      settlement.payer_user_id,
      0::bigint,
      0::bigint,
      abs(coalesce(settlement.amount_cents, 0)),
      0::bigint
    from public.household_settlement_events settlement
    where settlement.household_id = p_household_id
      and settlement.participant_user_id = v_actor_id
      and upper(settlement.currency) = v_currency

    union all

    select
      settlement.participant_user_id,
      0::bigint,
      0::bigint,
      0::bigint,
      abs(coalesce(settlement.amount_cents, 0))
    from public.household_settlement_events settlement
    where settlement.household_id = p_household_id
      and settlement.payer_user_id = v_actor_id
      and upper(settlement.currency) = v_currency
  )
  select
    delta.other_user_id,
    v_currency,
    coalesce(sum(delta.split_to_delta), 0)::bigint,
    coalesce(sum(delta.split_from_delta), 0)::bigint,
    coalesce(sum(delta.paid_to_delta), 0)::bigint,
    coalesce(sum(delta.paid_from_delta), 0)::bigint,
    (
      (coalesce(sum(delta.split_to_delta), 0)
        - coalesce(sum(delta.split_from_delta), 0))
      - (coalesce(sum(delta.paid_to_delta), 0)
        - coalesce(sum(delta.paid_from_delta), 0))
    )::bigint
  from deltas delta
  where delta.other_user_id is not null
    and delta.other_user_id <> v_actor_id
  group by delta.other_user_id
  having
    coalesce(sum(delta.split_to_delta), 0) <> 0
    or coalesce(sum(delta.split_from_delta), 0) <> 0
    or coalesce(sum(delta.paid_to_delta), 0) <> 0
    or coalesce(sum(delta.paid_from_delta), 0) <> 0
  order by abs(
    (coalesce(sum(delta.split_to_delta), 0)
      - coalesce(sum(delta.split_from_delta), 0))
    - (coalesce(sum(delta.paid_to_delta), 0)
      - coalesce(sum(delta.paid_from_delta), 0))
  ) desc,
  delta.other_user_id asc;
end;
$$;

revoke all on function public.households_get_pairwise_settlement_balances_v2(
  uuid, text
) from public, anon;
grant execute on function public.households_get_pairwise_settlement_balances_v2(
  uuid, text
) to authenticated;

create or replace function public.households_settle_amount_and_notify_v3_internal(
  p_household_id uuid,
  p_member_user_id uuid,
  p_mode text,
  p_amount_cents bigint,
  p_currency text default null,
  p_settlement_note text default null,
  p_expected_snapshot_token text default null,
  p_client_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_currency text;
  v_note text;
  v_expected_snapshot_token text;
  v_client_mutation_id text;
  v_is_idempotent_request boolean := false;
  v_request public.household_settlement_requests_v2%rowtype;
  v_snapshot jsonb;
  v_current_snapshot_token text;
  v_result_snapshot_token text;
  v_result jsonb;
  v_net_before bigint := 0;
  v_net_after bigint := 0;
  v_canonical_before bigint := 0;
  v_canonical_after bigint := 0;
  v_max_pay bigint := 0;
  v_pay_cents bigint := 0;
  v_event_payer_id uuid;
  v_event_participant_id uuid;
  v_event_id uuid;
  v_payload jsonb;
begin
  if v_actor_id is null then
    raise exception 'households_settle_amount_and_notify: auth.uid() is null';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'households_settle_amount_and_notify: p_amount_cents must be > 0';
  end if;
  if p_member_user_id = v_actor_id then
    raise exception 'households_settle_amount_and_notify: member must be another user';
  end if;
  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_settle_amount_and_notify: actor not member of household';
  end if;
  if not public.is_member_of_household(p_household_id, p_member_user_id) then
    raise exception 'households_settle_amount_and_notify: member not member of household';
  end if;
  if p_mode not in ('to_member', 'from_member', 'both') then
    raise exception 'households_settle_amount_and_notify: invalid mode %', p_mode;
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select upper(household.currency)
    into v_currency
    from public.households household
    where household.id = p_household_id;
  end if;
  if v_currency is null or v_currency = '' then
    raise exception 'households_settle_amount_and_notify: currency is required';
  end if;

  v_note := nullif(btrim(coalesce(p_settlement_note, '')), '');

  if p_expected_snapshot_token is not null
    or p_client_mutation_id is not null
  then
    v_expected_snapshot_token := nullif(
      btrim(coalesce(p_expected_snapshot_token, '')),
      ''
    );
    v_client_mutation_id := nullif(
      btrim(coalesce(p_client_mutation_id, '')),
      ''
    );
    if v_expected_snapshot_token is null
      or v_client_mutation_id is null
    then
      raise exception 'households_settle_amount_and_notify: snapshot token and client mutation id are both required';
    end if;
    if length(v_expected_snapshot_token) > 200
      or length(v_client_mutation_id) > 200
    then
      raise exception 'households_settle_amount_and_notify: snapshot token or client mutation id is too long';
    end if;
    if v_expected_snapshot_token !~ '^v1:[0-9a-f]{64}$'
      or v_currency !~ '^[A-Z]{3}$'
    then
      raise exception 'households_settle_amount_and_notify: invalid strict settlement identity';
    end if;
    v_is_idempotent_request := true;

    -- Fixed lock order: mutation key first, then household. This serializes a
    -- malicious same-key/different-household replay without introducing a
    -- cross-household advisory-lock cycle.
    perform pg_advisory_xact_lock(
      hashtextextended(
        'household-settlement-request:' || v_actor_id::text || ':' ||
          v_client_mutation_id,
        0
      )
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || p_household_id::text, 0)
  );

  if v_is_idempotent_request then
    select request.*
    into v_request
    from public.household_settlement_requests_v2 request
    where request.actor_user_id = v_actor_id
      and request.client_mutation_id = v_client_mutation_id;

    if found then
      if v_request.household_id is distinct from p_household_id
        or v_request.member_user_id is distinct from p_member_user_id
        or v_request.mode is distinct from p_mode
        or v_request.requested_amount_cents is distinct from p_amount_cents
        or upper(v_request.currency) is distinct from v_currency
        or v_request.settlement_note is distinct from v_note
        or v_request.expected_snapshot_token
          is distinct from v_expected_snapshot_token
      then
        raise exception 'settlement_idempotency_key_reused';
      end if;

      return v_request.result || jsonb_build_object('replayed', true);
    end if;
  end if;

  -- Never settle while a relevant split is between PostgREST write steps.
  -- The private marker is the durable readiness assertion: legacy markers
  -- preserve audited historical ledger facts, while all new markers are only
  -- published by the strict atomic writer/guard path.
  if exists (
    select 1
    from public.expense_split_groups split_group
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and upper(split_group.currency) = v_currency
      and split_group.payer_user_id in (v_actor_id, p_member_user_id)
      and not exists (
        select 1
        from public.household_settlement_finalized_split_groups finalized
        where finalized.split_group_id = split_group.id
      )
  ) then
    raise exception 'settlement_data_incomplete_split_group';
  end if;

  if v_is_idempotent_request then
    v_snapshot := public.households_build_settlement_snapshot_v3(
      p_household_id,
      v_actor_id,
      p_member_user_id,
      v_currency
    );
    v_net_before := coalesce((v_snapshot ->> 'net_cents')::bigint, 0);
    v_current_snapshot_token := v_snapshot ->> 'snapshot_token';

    if v_current_snapshot_token is distinct from v_expected_snapshot_token then
      v_result := jsonb_build_object(
        'status', 'snapshot_conflict',
        'reason', 'snapshot_changed',
        'replayed', false,
        'client_mutation_id', v_client_mutation_id,
        'settlement_event_id', null,
        'requested_amount_cents', p_amount_cents,
        'applied_amount_cents', 0,
        'pair_balance_before_cents', v_net_before,
        'pair_balance_after_cents', v_net_before,
        'current_net_cents', v_net_before,
        'cleared_pair_balance', v_net_before = 0,
        'result_snapshot_token', v_current_snapshot_token,
        'result_count', 0
      );
      insert into public.household_settlement_requests_v2 (
        actor_user_id,
        client_mutation_id,
        household_id,
        member_user_id,
        mode,
        requested_amount_cents,
        currency,
        settlement_note,
        expected_snapshot_token,
        terminal_status,
        settlement_event_id,
        result
      ) values (
        v_actor_id,
        v_client_mutation_id,
        p_household_id,
        p_member_user_id,
        p_mode,
        p_amount_cents,
        v_currency,
        v_note,
        v_expected_snapshot_token,
        'snapshot_conflict',
        null,
        v_result
      );
      return v_result;
    end if;
  else
    select balance.net_cents
    into v_net_before
    from public.households_get_pairwise_settlement_balances_v2(
      p_household_id,
      v_currency
    ) balance
    where balance.other_user_id = p_member_user_id;
    v_net_before := coalesce(v_net_before, 0);
  end if;

  if p_mode = 'both' then
    if v_net_before > 0 then
      v_event_payer_id := p_member_user_id;
      v_event_participant_id := v_actor_id;
      v_max_pay := v_net_before;
    elsif v_net_before < 0 then
      v_event_payer_id := v_actor_id;
      v_event_participant_id := p_member_user_id;
      v_max_pay := -v_net_before;
    end if;
  elsif p_mode = 'to_member' then
    if v_net_before > 0 then
      v_event_payer_id := p_member_user_id;
      v_event_participant_id := v_actor_id;
      v_max_pay := v_net_before;
    end if;
  else
    if v_net_before < 0 then
      v_event_payer_id := v_actor_id;
      v_event_participant_id := p_member_user_id;
      v_max_pay := -v_net_before;
    end if;
  end if;

  if v_max_pay <= 0 then
    v_result := jsonb_build_object(
      'status', 'nothing_to_settle',
      'reason', 'direction_has_no_balance',
      'replayed', false,
      'client_mutation_id', v_client_mutation_id,
      'settlement_event_id', null,
      'requested_amount_cents', p_amount_cents,
      'applied_amount_cents', 0,
      'pair_balance_before_cents', v_net_before,
      'pair_balance_after_cents', v_net_before,
      'current_net_cents', v_net_before,
      'cleared_pair_balance', v_net_before = 0,
      'result_snapshot_token', v_current_snapshot_token,
      'result_count', 0
    );
    if v_is_idempotent_request then
      insert into public.household_settlement_requests_v2 (
        actor_user_id,
        client_mutation_id,
        household_id,
        member_user_id,
        mode,
        requested_amount_cents,
        currency,
        settlement_note,
        expected_snapshot_token,
        terminal_status,
        settlement_event_id,
        result
      ) values (
        v_actor_id,
        v_client_mutation_id,
        p_household_id,
        p_member_user_id,
        p_mode,
        p_amount_cents,
        v_currency,
        v_note,
        v_expected_snapshot_token,
        'nothing_to_settle',
        null,
        v_result
      );
    end if;
    return v_result;
  end if;

  -- Preserve the legacy server-side clamp for older clients and same-moment
  -- balance shrinkage. The strict token-bound client path never clamps: a
  -- changed/invalid amount is a terminal conflict requiring fresh consent.
  if v_is_idempotent_request and p_amount_cents > v_max_pay then
    v_result := jsonb_build_object(
      'status', 'snapshot_conflict',
      'reason', 'amount_exceeds_balance',
      'replayed', false,
      'client_mutation_id', v_client_mutation_id,
      'settlement_event_id', null,
      'requested_amount_cents', p_amount_cents,
      'applied_amount_cents', 0,
      'pair_balance_before_cents', v_net_before,
      'pair_balance_after_cents', v_net_before,
      'current_net_cents', v_net_before,
      'cleared_pair_balance', false,
      'result_snapshot_token', v_current_snapshot_token,
      'result_count', 0
    );
    insert into public.household_settlement_requests_v2 (
      actor_user_id,
      client_mutation_id,
      household_id,
      member_user_id,
      mode,
      requested_amount_cents,
      currency,
      settlement_note,
      expected_snapshot_token,
      terminal_status,
      settlement_event_id,
      result
    ) values (
      v_actor_id,
      v_client_mutation_id,
      p_household_id,
      p_member_user_id,
      p_mode,
      p_amount_cents,
      v_currency,
      v_note,
      v_expected_snapshot_token,
      'snapshot_conflict',
      null,
      v_result
    );
    return v_result;
  end if;

  v_pay_cents := case
    when v_is_idempotent_request then p_amount_cents
    else least(p_amount_cents, v_max_pay)
  end;
  if v_pay_cents <= 0 then
    raise exception 'households_settle_amount_and_notify: computed payment must be positive';
  end if;

  v_net_after := case
    when v_net_before > 0 then v_net_before - v_pay_cents
    else v_net_before + v_pay_cents
  end;
  v_canonical_before := case
    when v_actor_id::text < p_member_user_id::text then v_net_before
    else -v_net_before
  end;
  v_canonical_after := case
    when v_actor_id::text < p_member_user_id::text then v_net_after
    else -v_net_after
  end;

  insert into public.household_settlement_events (
    household_id,
    actor_user_id,
    payer_user_id,
    participant_user_id,
    currency,
    amount_cents,
    mode,
    is_express_netting,
    settlement_note,
    pair_balance_before_cents,
    pair_balance_after_cents,
    cleared_pair_balance
  ) values (
    p_household_id,
    v_actor_id,
    v_event_payer_id,
    v_event_participant_id,
    v_currency,
    v_pay_cents,
    p_mode,
    p_mode = 'both',
    v_note,
    v_canonical_before,
    v_canonical_after,
    v_net_after = 0
  )
  returning id into v_event_id;

  if p_mode = 'both' then
    v_payload := jsonb_build_object(
      'from_user_id', v_actor_id,
      'to_user_id', p_member_user_id,
      'lines_settled_current_user_owes', 0,
      'lines_settled_member_owes', 0,
      'amounts_before', jsonb_build_object(
        'you_owe_cents', greatest(v_net_before, 0),
        'you_are_owed_cents', greatest(-v_net_before, 0),
        'net_pay_cents', v_pay_cents
      ),
      'actor_name', null,
      'currency', v_currency
    );
  else
    v_payload := jsonb_build_object(
      'from_user_id', v_actor_id,
      'to_user_id', p_member_user_id,
      'amount_cents', v_pay_cents,
      'line_count', 1,
      'actor_name', null,
      'currency', v_currency
    );
  end if;

  insert into public.notification_events (
    household_id,
    user_id,
    event_type,
    payload
  ) values (
    p_household_id,
    p_member_user_id,
    'split_settled',
    v_payload
  );

  if v_is_idempotent_request then
    v_snapshot := public.households_build_settlement_snapshot_v3(
      p_household_id,
      v_actor_id,
      p_member_user_id,
      v_currency
    );
    v_result_snapshot_token := v_snapshot ->> 'snapshot_token';
  end if;

  v_result := jsonb_build_object(
    'status', 'applied',
    'replayed', false,
    'client_mutation_id', v_client_mutation_id,
    'settlement_event_id', v_event_id,
    'requested_amount_cents', p_amount_cents,
    'applied_amount_cents', v_pay_cents,
    'pair_balance_before_cents', v_net_before,
    'pair_balance_after_cents', v_net_after,
    'current_net_cents', v_net_after,
    'cleared_pair_balance', v_net_after = 0,
    'result_snapshot_token', v_result_snapshot_token,
    'result_count', 1
  );

  if v_is_idempotent_request then
    insert into public.household_settlement_requests_v2 (
      actor_user_id,
      client_mutation_id,
      household_id,
      member_user_id,
      mode,
      requested_amount_cents,
      currency,
      settlement_note,
      expected_snapshot_token,
      terminal_status,
      settlement_event_id,
      result
    ) values (
      v_actor_id,
      v_client_mutation_id,
      p_household_id,
      p_member_user_id,
      p_mode,
      p_amount_cents,
      v_currency,
      v_note,
      v_expected_snapshot_token,
      'applied',
      v_event_id,
      v_result
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.households_settle_amount_and_notify_v3_internal(
  uuid, uuid, text, bigint, text, text, text, text
) from public, anon, authenticated;

-- Backward-compatible legacy endpoint. Existing clients retain the original
-- integer result and server-side clamp; current clients use the strict V2 RPC.
create or replace function public.households_settle_amount_and_notify(
  p_household_id uuid,
  p_member_user_id uuid,
  p_mode text,
  p_amount_cents bigint,
  p_currency text default null,
  p_settlement_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  v_result := public.households_settle_amount_and_notify_v3_internal(
    p_household_id,
    p_member_user_id,
    p_mode,
    p_amount_cents,
    p_currency,
    p_settlement_note,
    null,
    null
  );
  return coalesce((v_result ->> 'result_count')::integer, 0);
end;
$$;

create or replace function public.households_settle_amount_and_notify_v2(
  p_household_id uuid,
  p_member_user_id uuid,
  p_mode text,
  p_amount_cents bigint,
  p_currency text,
  p_expected_snapshot_token text,
  p_client_mutation_id text,
  p_settlement_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.households_settle_amount_and_notify_v3_internal(
    p_household_id,
    p_member_user_id,
    p_mode,
    p_amount_cents,
    p_currency,
    p_settlement_note,
    p_expected_snapshot_token,
    p_client_mutation_id
  );
end;
$$;

create or replace function public.households_settle_all_debts_and_notify(
  p_household_id uuid,
  p_member_user_id uuid,
  p_mode text,
  p_you_owe_cents_before integer default 0,
  p_you_are_owed_cents_before integer default 0,
  p_currency text default null,
  p_settlement_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.households_settle_amount_and_notify(
    p_household_id,
    p_member_user_id,
    p_mode,
    9223372036854775807::bigint,
    p_currency,
    p_settlement_note
  );
end;
$$;

revoke all on function public.households_settle_amount_and_notify(
  uuid, uuid, text, bigint, text, text
) from public, anon;
revoke all on function public.households_settle_amount_and_notify_v2(
  uuid, uuid, text, bigint, text, text, text, text
) from public, anon;
revoke all on function public.households_settle_all_debts_and_notify(
  uuid, uuid, text, integer, integer, text, text
) from public, anon;

grant execute on function public.households_settle_amount_and_notify(
  uuid, uuid, text, bigint, text, text
) to authenticated;
grant execute on function public.households_settle_amount_and_notify_v2(
  uuid, uuid, text, bigint, text, text, text, text
) to authenticated;
grant execute on function public.households_settle_all_debts_and_notify(
  uuid, uuid, text, integer, integer, text, text
) to authenticated;

-- Preserve the previously shipped projection exactly for legacy histories
-- where no immutable event-time balance can prove a full cycle boundary.
alter function public.households_get_settlement_breakdown_v2(uuid, uuid, text)
  rename to households_get_settlement_breakdown_legacy_projection_v2;

revoke all on function public.households_get_settlement_breakdown_legacy_projection_v2(
  uuid, uuid, text
) from public, anon, authenticated;

create function public.households_get_settlement_breakdown_v2(
  p_household_id uuid,
  p_other_user_id uuid,
  p_currency text default null
)
returns table (
  direction text,
  expense_id uuid,
  split_group_id uuid,
  split_line_id uuid,
  expense_date timestamptz,
  expense_description text,
  expense_category text,
  expense_raw_text text,
  expense_type text,
  total_amount_cents bigint,
  remaining_amount_cents bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_currency text;
  v_boundary_event_id uuid;
  v_full_boundary_ledger_seq bigint;
  v_full_boundary_created_at timestamptz;
  v_cutover_id uuid;
  v_cutover_ledger_seq bigint;
  v_cutover_created_at timestamptz;
  v_boundary_kind text := 'none';
  v_boundary_ledger_seq bigint;
  v_boundary_display_date timestamptz;
  v_canonical_net bigint := 0;
begin
  if v_actor_id is null then
    raise exception 'households_get_settlement_breakdown_v2: auth.uid() is null';
  end if;
  if p_other_user_id = v_actor_id then
    raise exception 'households_get_settlement_breakdown_v2: other member must differ from actor';
  end if;
  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_get_settlement_breakdown_v2: actor not member of household';
  end if;
  if not public.is_member_of_household(p_household_id, p_other_user_id) then
    raise exception 'households_get_settlement_breakdown_v2: other member not in household';
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select upper(household.currency)
    into v_currency
    from public.households household
    where household.id = p_household_id;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || p_household_id::text, 0)
  );

  if exists (
    select 1
    from public.expense_split_groups split_group
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and upper(split_group.currency) = v_currency
      and split_group.payer_user_id in (v_actor_id, p_other_user_id)
      and not exists (
        select 1
        from public.household_settlement_finalized_split_groups finalized
        where finalized.split_group_id = split_group.id
      )
  ) then
    raise exception 'settlement_data_incomplete_split_group';
  end if;

  v_boundary_event_id := public.households_latest_full_settlement_boundary_v3(
    p_household_id,
    v_actor_id,
    p_other_user_id,
    v_currency,
    null
  );

  if v_boundary_event_id is not null then
    select event.settlement_ledger_seq, event.created_at
    into v_full_boundary_ledger_seq, v_full_boundary_created_at
    from public.household_settlement_events event
    where event.id = v_boundary_event_id;
  end if;

  select
    cutover.id,
    cutover.cutover_ledger_seq,
    cutover.created_at
  into
    v_cutover_id,
    v_cutover_ledger_seq,
    v_cutover_created_at
  from public.household_settlement_legacy_cutovers_v3 cutover
  where cutover.household_id = p_household_id
    and cutover.user_a_id = case
      when v_actor_id::text < p_other_user_id::text
        then v_actor_id
      else p_other_user_id
    end
    and cutover.user_b_id = case
      when v_actor_id::text < p_other_user_id::text
        then p_other_user_id
      else v_actor_id
    end
    and cutover.currency = v_currency;

  if v_full_boundary_ledger_seq is not null
    and (
      v_cutover_ledger_seq is null
      or v_full_boundary_ledger_seq > v_cutover_ledger_seq
    )
  then
    v_boundary_kind := 'full';
    v_boundary_ledger_seq := v_full_boundary_ledger_seq;
    v_boundary_display_date := v_full_boundary_created_at;
  elsif v_cutover_ledger_seq is not null then
    v_boundary_kind := 'legacy_cutover';
    v_boundary_event_id := null;
    v_boundary_ledger_seq := v_cutover_ledger_seq;
    v_boundary_display_date := v_cutover_created_at;
  else
    v_boundary_event_id := null;
    v_boundary_ledger_seq := null;
    v_boundary_display_date := to_timestamp(0);
  end if;

  select balance.net_cents
  into v_canonical_net
  from public.households_get_pairwise_settlement_balances_v2(
    p_household_id,
    v_currency
  ) balance
  where balance.other_user_id = p_other_user_id;
  v_canonical_net := coalesce(v_canonical_net, 0);

  return query
  with current_lines as (
    select
      split_group.expense_id,
      split_group.id as split_group_id,
      split_line.id as split_line_id,
      split_group.payer_user_id,
      split_line.user_id as participant_user_id,
      case
        when split_group.payer_user_id = p_other_user_id
          and split_line.user_id = v_actor_id
          then abs(split_line.amount_cents)
        else -abs(split_line.amount_cents)
      end::bigint as signed_cents,
      abs(split_line.amount_cents)::bigint as current_total_cents,
      coalesce(
        expense.date::timestamp at time zone 'UTC',
        split_group.created_at
      ) as expense_date,
      split_group.description::text as expense_description,
      expense.category::text as expense_category,
      expense.raw_text::text as expense_raw_text,
      expense.type::text as expense_type,
      split_line.settlement_ledger_seq
    from public.expense_split_lines split_line
    join public.expense_split_groups split_group
      on split_group.id = split_line.split_group_id
    join public.household_settlement_finalized_split_groups finalized
      on finalized.split_group_id = split_group.id
    join public.expenses expense
      on expense.id = split_group.expense_id
      and expense.deleted_at is null
    where split_group.household_id = p_household_id
      and upper(split_group.currency) = v_currency
      and split_line.is_settled = false
      and split_line.amount_cents is not null
      and split_line.amount_cents > 0
      and (
        (
          split_group.payer_user_id = p_other_user_id
          and split_line.user_id = v_actor_id
        )
        or (
          split_group.payer_user_id = v_actor_id
          and split_line.user_id = p_other_user_id
        )
      )
  ),
  baseline_lines as (
    select
      baseline.expense_id,
      baseline.split_group_id,
      baseline.split_line_id,
      baseline.payer_user_id,
      baseline.participant_user_id,
      case
        when baseline.payer_user_id = p_other_user_id
          and baseline.participant_user_id = v_actor_id
          then abs(baseline.amount_cents)
        else -abs(baseline.amount_cents)
      end::bigint as signed_cents,
      baseline.expense_date,
      baseline.expense_description,
      baseline.expense_category,
      baseline.expense_raw_text,
      baseline.expense_type
    from public.household_settlement_cycle_baseline_lines baseline
    where v_boundary_kind = 'full'
      and baseline.boundary_event_id = v_boundary_event_id
      and baseline.household_id = p_household_id
      and upper(baseline.currency) = v_currency
      and (
        (
          baseline.payer_user_id = p_other_user_id
          and baseline.participant_user_id = v_actor_id
        )
        or (
          baseline.payer_user_id = v_actor_id
          and baseline.participant_user_id = p_other_user_id
        )
      )

    union all

    select
      baseline.expense_id,
      baseline.split_group_id,
      baseline.split_line_id,
      baseline.payer_user_id,
      baseline.participant_user_id,
      case
        when baseline.payer_user_id = p_other_user_id
          and baseline.participant_user_id = v_actor_id
          then abs(baseline.amount_cents)
        else -abs(baseline.amount_cents)
      end::bigint as signed_cents,
      baseline.expense_date,
      baseline.expense_description,
      baseline.expense_category,
      baseline.expense_raw_text,
      baseline.expense_type
    from public.household_settlement_legacy_cutover_lines_v3 baseline
    where v_boundary_kind = 'legacy_cutover'
      and baseline.cutover_id = v_cutover_id
      and baseline.household_id = p_household_id
      and upper(baseline.currency) = v_currency
      and (
        (
          baseline.payer_user_id = p_other_user_id
          and baseline.participant_user_id = v_actor_id
        )
        or (
          baseline.payer_user_id = v_actor_id
          and baseline.participant_user_id = p_other_user_id
        )
      )
  ),
  changes as (
    select
      ('expense:' || current.expense_id::text) as logical_key,
      current.expense_id,
      current.signed_cents as delta_cents
    from current_lines current

    union all

    select
      ('expense:' || baseline.expense_id::text),
      baseline.expense_id,
      -baseline.signed_cents
    from baseline_lines baseline
  ),
  gross_changes as (
    select
      change.logical_key,
      change.expense_id,
      sum(change.delta_cents)::bigint as gross_signed_cents
    from changes change
    group by change.logical_key, change.expense_id
    having sum(change.delta_cents) <> 0
  ),
  visible_expenses as (
    -- Baseline subtraction identifies materially changed sources even if a
    -- legacy row lacks a trustworthy sequence.  The causal sequence also
    -- identifies equal-value replacements and every new/backdated write after
    -- the effective boundary.  It is used only to decide visibility: the
    -- displayed amount below always comes from the current transaction row.
    select gross.expense_id
    from gross_changes gross

    union

    select current.expense_id
    from current_lines current
    where v_boundary_ledger_seq is null
      or current.settlement_ledger_seq > v_boundary_ledger_seq
  ),
  current_gross_rows as (
    select
      current.expense_id,
      sum(current.signed_cents)::bigint as current_signed_cents
    from current_lines current
    join visible_expenses visible
      on visible.expense_id = current.expense_id
    group by current.expense_id
    having sum(current.signed_cents) <> 0
  ),
  candidates as (
    select
      ('expense:' || current_gross.expense_id::text) as logical_key,
      current_gross.expense_id,
      current_gross.current_signed_cents,
      current_rep.split_group_id,
      current_rep.split_line_id,
      current_rep.expense_date,
      current_rep.expense_description,
      current_rep.expense_category,
      current_rep.expense_raw_text,
      current_rep.expense_type,
      current_rep.settlement_ledger_seq
    from current_gross_rows current_gross
    join lateral (
      select current.*
      from current_lines current
      where current.expense_id = current_gross.expense_id
      order by current.settlement_ledger_seq desc, current.split_line_id desc
      limit 1
    ) current_rep on true
  ),
  normal_rows as (
    select
      case
        when candidate.current_signed_cents > 0 then 'you_owe'::text
        else 'they_owe_you'::text
      end as direction,
      candidate.expense_id,
      candidate.split_group_id,
      candidate.split_line_id,
      candidate.expense_date,
      candidate.expense_description,
      candidate.expense_category,
      candidate.expense_raw_text,
      candidate.expense_type,
      abs(candidate.current_signed_cents)::bigint as total_amount_cents,
      abs(candidate.current_signed_cents)::bigint as remaining_amount_cents,
      candidate.current_signed_cents as remaining_signed_cents,
      candidate.settlement_ledger_seq
    from candidates candidate
    -- Deleted sources have no current_gross_rows entry and therefore never
    -- reappear.  Any historical/payment effect is represented only by the
    -- source-free reconciliation row below.
  ),
  normal_total as (
    select coalesce(sum(normal.remaining_signed_cents), 0)::bigint as signed_cents
    from normal_rows normal
  ),
  reconciliation_row as (
    select
      case
        when (v_canonical_net - total.signed_cents) > 0
          then 'you_owe'::text
        else 'they_owe_you'::text
      end as direction,
      null::uuid as expense_id,
      null::uuid as split_group_id,
      null::uuid as split_line_id,
      v_boundary_display_date as expense_date,
      case
        when v_boundary_kind = 'legacy_cutover'
          then 'Balance carried forward'::text
        else 'Settlement adjustment'::text
      end as expense_description,
      null::text as expense_category,
      null::text as expense_raw_text,
      case
        when v_boundary_kind = 'legacy_cutover'
          then 'legacy_carryover'::text
        else 'adjustment'::text
      end as expense_type,
      abs(v_canonical_net - total.signed_cents)::bigint as total_amount_cents,
      abs(v_canonical_net - total.signed_cents)::bigint as remaining_amount_cents,
      9223372036854775807::bigint as settlement_ledger_seq
    from normal_total total
    where v_canonical_net <> total.signed_cents
  ),
  output_rows as (
    select
      normal.direction,
      normal.expense_id,
      normal.split_group_id,
      normal.split_line_id,
      normal.expense_date,
      normal.expense_description,
      normal.expense_category,
      normal.expense_raw_text,
      normal.expense_type,
      normal.total_amount_cents,
      normal.remaining_amount_cents,
      normal.settlement_ledger_seq
    from normal_rows normal

    union all

    select reconciliation.*
    from reconciliation_row reconciliation
  )
  select
    output.direction,
    output.expense_id,
    output.split_group_id,
    output.split_line_id,
    output.expense_date,
    output.expense_description,
    output.expense_category,
    output.expense_raw_text,
    output.expense_type,
    output.total_amount_cents,
    output.remaining_amount_cents
  from output_rows output
  order by
    output.expense_date desc,
    output.settlement_ledger_seq desc,
    output.split_group_id desc nulls last,
    output.split_line_id desc nulls last;
end;
$$;

revoke all on function public.households_get_settlement_breakdown_v2(
  uuid, uuid, text
) from public, anon;
grant execute on function public.households_get_settlement_breakdown_v2(
  uuid, uuid, text
) to authenticated;

comment on function public.households_get_settlement_breakdown_v2(
  uuid, uuid, text
) is 'Returns every current-cycle pairwise transaction in both directions at its real gross amount, never clips a source row by settlement allocations, and reconciles settlement or unprovable pre-cutover history with at most one source-free row.';

create or replace function public.households_build_settlement_snapshot_v3(
  p_household_id uuid,
  p_actor_user_id uuid,
  p_member_user_id uuid,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_currency text := upper(btrim(p_currency));
  v_boundary_event_id uuid;
  v_boundary_ledger_seq bigint;
  v_full_boundary_event_id uuid;
  v_full_boundary_ledger_seq bigint;
  v_cutover_id uuid;
  v_cutover_ledger_seq bigint;
  v_cutover_carryover_user_a_cents bigint;
  v_cutover_latest_full_event_id uuid;
  v_cutover_latest_full_ledger_seq bigint;
  v_cutover_latest_ambiguous_event_id uuid;
  v_cutover_latest_ambiguous_event_ledger_seq bigint;
  v_effective_boundary_kind text := 'none';
  v_split_to_cents bigint := 0;
  v_split_from_cents bigint := 0;
  v_paid_to_cents bigint := 0;
  v_paid_from_cents bigint := 0;
  v_net_cents bigint := 0;
  v_rows jsonb := '[]'::jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_baselines jsonb := '[]'::jsonb;
  v_cutover_baselines jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_allocations jsonb := '[]'::jsonb;
  v_fingerprint jsonb;
  v_snapshot_token text;
begin
  if p_actor_user_id is null or p_member_user_id is null
    or p_actor_user_id = p_member_user_id
  then
    raise exception 'households_build_settlement_snapshot_v3: invalid pair';
  end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'households_build_settlement_snapshot_v3: invalid currency';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('household:' || p_household_id::text, 0)
  );

  -- The V2 call validates split completeness while the same household lock is
  -- held. Aggregating it first guarantees we never pair a net with stale rows.
  select coalesce(
    jsonb_agg(
      to_jsonb(breakdown)
      order by
        breakdown.expense_date desc,
        breakdown.split_group_id desc nulls last,
        breakdown.split_line_id desc nulls last
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.households_get_settlement_breakdown_v2(
    p_household_id,
    p_member_user_id,
    v_currency
  ) breakdown;

  select
    balance.net_cents,
    balance.split_to_cents,
    balance.split_from_cents,
    balance.paid_to_cents,
    balance.paid_from_cents
  into
    v_net_cents,
    v_split_to_cents,
    v_split_from_cents,
    v_paid_to_cents,
    v_paid_from_cents
  from public.households_get_pairwise_settlement_balances_v2(
    p_household_id,
    v_currency
  ) balance
  where balance.other_user_id = p_member_user_id
  limit 1;

  v_net_cents := coalesce(v_net_cents, 0);
  v_split_to_cents := coalesce(v_split_to_cents, 0);
  v_split_from_cents := coalesce(v_split_from_cents, 0);
  v_paid_to_cents := coalesce(v_paid_to_cents, 0);
  v_paid_from_cents := coalesce(v_paid_from_cents, 0);

  select event.id, event.settlement_ledger_seq
  into v_full_boundary_event_id, v_full_boundary_ledger_seq
  from public.household_settlement_events event
  where event.household_id = p_household_id
    and upper(event.currency) = v_currency
    and event.cleared_pair_balance is true
    and (
      (
        event.payer_user_id = p_actor_user_id
        and event.participant_user_id = p_member_user_id
      )
      or (
        event.payer_user_id = p_member_user_id
        and event.participant_user_id = p_actor_user_id
      )
    )
  order by event.settlement_ledger_seq desc nulls last, event.id desc
  limit 1;

  select
    cutover.id,
    cutover.cutover_ledger_seq,
    cutover.carryover_net_user_a_cents,
    cutover.latest_preceding_full_event_id,
    cutover.latest_preceding_full_ledger_seq,
    cutover.latest_ambiguous_event_id,
    cutover.latest_ambiguous_event_ledger_seq
  into
    v_cutover_id,
    v_cutover_ledger_seq,
    v_cutover_carryover_user_a_cents,
    v_cutover_latest_full_event_id,
    v_cutover_latest_full_ledger_seq,
    v_cutover_latest_ambiguous_event_id,
    v_cutover_latest_ambiguous_event_ledger_seq
  from public.household_settlement_legacy_cutovers_v3 cutover
  where cutover.household_id = p_household_id
    and cutover.user_a_id = case
      when p_actor_user_id::text < p_member_user_id::text
        then p_actor_user_id
      else p_member_user_id
    end
    and cutover.user_b_id = case
      when p_actor_user_id::text < p_member_user_id::text
        then p_member_user_id
      else p_actor_user_id
    end
    and cutover.currency = v_currency;

  if v_full_boundary_ledger_seq is not null
    and (
      v_cutover_ledger_seq is null
      or v_full_boundary_ledger_seq > v_cutover_ledger_seq
    )
  then
    v_effective_boundary_kind := 'full';
    v_boundary_event_id := v_full_boundary_event_id;
    v_boundary_ledger_seq := v_full_boundary_ledger_seq;
  elsif v_cutover_ledger_seq is not null then
    v_effective_boundary_kind := 'legacy_cutover';
    v_boundary_event_id := null;
    v_boundary_ledger_seq := v_cutover_ledger_seq;
  else
    v_boundary_event_id := null;
    v_boundary_ledger_seq := null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'split_line_id', split_line.id,
        'split_group_id', split_group.id,
        'expense_id', expense.id,
        'payer_user_id', split_group.payer_user_id,
        'participant_user_id', split_line.user_id,
        'amount_cents', split_line.amount_cents,
        'settlement_ledger_seq', split_line.settlement_ledger_seq,
        'cycle_boundary_event_id', split_line.cycle_boundary_event_id
      )
      order by split_line.settlement_ledger_seq, split_line.id
    ),
    '[]'::jsonb
  )
  into v_lines
  from public.expense_split_lines split_line
  join public.expense_split_groups split_group
    on split_group.id = split_line.split_group_id
  join public.household_settlement_finalized_split_groups finalized
    on finalized.split_group_id = split_group.id
  join public.expenses expense
    on expense.id = split_group.expense_id
    and expense.deleted_at is null
  where split_group.household_id = p_household_id
    and upper(split_group.currency) = v_currency
    and split_line.is_settled is false
    and (
      (
        split_group.payer_user_id = p_actor_user_id
        and split_line.user_id = p_member_user_id
      )
      or (
        split_group.payer_user_id = p_member_user_id
        and split_line.user_id = p_actor_user_id
      )
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'baseline_kind', 'full',
        'boundary_event_id', baseline.boundary_event_id,
        'split_line_id', baseline.split_line_id,
        'split_group_id', baseline.split_group_id,
        'expense_id', baseline.expense_id,
        'payer_user_id', baseline.payer_user_id,
        'participant_user_id', baseline.participant_user_id,
        'amount_cents', baseline.amount_cents,
        'expense_date', baseline.expense_date,
        'expense_description', baseline.expense_description,
        'expense_type', baseline.expense_type
      )
      order by baseline.split_line_id
    ),
    '[]'::jsonb
  )
  into v_baselines
  from public.household_settlement_cycle_baseline_lines baseline
  where v_effective_boundary_kind = 'full'
    and baseline.boundary_event_id = v_boundary_event_id
    and baseline.household_id = p_household_id
    and upper(baseline.currency) = v_currency
    and (
      (
        baseline.payer_user_id = p_actor_user_id
        and baseline.participant_user_id = p_member_user_id
      )
      or (
        baseline.payer_user_id = p_member_user_id
        and baseline.participant_user_id = p_actor_user_id
      )
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'baseline_kind', 'legacy_cutover',
        'cutover_id', baseline.cutover_id,
        'split_line_id', baseline.split_line_id,
        'split_group_id', baseline.split_group_id,
        'expense_id', baseline.expense_id,
        'payer_user_id', baseline.payer_user_id,
        'participant_user_id', baseline.participant_user_id,
        'amount_cents', baseline.amount_cents,
        'signed_for_user_a_cents', baseline.signed_for_user_a_cents,
        'settlement_ledger_seq', baseline.settlement_ledger_seq,
        'expense_date', baseline.expense_date,
        'expense_description', baseline.expense_description,
        'expense_type', baseline.expense_type
      )
      order by baseline.settlement_ledger_seq, baseline.split_line_id
    ),
    '[]'::jsonb
  )
  into v_cutover_baselines
  from public.household_settlement_legacy_cutover_lines_v3 baseline
  where baseline.cutover_id = v_cutover_id
    and baseline.household_id = p_household_id
    and upper(baseline.currency) = v_currency
    and (
      (
        baseline.payer_user_id = p_actor_user_id
        and baseline.participant_user_id = p_member_user_id
      )
      or (
        baseline.payer_user_id = p_member_user_id
        and baseline.participant_user_id = p_actor_user_id
      )
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'settlement_event_id', event.id,
        'payer_user_id', event.payer_user_id,
        'participant_user_id', event.participant_user_id,
        'amount_cents', event.amount_cents,
        'mode', event.mode,
        'pair_balance_before_cents', event.pair_balance_before_cents,
        'pair_balance_after_cents', event.pair_balance_after_cents,
        'cleared_pair_balance', event.cleared_pair_balance,
        'cycle_boundary_event_id', event.cycle_boundary_event_id,
        'settlement_ledger_seq', event.settlement_ledger_seq
      )
      order by event.settlement_ledger_seq, event.id
    ),
    '[]'::jsonb
  )
  into v_events
  from public.household_settlement_events event
  where event.household_id = p_household_id
    and upper(event.currency) = v_currency
    and (
      v_boundary_ledger_seq is null
      or (
        v_effective_boundary_kind = 'full'
        and event.settlement_ledger_seq >= v_boundary_ledger_seq
      )
      or (
        v_effective_boundary_kind = 'legacy_cutover'
        and event.settlement_ledger_seq > v_boundary_ledger_seq
      )
    )
    and (
      (
        event.payer_user_id = p_actor_user_id
        and event.participant_user_id = p_member_user_id
      )
      or (
        event.payer_user_id = p_member_user_id
        and event.participant_user_id = p_actor_user_id
      )
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'allocation_id', allocation.id,
        'settlement_event_id', allocation.settlement_event_id,
        'split_group_id', allocation.split_group_id,
        'split_line_id', allocation.split_line_id,
        'expense_id', allocation.expense_id,
        'payer_user_id', allocation.payer_user_id,
        'participant_user_id', allocation.participant_user_id,
        'allocated_amount_cents', allocation.allocated_amount_cents,
        'allocation_order', allocation.allocation_order
      )
      order by
        allocation.settlement_event_id,
        allocation.allocation_order,
        allocation.id
    ),
    '[]'::jsonb
  )
  into v_allocations
  from public.household_settlement_event_allocations_v2 allocation
  join public.household_settlement_events allocation_event
    on allocation_event.id = allocation.settlement_event_id
  join public.expenses allocation_expense
    on allocation_expense.id = allocation.expense_id
    and allocation_expense.deleted_at is null
  where allocation.household_id = p_household_id
    and upper(allocation.currency) = v_currency
    and (
      v_boundary_ledger_seq is null
      or (
        v_effective_boundary_kind = 'full'
        and allocation_event.settlement_ledger_seq
          >= v_boundary_ledger_seq
      )
      or (
        v_effective_boundary_kind = 'legacy_cutover'
        and allocation_event.settlement_ledger_seq
          > v_boundary_ledger_seq
      )
    )
    and (
      (
        allocation.payer_user_id = p_actor_user_id
        and allocation.participant_user_id = p_member_user_id
      )
      or (
        allocation.payer_user_id = p_member_user_id
        and allocation.participant_user_id = p_actor_user_id
      )
    );

  v_fingerprint := jsonb_build_object(
    'snapshot_version', 1,
    'household_id', p_household_id,
    'actor_user_id', p_actor_user_id,
    'member_user_id', p_member_user_id,
    'currency', v_currency,
    'effective_boundary_kind', v_effective_boundary_kind,
    'boundary_event_id', v_boundary_event_id,
    'boundary_ledger_seq', v_boundary_ledger_seq,
    'cutover_id', v_cutover_id,
    'cutover_ledger_seq', v_cutover_ledger_seq,
    'cutover_carryover_net_user_a_cents',
      v_cutover_carryover_user_a_cents,
    'cutover_latest_preceding_full_event_id',
      v_cutover_latest_full_event_id,
    'cutover_latest_preceding_full_ledger_seq',
      v_cutover_latest_full_ledger_seq,
    'cutover_latest_ambiguous_event_id',
      v_cutover_latest_ambiguous_event_id,
    'cutover_latest_ambiguous_event_ledger_seq',
      v_cutover_latest_ambiguous_event_ledger_seq,
    'split_to_cents', v_split_to_cents,
    'split_from_cents', v_split_from_cents,
    'paid_to_cents', v_paid_to_cents,
    'paid_from_cents', v_paid_from_cents,
    'net_cents', v_net_cents,
    'rows', v_rows,
    'lines', v_lines,
    'baselines', v_baselines,
    'cutover_baselines', v_cutover_baselines,
    'events', v_events,
    'allocations', v_allocations
  );
  v_snapshot_token := 'v1:' || encode(
    extensions.digest(convert_to(v_fingerprint::text, 'UTF8'), 'sha256'),
    'hex'
  );

  return jsonb_build_object(
    'snapshot_version', 1,
    'snapshot_token', v_snapshot_token,
    'household_id', p_household_id,
    'member_user_id', p_member_user_id,
    'currency', v_currency,
    'effective_boundary_kind', v_effective_boundary_kind,
    'boundary_event_id', v_boundary_event_id,
    'boundary_ledger_seq', v_boundary_ledger_seq,
    'cutover_id', v_cutover_id,
    'cutover_ledger_seq', v_cutover_ledger_seq,
    'cutover_carryover_net_cents', case
      when v_cutover_carryover_user_a_cents is null then null
      when p_actor_user_id::text < p_member_user_id::text
        then v_cutover_carryover_user_a_cents
      else -v_cutover_carryover_user_a_cents
    end,
    'split_to_cents', v_split_to_cents,
    'split_from_cents', v_split_from_cents,
    'paid_to_cents', v_paid_to_cents,
    'paid_from_cents', v_paid_from_cents,
    'net_cents', v_net_cents,
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.households_build_settlement_snapshot_v3(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

create or replace function public.households_get_settlement_calculation_v3(
  p_household_id uuid,
  p_member_user_id uuid,
  p_currency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_currency text;
begin
  if v_actor_id is null then
    raise exception 'households_get_settlement_calculation_v3: auth.uid() is null';
  end if;
  if p_member_user_id = v_actor_id then
    raise exception 'households_get_settlement_calculation_v3: member must be another user';
  end if;
  if not public.is_member_of_household(p_household_id, v_actor_id) then
    raise exception 'households_get_settlement_calculation_v3: actor not member of household';
  end if;
  if not public.is_member_of_household(p_household_id, p_member_user_id) then
    raise exception 'households_get_settlement_calculation_v3: member not member of household';
  end if;

  if p_currency is not null and btrim(p_currency) <> '' then
    v_currency := upper(btrim(p_currency));
  else
    select upper(household.currency)
    into v_currency
    from public.households household
    where household.id = p_household_id;
  end if;

  return public.households_build_settlement_snapshot_v3(
    p_household_id,
    v_actor_id,
    p_member_user_id,
    v_currency
  );
end;
$$;

revoke all on function public.households_get_settlement_calculation_v3(
  uuid, uuid, text
) from public, anon;
grant execute on function public.households_get_settlement_calculation_v3(
  uuid, uuid, text
) to authenticated;

comment on function public.households_get_settlement_calculation_v3(
  uuid, uuid, text
) is 'Returns the authoritative pairwise net and its complete breakdown from one household-locked snapshot.';

-- A split-linked provider transaction is an accounting record whose amount,
-- currency, and household are now part of settlement history. Wallet rebinding
-- may continue for unsplit provider rows, but it must not silently move a split
-- between households. Provider sync still stores its latest raw/provider fields.
create or replace function public.rebind_bank_account_expenses_to_wallet(
  p_user_id uuid,
  p_provider text,
  p_bank_account_id uuid,
  p_wallet_id uuid,
  p_household_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer := 0;
  v_wallet_currency text;
begin
  select account.currency
  into v_wallet_currency
  from public.accounts account
  join public.bank_accounts bank_account
    on bank_account.id = p_bank_account_id
  where account.id = p_wallet_id
    and account.user_id = p_user_id
    and account.household_id is not distinct from p_household_id
    and account.linked_bank_account_id = p_bank_account_id
    and upper(nullif(btrim(bank_account.currency), '')) = account.currency
    and account.is_archived = false
  limit 1;

  if v_wallet_currency is null then
    return 0;
  end if;

  update public.expenses expense
  set account_id = p_wallet_id,
      household_id = p_household_id,
      updated_at = clock_timestamp()
  where expense.user_id = p_user_id
    and expense.provider = p_provider
    and expense.bank_account_id = p_bank_account_id
    and upper(nullif(btrim(coalesce(expense.currency, '')), ''))
      = v_wallet_currency
    and expense.deleted_at is null
    and expense.split_group_id is null
    and not coalesce(expense.user_overrides ? 'account_id', false)
    and (
      expense.account_id is distinct from p_wallet_id
      or expense.household_id is distinct from p_household_id
    );

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.rebind_bank_account_expenses_to_wallet(
  uuid, text, uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.rebind_bank_account_expenses_to_wallet(
  uuid, text, uuid, uuid, uuid
) to service_role;

notify pgrst, 'reload schema';

reset statement_timeout;
reset lock_timeout;
