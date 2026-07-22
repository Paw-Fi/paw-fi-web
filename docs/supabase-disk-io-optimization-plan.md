# Supabase Disk I/O Optimization Plan

## Purpose

This document is the implementation handoff for reducing Supabase Disk I/O,
memory pressure, query latency, temporary-file writes, and write amplification
without changing Moneko's user-facing behavior.

The work must preserve:

- Existing public RPC names, arguments, result types, and JSON shapes.
- Authentication, authorization, RLS, and household privacy behavior.
- Plaid sync correctness, fencing, idempotency, and cursor semantics.
- Transaction ordering, pagination, soft deletion, and local-first sync.
- Native row currencies and aggregate multi-currency conversion behavior.
- Pocket rollover and recurring projection behavior.
- Existing mobile freshness after startup, foreground resume, pull-to-refresh,
  and mutations.

Do not optimize by hiding work through stale data, removing refreshes without
proof, changing visible results, or weakening consistency.

## Current Incident

Supabase warned that the project was close to exhausting its Disk I/O Budget.
The project has 1 GB RAM. At capture time:

- Total reported memory: 921.38 MB.
- Used: 350.58 MB.
- Cache and buffers: 535.43 MB.
- Free: 35.37 MB.
- Swap: 474.53 MB.
- Cache hit rate: 99.94%.
- CPU was generally low, but I/O wait was visible.

The July 19 and July 21 Plaid migrations were deployed immediately before the
warning appeared. The evidence indicates a mixed incident:

1. Large one-time migration backfills and index builds generated heavy WAL and
   evicted part of the working set into swap.
2. The new Plaid transfer reconciliation path causes an ongoing query and index
   probe explosion.
3. The new recurring badge wrappers cause an ongoing correlated JSONB lookup
   for every returned transaction.
4. Secondary historical queries spill to temporary files or scan more rows than
   needed.
5. Several internal extension tables are heavily bloated and consume cache and
   disk space, but are not the primary sudden regression.

## Production Evidence

### Database totals

- `xact_commit`: 100,353,975.
- `xact_rollback`: 528,846.
- `blks_read`: 21,206,468.
- `blks_hit`: 36,816,259,014.
- Cache hit rate: 99.94%.
- Temporary files: 568,707.
- Cumulative temporary bytes: 1,722 GB.
- No reported deadlocks.
- `track_io_timing` was effectively unavailable in the supplied statistics, so
  block counts are the reliable comparison metric.

### `expenses` table

- Total relation size: 511 MB.
- Live rows: approximately 104,822.
- Dead rows: approximately 7,641, or 6.79%.
- Cumulative inserts: 138,752.
- Cumulative updates: 2,022,876.
- Cumulative deletes: 34,231.
- Sequential tuples read: 610,163,119.
- Heap blocks read: 12,214,650.
- Index blocks read: 6,529,331.

The table is large relative to its live row count because it contains wide
columns, many indexes, and has experienced substantial update churn. The high
update count creates WAL, dead tuples, index churn, and autovacuum pressure.

### Confirmed critical queries

#### Plaid atomic sync

`apply_plaid_sync_batch_v2` production statistics:

- Calls: approximately 5,604.
- Average execution time: approximately 1,918 ms.
- Maximum execution time: approximately 40 seconds.
- Shared blocks read: approximately 4,933,943.
- Physical reads represented by those blocks: approximately 38.5 GB.
- WAL generated: approximately 10 GB.

The v2 function invokes the v1 implementation. The transfer matching is inside
the v1 implementation.

Relevant source:

- `supabase/migrations/20260718160000_plaid_lifecycle_atomicity_followup.sql:202`
- `supabase/migrations/20260718160000_plaid_lifecycle_atomicity_followup.sql:500`
- `supabase/migrations/20260717120000_plaid_atomic_sync_and_review.sql:754`

#### Plaid transfer reconciliation index

`expenses_plaid_transfer_reconciliation_idx` was added on July 21 and already
showed:

- Index scans: approximately 31,201,678.
- Index tuples read: approximately 1,134,221,691.
- Index tuples fetched: approximately 1,068,717,519.
- Index blocks read: approximately 116,632.
- Index block hits: approximately 738,872,453.
- Index size: approximately 2.6 MB.

