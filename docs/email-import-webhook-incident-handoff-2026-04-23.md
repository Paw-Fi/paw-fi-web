# Resend Inbound Webhook Incident Handoff (2026-04-23)

## 1) Scope

This document covers the `resend-inbound-webhook` incident in `moneko-web` where inbound email imports intermittently return duplicate/timeouts and fail to complete transaction persistence.

Primary function:
- `moneko-web/supabase/functions/resend-inbound-webhook/index.ts`

Primary table:
- `public.email_import_events`

## 2) What Was Reported

User observed these behaviors for inbound email import:

1. Response body `{"success":true,"duplicate":true}` despite non-duplicate attachment content.
2. No follow-up email or push notification in some attempts.
3. Resend dashboard showed retries and large backoff gaps.
4. Replay sometimes ended with `request timed out`.

## 3) Confirmed Timeline / Evidence

### A) Early stuck event (never finalized)
Row observed:
- `provider_email_id = 99a546a2-c1be-4deb-8acd-867b36be90dc`
- `status = received`
- `processed_at = null`
- `user_id = null`

Interpretation:
- The event was claimed once, but no terminal update (`processed/ignored/failed`) was written.

### B) Successful event
Row observed:
- `provider_email_id = 385f4160-e87b-45cc-a35d-c27b4c6cd392`
- `status = processed`
- `savedCount = 150`
- Follow-up email + push notifications were delivered.

Interpretation:
- Pipeline can complete end-to-end for similar payloads.

### C) Current failing event (after hardening)
Row observed:
- `provider_email_id = fb0fc7d4-b42d-485f-8764-705e648e3466`
- `status = processing`
- `processing_attempt_count = 4`
- `error_text = SOFT_DEADLINE_EXCEEDED:save_transactions`
- `processed_at = null`
- `result = null`
- `lock_expires_at` advances with retries

Interpretation:
- Event is no longer stuck as plain `received`; now it is retryable `processing` with lease.
- Deadline is exceeded before save phase is executed/finished.

## 4) Root Problem Model

There are two distinct issues:

1. **Webhook delivery model issue**
- Resend uses at-least-once delivery + exponential backoff retries.
- If endpoint does not return in time, retries occur with increasing delay.

2. **Function runtime budget issue**
- This function performs heavy synchronous work inside webhook request:
  - fetch inbound metadata/attachments,
  - attachment download,
  - PDF/AI extraction,
  - save-transactions batch,
  - follow-up email,
  - push notification.
- For large payloads, the request exceeds practical deadline and times out/retries.

## 5) What Was Implemented (Code)

### 5.1 State-machine + lease-based idempotency
File:
- `moneko-web/supabase/functions/resend-inbound-webhook/index.ts`

Key additions:
- `processing` status lifecycle.
- lease fields in logic: `lock_expires_at`, `processing_attempt_count`, `last_svix_id`, `last_svix_timestamp`.
- stale takeover logic for expired/incomplete events.
- max attempt guard.

Relevant blocks:
- claim and duplicate/recovery logic: around lines `235-367`
- row mapping/read helpers: around lines `369-420`
- takeover CAS update: around lines `422-461`
- heartbeat/lease refresh: around lines `463-481`
- retryable failure marking: around lines `504-520`

### 5.2 Duplicate handling behavior changed
- Duplicate while another attempt is actively processing now returns HTTP `409` with metadata:
  - `duplicate: true`
  - `status`
  - `in_progress`
  - `processed_at`
  - `reason`

Relevant block:
- around lines `1176-1189`.

### 5.3 Retryability for transient attachment-list fetch failure
- `ATTACHMENT_FETCH_FAILED` path now throws and flows into retryable failure marker instead of terminal-failing that event immediately.

Relevant block:
- around lines `1303-1305`.

### 5.4 Timeouts + soft deadlines
- Added bounded network fetch wrapper (`fetchWithTimeout`).
- Added soft deadline checkpoints (`ensureSoftDeadline`) around major phases.
- Added periodic lease heartbeat during long processing.

Relevant blocks:
- timeout helpers: around lines `186-199`
- deadline checks in handler: lines near `1193`, `1259`, `1356`, `1574`, `1623`, `1638`.

### 5.5 Configurable inbound inbox for dev
- Added env-based inbox matching:
  - `EMAIL_IMPORT_INBOX_EMAIL`
  - `EMAIL_IMPORT_INBOX_EMAILS`
