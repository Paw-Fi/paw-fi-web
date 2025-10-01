# Stripe Subscription Implementation Audit

Generated: (UTC) 

This document provides a comprehensive audit of the current Stripe subscription lifecycle implementation across frontend and backend code in this repository. The audit strictly refrains from assuming existence of code not found in the repository. Any missing pieces, risks, deviations from Stripe best practices (2023-10 API) and production readiness gaps are called out explicitly.

## Scope Reviewed

Frontend:
- src/routes/pricing.tsx
- src/routes/checkout.tsx
- src/components/membership/PlanSelector.tsx
- src/hooks/use-subscription.ts

Backend (Supabase Edge Functions / Database):
- supabase/functions/create-checkout-session/index.ts
- supabase/functions/verify-payment/index.ts
- supabase/functions/update-subscription/index.ts
- supabase/functions/preview-subscription-change/index.ts
- supabase/functions/get-subscription/index.ts
- supabase/functions/stripe-webhook/index.ts
- supabase/functions/shared/stripe-subscription-prices.ts
- supabase/functions/shared/email-templates.ts
- supabase/functions/shared/email-service.ts
- supabase/migrations/20250629_subscription_functions.sql

## High-Level Lifecycle Requirements vs Implementation

| Lifecycle Stage | Expected (Stripe best practice) | Implemented? | Gaps / Risks |
|-----------------|---------------------------------|--------------|--------------|
| Plan presentation | Show current plans, correct pricing, handle trials | pricing.tsx, PlanSelector.tsx | Premium marked coming soon; Plus/Premium price IDs reused; No dynamic fetch from Stripe; Hard-coded feature sets |
| Checkout session creation | Use Checkout Session or Customer Portal; use proper price IDs; metadata for plan; handle trial logic | create-checkout-session function | Trial uses allow_incomplete + trial_period_days but does NOT ensure payment method collection post-trial; lacks customer attachment logic; no idempotency key |
| Trial management | Track trial start/end, send notifications, require payment method collection before trial end (if converting) | Webhook handles trial_will_end email | No enforcement to collect payment method; trial sign-up allows no payment method with future potential failure; no job to cancel incomplete trials |
| Initial subscription persistence | On successful payment or webhook upsert subscription record | verify-payment + stripe-webhook | Possible duplication/ race (verify-payment and webhook both mutate) |
| Handling upgrades | Immediate proration & invoice; consistent proration date | preview-subscription-change + update-subscription | Preview uses upcoming invoice; update uses proration_date; Good alignment but no validation of returned preview data integrity |
| Handling downgrades | Should apply at period end, optionally credit | preview-subscription-change + update-subscription | Correct messaging but credits logic not persisted; database not tracking scheduled change |
| Cancellation (at period end) | Set cancel_at_period_end; send confirmation | update-subscription + webhook deletion | Cancellation email only on deletion event, not at scheduling of cancel_at_period_end |
| Immediate cancellation | Cancel subscription and downgrade access | update-subscription | No feature gating logic enforced immediately beyond status; downgrade to free plan not explicit (plan field persists?) |
| Payment failures | invoice.payment_failed → mark past_due, send email, attempt retries | stripe-webhook | Marks status past_due but subscription table only updated in subscriptions table? Does not persist grace windows, no retry config logic shown |
| Renewal success | invoice.payment_succeeded → maintain active status, email optional | stripe-webhook | Calls handleSubscriptionUpdated indirectly; no renewal classification logic (changeType always 'renewal' fallback) |
| Expiration (non-renewal) | Access revoked, plan downgraded, notify user | Not clearly implemented | No scheduled worker to detect expired current_period_end and downgrade |
| Customer Portal (self-service) | Provide portal for card updating, cancel, invoices | Not found | Missing portal session function |
| Security / Validation | Webhook signature verification, strict parameter validation | Partial | Some validation; missing idempotency, missing strong plan mapping validation, no environment guard for placeholder IDs |

## Detailed Findings

### 1. Pricing & Plan Selection (pricing.tsx, PlanSelector.tsx)
- Pricing page maps plan button clicks to navigate /checkout with plan + trial flags. No server-driven plan catalog (risk: price mismatch vs Stripe Dashboard). Recommendation: Fetch product/price list from Stripe server-side and cache.
- Annual vs monthly toggle present but messaging only for Plus plan. Potential inconsistency if premium added later.
- PlanSelector prevents selecting premium (disabled) but still allows logic paths that assume premium plan exists across backend.
- No display of proration results BEFORE actual plan update except via preview in Dashboard flow (good), but pricing page direct checkout lacks preview.