This is approximately 5,568 index scans and 202,000 index tuples examined per
`apply_plaid_sync_batch_v2` call. The index is not necessarily defective. The
current SQL repeatedly probes it due to the query shape.

Do not drop this index before rewriting and validating the reconciliation SQL.
Without it, the current implementation may fall back to an even worse plan.

Relevant source:

- `supabase/migrations/20260721170000_optimize_plaid_transfer_reconciliation.sql`
- `supabase/migrations/20260717120000_plaid_atomic_sync_and_review.sql:754`

#### Transaction page v3

`get_user_transactions_page_v3` production statistics:

- Calls: approximately 1,324.
- Average execution time: approximately 693 ms.
- Maximum execution time: approximately 8 seconds.
- Shared blocks read: approximately 1,613,857.
- Physical reads represented by those blocks: approximately 12.6 GB.
- Approximately 9.5 MB of physical reads per call.

The wrapper obtains the v2 payload, iterates each item, looks up the actual
expense, scans possible recurring template expenses, and checks membership in
`provider_fields.transaction_ids`. This is a correlated lookup per page item.

Relevant source:

- `supabase/migrations/20260719151000_plaid_recurring_transaction_badges.sql:5`
- `supabase/migrations/20260719151000_plaid_recurring_transaction_badges.sql:55`

#### Home month-over-month v2

`get_home_mom_transactions_v2` production statistics:

- Calls: approximately 139 in the captured statement entry.
- Average execution time: approximately 1,833 ms.
- Shared blocks read: approximately 156,812.
- Approximately 8.8 MB of physical reads per call.

The query combines direct user ownership and contact ownership with an `OR`.
Dedicated Home indexes exist, but the direct user index reported zero scans.

Relevant source:

- `supabase/migrations/20260719111359_home_mom_v2_classification_fields.sql`
- `supabase/migrations/20260710121000_optimize_home_mom_transactions.sql`

#### Pockets v3

`get_pockets_month_v3` production statistics:

- Calls: approximately 13,332.
- Average execution time: approximately 279 ms.
- Physical reads: approximately 4.1 GB cumulative.
- Temporary blocks written: approximately 477,810.
- Temporary bytes written: approximately 3.7 GB cumulative.

Relevant source:

- `supabase/migrations/20260712143000_stable_budget_month_pockets_v3.sql:322`

### One-time migration pressure

The July classification migrations included broad updates over `expenses`:

- One statement generated approximately 729 MB WAL.
- Another generated approximately 317 MB WAL.
- Another generated approximately 100 MB WAL.
- Other table rewrites, constraint validation, and index builds added more I/O.

These one-time operations likely triggered the immediate memory and Disk I/O
warning, but they do not explain the continuing Plaid reconciliation scan rate.

Do not rerun historical migrations. Every correction must be a new follow-up
migration containing only the delta.

### Internal table bloat

- `net._http_response`: approximately 165 MB for 121 live rows.
- `cron.job_run_details`: approximately 158 MB for 3,147 live rows.
- `net.http_request_queue`: approximately 5.2 MB for 196 live rows.

The `net._http_response` cleanup statement has high cumulative reads because it
runs frequently, but its average work is small. It is not the primary sudden
regression. The table is nevertheless severely bloated.

These are extension-managed tables. Do not truncate, `VACUUM FULL`, repack, or
modify their structure without Supabase support confirming the safe procedure.

### Cron status

The SQL cron launcher jobs are healthy:

- `bank-sync-processor`: 720 successful runs in 24 hours, approximately 0.07s
  average launcher duration.
- `check-recurring-reminders`: 144 successful runs, approximately 0.60s average.
- Other jobs completed successfully with low launcher durations.

The `bank-sync-processor` cron duration only measures enqueueing the asynchronous
HTTP request. It does not include the Edge Function's database processing time.

## Safety Constraints

The implementing agent must follow these constraints:

- Do not rerun or edit already deployed historical migrations.
- Use new follow-up migrations only.
- Do not deploy multiple major query rewrites in one migration.
- Do not remove current indexes while introducing a replacement query.
- Do not blindly add indexes to `expenses`; each index increases Plaid write
  amplification and memory requirements.
