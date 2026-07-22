-- STAGING/READ-REPLICA ONLY. NEVER RUN ON THE PRODUCTION PRIMARY.
-- This file executes the expensive historical and optimized reconciliation
-- queries with EXPLAIN ANALYZE. Running the whole file without explicit opt-in
-- aborts before either plan executes.
--
-- In the same isolated session, explicitly set all four values before running:
-- set moneko.plaid_plan_verification = 'enabled';
-- set moneko.plaid_plan_user_id = '<fixed staging fixture user UUID>';
-- set moneko.plaid_plan_household_id = '<fixture household UUID, or empty>';
-- set moneko.plaid_plan_account_ids = '<comma-separated fixture account UUIDs>';
-- Use the same immutable staging fixture and settings for both plans. Do not
-- place real user IDs, transaction payloads, access tokens, or PII in this file.

begin;
set local transaction_read_only = on;
set local statement_timeout = '15s';
set local lock_timeout = '2s';

do $$
begin
  if current_setting('moneko.plaid_plan_verification', true)
      is distinct from 'enabled' then
    raise exception 'Explicit staging plan verification opt-in is required';
  end if;
  if nullif(current_setting('moneko.plaid_plan_user_id', true), '') is null
    or nullif(current_setting('moneko.plaid_plan_account_ids', true), '') is null
    or current_setting('moneko.plaid_plan_household_id', true) is null then
    raise exception 'Fixed staging fixture parameters are required';
  end if;
end;
$$;

-- Use each EXPLAIN node's actual loops and rows to record reconciliation index
-- scans and tuple work. Cumulative pg_stat index counters may not flush until
-- this read-only transaction ends, so they are intentionally not sampled here.

-- LEGACY PLAN. Record execution time, candidate/final rows, shared blocks,
-- temporary blocks, rows removed by filters, join strategy, and spill details.
explain (analyze, buffers, wal, settings, summary)
with params as materialized (
  select
    current_setting('moneko.plaid_plan_user_id')::uuid as user_id,
    nullif(current_setting('moneko.plaid_plan_household_id'), '')::uuid
      as household_id,
    string_to_array(
      current_setting('moneko.plaid_plan_account_ids'), ','
    )::uuid[] as account_ids
), transfer_candidates as (
  select expense.id
  from params
  join public.expenses expense
    on expense.user_id = params.user_id
   and expense.provider = 'plaid'
   and expense.deleted_at is null
   and expense.analytics_is_final
   and expense.bank_account_id = any(params.account_ids)
   and expense.household_id is not distinct from params.household_id
  join public.expenses match
    on match.user_id = expense.user_id
   and match.provider = 'plaid'
   and match.deleted_at is null
   and match.analytics_is_final
   and match.bank_account_id is distinct from expense.bank_account_id
   and match.bank_account_id = any(params.account_ids)
   and match.household_id is not distinct from params.household_id
   and upper(coalesce(match.currency, '')) = upper(coalesce(expense.currency, ''))
   and abs(match.amount_cents) = abs(expense.amount_cents)
   and match.type is distinct from expense.type
   and abs(match.date - expense.date) <= 3
  where expense.classification_source <> 'user_override'
  union
  select match.id
  from params
  join public.expenses expense
    on expense.user_id = params.user_id
   and expense.provider = 'plaid'
   and expense.deleted_at is null
   and expense.analytics_is_final
   and expense.bank_account_id = any(params.account_ids)
   and expense.household_id is not distinct from params.household_id
  join public.expenses match
    on match.user_id = expense.user_id
   and match.provider = 'plaid'
   and match.deleted_at is null
   and match.analytics_is_final
   and match.bank_account_id is distinct from expense.bank_account_id
   and match.bank_account_id = any(params.account_ids)
   and match.household_id is not distinct from params.household_id
   and upper(coalesce(match.currency, '')) = upper(coalesce(expense.currency, ''))
   and abs(match.amount_cents) = abs(expense.amount_cents)
   and match.type is distinct from expense.type
   and abs(match.date - expense.date) <= 3
  where match.classification_source <> 'user_override'
)
select count(*) from transfer_candidates;

-- OPTIMIZED PLAN against the exact same fixture. Record candidate CTE rows,
-- matching_pairs rows, final IDs, execution time, shared/temp blocks, filter
-- removals, join strategy, and any sort/hash spill.
explain (analyze, buffers, wal, settings, summary)
with params as materialized (
  select
    current_setting('moneko.plaid_plan_user_id')::uuid as user_id,
    nullif(current_setting('moneko.plaid_plan_household_id'), '')::uuid
      as household_id,
    string_to_array(
      current_setting('moneko.plaid_plan_account_ids'), ','
    )::uuid[] as account_ids
), candidate_expenses as materialized (
  select
    expense.id,
    expense.bank_account_id,
    upper(coalesce(expense.currency, '')) as normalized_currency,
    abs(expense.amount_cents) as absolute_amount_cents,
    expense.date,
    expense.type,
    expense.classification_source
  from params
  join public.expenses expense
    on expense.user_id = params.user_id
   and expense.provider = 'plaid'
   and expense.deleted_at is null
   and expense.analytics_is_final
   and expense.bank_account_id = any(params.account_ids)
   and expense.household_id is not distinct from params.household_id
), matching_pairs as (
  select
    left_candidate.id as left_id,
    left_candidate.classification_source as left_classification_source,
    right_candidate.id as right_id,
    right_candidate.classification_source as right_classification_source
  from candidate_expenses left_candidate
  join candidate_expenses right_candidate
    on left_candidate.id < right_candidate.id
   and left_candidate.bank_account_id is distinct from right_candidate.bank_account_id
   and left_candidate.normalized_currency = right_candidate.normalized_currency
   and left_candidate.absolute_amount_cents = right_candidate.absolute_amount_cents
   and left_candidate.type is distinct from right_candidate.type
   and abs(left_candidate.date - right_candidate.date) <= 3
), transfer_candidates as (
  select distinct candidate_side.id
  from matching_pairs pair
  cross join lateral (
    values
      (pair.left_id, pair.left_classification_source),
      (pair.right_id, pair.right_classification_source)
  ) as candidate_side(id, classification_source)
  where candidate_side.classification_source <> 'user_override'
)
select count(*) from transfer_candidates;