### 2. Hook use-subscription.ts
- Invokes get-subscription edge function (GET) with query params concatenated into function name string (Supabase Functions treat path differently— verify compatibility; pattern `functions.invoke('get-subscription?userId=...')` may not work in all environments unless configured exactly).
- Assumes response structure (data.subscription). If function returns different shape for free user (subscription: null but top-level plan/status fields), consumer might ignore plan fallback logic.
- isActive check: status === 'active' || 'trialing'. Good, but no handling for 'past_due', 'incomplete', 'incomplete_expired'. Risk: granting access to 'trialing' subscriptions without verifying payment method presence when trial ends.
- No periodic polling or websocket to refresh on webhook events; potential stale UI state.

### 3. create-checkout-session
- Accepts isTrial flag; if true sets payment_method_collection: 'if_required', payment_behavior: 'allow_incomplete', and trial_period_days: 30. Stripe guidance: better to create subscription with trial on Subscriptions API and collect payment method upfront unless explicitly offering cardless trial. Risk: end-of-trial failure and churn.
- Does not create or attach customer: If user already has a stripe_customer_id it's not used; no retrieval/mapping logic; relies on Checkout to implicitly create a customer. Missing integration to persist stripe_customer_id immediately.
- Missing idempotency key (risk duplicate sessions on rapid multi-click).
- Missing validation that plan argument matches allowed keys; only checks SUBSCRIPTION_PRICES[plan] existence. SUBSCRIPTION_PRICES uses identical env vars for plus and premium (placeholder duplication) — critical misconfiguration risk leading to plan confusion.
- No metadata except in non-trial path? (Trial path also lacks metadata.plan; both paths lack explicit metadata except client_reference_id). In verify-payment fallback plan resolution defaults to subscription.metadata.plan || 'plus' → may mislabel premium subscriptions.

### 4. verify-payment
- Redundant with webhook handling: attempts to insert/update subscription immediately after checkout redirect. Race conditions possible: webhook may arrive before or after, leading to inconsistent status.
- Uses subscription.metadata.plan default 'plus' if not set, which is brittle.
- Does not set plan based on Stripe price ID mapping; does not query price/product to derive plan (risk: mismatches).
- Does not handle incomplete or trialing states specially.
- Does not store billing interval (missing dimension in schema; schema has no interval column).

### 5. preview-subscription-change
- Properly retrieves current subscription and calls invoices.upcoming with subscription_proration_date. Good alignment with Stripe docs for preview.
- Missing validation: newPlan must exist in SUBSCRIPTION_PRICES; partially done but early exit cases may leak internal logic.
- For downgrade scenario sets billingBehavior 'end_of_period' but does not persist a future-plan-change record (no table/field to hold pending next plan). Risk: At period end webhook deletion/renewal logic has no reference to desired downgraded plan; if user tries to revert mid-cycle confusion may occur.
- No concept of billing interval change detection separate from plan (works but messaging lumps plan+interval).
- Negative proration amounts treated as credit messaging only; credit not persisted; relies on Stripe to apply next invoice but not exposed to user later.

### 6. update-subscription
- If current plan is free or no active subscription, creates a new checkout session again (duplication of create-checkout-session logic; DRY violation and risk discrepancy).
- Upgrades use proration_behavior 'always_invoice' (correct for immediate charge) and payment_behavior 'error_if_incomplete' (good for ensuring no incomplete states). Downgrades use 'create_prorations' but still immediately update subscription items – Stripe may apply new price now but proration credit appears on next invoice; if intention was end-of-period downgrade, best practice is to schedule via pending update or cancel_at_period_end + new subscription later.
- Does not store or update billing interval anywhere (schema lacks billing cadence field). Cannot reconstruct monthly vs annual in dashboard.
- Lacks concurrency guard (e.g., user triggers multiple updates quickly).
- Missing robust error classification (always 500 internal server error). No idempotency or logging correlation IDs.

### 7. get-subscription
- Dual strategy: direct table query + RPC function get_user_subscription; chooses direct fallback. Complexity may mask bugs. If both return different results no reconciliation logic, last one wins silently.
- Fetches Stripe subscription & invoices on every call (no caching). Potential rate-limit issues at scale.
- Calculates days_until_next_payment but does not consider 'past_due' edge cases or future scheduled cancellations (cancel_at_period_end only).
- Features are hardcoded via SQL function placeholder — not production ready.