- Do not raise global `work_mem` on a 1 GB instance.
- Do not run `VACUUM FULL` in production.
- Do not reset `pg_stat_statements` before capturing a baseline unless an
  explicit observation window has been agreed.
- Never run `EXPLAIN ANALYZE` on write statements unless wrapped in an explicit
  transaction that is guaranteed to roll back and its side effects are fully
  understood.
- Keep public function signatures, grants, security mode, `search_path`, and
  response fields unchanged.
- Preserve `auth.uid()` validation and household membership checks.
- Preserve all multi-currency behavior documented in repository instructions.
- Preserve soft-deleted rows in mobile delta as tombstones.
- Preserve deterministic cursor ordering and ID tie-breakers.
- Keep backend entitlement and privacy enforcement authoritative.

## Required Workflow

Use strict evidence-driven TDD:

1. Capture current behavior and plans.
2. Write parity and regression tests first.
3. Implement one minimal follow-up migration.
4. Verify outputs and plans locally or in a staging branch.
5. Deploy one phase.
6. Observe production for at least 24 hours.
7. Continue only if correctness and performance gates pass.

Recommended skills for the implementing agent:

- `backend-patterns`: SQL/API performance and repository behavior.
- `tdd-workflow`: behavior-preserving tests before SQL rewrites.
- `security-review`: SECURITY DEFINER/INVOKER, grants, RLS, and user scoping.
- `senior-architect`: staged rollout and migration tradeoffs.
- `code-simplifier`: final review to avoid unnecessary abstractions.

## Phase 0: Establish a Short-Window Baseline

Before any production change, capture 15-30 minute counter deltas during normal
traffic. Do not rely only on lifetime totals.

Capture the following twice with timestamps:

- Calls, execution time, blocks read/hit/dirtied/written, temporary blocks, and
  WAL bytes for target statements.
- `expenses_plaid_transfer_reconciliation_idx` scan and tuple counters.
- `expenses` insert/update/delete and dead tuple counters.
- Database temporary bytes and files.
- Disk I/O Budget slope, I/O wait, memory, free memory, and swap.
- Plaid sync success/failure/deferred counts.

Important interpretation:

- Existing swap does not prove current thrashing. Linux may leave inactive pages
  in swap after pressure subsides.
- Continued swap growth plus I/O wait is evidence of ongoing pressure.
- A 99.94% cache hit rate does not make a query efficient. Billions of logical
  block hits still consume CPU, memory bandwidth, and cache capacity.

## Phase 1: Rewrite Plaid Transfer Reconciliation

### Objective

Stop repeatedly scanning and self-joining the same Plaid candidate set while
preserving exact transfer classification behavior.

### Current behavior to preserve

The existing implementation:

- Limits both sides to the requested user.
- Limits both sides to Plaid expenses.
- Excludes deleted rows.
- Requires finalized analytics rows.
- Limits both sides to processed bank account IDs.
- Requires different bank accounts.
- Requires the same household using `IS NOT DISTINCT FROM`.
- Requires normalized currencies to match.
- Requires equal absolute amounts.
- Requires transaction types to differ.
- Allows dates within three days.
- Does not overwrite a side whose `classification_source` is `user_override`.
- Marks matched, non-overridden rows as possible transfers requiring review.

### Required test fixtures

Write SQL tests covering:

- Same amount, currency, opposing type, different account, same date.
- Date offsets of one, two, and three days.
- Four-day offset does not match.
- Different currency does not match.
- Same bank account does not match.
- Different user does not match.
- Different household does not match.
- Both households `NULL` match correctly.
- One household `NULL` and one non-`NULL` do not match.
- Deleted rows do not match.
- Non-final rows do not match.
- Accounts outside `p_processed_bank_account_ids` do not match.
- One side overridden: only the non-overridden side is updated.
- Both sides overridden: neither side is updated.
- Multiple candidates with identical amount/date produce the same final ID set as
  the existing function.
- Candidate IDs are updated once even when multiple pairs match.
- Existing classification reset behavior remains identical on later syncs.