-- Exact production-shaped parity and amplification metrics. UUID arrays are
-- compared internally but not returned, avoiding transaction-ID disclosure.
with params as materialized (
  select
    current_setting('moneko.plaid_plan_user_id')::uuid as user_id,
    nullif(current_setting('moneko.plaid_plan_household_id'), '')::uuid
      as household_id,
    string_to_array(
      current_setting('moneko.plaid_plan_account_ids'), ','
    )::uuid[] as account_ids
), legacy_candidates as (
  select expense.id
  from params
  join public.expenses expense
    on expense.user_id = params.user_id
   and expense.provider = 'plaid'
   and expense.deleted_at is null
   and expense.analytics_is_final
   and expense.bank_account_id = any(params.account_ids)
   and expense.household_id is not distinct from params.household_id
  join public.expenses match
    on match.user_id = expense.user_id
   and match.provider = 'plaid'
   and match.deleted_at is null
   and match.analytics_is_final
   and match.bank_account_id is distinct from expense.bank_account_id
   and match.bank_account_id = any(params.account_ids)
   and match.household_id is not distinct from params.household_id
   and upper(coalesce(match.currency, '')) = upper(coalesce(expense.currency, ''))
   and abs(match.amount_cents) = abs(expense.amount_cents)
   and match.type is distinct from expense.type
   and abs(match.date - expense.date) <= 3
  where expense.classification_source <> 'user_override'
  union
  select match.id
  from params
  join public.expenses expense
    on expense.user_id = params.user_id
   and expense.provider = 'plaid'
   and expense.deleted_at is null
   and expense.analytics_is_final
   and expense.bank_account_id = any(params.account_ids)
   and expense.household_id is not distinct from params.household_id
  join public.expenses match
    on match.user_id = expense.user_id
   and match.provider = 'plaid'
   and match.deleted_at is null
   and match.analytics_is_final
   and match.bank_account_id is distinct from expense.bank_account_id
   and match.bank_account_id = any(params.account_ids)
   and match.household_id is not distinct from params.household_id
   and upper(coalesce(match.currency, '')) = upper(coalesce(expense.currency, ''))
   and abs(match.amount_cents) = abs(expense.amount_cents)
   and match.type is distinct from expense.type
   and abs(match.date - expense.date) <= 3
  where match.classification_source <> 'user_override'
), candidate_expenses as materialized (
  select
    expense.id,
    expense.bank_account_id,
    upper(coalesce(expense.currency, '')) as normalized_currency,
    abs(expense.amount_cents) as absolute_amount_cents,
    expense.date,
    expense.type,
    expense.classification_source
  from params
  join public.expenses expense
    on expense.user_id = params.user_id
   and expense.provider = 'plaid'
   and expense.deleted_at is null
   and expense.analytics_is_final
   and expense.bank_account_id = any(params.account_ids)
   and expense.household_id is not distinct from params.household_id
), matching_pairs as materialized (
  select
    left_candidate.id as left_id,
    left_candidate.classification_source as left_classification_source,
    right_candidate.id as right_id,
    right_candidate.classification_source as right_classification_source
  from candidate_expenses left_candidate
  join candidate_expenses right_candidate
    on left_candidate.id < right_candidate.id
   and left_candidate.bank_account_id is distinct from right_candidate.bank_account_id
   and left_candidate.normalized_currency = right_candidate.normalized_currency
   and left_candidate.absolute_amount_cents = right_candidate.absolute_amount_cents
   and left_candidate.type is distinct from right_candidate.type
   and abs(left_candidate.date - right_candidate.date) <= 3
), optimized_candidates as (
  select distinct candidate_side.id
  from matching_pairs pair
  cross join lateral (
    values
      (pair.left_id, pair.left_classification_source),
      (pair.right_id, pair.right_classification_source)
  ) as candidate_side(id, classification_source)
  where candidate_side.classification_source <> 'user_override'
), legacy_result as (
  select array_agg(id order by id) as ids from legacy_candidates
), optimized_result as (
  select array_agg(id order by id) as ids from optimized_candidates
)
select
  legacy_result.ids is not distinct from optimized_result.ids
    as exact_final_id_set_parity,
  (select count(*) from candidate_expenses) as candidate_row_count,
  (select count(*) from matching_pairs) as matching_pair_row_count,
  cardinality(optimized_result.ids) as final_candidate_id_count
from legacy_result
cross join optimized_result;

rollback;