### 8. stripe-webhook
Events handled: subscription created/updated/deleted, trial_will_end, invoice.payment_succeeded, invoice.payment_failed.
Missing critical events: checkout.session.completed, customer.subscription.pending_update_applied/expired, invoice.upcoming, customer.subscription.paused, invoice.finalization_failed.
- RELIES on subscription.created/updated to send emails; upgrade vs downgrade detection not implemented (changeType always 'renewal' except new subscription branch). Missing logic to store previous plan snapshot to classify.
- Payment failed handler sets state to past_due and sends email; TODO comment remains to send email but actually email sending implemented later (lines ~421–450). Duplicate or inconsistent comment vs implementation.
- Does not attempt retry logic or track number of failures (Stripe has dunning settings but application may want to reflect them).
- Deletion handler marks status canceled but does not downgrade plan column (plan stays the previous non-free plan). Nothing sets plan='free'. Access gating relies only on status, but some code uses plan to show features.
- No signature tolerance window enforcement or logging of event.id for idempotency (risk of processing duplicate webhooks).
- No dead-letter or alerting on handler errors; errors just log.
- No explicit downgrade on past_due expiration (Stripe may eventually cancel; system will only react on subscription.deleted).

### 9. Email Templates & Service
- Templates cover core phases (created, updated, canceled, payment failed, trial ending). Missing: upgrade vs downgrade differentiated messaging, card expiring, payment method updated, subscription resumed.
- email-service lacks rate limiting, bounce handling, unsubscribe logic (placeholder unsubscribe link only). No templated i18n.

### 10. Database Schema (subscriptions table)
- Missing columns: billing_interval, plan_version, trial_end, started_at, canceled_at, ended_at, proration_behavior, quantity, pending_plan, pending_interval.
- Unique constraint stripe_subscription_id ensures single record but upsert by user_id may cause mismatch if user manually creates new subscription with new id (old row orphaned?).
- No historical audit table (changes overwritten — cannot produce billing history beyond invoices).
- No foreign key relationship to a plans table; plan is TEXT freeform.

### 11. Missing Features vs Production Readiness
Critical Missing:
1. Billing interval persistence.
2. Reliable plan derivation from price/product IDs (mapping table missing).
3. Handling for checkout.session.completed event (canonical place to create local subscription record).
4. Idempotency protections (both webhook and function invocations).
5. Customer portal (Stripe Billing Portal) for self-service.
6. Downgrade scheduling (pending update record).
7. Automatic downgrade after expiration of period_end or status transitions (background job / cron).
8. Distinguish upgrade vs downgrade in emails.
9. Race condition mitigation between verify-payment and webhook (consider removing verify-payment function or making it read-only status check).
10. Separate environment config for premium price IDs (currently duplicates plus IDs). Currently impossible to differentiate premium.

Important Missing (High Impact but not blocking initial launch if controlled):
- Card expiration notifications.
- Logging observability (structured logs with trace IDs).
- Unit/integration tests for functions.
- Retry/backoff for transient Stripe API errors.
- Validation that environment variables are set (fail fast if missing).
- Graceful handling of incomplete/incomplete_expired states.
- Support for coupon / promo codes beyond allow_promotion_codes (no explicit promotion code logic in create-checkout-session for retrieving discount metadata client side).
- Plan feature enforcement server-side (purely UI gating now).
- Accounting for taxes (automatic tax, tax rates, VAT collection not implemented).

Moderate Missing:
- Webhook secret rotation handling.
- Security: no authentication/authorization layer on update-subscription, preview-subscription-change, etc. They rely on a userId in request body (spoofable). Needs JWT-based server validation ensuring auth.uid() matches provided userId.
- No usage-based metering logic (if future features require it).
- No concurrency locks (two updates could interleave causing proration conflicts).
- No logging of previous vs new plan in DB for audit.

Minor Issues / Code Smells:
- SUBSCRIPTION_PRICES uses same env vars for plus and premium.
- Comments referencing TODO but code implemented (payment failed email).
- Multiple identical retrieval calls (stripe.subscriptions.retrieve) without caching in same function chain potential duplication.
- In preview-subscription-change code path for missing subscription returns action cancel even if subscription record might be stale.
- Feature list hardcoded in SQL; duplicates logic elsewhere.

### 12. Edge Cases Not Handled
- User starts trial, never adds payment method: what happens at trial end? (Likely becomes incomplete/incomplete_expired – not handled).
- User upgrades during trial: Are they charged immediately? Current code sets immediate upgrade with proration (could bill prematurely if still in trial window — need logic to treat trial upgrades gracefully).
- Payment fails multiple times then subscription goes to canceled by Stripe dunning: only subscription.deleted eventually triggers cancellation email, no interim reminders sequence.
- User cancels then resumes: update-subscription 'resume' checks subscription.status === 'active' AND cancel_at_period_end true; if status moved to canceled before period end due to failure, resume impossible.
- Currency assumptions: Hard-coded USD.
- Multiplan (quantity >1) unsupported.
- Switching from annual to monthly mid-cycle: preview indicates immediate charge; some businesses choose credit until next cycle — ensure business decision.
- Attempted downgrade during trial? Behavior unspecified.