### Required SQL design

Create a new follow-up migration that replaces only the internal function body
needed by `apply_plaid_sync_batch_v2`.

The optimized matching section should:

1. Build a `MATERIALIZED` candidate CTE containing the fully scoped rows once.
2. Compute normalized currency and absolute amount once in that CTE.
3. Self-join that candidate set once.
4. Require a deterministic ID ordering such as `left.id < right.id` so each pair
   is evaluated once.
5. Expand each pair into its two IDs using a lateral values expression or an
   equivalent set operation.
6. Filter `user_override` independently for each expanded side.
7. Deduplicate IDs before the update.
8. Update each target row once.

Do not initially restrict matching only to newly changed rows. A newly arrived
transaction may match an older existing counterpart. First preserve the exact
processed-account scope, then consider narrower incremental matching only after
proof that it cannot miss a counterpart.

### Acceptance criteria

- Exact updated ID and classification parity against the existing function.
- No authorization, household, or currency behavior changes.
- Reconciliation index scans per Plaid sync fall from approximately 5,568 to a
  small fixed number.
- Index tuples read per sync fall by at least 90%.
- Typical `apply_plaid_sync_batch_v2` latency falls below 500 ms.
- No increase in sync failures, cursor conflicts, retries, deferred syncs, or
  recurring-refresh supersession.
- Public v2 RPC signature and response JSON remain unchanged.

### Rollback

- Preserve the previous function definition in version control.
- Restore only the previous body in a follow-up rollback migration.
- Do not drop `expenses_plaid_transfer_reconciliation_idx` during this phase.

## Phase 2: Eliminate Plaid No-Op Writes

### Objective

Reduce the approximately 10 GB cumulative WAL and update churn generated by
`apply_plaid_sync_batch_v2`.

### Investigation

For a representative sync batch, record:

- Incoming insert count.
- Incoming update count.
- Rows actually changed.
- Rows rewritten with identical values.
- Rows reclassified and then restored to the same classification.
- Bank account and raw transaction upserts that do not change stored values.

### Implementation requirements

- Add `IS DISTINCT FROM` predicates to avoid updating an expense when every
  persisted value is unchanged.
- Apply the same principle to bank account and raw transaction upserts when safe.
- Do not suppress authoritative synchronization timestamps that intentionally
  record a completed sync.
- Do not alter cursor generation, lock fencing, audit records, event records,
  retry behavior, or idempotency.
- Keep classification trigger behavior in mind: avoiding an update also avoids
  trigger and index work, so only skip genuinely equivalent writes.

### Acceptance criteria

- Same inserted, updated, removed, and returned records semantically.
- Same cursor generation and audit/event behavior.
- WAL bytes per normal sync reduced by at least 60%.
- Fewer dead tuples and slower `expenses` bloat growth.
- No material increase in execution time for changed rows.

## Phase 3: Make Recurring Badges Set-Based

### Objective

Replace per-item recurring-template scans in `get_user_transactions_page_v3`
and `get_mobile_delta_v3` with one page-scoped set operation.

### Behavior to preserve

- Base v2 page/delta payload remains authoritative.
- `provider_recurring` is true only when the actual Plaid transaction ID is
  listed by a qualifying recurring template.
- The template must have the same user and household.
- The template must be active.
- The template source must be `plaid_recurring_template`.
- The template bank account ID must match the actual transaction bank account.
- Actual rows must be active Plaid rows with a bank account and provider
  transaction ID.
- Non-UUID synthetic transfer rows remain `provider_recurring = false`.
- Item and delta transaction ordering remains unchanged.

### Required design

1. Read the existing v2 payload.
2. Expand page or delta items once with ordinality.
3. Safely identify UUID item IDs without casting malformed values.
4. Load all corresponding actual rows in one set.
5. Load qualifying templates for only the relevant users, households, and bank
   accounts.
6. Expand template `transaction_ids` once using JSONB set functions.
7. Join expanded provider transaction IDs back to actual/page rows.
8. Aggregate or use `EXISTS` semantics so duplicate JSON values cannot duplicate
   output rows.
9. Rebuild JSON in original ordinality.

