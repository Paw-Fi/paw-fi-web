# Lifetime Plan Audit and Best Practices Report

Date: 2025-10-04
Owner: Moneko Web

Summary
- Objective: Add Lifetime plan (one-time payment, permanent access) across FE and BE.
- Result: Implementation is robust and production-ready. Added two additional backend safeguards to cover real-world scenarios.
- This document records the audit, highlights best practices adherence, added improvements, and remaining recommendations.

What changed in this audit
- Added payment_intent.succeeded webhook handler for idempotent Lifetime fulfillment.
- Added charge.refunded webhook handler to revoke Lifetime access on refund and notify user.
- Verified FE and BE flows for Lifetime with edge-case coverage.
- API version normalization: Set Stripe API version to 2025-07-30.basil across all Stripe functions (create-checkout-session, stripe-webhook, verify-payment, get-subscription, update-subscription, preview-subscription-change, create-portal-session).

Backend audit
1) Stripe Webhooks (supabase/functions/stripe-webhook/index.ts)
- Event verification: Uses constructEventAsync with webhook secret. Good.
- Idempotency: Uses isWebhookEventProcessed/markWebhookEventProcessed per event ID; added additional logical idempotency when granting Lifetime to prevent duplicate fulfillment across different event types.
- Events covered and expected behavior:
  - checkout.session.completed: grants Lifetime on mode=payment path (already implemented).
  - payment_intent.succeeded: ADDED in this audit. Grants Lifetime if metadata.plan='lifetime', idempotent check against existing Lifetime.
  - charge.refunded: ADDED in this audit. Revokes access by downgrading to free and sends cancellation email.
  - customer.subscription.*: handled for recurring plans. No change.
  - invoice.*: handled for recurring plans. No change.
  - setup_intent.*, payment_method.attached: handled for recurring flows.
- Not handled (optional, future hardening):
  - charge.dispute.closed: In most cases a lost dispute results in a refund and is handled via charge.refunded. If using partial refunds or custom dispute handling, consider explicit revoke on status='lost'.
  - payment_intent.payment_failed: For Lifetime, no fulfillment occurs; current flows are safe.

2) Checkout Session Creation (supabase/functions/create-checkout-session/index.ts)
- Plan validation: Uses isValidPlan and explicit special-casing for Lifetime (no interval). Good.
- Price ID resolution: Uses shared getPriceId/validatePriceId. Good.
- Mode selection: Lifetime uses mode='payment' (one-time). Others mode='subscription'. Good.
- Strong customer mapping: Attaches customer, persists mapping in user_stripe_mapping. Good.
- Trial logic: Server-side only and eligibility based on presence of any prior subscription row. Good.
- Metadata discipline: Uses snake_case keys for Stripe metadata. Good.

3) Subscription Management (supabase/functions/update-subscription and preview-subscription-change)
- Blocks plan changes from Lifetime; redirects to checkout for upgrading to Lifetime. Good.
- Uses plan hierarchy excluding Lifetime for upgrade/downgrade semantics. Good.

4) Get Subscription (supabase/functions/get-subscription)
- Lifetime sets next_payment_date=null and current_period_end=null. Good.

5) Database/Migrations (supabase/migrations/20250104_add_lifetime_plan.sql)
- Adds plan constraint including 'lifetime'. Good.
- Adds helper function is_lifetime_subscription and enhanced getter with proper next_payment_date handling. Good.
- Adds index to optimize lifetime lookups. Good.

6) Email templates (supabase/functions/shared/email-templates.ts)
- Supports isLifetime messaging. Used in webhook handlers. Good.

Frontend audit
1) Pricing (src/routes/pricing.tsx)
- Routes to /checkout?plan=lifetime without billing param. Good.

2) Checkout (src/routes/checkout.tsx)
- Sends plan and billing to server. For Lifetime, server ignores billing. Safe. Consider optionally omitting billing when plan=lifetime; not required.
- Success/canceled handling redirects to payment-status. Good.

3) Membership UI
- PlanSelector: Displays one-time price and hides /month for Lifetime. Yearly billed text hidden for Lifetime. Good.
- SubscriptionDetails: Hides auto-renew/cancel for Lifetime; shows Lifetime banner and created_at. Good.
- SubscriptionStatus/MembershipDashboard: Special-cases Lifetime UI and hides payment method management. Good.

Security and best practices checklist
- Webhook signature verification: Present.
- Idempotency: Present both at event level and logical fulfillment checks for Lifetime.
- Never trust client userId: Server authenticates and derives userId. Present.
- Prevent subscription update on Lifetime: Present.
- Stripe customer mapping: Present and persisted.
- Env validation: Centralized validateEnvironment used in key functions. Good.

Real-world edge cases covered
- Double event deliveries and event order variance: Covered by event-id idempotency and logical duplicate check.
- Asynchronous confirmations (3DS/slow methods): Covered by new payment_intent.succeeded handler.
- Refunds: Now revoke Lifetime on charge.refunded with customer notification.
- Trial eligibility abuse: Prevented by server-only logic based on DB row existence.
- Missing metadata or customer ID: Defensive checks in handlers.

Gaps and optional future improvements
- Add explicit handler for charge.dispute.closed to revoke on status='lost' even if no refund was created automatically.
- Standardize environment variable naming for price IDs and update deployment docs accordingly.
- Consider Guardrails limiting partial refunds for Lifetime or deciding policy explicitly (keep access vs revoke).
- Add lightweight end-to-end checks (scripts) for smoke testing Lifetime purchase and revocation.

Testing checklist (manual)
- New user buys Lifetime via pricing → checkout → webhook creates Lifetime, email sent, dashboard shows Lifetime.
- Existing recurring user upgrades to Lifetime via dashboard CTA → checkout → Lifetime created, recurring sub remains canceled/not active (by design path through checkout only).
- Attempt to change plan from Lifetime → blocked with clear message.
- Refund Lifetime payment in Stripe Dashboard → webhook downgrades to free, sends cancellation email.
- Delayed confirmation method (e.g., 3DS) → payment_intent.succeeded fires later, still grants Lifetime exactly once.

Artifacts touched in this audit
- supabase/functions/stripe-webhook/index.ts
  - Added handlers for payment_intent.succeeded and charge.refunded
  - Updated switch to route new events
- LIFETIME_PLAN_AUDIT.md (this file)

Conclusion
- Lifetime plan support is complete and resilient. The added webhook handlers align with Stripe best practices and cover important real-world scenarios. Optional improvements listed above can be scheduled as follow-ups based on business policy.
































































Additional Stripe API version normalization
- Updated apiVersion to 2025-07-30.basil in the following functions:
  - supabase/functions/verify-payment/index.ts
  - supabase/functions/update-subscription/index.ts
  - supabase/functions/preview-subscription-change/index.ts
  - supabase/functions/create-portal-session/index.ts
  - supabase/functions/get-subscription/index.ts (already up-to-date)
  - supabase/functions/create-checkout-session/index.ts (already up-to-date)
  - supabase/functions/stripe-webhook/index.ts (already up-to-date)