### 13. Security Concerns
- Edge function endpoints accept raw user-supplied userId; no server-side verification with auth context; malicious actor could alter another user subscription (critical).
- Missing rate limiting / abuse protection.
- Logging may expose PII (email addresses) without redaction policy.
- Webhook fallback (if endpointSecret missing) parses JSON directly (development convenience) but if misconfigured in production could allow forged events.

### 14. Reliability / Observability Gaps
- No centralized error tracking (Sentry, etc.).
- No structured log correlation (event.id, request id).
- No alerting on repeated failures (e.g. payment attempts).
- No dead-letter handling for failed webhook events (failures lost).

### 15. Data Integrity Risks
- Potential inconsistent plan labeling due to metadata omissions.
- Lack of billing interval leads to ambiguous pricing display later; user may appear on plus but price charged annually vs monthly unknown.
- Deleting subscription (canceled) leaves plan column unchanged; feature gating might incorrectly expose paid features until client checks status each time.
- Race conditions: verify-payment may write partial record before webhook final state resulting in status mismatch (e.g., incomplete vs active).

## Prioritized Remediation Roadmap

Critical (P0):
1. Add authentication enforcement in all user-facing Edge Functions (derive userId from JWT not body).
2. Introduce canonical plan/price mapping table: plan_key, stripe_price_id, interval.
3. Add billing_interval column to subscriptions and persist on create/update.
4. Implement checkout.session.completed webhook; migrate creation logic there; remove verify-payment or make idempotent read-only.
5. Enforce webhook signature always; disallow fallback parse in production.
6. Add idempotency (store processed event IDs) to avoid duplicate handling.
7. Implement plan reset to 'free' on cancellation/deletion and when status not active/trialing and current_period_end < now().
8. Add security validation: each function should validate Supabase auth context (e.g., using service role only internally / user token externally).
9. Fix SUBSCRIPTION_PRICES premium env vars.
10. Remove cardless trial OR add post-trial payment method collection flow and enforcement.

High (P1):
11. Store prior plan + classify upgrade/downgrade in webhook.
12. Persist pending downgrade (new columns pending_plan, pending_interval, pending_effective_date).
13. Consolidate create-checkout-session and update-subscription new subscription flows.
14. Add retry + exponential backoff for Stripe API transient errors.
15. Add background job (cron) to detect expired subscriptions / perform downgrades + send emails.
16. Add portal session endpoint for customer self-service (stripe.billingPortal.sessions.create).
17. Add billing interval change logic distinct from plan change.
18. Replace freeform plan strings with enum constraint in DB.

Medium (P2):
19. Cache Stripe product/price lists server-side and feed pricing UI.
20. Add feature enforcement server-side (e.g., RLS or function gating using has_active_subscription).
21. Improve invoice & proration display in dashboard (show credits).
22. Multi-environment config validation at startup (fail fast if missing price IDs).
23. Logging improvements (structured JSON logs with request + event correlation IDs).
24. Add tests for each function (unit + mock Stripe).

Low (P3):
25. Internationalization for emails.
26. Tax handling (automatic tax, address collection).
27. Card expiration & upcoming renewal reminder emails.
28. Analytics around churn reasons (cancellation survey integration).

## Suggested Data Model Extensions
Add columns to subscriptions:
- billing_interval (TEXT: 'monthly'|'yearly')
- trial_start, trial_end (TIMESTAMPTZ)
- canceled_at, ended_at
- pending_plan, pending_interval, pending_effective_date
- last_event_id (for idempotency tracking)
- original_price_id, current_price_id

Create table: subscription_events (id, user_id, event_type, old_plan, new_plan, metadata JSONB, created_at)

## Test Coverage Recommendations
- Unit test plan change preview for upgrade, downgrade, interval switch.
- Webhook event idempotency (duplicate delivery ignored).
- Trial to active transition email.
- Payment failure escalation path (simulate multiple failures → cancellation).
- Cancellation scheduling vs immediate cancellation.

## Monitoring / Alerting
Implement metrics:
- webhook_processing_time_ms
- webhook_failures_total
- subscription_upgrades_total
- subscription_downgrades_total
- payment_failures_total
- active_trials_count

Add alerts on sustained webhook failures or spike in payment failures.

## Final Summary
Current implementation provides a functional baseline (checkout, subscription update, basic emails, proration preview) but lacks several production-critical controls around security, idempotency, lifecycle completeness, and data integrity. The most urgent fixes involve securing endpoints, canonicalizing plan/price mappings, centralizing subscription creation via webhooks, and persisting missing lifecycle data (billing interval, pending changes). Without these, risks include unauthorized subscription manipulation, inconsistent user entitlements, and billing confusion.

This audit can serve as a blueprint for hardening. No code changes were made— only analysis.

END OF REPORT