Do not add a broad GIN index to the entire `expenses.provider_fields` column as
the first response. It would increase every expense write. Test the set-based
rewrite first. If an index is still required, use a narrow partial index limited
to qualifying recurring template rows.

### Required tests

- No template.
- One matching template.
- Multiple templates, only one matching account.
- Same provider transaction ID in another user's template.
- Same ID in another household.
- Deleted template.
- Empty, `NULL`, non-array, and duplicate `transaction_ids`.
- Synthetic transfer item ID.
- Missing actual expense.
- Page ordering and cursor unchanged.
- Delta ordering, tombstones, `nextCursor`, `nextCursorId`, and `hasMore`
  unchanged.

### Acceptance criteria

- JSON equality with the current functions for representative fixtures.
- Physical reads for page v3 reduced from approximately 9.5 MB per call to less
  than 1-3 MB, or at least a 70% reduction.
- Average page v3 execution time below 200 ms under comparable load.
- No duplicated or reordered items.

## Phase 4: Optimize Home Month-Over-Month Ownership

### Objective

Allow PostgreSQL to use the dedicated direct-user and contact-owned indexes
instead of evaluating a broad ownership `OR`.

### Required design

- Create one branch for `e.user_id = p_user_id`.
- Create one branch for contact IDs belonging to the user.
- Push deleted, split, recurring, date, and keyset predicates into each branch.
- Use `UNION ALL` only with an explicit exclusion that prevents direct-user rows
  from being returned through the contact branch, or deduplicate by ID with
  explicit precedence.
- Apply the final global order and limit after combining branches.
- Preserve `date DESC, created_at DESC NULLS FIRST, id DESC` exactly.
- Preserve current cursor behavior when `created_at` is `NULL`.

### Required tests

- Direct user-owned rows only.
- Contact-owned rows only.
- A row visible through both paths.
- Date boundaries.
- Multiple rows sharing date and `created_at`.
- `NULL created_at` pagination.
- Multiple pages with no omissions or duplicates.
- Deleted, recurring, and split rows excluded.
- Classification fields unchanged.

### Acceptance criteria

- Exact ordered row parity with current v2.
- Both dedicated Home indexes are used in representative plans.
- Physical reads per call reduced by at least 80%.
- No RLS or ownership visibility changes.

## Phase 5: Align Mobile Delta Indexes

### Objective

Match mobile delta indexes to the exact changed-at expression used by
`get_mobile_delta_v2`, while preserving deleted-row tombstones and keyset
pagination.

### Current mismatch

Active-row indexes use:

```sql
COALESCE(updated_at, created_at, epoch)
```

Deleted-row indexes use:

```sql
COALESCE(updated_at, deleted_at, created_at, epoch)
```

The current RPC uses:

```sql
GREATEST(
  COALESCE(updated_at, epoch),
  COALESCE(deleted_at, epoch),
  COALESCE(created_at, epoch)
)
```

These are not equivalent expression trees for planner matching.

### Required rollout

1. Define the changed-at expression once and use the exact same expression in
   the query and indexes.
2. Create three replacement indexes, scoped by user, contact, and household,
   with `(scope_id, changed_at_expression, id)`.
3. Include both active and deleted rows so a single branch can retrieve current
   rows and tombstones.
4. Create indexes concurrently, one at a time, after the Disk I/O incident has
   stabilized.
5. Keep the six old active/deleted indexes during validation.
6. Confirm production usage of replacement indexes.
7. Drop old indexes concurrently in a later migration only.

Do not add a generated stored column on the hot 511 MB table without first
evaluating whether it rewrites the relation. Expression indexes are the less
invasive initial option.

### Required tests

- Newly created row.
- Updated row.
- Deleted row returned as tombstone.
- Restore after soft deletion.
- Multiple rows with identical timestamps.
- Pagination beginning in the middle of a tied timestamp set.
- Direct user, contact-owned, and household-owned visibility.
- Rows visible through multiple ownership paths deduplicated.
- Cursor resumes without omissions or duplicates.

### Acceptance criteria

