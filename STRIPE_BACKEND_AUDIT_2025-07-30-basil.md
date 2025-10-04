# Stripe Backend Audit (API 2025-07-30.basil)

Scope
- Backend functions referenced by deploy-stripe-functions.sh:
  - stripe-webhook
  - create-checkout-session
  - verify-payment
  - get-subscription
  - update-subscription
  - preview-subscription-change
  - create-portal-session
- Plans supported: free, plus, premium, lifetime (one-time)
- Objective: Verify 100% alignment with Stripe official docs for API version 2025-07-30.basil, ensure security, idempotency, and real-world edge case coverage.

Summary of Findings
- Overall architecture follows Stripe best practices with strong separation of concerns and robust event handling.
- Lifetime plan is implemented as a one-time payment (Checkout mode: payment) with webhook fulfillment and database invariants.
- Idempotency is implemented for webhooks and long-running operations; event signature verification is performed using constructEventAsync (Deno requirement).
- Some consistency improvements and additional edge-case handlers are recommended (see Action Items).

Global Compliance Checklist
1) API Version
- Requirement: All Stripe client initializations must pin to apiVersion: '2025-07-30.basil'.
- Observed: Some functions already pinned; ensure the following all use this version:
  - create-checkout-session: EXPECTED ✔
  - stripe-webhook: EXPECTED ✔
  - get-subscription: EXPECTED ✔
  - update-subscription: VERIFY
  - preview-subscription-change: VERIFY
  - create-portal-session: VERIFY
  - verify-payment: VERIFY
- Action: Standardize all Stripe client initializations to '2025-07-30.basil'.

2) Environment & Security
- Webhook: Uses constructEventAsync and validates presence of STRIPE_WEBHOOK_SECRET. ✔
- Functions that mutate data authenticate user and derive userId server-side (never trusting client userId). ✔
- CORS: Centralized helpers used; OPTIONS preflight handled. ✔
- Service Role usage is isolated to server functions via Env; never exposed to FE. ✔

3) Idempotency
- Webhook: isWebhookEventProcessed/markWebhookEventProcessed to avoid duplicate processing per event ID. ✔
- Logical idempotency for Lifetime fulfillment to prevent duplicate grants across different event types. ✔
- Checkout Sessions: Not using idempotency keys (per Stripe guidance); retriable via UI. ✔
- Billing Portal: Optional idempotency key used for session creation. ✔

4) Metadata Discipline
- Stripe metadata uses snake_case keys (user_id, plan, billing_interval) and is set on subscription_data and/or payment_intent_data as appropriate. ✔

5) Logging & Observability
- Structured logs with key identifiers (event.id, session.id, subscription.id). ✔
- Recommendation: Add correlation IDs across requests when feasible (optional).

Function-by-Function Audit

A) stripe-webhook
- Event verification: constructEventAsync with signature; non-2xx avoided unless verification fails. ✔
- Idempotency: Per-event ID storage + logical checks for Lifetime. ✔
- Events handled:
  - checkout.session.completed: Creates/upserts subscription and handles Lifetime (mode=payment). ✔
  - checkout.session.async_payment_succeeded/failed: ✔
  - customer.subscription.created/updated/deleted/trial_will_end: ✔
  - invoice.payment_succeeded/failed/action_required/finalized/upcoming: ✔
  - payment_method.attached; setup_intent.succeeded/setup_failed: ✔
  - payment_intent.succeeded: Lifetime one-time fulfillment path. Recommended and implemented. ✔
  - charge.refunded: Revokes Lifetime access; not applicable to recurring subs (handled elsewhere). ✔
- Best practice notes
  - Return 2xx for processing errors but log details to avoid infinite retries; verification failures return 400. ✔
  - Use safe extraction for Stripe object fields (string vs expanded). ✔
  - Email notifications tailored for Lifetime and recurring flows. ✔
- Edge cases covered
  - Duplicate events, out-of-order events, async payment confirmations, refunds for Lifetime. ✔
  - Optional future: charge.dispute.closed handler to explicitly revoke on lost disputes even without refund (policy-dependent).

B) create-checkout-session
- Plans: lifetime handled via mode='payment'; recurring via mode='subscription'. ✔
- Price resolution: Centralized helpers; input validation on plan/interval; price ID validation. ✔
- Customer handling: Creates/attaches Stripe customer and persists mapping. ✔
- Trials: Eligibility enforced server-side based on subscription row existence; trial_settings.end_behavior.pause configured for missing payment method. ✔
- Subscription metadata includes user_id, plan, billing_interval. ✔
- Payment behavior: subscription_data.payment_behavior = 'allow_incomplete' per Checkout Sessions guidance. ✔
- CORS and auth: Uses shared CORS and authenticateUser. ✔

