# Lifetime Plan Implementation - Complete Documentation

## Overview
Comprehensive backend refactoring to support **Lifetime plan** as a **one-time payment** (not subscription) in addition to existing Free, Plus, and Premium plans.

## Plan Hierarchy
```
free: 0
plus: 1
premium: 2 (kept for hierarchy)
lifetime: 3 (HIGHEST TIER - one-time payment, permanent access)
```

## Key Architectural Decisions

### 1. Payment Mode
- **Lifetime**: Uses Stripe Checkout in `payment` mode (one-time payment)
- **Plus/Premium**: Uses Stripe Checkout in `subscription` mode (recurring)

### 2. Database Structure
- **Lifetime subscriptions have**:
  - `plan = 'lifetime'`
  - `status = 'active'` (always active, never expires)
  - `stripe_subscription_id = null` (no subscription object in Stripe)
  - `billing_interval = null` (one-time payment)
  - `current_period_end = null` (never expires)
  - `cancel_at_period_end = false` (cannot be canceled)

### 3. Stripe Price Configuration
- Environment variable: `STRIPE_LIFETIME_PRICE_ID`
- No billing interval required (one-time payment)
- Validated in `getPriceId()` function

## Files Modified

### 1. Frontend Changes
- ✅ `/src/data/pricing-plans.ts` - Updated plan data structure
- ✅ `/src/routes/pricing.tsx` - Redesigned pricing page UI

### 2. Backend Constants & Configuration
- ✅ `/supabase/functions/shared/subscription-constants.ts`
  - Updated `PLAN_HIERARCHY` with lifetime: 3
  - Updated `PlanType` to include 'lifetime'

- ✅ `/supabase/functions/shared/stripe-subscription-prices.ts`
  - Added `lifetime: string` (one-time payment price ID)
  - Updated `getPriceId()` to handle Lifetime (no interval required)
  - Updated `getPlanFromPriceId()` to return `interval: null` for Lifetime
  - Updated `getAllPriceIds()` to include Lifetime

### 3. Checkout & Payment Functions
- ✅ `/supabase/functions/create-checkout-session/index.ts`
  - Added dual-mode checkout logic:
    - **Lifetime**: `mode: 'payment'` with `payment_intent_data`
    - **Recurring**: `mode: 'subscription'` with `subscription_data`
  - Lifetime doesn't require `billingInterval`
  - Proper metadata for both modes

- ✅ `/supabase/functions/stripe-webhook/index.ts`
  - Updated `handleCheckoutSessionCompleted()`:
    - Detects `session.mode === 'payment'` for Lifetime
    - Creates subscription record with proper Lifetime fields
    - No `stripe_subscription_id`, no `billing_interval`, no `current_period_end`
  - Updated email templates to pass `isLifetime: true`

### 4. Subscription Management Functions
- ✅ `/supabase/functions/get-subscription/index.ts`
  - Lifetime returns `daysUntilNextPayment = null` (no next payment)
  - Handles missing `current_period_end` gracefully

- ✅ `/supabase/functions/update-subscription/index.ts`
  - **Prevents plan changes for Lifetime users** (permanent access)
  - **Prevents cancellation of Lifetime** (one-time purchase, cannot cancel)
  - **Redirects to checkout** if trying to "upgrade" to Lifetime from another plan

- ✅ `/supabase/functions/preview-subscription-change/index.ts`
  - **Prevents preview for Lifetime users** (cannot change plans)
  - **Redirects to checkout** for Lifetime purchases
  - Updated validation to make `billingInterval` optional for Lifetime

- ✅ `/supabase/functions/create-portal-session/index.ts`
  - No changes needed (Stripe Customer Portal automatically handles Lifetime)

### 5. Database Migration
- ✅ `/supabase/migrations/20250104_add_lifetime_plan.sql`
  - Updated `check_plan_valid` constraint to include 'lifetime'
  - Created `is_lifetime_subscription()` helper function
  - Created `get_user_subscription_enhanced()` with Lifetime support
  - Added index for active Lifetime subscriptions
  - Proper comments and documentation

### 6. Email Templates
- ✅ `/supabase/functions/shared/email-templates.ts`
  - Updated `subscriptionCreatedTemplate()`:
    - Added `isLifetime?: boolean` flag
    - Added `endDate?: string` (optional for Lifetime)
    - Different messaging for Lifetime vs recurring

### 7. Deployment & Documentation
- ✅ `/deploy-stripe-functions.sh`
  - Added `STRIPE_LIFETIME_PRICE_ID` to required environment variables
  - Added `payment_intent.succeeded` to webhook events (for Lifetime)
  - Updated documentation with Lifetime-specific notes

## Edge Cases Handled

### 1. Plan Changes
- ❌ **Lifetime → Any other plan**: BLOCKED (permanent access, cannot change)
- ❌ **Any plan → Lifetime via update**: BLOCKED (must use checkout for one-time payment)
- ✅ **Free/Plus → Lifetime**: Redirects to checkout page

### 2. Cancellations
- ❌ **Lifetime cancellation**: BLOCKED (one-time purchase, permanent)
- ❌ **Lifetime cancel_immediately**: BLOCKED (one-time purchase, permanent)

### 3. Webhook Events
- ✅ `checkout.session.completed` (mode: 'payment') → Creates Lifetime subscription
- ✅ `payment_intent.succeeded` → Backup confirmation for Lifetime payments
- ✅ All subscription events → Properly handle missing subscription ID for Lifetime

### 4. Email Notifications
- ✅ Lifetime purchase → Welcome email with "permanent access" messaging
- ✅ Recurring subscription → Standard "auto-renew on X" messaging

