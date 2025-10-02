# Stripe Subscription Welcome Email Fix

## Problem
Users were only receiving the **invoice payment email** ("Invoice Ready: Premium Subscription") but **NOT** the **subscription welcome email** when subscribing to a premium plan.

## Root Cause
The logic in `handleSubscriptionUpdated` function (line 442-443) was using an incorrect condition to detect new subscriptions:

```typescript
// ❌ WRONG - This almost always fails
const isNew = subscription.status === 'active' && 
             subscription.created === subscription.start_date
```

### Why This Failed:
When Stripe creates a new subscription, there's often a **small time difference** (even milliseconds) between:
- `subscription.created` - Timestamp when the subscription object was created
- `subscription.start_date` - Timestamp when the subscription period starts

Since these timestamps are rarely exactly equal, the condition `subscription.created === subscription.start_date` would almost always be `false`, preventing the welcome email from being sent.

## Solution
Changed the logic to check if there's **no previous subscription record** in the database:

```typescript
// ✅ CORRECT - Check if user had no previous subscription
const isNew = subscription.status === 'active' && !previousSub
```

### Why This Works:
- For **new subscriptions**: `previousSub` will be `null` (no record exists), so `!previousSub` is `true` → Welcome email sent ✅
- For **subscription updates**: `previousSub` will exist, so `!previousSub` is `false` → Update email sent instead ✅
- For **renewals**: `previousSub` exists with same plan → No email sent (correct behavior) ✅

## Email Flow (After Fix)

### New Subscription:
1. **`checkout.session.completed`** → Updates customer ID
2. **`customer.subscription.created`** → Sends **welcome email** (now fixed!)
3. **`invoice.payment_succeeded`** → Sends **invoice receipt email**

Result: User receives **2 emails** (welcome + invoice) ✅

### Subscription Update (Upgrade/Downgrade):
1. **`customer.subscription.updated`** → Sends **change confirmation email**
2. **`invoice.payment_succeeded`** → Sends **invoice receipt email**

Result: User receives **2 emails** (change + invoice) ✅

### Subscription Renewal:
1. **`customer.subscription.updated`** → No email (same plan, not new)
2. **`invoice.payment_succeeded`** → Sends **invoice receipt email**

Result: User receives **1 email** (invoice only) ✅

## Files Modified
- `supabase/functions/stripe-webhook/index.ts` (lines 441-445)

## Testing
To verify the fix works:

1. **Test New Subscription:**
   ```bash
   # Subscribe to a plan via Stripe Checkout
   # Expected: 2 emails (welcome + invoice)
   ```

2. **Test Subscription Update:**
   ```bash
   # Upgrade/downgrade existing subscription
   # Expected: 2 emails (change confirmation + invoice)
   ```

3. **Test Renewal:**
   ```bash
   # Wait for automatic renewal
   # Expected: 1 email (invoice only)
   ```

## Deployment
```bash
# Deploy the updated webhook function
cd supabase/functions
supabase functions deploy stripe-webhook --project-ref qbuynyxyemigtnvdujts
```

## Status
✅ **FIXED** - Welcome emails will now be sent for new subscriptions
