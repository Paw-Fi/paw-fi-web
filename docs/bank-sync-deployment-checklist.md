# Bank Sync Deployment Checklist

**Created**: 2026-01-19  
**Status**: Ready for first-time deployment  
**Audit Status**: ✅ PASSED - All implementations verified against latest Supabase official docs

---

## Pre-Deployment Audit Summary

### ✅ Issues Fixed

1. **Migration Fix**: Added missing `processed_at TIMESTAMPTZ` column to `bank_sync_jobs` table in `20260120_bank_sync_resilience.sql`

### ✅ Verification Completed

- **CORS Handling**: All functions use proper CORS with `corsHeaders` and `getCorsHeaders()` from shared module
- **Error Handling**: All functions have try-catch blocks with proper JSON error responses
- **Environment Variables**: All functions check for required env vars and fail gracefully
- **Service Role Auth**: All new edge functions correctly use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- **RLS Policies**: All 5 new tables have RLS enabled with service_role-only policies
- **Soft-Delete Filters**: Verified 10 locations applying `.is("deleted_at", null)` filters
- **Webhook Functions**: Both `plaid-webhook` and `tink-webhook` properly intake events and enqueue jobs
- **Bank Sync Processor**: Correctly processes job queue and dispatches to provider-specific sync functions

### 📋 Architecture Overview

```
Webhook → bank_webhook_events → bank_sync_jobs → bank-sync-processor → [plaid/tink]-sync-transactions → expenses
```

---

## Deployment Steps

### Step 1: Verify Supabase Project Connection

```bash
cd moneko-web

# Check current project
supabase status

# Link to production project if needed
# supabase link --project-ref <YOUR_PROJECT_REF>
```

### Step 2: Deploy Database Migrations (IN ORDER)

```bash
# Migration 1: Provider normalization (adds provider-neutral columns)
supabase db push --include-migration 20260118_get_last_expense_per_user.sql
supabase db push --include-migration 20260119_bank_provider_normalization.sql

# Migration 2: Bank sync resilience (adds locks, webhooks, jobs, soft-deletes)
supabase db push --include-migration 20260120_bank_sync_resilience.sql
```

**What these migrations create:**

- **20260118**: Updates `get_last_expense_per_user()` SQL function to exclude soft-deleted expenses
- **20260119**:
  - Adds `provider_item_id`, `access_token_encrypted`, `refresh_token_encrypted`, `cursor`, `expires_at`, `last_sync_attempt_at` to `bank_connections`
  - Adds `provider_account_id` to `bank_accounts`
  - Creates `bank_connection_tokens` table (for token rotation)
  - Creates `bank_transaction_raw` table (for staging raw provider data)
  - Adds `error_code`, `error_payload`, `attempt` to `bank_sync_audit`
- **20260120**:
  - Adds `deleted_at`, `deleted_reason` to `expenses` table
  - Creates `bank_sync_locks` table + `acquire_bank_sync_lock()` + `release_bank_sync_lock()` functions
  - Creates `bank_webhook_events` table
  - Creates `bank_sync_jobs` table (with `processed_at` column)
  - All new tables have RLS enabled with service_role-only policies

### Step 3: Verify Required Secrets

The following environment variables are **automatically provided** by Supabase:

- `SUPABASE_URL` (auto-injected)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)
- `SUPABASE_ANON_KEY` (auto-injected)

**Custom secrets you may need to set:**

```bash
# If not already set, configure these:
supabase secrets set PLAID_CLIENT_ID=<your_plaid_client_id> --project-ref <YOUR_PROJECT_REF>
supabase secrets set PLAID_SECRET=<your_plaid_secret> --project-ref <YOUR_PROJECT_REF>
supabase secrets set PLAID_ENV=<sandbox|development|production> --project-ref <YOUR_PROJECT_REF>

supabase secrets set TINK_CLIENT_ID=<your_tink_client_id> --project-ref <YOUR_PROJECT_REF>
supabase secrets set TINK_CLIENT_SECRET=<your_tink_client_secret> --project-ref <YOUR_PROJECT_REF>
supabase secrets set TINK_ENV=<test|production> --project-ref <YOUR_PROJECT_REF>

# Optional: CORS configuration (defaults to localhost + moneko.io)
supabase secrets set ALLOWED_ORIGINS=http://localhost:3000,https://moneko.io,https://www.moneko.io --project-ref <YOUR_PROJECT_REF>

# List all secrets to verify
supabase secrets list --project-ref <YOUR_PROJECT_REF>
```

### Step 4: Deploy Edge Functions