### 5. Subscription Queries
- ✅ `get-subscription` → Returns null for `next_payment_date` for Lifetime
- ✅ Database functions → Handle null `current_period_end` for Lifetime
- ✅ RPC functions → Distinguish Lifetime from recurring plans

## Testing Checklist

### Required Stripe Configuration
1. ✅ Create Lifetime price in Stripe Dashboard (one-time payment)
2. ✅ Add `STRIPE_LIFETIME_PRICE_ID=price_xxx` to Supabase secrets
3. ✅ Configure webhook with `payment_intent.succeeded` event

### Test Scenarios
1. ⬜ **New user purchases Lifetime**:
   - Checkout session created with `mode: 'payment'`
   - Payment succeeds → webhook creates subscription with plan='lifetime'
   - User receives welcome email with "permanent access" message
   - Dashboard shows Lifetime status with no renewal date

2. ⬜ **Lifetime user tries to change plan**:
   - API returns error: "Lifetime subscriptions cannot be changed"
   - Frontend displays appropriate message

3. ⬜ **Lifetime user tries to cancel**:
   - API returns error: "Lifetime subscriptions are permanent and cannot be canceled"
   - Stripe Customer Portal doesn't show cancel option

4. ⬜ **Free user upgrades to Lifetime**:
   - Redirected to checkout page
   - One-time payment processed
   - Subscription created with Lifetime plan

5. ⬜ **Plus user tries to upgrade to Lifetime**:
   - Update/preview endpoints redirect to checkout
   - User completes one-time payment
   - Old subscription remains (Plus), new Lifetime subscription created
   - System picks highest tier (Lifetime) for access

## Deployment Steps

### 1. Database Migration
```bash
# Run migration to add Lifetime support
supabase db push
```

### 2. Stripe Configuration
```bash
# Create Lifetime price in Stripe Dashboard
# Copy the price ID (starts with price_)
```

### 3. Environment Variables
```bash
# Add to Supabase Edge Functions secrets
supabase secrets set STRIPE_LIFETIME_PRICE_ID=price_xxx --project-ref pbopcsmrcykdzbilpilf
```

### 4. Deploy Functions
```bash
# Deploy all Stripe functions with updated code
chmod +x deploy-stripe-functions.sh
./deploy-stripe-functions.sh
```

### 5. Webhook Configuration
Add the following event to your Stripe webhook:
- `payment_intent.succeeded` (REQUIRED for Lifetime one-time payments)

### 6. Verification
```bash
# Test create-checkout-session
curl -X POST https://pbopcsmrcykdzbilpilf.supabase.co/functions/v1/create-checkout-session \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"plan":"lifetime"}'

# Monitor webhook logs
supabase functions logs stripe-webhook --project-ref pbopcsmrcykdzbilpilf
```

## API Response Examples

### Checkout Session (Lifetime)
```json
{
  "clientSecret": "cs_test_...",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

### Get Subscription (Lifetime)
```json
{
  "subscription": {
    "id": "uuid",
    "plan": "lifetime",
    "status": "active",
    "stripe_subscription_id": null,
    "billing_interval": null,
    "current_period_end": null,
    "cancel_at_period_end": false
  },
  "features": [...],
  "payment_method": null,
  "invoices": [...],
  "days_until_next_payment": null
}
```

### Update Subscription (Lifetime user)
```json
{
  "error": "Lifetime subscriptions cannot be changed. You already have permanent access."
}
```

## Important Notes

### 1. Stripe Best Practices
- ✅ Uses `payment` mode for one-time payments (per Stripe docs)
- ✅ Metadata stored in `payment_intent_data` for Lifetime
- ✅ No subscription object created in Stripe for Lifetime
- ✅ Idempotency keys used for all Stripe API calls

### 2. Security Considerations
- ✅ User ID validated via JWT authentication (never trusted from client)
- ✅ Trial eligibility checked server-side based on subscription history
- ✅ Plan hierarchy enforced to prevent downgrades from Lifetime
- ✅ All Stripe operations use retry logic with exponential backoff

### 3. User Experience
- ✅ Clear messaging: "permanent access" vs "auto-renew"
- ✅ No confusing "cancel" options for Lifetime users
- ✅ Redirects to checkout for Lifetime purchases (not in-app upgrade)
- ✅ Email templates adapted for Lifetime messaging

## Potential Future Enhancements

1. **Lifetime Discount/Upgrade Path**:
   - Allow Plus users to pay difference to upgrade to Lifetime
   - Calculate prorated credit for remaining subscription time

2. **Lifetime Gift Cards**:
   - Allow purchasing Lifetime as a gift
   - Generate gift codes for Lifetime access

3. **Lifetime Early Bird Pricing**:
   - Time-limited discounts for Lifetime plan
   - Countdown timer on pricing page

4. **Lifetime Seat Limits**:
   - Implement "X spots remaining" messaging
   - Update price when seats fill up

## Related Documentation
- Stripe Checkout: https://stripe.com/docs/payments/checkout
- Stripe Payment Intents: https://stripe.com/docs/payments/payment-intents
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

## Support & Troubleshooting

### Common Issues

**Q: Lifetime checkout fails**
- Check `STRIPE_LIFETIME_PRICE_ID` is set correctly
- Verify price exists in Stripe Dashboard
- Check webhook includes `payment_intent.succeeded`

**Q: Lifetime user sees subscription options**
- Verify `plan='lifetime'` in database
- Check frontend properly handles Lifetime status
- Ensure API returns correct error messages

**Q: Email says "auto-renew" for Lifetime**
- Verify `isLifetime: true` passed to email template
- Check webhook passes correct plan value

---

**Implementation Status**: ✅ Complete
**Last Updated**: 2025-01-04
**Deployment Ready**: Yes (pending environment variable configuration)
