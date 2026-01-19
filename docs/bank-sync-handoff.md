# Bank Sync Audit & Enhancements Handoff

## Purpose
This document captures the current state of the bank sync audit/enhancement work for Plaid and Tink. It is intended for developers who are new to this workstream and need a full, explicit overview to continue implementation safely.

## High-Level Objective
Modernize and harden the bank sync system to be provider‑neutral (Plaid + Tink), resilient under extreme scenarios, and aligned with 2026 vendor guidance. The work includes:
- Schema normalization for provider‑agnostic bank connections/accounts.
- Robust sync primitives (locking, retry/backoff, audit logging).
- Webhook intake and job queue processing.
- Transaction staging and persistence improvements (raw staging, FX normalization).
- Soft‑delete handling for removed transactions.
- Downstream query updates to ignore soft‑deleted rows.

## What Has Been Implemented
### Database (migrations)
The migration `supabase/migrations/20260120_bank_sync_resilience.sql` adds the core resilience layer:
- `expenses.deleted_at` + `expenses.deleted_reason` for soft deletes.
- `bank_sync_locks` table + `acquire_bank_sync_lock` / `release_bank_sync_lock` SQL functions.
- `bank_webhook_events` table to persist webhook payloads.
- `bank_sync_jobs` table to queue sync jobs triggered by webhooks.

### Shared Helpers
- `supabase/functions/shared/bank-retry.ts` — `fetchWithRetry` wrapper with exponential backoff + rate‑limit handling.
- `supabase/functions/shared/plaid-client.ts` and `supabase/functions/shared/tink-client.ts` now use `fetchWithRetry` for all external requests.

### Sync Functions
- **Plaid:** `supabase/functions/plaid-sync-transactions/index.ts`
  - Uses sync locking via `acquire_bank_sync_lock` / `release_bank_sync_lock`.
  - Soft‑deletes removed transactions in `expenses` via `deleted_at` and `deleted_reason = 'provider_removed'`.
  - FX normalization + currency mismatch tracking (via shared `bank-sync.ts`).

- **Tink:** `supabase/functions/tink-sync-transactions/index.ts`
  - Uses sync locking.
  - FX normalization + currency mismatch tracking.
  - **Still missing soft‑delete handling for deleted transactions** (see Pending Work).

### Webhooks
- **Plaid webhook:** `supabase/functions/plaid-webhook/index.ts`
  - Stores webhook payloads in `bank_webhook_events`.
  - Enqueues `bank_sync_jobs` for transaction‑related webhook codes.

- **Tink webhook:** `supabase/functions/tink-webhook/index.ts`
  - Stores webhook payloads in `bank_webhook_events`.
  - Enqueues `bank_sync_jobs` for transaction‑related events.
  - **Needs to include `transactions.ids` payload for `account-transactions:deleted`** (see Pending Work).

### FX Normalization & Currency Mismatch
- Implemented in `supabase/functions/shared/bank-sync.ts`:
  - Normalize `normalized_amount_cents`, `base_currency`, and `fx_rate` for inserts/updates.
  - Track `currencyMismatches` in sync summaries.

## Pending Work (In Order)
### 1. Bank Sync Jobs Processor (New Edge Function)
Create a new edge function: `supabase/functions/bank-sync-processor/index.ts`

Responsibilities:
- Run via cron or internal service call.
- Select `bank_sync_jobs` with `status = 'pending'` (batch limit recommended).
- Mark job as `processing` (update `updated_at`).
- Load `bank_connection` and dispatch based on provider.
- If job payload indicates Tink `account-transactions:deleted`, extract `transactions.ids` and soft‑delete those expenses.
- Otherwise, call provider sync:
  - `plaid-sync-transactions` for Plaid.
  - `tink-sync-transactions` for Tink.
- Mark job as `completed` or `failed` with error details in `payload` (if desired).

### 2. Tink Webhook Payload for Deletes
In `supabase/functions/tink-webhook/index.ts`:
- For event `account-transactions:deleted`, include `content.transactions.ids` in the job payload.
- This is required because Tink only supplies deleted IDs via this event.

### 3. Tink Soft Deletes
In `supabase/functions/tink-sync-transactions/index.ts`:
- Either handle deleted transactions directly if passed in, or rely on the processor.
- Soft‑delete with:
  - `deleted_at = now()`
  - `deleted_reason = 'provider_removed'`
  - Filter by `provider = 'tink'` and `provider_transaction_id`.

### 4. Downstream Query Filtering (Soft Deletes)
Add `.is('deleted_at', null)` filters to all expense queries:
- `supabase/functions/list-expenses/index.ts`
- `supabase/functions/expenses-summary/index.ts`
- `supabase/functions/income-summary/index.ts`
- `supabase/functions/get-budget/index.ts`
- `supabase/functions/shared/expenses-helpers.ts` (`fetchExpensesDirect` and any direct expense reads)

### 5. SQL Function Update
Update migration `supabase/migrations/20260118_get_last_expense_per_user.sql`:
- Add `AND deleted_at IS NULL` to the `WHERE` clause.

## Important Notes for Continuation
### Provider‑Neutral Columns
The earlier phase introduced provider‑neutral columns on `bank_connections` and `bank_accounts` (e.g., `provider_item_id`, `access_token_encrypted`, `cursor`, `expires_at`). Ensure any new logic uses these fields and avoids provider‑specific column names.

### Soft‑Delete Conventions
Soft‑deletion is now the standard for removed transactions:
- Only mark deleted; do not hard‑delete expenses.
- Filter `deleted_at IS NULL` for end‑user queries and summaries.

### Job Status Updates
The `bank_sync_jobs` table includes `created_at` and `updated_at`. If you do not add a trigger, explicitly update `updated_at` on each status change in the processor.

### Security
All sync jobs and webhooks are processed with the Supabase service role key. Ensure no new functions expose service role to user‑facing calls.

## Suggested File Map
- `supabase/functions/bank-sync-processor/index.ts` (NEW)
- `supabase/functions/tink-webhook/index.ts` (update payload for deletions)
- `supabase/functions/tink-sync-transactions/index.ts` (soft deletes)
- `supabase/functions/shared/expenses-helpers.ts` (exclude deleted)
- `supabase/functions/list-expenses/index.ts`
- `supabase/functions/expenses-summary/index.ts`
- `supabase/functions/income-summary/index.ts`
- `supabase/functions/get-budget/index.ts`
- `supabase/migrations/20260118_get_last_expense_per_user.sql`

## Env Vars & Config
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
- `TINK_CLIENT_ID`, `TINK_CLIENT_SECRET`

## Testing Checklist
- Trigger Tink webhook `account-transactions:deleted` → ensure a job is queued with IDs.
- Run `bank-sync-processor` → deleted Tink expenses are soft‑deleted.
- Run `list-expenses`, `expenses-summary`, `income-summary`, `get-budget` → no `deleted_at` rows returned.
- Check `get_last_expense_per_user` output → excludes deleted expenses.

## If You’re New to the Codebase
Start with:
1. `README.md` (architecture and setup)
2. `supabase/migrations/20260120_bank_sync_resilience.sql` (schema changes)
3. `supabase/functions/plaid-sync-transactions/index.ts` (reference implementation for deletes + locks)
4. `supabase/functions/tink-sync-transactions/index.ts` (mirror Plaid where missing)

---
**Owner:** Bank sync audit & enhancements
**Status:** In progress (pending processor, deletions, and query filters)