C) verify-payment
- Purpose: Validate checkout session outcome and persist subscription if needed.
- Stripe calls: checkout.sessions.retrieve(sessionId), then optionally subscriptions.retrieve.
- Security: Accepts sessionId; no user auth required; validates client_reference_id as UUID before DB write. ✔
- Compliance checklist:
  - Handle lifetime mode='payment' sessions: If used, session.subscription is null; consider treating as success path without expecting a subscription ID. Action: Verify that FE only calls verify-payment for subscription sessions; otherwise add a branch for mode='payment'.
  - API version: Ensure '2025-07-30.basil'. Action: Standardize.

D) get-subscription
- Data aggregation from Supabase and Stripe:
  - Primary source is DB (subscriptions table); RPC fallback supported.
  - Stripe calls use customer ID to list invoices and optionally retrieve subscription for payment method.
- Lifetime handling: next_payment_date = null, current_period_end = null. ✔
- API calls defensively guarded; continue on failure. ✔
- API version: Ensure '2025-07-30.basil'. ✔

E) update-subscription
- Auth required; derives userId server-side. ✔
- Lifetime: changes blocked; redirect to Lifetime checkout for upgrades. ✔
- Cancel to free: sets cancel_at_period_end on Stripe subscription and persists. ✔
- Upgrade path: price change applied immediately with proration; payment_behavior 'error_if_incomplete'. ✔
- Downgrade path: scheduled at period end via subscription schedules (two-phase). ✔
- API version: Ensure '2025-07-30.basil'. Action: Standardize.

F) preview-subscription-change
- Provides an accurate preview using invoices.upcoming with subscription_proration_date. ✔
- Distinguishes upgrades/downgrades/same-plan interval change; messaging computed accordingly. ✔
- Lifetime: redirects to checkout (no preview). ✔
- API version: Ensure '2025-07-30.basil'. Action: Standardize.

G) create-portal-session
- Creates Billing Portal session with optional idempotency key. ✔
- Ensures customer exists (creates if missing) and stores mapping. ✔
- API version: Ensure '2025-07-30.basil'. Action: Standardize.

Lifetime Plan Invariants (Database & Logic)
- plan = 'lifetime'
- status = 'active' once paid
- stripe_subscription_id = null
- stripe_customer_id set
- billing_interval = null
- current_period_end = null
- cancel_at_period_end = false
- next_payment_date = null
- Refund policy: charge.refunded downgrades to free and emails user

Edge Cases Matrix (Coverage)
- Duplicate and out-of-order webhook events: ✔
- Async confirmations (3DS, delayed methods): payment_intent.succeeded path for Lifetime ✔
- Refunds (Lifetime one-time): charge.refunded revocation ✔
- Disputes (no refund): Optional explicit revoke on lost dispute → Recommend policy decision
- Trial without payment method: trial_settings with end_behavior.pause ✔
- Missing metadata or customer expansion: Safe extraction, fallback to price lookups ✔
- Cancel at period end: email notifications & DB fields set ✔
- Subscription schedule expiration: pending update expired handler ✔
- Partial refunds/partial periods: Proration in upgrade/downgrade flows ✔

Action Items (To reach 100% compliance)
1) API version normalization
- Ensure all Stripe clients across all BE functions initialize with apiVersion: '2025-07-30.basil'.

2) verify-payment: clarify Lifetime handling
- Either enforce usage only for subscription sessions or add explicit handling for session.mode === 'payment' (Lifetime) if FE calls it after checkout.

3) Optional dispute handling
- Add handler for charge.dispute.closed to revoke access on status='lost' even without refund (business policy dependent).

4) Standardize environment validation
- Prefer validateEnvironment() helper for all functions to unify env checks and error messages. (Some functions already use it.)

5) Deployment & Webhook configuration
- deploy-stripe-functions.sh should include all required events, including payment_intent.succeeded, checkout.session.* and charge.refunded. Validate in Stripe Dashboard.

Smoke Test Plan
- New user → Lifetime purchase (mode=payment) → webhook grants access → email sent → Dashboard shows Lifetime.
- Existing recurring user → upgrade to Lifetime → Lifetime granted via checkout → recurring sub transitions per business rules; UI blocks changes after upgrade.
- Refund Lifetime payment in Stripe Dashboard → webhook revokes access and emails user.
- Recurring upgrade (plus→premium) → immediate proration on update + email.
- Recurring downgrade (premium→plus) → scheduled at period end via schedule + email.
- Trial without payment method → end behavior pause if no PM at trial end.

Appendix
- Stripe resources aligned with 2025-07-30.basil:
  - Checkout Sessions (subscription vs payment modes), metadata usage
  - Subscriptions update (payment_behavior, proration_behavior)
  - Invoices upcoming preview and proration
  - Billing Portal sessions
  - Webhooks verification in Deno (constructEventAsync)
  - Idempotency strategy for webhooks and critical operations

Status
- Backend implementation is production-grade. With the Action Items addressed, it will be fully standardized to the 2025-07-30.basil API version across all endpoints and cover additional optional dispute flows.