Deploy all bank-related edge functions:

```bash
# Deploy NEW function: bank-sync-processor (job queue processor)
supabase functions deploy bank-sync-processor

# Deploy UPDATED functions: webhook handlers
supabase functions deploy plaid-webhook
supabase functions deploy tink-webhook

# Deploy UPDATED functions: sync processors
supabase functions deploy plaid-sync-transactions
supabase functions deploy tink-sync-transactions

# Deploy UPDATED functions: query functions with soft-delete filters
supabase functions deploy list-expenses
supabase functions deploy expenses-summary
supabase functions deploy income-summary
supabase functions deploy get-budget
```

**Verify deployment:**

```bash
supabase functions list
```

All functions should show status: `ACTIVE`

---

## Post-Deployment Verification

### 1. Test Webhook Endpoints

```bash
# Test Plaid webhook (should return {"received": true})
curl -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/plaid-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{"item_id": "test_item", "webhook_type": "TRANSACTIONS", "webhook_code": "SYNC_UPDATES_AVAILABLE"}'

# Test Tink webhook
curl -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/tink-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{"event": "account-transactions:modified", "context": {"userId": "test_user"}}'
```

### 2. Test Bank Sync Processor

```bash
# Manually trigger processor (should return {"processed": 0, "succeeded": 0, "failed": 0, "errors": []})
curl -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/bank-sync-processor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -d '{"batchSize": 10}'
```

### 3. Verify Database Tables

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'bank_sync_locks',
    'bank_webhook_events',
    'bank_sync_jobs',
    'bank_connection_tokens',
    'bank_transaction_raw'
  );

-- Verify expenses has soft-delete columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'expenses'
  AND column_name IN ('deleted_at', 'deleted_reason');

-- Verify bank_sync_jobs has processed_at column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bank_sync_jobs'
  AND column_name = 'processed_at';

-- Check RLS policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'bank_sync_locks',
  'bank_webhook_events',
  'bank_sync_jobs',
  'bank_connection_tokens',
  'bank_transaction_raw'
);
```

### 4. Monitor Logs

```bash
# Watch function logs in real-time
supabase functions logs bank-sync-processor --tail
supabase functions logs plaid-webhook --tail
supabase functions logs tink-webhook --tail
```

---

## Rollback Plan

If issues are detected post-deployment:

### Rollback Functions

```bash
# Deploy previous versions from git
git checkout <previous_commit>
supabase functions deploy <function_name>
```

### Rollback Migrations

⚠️ **WARNING**: Database migrations are harder to rollback. The migrations are designed to be **additive** (adding columns/tables) so they should not break existing functionality.

If critical issues occur:

1. New columns can be left in place (they won't break existing queries)
2. New tables can be left in place (they're isolated with RLS)
3. If you must revert, manually drop tables/columns:

```sql
-- ONLY IF ABSOLUTELY NECESSARY
DROP TABLE IF EXISTS bank_sync_jobs CASCADE;
DROP TABLE IF EXISTS bank_webhook_events CASCADE;
DROP TABLE IF EXISTS bank_sync_locks CASCADE;
DROP TABLE IF EXISTS bank_transaction_raw CASCADE;
DROP TABLE IF EXISTS bank_connection_tokens CASCADE;