- Primary inbox used in follow-up/unavailable email text.

Relevant blocks:
- resolver + matcher: around lines `145-177`
- recipient validation path: line `1139`

Current defaults in function:
- `EMAIL_IMPORT_NETWORK_TIMEOUT_MS` default `50000`
- `EMAIL_IMPORT_PROCESSING_LEASE_MS` default `360000`
- `EMAIL_IMPORT_REQUEST_SOFT_DEADLINE_MS` default `300000`

(These defaults are currently in code at lines `47-62`.)

## 6) What Was Implemented (Schema)

Migration added:
- `moneko-web/supabase/migrations/20260423143000_email_import_event_processing_lease.sql`

Changes:
- new columns:
  - `lock_expires_at timestamptz`
  - `processing_attempt_count integer not null default 0`
  - `last_svix_id text`
  - `last_svix_timestamp text`
- status check now includes `processing`
- added index:
  - `(status, lock_expires_at, created_at desc)`

## 7) Test and Validation Status

### Local tests run
Command:
- `deno test --allow-read supabase/functions/_tests/import_edge_contract_test.ts supabase/functions/_tests/email_import_helpers_test.ts`

Result:
- `17 passed, 0 failed`.

### Deployment status from this session
- Could not complete deployment from this machine due missing Supabase auth token (`supabase login` / `SUPABASE_ACCESS_TOKEN` not available).
- However, runtime evidence from DB (`processing`, `lock_expires_at`, `SOFT_DEADLINE_EXCEEDED:*`) indicates hardening code is already active in the tested environment.

## 8) Current Observed Failure Mode (Important)

Current event repeatedly fails with:
- `error_text = SOFT_DEADLINE_EXCEEDED:save_transactions`

Meaning:
- extraction/analysis completed far enough to reach deadline gate before save call.
- function intentionally aborts to avoid hard timeout, marks event retryable, and waits for next retry/replay.

Practical effect:
- same event can loop retries without ever persisting if total pre-save latency stays above soft deadline.

## 9) Audit Focus for Next Agent

Please audit these points first:

1. **Latency breakdown by phase**
- measure elapsed ms at:
  - post-verify,
  - post-owner lookup,
  - post-resend metadata fetch,
  - post-each attachment analyze,
  - pre-save,
  - post-save.
- Determine whether bottleneck is extraction, mapping size, or save RPC.

2. **`saveTransactionsBatchInternal` scalability**
- validate cost when called with ~150+ items at once.
- inspect locking/index/contention in downstream writes and dedupe checks.

3. **Deadline strategy correctness**
- current soft deadline is fixed and global.
- check whether deadline should be dynamic (e.g., based on attachment count/pages) or checkpoint should move after first save chunk.

4. **Retry behavior semantics**
- confirm Resend handling of our `409` response for in-progress duplicate paths.
- verify retries continue appropriately until terminal status is written.

5. **Event finalization guarantees**
- confirm every failure path either:
  - terminally finalizes (`ignored/failed`) when non-retryable, or
  - leaves retryable lease-expired state intentionally.

6. **Dev/prod config drift**
- verify deployed secrets:
  - `EMAIL_IMPORT_INBOX_EMAIL` for dev = `test-files@inbound.moneko.io`
  - timeout/deadline/lease values are as expected.

## 10) Suggested Immediate Operational Checks (No Architecture Change)

1. Verify current row repeatedly hitting same stage:
```sql
select provider_email_id, status, error_text, processing_attempt_count, lock_expires_at, processed_at
from public.email_import_events
where provider_email_id = 'fb0fc7d4-b42d-485f-8764-705e648e3466';
```

2. Validate runtime limits in project tier and actual function execution times from logs/metrics.

3. Confirm request timeout surface:
- Resend dashboard says `request timed out`.
- correlate with function execution duration and response status in Supabase logs.

## 11) Relevant Files for Audit

- `moneko-web/supabase/functions/resend-inbound-webhook/index.ts`
- `moneko-web/supabase/migrations/20260423143000_email_import_event_processing_lease.sql`
- `moneko-web/supabase/functions/_tests/import_edge_contract_test.ts`
- `moneko-web/deploy-email-import.sh`

## 12) Known Constraint

User requested no worker-job architecture for now.
Current implementation intentionally remains synchronous in a single webhook function with stronger idempotency/retry handling.