- Exact delta JSON parity.
- No missing tombstones.
- No cursor regression.
- Replacement indexes are used.
- Read volume becomes proportional to changed rows.
- Replacement index total size is not materially larger than the old six-index
  total.

## Phase 6: Reduce Pockets Temporary Writes

### Objective

Reduce temporary-file spilling without changing pocket, rollover, recurring,
or multi-currency behavior.

### Investigation targets

- Repeated calls to `get_pockets_month_v2_financial_impl`.
- Current financial period, stable anchor month, and previous month reads.
- Per-envelope `calculate_pocket_rollover_carry_v2` calls.
- JSONB expansion and re-aggregation of complete expense rows.
- Sort/hash nodes used by uncategorized and category rollups.

Use a representative heavy user and a normal user. Inspect read-only plans and
identify the exact spilling node before changing SQL.

### Required constraints

- Do not raise global `work_mem`.
- Filter by scope, period, currency, and actual/projected status as early as
  possible.
- Carry narrow columns through aggregate stages.
- Preserve stable budget month keys and custom financial cycles.
- Preserve rollover caps, negative rollover, opening rollover, and lineage.
- Preserve projected recurring deduplication.
- Preserve native pocket currency and aggregate conversion behavior.

### Acceptance criteria

- Exact JSON parity for personal and household pockets.
- Exact rollover and uncategorized totals.
- Temporary blocks per call reduced by at least 80%.
- No increase in memory/swap pressure.

## Phase 7: Remove Only Strict Duplicate Indexes

Do this only after query rewrites and at least 24-72 hours of representative
production index statistics.

Potential duplicate candidates requiring dependency and definition checks:

- `idx_envelope_category_links_envelope_category`, because the unique
  `envelope_category_links_envelope_id_category_key` has the same keys.
- `idx_allocations_envelope_month`, because the unique
  `envelope_allocations_envelope_id_period_month_key` has the same keys.
- `idx_split_groups_expense_id`, because `unique_expense_split` has the same key.
- `idx_idempotency_keys_key`, because `idempotency_keys_key_key` is unique on the
  same key.
- `idx_webhook_events_stripe_event_id`, because
  `webhook_events_stripe_event_id_key` is unique on the same key.
- `idx_subscriptions_user_id`, because `subscriptions_user_id_unique` is unique
  on the same key.
- `idx_user_category_preferences_lookup`, because
  `user_category_preferences_unique` has the same ordered keys.
- `idx_bank_transaction_raw_provider`, because `bank_transaction_raw_unique`
  already has the same keys and broader applicability.
- `idx_budgets_personal_scenario`, because `budgets_personal_unique` has the same
  keys and predicate.

Before each drop verify:

- It does not back a primary, unique, exclusion, or foreign-key-related
  constraint requirement.
- The retained index has identical columns, expressions, ordering, collation,
  operator classes, predicate, and included columns where applicable.
- Representative plans use the retained index.
- The index is dropped concurrently and independently.

Do not drop zero-scan Home or Pocket indexes yet. Some currently have zero scans
because the corresponding query shape does not allow planner use. The planned
rewrites may activate them.

## Phase 8: Reclaim Internal Table Bloat

Contact Supabase support with these facts:

- `net._http_response` is approximately 165 MB with 121 live rows.
- `cron.job_run_details` is approximately 158 MB with 3,147 live rows.
- The project has 1 GB RAM and active Disk I/O Budget pressure.

Ask Supabase to confirm:

- Current retention behavior for both extension-owned tables.
- Whether cleanup is working as intended.
- Whether `pg_repack` is supported and safe for these tables.
- Whether Supabase should perform the maintenance.
- Whether a temporary compute upgrade is recommended during repack.

Do not perform destructive maintenance without that confirmation.

## Phase 9: Optional Mobile Refresh Deduplication

Only consider this after database fixes are deployed and measured.

Current startup/resume flow in
`moneko-mobile/lib/core/navigation/main_shell.dart` performs:

- Outbox drain.
- Category remap sync.
- Mobile delta pull.
- Settlement refresh.
- Currency rate refresh.
- Active tab refresh.
- Deferred recurring, wallet, and analytics refreshes.

Potential safe optimization after database work:

- Deduplicate in-flight startup and resume refreshes.
- Record a short freshness timestamp.
- If mobile delta reports no changes and the relevant local feed is complete,
  avoid immediately fetching the same summary/page again.
- Keep pull-to-refresh authoritative.
- Keep mutation-triggered invalidation and refresh.
- Keep cross-device household freshness.

Do not simply remove foreground refreshes. That would change observable data
freshness and could hide other household members' changes.

## Verification Matrix

Every rewritten read RPC must be compared against the current implementation
using identical inputs.

Verify:

- Row and JSON equality.
- Stable ordering.
- Pagination cursor equality.
- Empty data.
- Large data.
- Personal scope.
- Portfolio scope where applicable.
- Household scope.
- Full and balances-only privacy.
- Single currency.
- Multiple selected currencies.
- Deleted rows.
- Pending/local synchronization cases.
- Recurring templates and projections.
- Transfers.
- Authorization failures.

For write RPCs, verify inside rollback-only transactions or isolated test data:

- Insert/update/delete effects.
- Idempotency.
- Fencing and cursor conflicts.
- Audit and event rows.
- Trigger results.
- Returned JSON.
- Retry behavior.

Run:

- Supabase SQL tests relevant to Plaid, transactions, recurring, pockets, and
  household behavior.
- Edge Function tests covering Plaid batch application and duplicate identity.
- Mobile provider and transaction feed tests.
- Complete mobile test suite before completion.
- Static analysis on all touched Dart/TypeScript files.

## Production Observation Gates

After each phase, observe for at least 24 hours before proceeding.

Track per target statement:

- Calls.
- Mean and maximum execution time.
- Shared blocks read per call.
- Shared blocks hit per call.
- Temporary blocks per call.
- WAL bytes per call.
- Rows returned or changed per call.

Track project health:

- Disk I/O Budget slope.
- Read and write throughput.
- I/O wait.
- Free memory.
- Swap growth, not only absolute swap usage.
- Database connections.
- Autovacuum completion.
- Plaid sync success/failure/deferred rate.
- API timeout and error rate.

## Deployment Sequence

Deploy in this order:

1. Transfer reconciliation query rewrite.
2. Plaid no-op write reduction.
3. Set-based recurring badge functions.
4. Home MoM ownership rewrite.
5. Mobile delta replacement indexes and query alignment.
6. Pockets temporary-spill reduction.
7. Strict duplicate-index removal.
8. Supabase-supported internal-table repack.
9. Optional mobile refresh deduplication.

Each step must be a separate, reversible follow-up migration or application
change. Never combine a function rewrite with dropping its old supporting index.

## Capacity Decision

Do not use a compute upgrade as the only fix. The confirmed query regressions
would waste resources on a larger instance too.

A temporary upgrade is justified as operational protection if:

- User-facing latency is currently elevated.
- I/O wait remains high.
- Swap continues growing.
- Autovacuum or backups cannot complete.
- The Disk I/O Budget reaches zero before fixes can be deployed.

After fixes, retain larger compute only if comparable traffic still causes:

- Continued swap growth.
- Persistent elevated I/O wait.
- Disk I/O Budget depletion.
- Plaid sync p95 above two seconds.

## Definition of Done

The work is complete only when:

- Public behavior and RPC contracts are unchanged.
- All regression and full test suites pass.
- Transfer reconciliation scan amplification is eliminated.
- Plaid sync WAL per call is materially reduced.
- Transaction page recurring badges are set-based and substantially cheaper.
- Home MoM queries use the intended access paths.
- Mobile delta retrieves active rows and tombstones without cursor regressions.
- Pockets temporary writes are materially reduced.
- No unsafe index or internal-table maintenance remains.
- A full post-deployment observation window shows lower I/O, stable memory, and
  no correctness regression.

## Initial Agent Instruction

Start with Phase 0 and Phase 1 only. Do not implement later phases in the same
change. First inspect the current deployed function definitions and migration
history, add parity tests for transfer reconciliation, and produce before/after
plans for representative fixtures. Implement the smallest follow-up migration
that replaces the duplicated self-join/`UNION` reconciliation block while
preserving the exact final transaction classifications and public v2 contract.