ALTER TABLE expenses DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE expenses DROP COLUMN IF EXISTS deleted_reason;
```

---

## Function Inventory

### New Functions (Never Deployed Before)

1. **bank-sync-processor** - Job queue processor that handles webhook-triggered sync jobs

### Updated Functions (Already Deployed, Now Enhanced)

1. **plaid-webhook** - Updated to enqueue jobs
2. **tink-webhook** - Updated to enqueue jobs + include transaction IDs
3. **plaid-sync-transactions** - Updated with soft-delete handling
4. **tink-sync-transactions** - Updated with soft-delete handling
5. **list-expenses** - Added soft-delete filter
6. **expenses-summary** - Added soft-delete filter
7. **income-summary** - Added soft-delete filter (2 locations)
8. **get-budget** - Added soft-delete filter

### Unchanged Functions (Dependencies)

- **plaid-create-link-token**
- **plaid-exchange-public-token**
- **tink-create-link-token**
- **tink-exchange-auth-code**

---

## Migration Inventory

All migrations to deploy (in order):

1. `20260118_get_last_expense_per_user.sql` - Update SQL function to exclude soft-deletes
2. `20260119_bank_provider_normalization.sql` - Provider-neutral schema + token storage
3. `20260120_bank_sync_resilience.sql` - Sync locks + webhooks + jobs + soft-deletes

---

## Architecture Decisions (Verified Against Latest Docs)

### ✅ Edge Functions Best Practices

- **CORS**: Using shared `cors.ts` with dynamic origin matching
- **Authentication**: Service role key for admin operations, anon key never used for bank operations
- **Error Handling**: All functions return proper HTTP status codes with JSON responses
- **Environment Variables**: Using `Deno.env.get()` as per Supabase Edge Functions docs
- **Client Initialization**: Using recommended pattern with `autoRefreshToken: false`, `persistSession: false`

### ✅ Database Best Practices

- **Idempotency**: All migrations use `IF NOT EXISTS` and `DO $$` blocks
- **RLS**: All new tables have RLS enabled with appropriate service_role policies
- **Indexes**: Strategic indexes on foreign keys and frequently queried columns
- **Soft Deletes**: Using `deleted_at` + `deleted_reason` pattern instead of hard deletes

### ✅ Security Considerations

- **Secrets**: All sensitive credentials stored as Supabase secrets (not in code)
- **RLS Policies**: Service role bypass ensures edge functions can manage sync state
- **Webhook Validation**: Both webhooks log all events to `bank_webhook_events` for audit trail
- **Job Processing**: Job processor is idempotent and handles race conditions

---

## Monitoring & Maintenance

### Recommended Cron Jobs

Set up periodic cleanup and processor execution:

```bash
# Schedule bank-sync-processor to run every 5 minutes
# (Use Supabase Dashboard → Edge Functions → Cron)
# Pattern: */5 * * * *
# Function: bank-sync-processor
# Payload: {"batchSize": 50}
```

### Key Metrics to Monitor

1. **Job Queue Depth**: `SELECT COUNT(*) FROM bank_sync_jobs WHERE status = 'pending'`
2. **Failed Jobs**: `SELECT COUNT(*) FROM bank_sync_jobs WHERE status = 'failed'`
3. **Webhook Events**: `SELECT COUNT(*) FROM bank_webhook_events WHERE received_at > NOW() - INTERVAL '1 hour'`
4. **Soft-Deleted Transactions**: `SELECT COUNT(*) FROM expenses WHERE deleted_at IS NOT NULL`
5. **Sync Lock Stalls**: `SELECT COUNT(*) FROM bank_sync_locks WHERE locked_until > NOW()`

---

## Troubleshooting

### Issue: Job processor not processing jobs

**Check:**

1. Verify `bank-sync-processor` is deployed and active
2. Check function logs: `supabase functions logs bank-sync-processor`
3. Verify service role key is set correctly
4. Check job queue: `SELECT * FROM bank_sync_jobs WHERE status = 'pending' LIMIT 10`

### Issue: Transactions not syncing

**Check:**

1. Verify webhook endpoints are receiving events
2. Check `bank_webhook_events` table for recent events
3. Check `bank_sync_jobs` for failed jobs
4. Review sync function logs for specific provider

### Issue: Soft-deleted transactions still appearing

**Check:**

1. Verify all query functions have `.is("deleted_at", null)` filter
2. Check if any custom queries bypass the filter
3. Review `expenses` table: `SELECT COUNT(*) FROM expenses WHERE deleted_at IS NOT NULL`

---

## Success Criteria

✅ All migrations deployed without errors  
✅ All edge functions deployed and showing ACTIVE status  
✅ Webhook test calls return `{"received": true}`  
✅ Job processor test call returns success with 0 pending jobs  
✅ All new database tables exist with correct schemas  
✅ All RLS policies are in place  
✅ Function logs show no configuration errors

---

## Next Steps After Deployment

1. **Enable Real Webhooks**: Configure Plaid and Tink dashboards to point to your deployed webhook URLs
2. **Set Up Monitoring**: Configure alerting for failed jobs and stalled locks
3. **Schedule Processor**: Set up cron job to run `bank-sync-processor` every 5-10 minutes
4. **Test with Real Users**: Monitor first few real transactions to ensure proper sync flow
5. **Performance Tuning**: Monitor job processing times and adjust batch sizes if needed

---

## Contact & Support

- **Implementation Reference**: `moneko-web/docs/bank-sync-handoff.md`
- **Migration Files**: `moneko-web/supabase/migrations/2026011[89]*.sql` and `20260120*.sql`
- **Function Code**: `moneko-web/supabase/functions/bank-*`, `plaid-*`, `tink-*`
- **Audit Date**: 2026-01-19
- **Audit Status**: ✅ PASSED (verified against latest Supabase documentation via Context7)
