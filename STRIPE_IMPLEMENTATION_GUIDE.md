# 🚀 Stripe Subscription Implementation Guide
**Based on Latest Stripe Documentation (2024-2025)**
**Generated**: January 1, 2025
**Stripe API Version**: 2023-10-16

---

## 📖 Table of Contents

1. [Critical Issues Overview](#critical-issues-overview)
2. [P0-1: Email Notifications Integration](#p0-1-email-notifications-integration)
3. [P0-2: Automatic Downgrade Implementation](#p0-2-automatic-downgrade-implementation)
4. [P0-3: Billing Interval Tracking](#p0-3-billing-interval-tracking)
5. [P0-4: Trial Period Implementation](#p0-4-trial-period-implementation)
6. [P0-5: Premium Plan Decision](#p0-5-premium-plan-decision)
7. [P0-6: Scheduled Downgrade Tracking](#p0-6-scheduled-downgrade-tracking)
8. [P0-7: Payment Failure Recovery](#p0-7-payment-failure-recovery)
9. [Testing Guide](#testing-guide)
10. [Deployment Checklist](#deployment-checklist)

---

## Critical Issues Overview

Based on the comprehensive audit and latest Stripe documentation, there are **7 Critical (P0) issues** that must be fixed before production deployment:

| Issue | Impact | Estimated Time | Priority |
|-------|--------|----------------|----------|
| P0-1: Email Notifications | Users won't receive ANY subscription emails | 4 hours | CRITICAL |
| P0-2: Automatic Downgrade | Canceled users keep premium access indefinitely | 2 hours | CRITICAL |
| P0-3: Billing Interval | Can't distinguish monthly vs yearly subscribers | 2 hours | CRITICAL |
| P0-4: Trial Period | Trial data not tracked or displayed | 1.5 hours | CRITICAL |
| P0-5: Premium Plan | Half-implemented feature causes confusion | 1 hour | CRITICAL |
| P0-6: Scheduled Downgrades | No way to track pending plan changes | 3 hours | CRITICAL |
| P0-7: Payment Recovery | High churn due to no retry emails/3DS | 4 hours | CRITICAL |

**Total Estimated Time**: 17.5 hours (2-3 days of focused work)

---

## P0-1: Email Notifications Integration

### 🎯 Objective
Integrate the existing `send-email` function with the Stripe webhook handler so users receive subscription lifecycle emails.

### 📚 Stripe Documentation Reference
- **Webhook Best Practices**: https://docs.stripe.com/webhooks/best-practices
- **Subscription Events**: https://docs.stripe.com/billing/subscriptions/webhooks

### 🔍 Current State
The `send-email` function exists with comprehensive templates but is **NEVER called** from `stripe-webhook/index.ts`. The webhook processes all events but sends zero emails.

### ✅ Implementation Steps

#### Step 1: Add Email Helper Function to Webhook Handler

**File**: `supabase/functions/stripe-webhook/index.ts`

Add this helper function after the imports:

```typescript
/**
 * Sends subscription-related emails by invoking the send-email function
 * @param supabase - Supabase client instance
 * @param eventType - Type of event (INSERT, UPDATE, DELETE)
 * @param subscriptionData - Current subscription data
 * @param oldData - Previous subscription data (for UPDATE events)
 */
async function sendSubscriptionEmail(
  supabase: SupabaseClient,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  subscriptionData: {
    user_id: string;
    plan: string;
    status: string;
    stripe_subscription_id?: string;
    [key: string]: any;
  },
  oldData?: any
): Promise<void> {
  try {
    console.log(`Attempting to send ${eventType} email for subscription ${subscriptionData.stripe_subscription_id}`);

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        type: eventType,
        table: 'subscriptions',
        record: subscriptionData,
        old_record: oldData,
        schema: 'public'
      }
    });

    if (error) {
      console.error('Failed to send subscription email:', error);
      // Don't fail webhook processing if email fails
    } else {
      console.log('Subscription email sent successfully');
    }
  } catch (err) {
    console.error('Error invoking send-email function:', err);
    // Don't fail webhook processing if email fails
  }
}
```

#### Step 2: Add Email Calls to Webhook Event Handlers

**Location**: `supabase/functions/stripe-webhook/index.ts`

##### For `checkout.session.completed`:

```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;

  // ... existing subscription creation code ...

  // After successful database insert/update:
  if (!subscriptionError) {
    await sendSubscriptionEmail(supabase, 'INSERT', {
      user_id: userId,
      plan,
      status: subscription.status,
      stripe_subscription_id: subscription.id
    });
  }

  break;
}
```

##### For `customer.subscription.created`:

```typescript
case 'customer.subscription.created': {
  const subscription = event.data.object as Stripe.Subscription;

  // ... existing subscription update code ...

  // After successful database update:
  if (!updateError) {
    await sendSubscriptionEmail(supabase, 'INSERT', {
      user_id: userId,
      plan,
      status: subscription.status,
      stripe_subscription_id: subscription.id
    });
  }

  break;
}
```

##### For `customer.subscription.updated`:

```typescript
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;

  // Get old subscription data before update
  const { data: oldSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  // ... existing subscription update code ...

  // After successful database update:
  if (!updateError) {
    await sendSubscriptionEmail(supabase, 'UPDATE', {
      user_id: userId,
      plan,
      status: subscription.status,
      stripe_subscription_id: subscription.id
    }, oldSubscription);
  }

  break;
}
```

##### For `customer.subscription.deleted`:

```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;

  // ... existing cancellation code ...

  // After successful database update:
  if (!updateError) {
    await sendSubscriptionEmail(supabase, 'UPDATE', {
      user_id: userId,
      plan: 'free',  // Downgraded to free
      status: 'canceled',
      stripe_subscription_id: null
    });
  }

  break;
}
```

#### Step 3: Add Trial Ending Reminder Email

```typescript
case 'customer.subscription.trial_will_end': {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata.user_id;

  // Get user details
  const { data: userData } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (userData) {
    // Send trial ending email directly
    await supabase.functions.invoke('send-email', {
      body: {
        type: 'direct',
        to: userData.email,
        subject: '🎯 Your Moneko Trial Ends in 3 Days',
        html: `
          <h1>Your Trial is Ending Soon</h1>
          <p>Hi ${userData.full_name},</p>
          <p>Your Moneko trial ends in 3 days on ${new Date(subscription.trial_end! * 1000).toLocaleDateString()}.</p>
          <p>Your subscription will automatically convert to the ${subscription.metadata.plan} plan.</p>
          <p><a href="https://moneko.io/dashboard/membership">Manage Your Subscription</a></p>
        `,
        text: `Your Moneko trial ends in 3 days. Visit https://moneko.io/dashboard/membership to manage your subscription.`
      }
    });
  }

  console.log(`Trial ending reminder sent for user: ${userId}`);
  break;
}
```

#### Step 4: Add Payment Failed Email

```typescript
case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice;
  const subscription = invoice.subscription;
  const attemptCount = invoice.attempt_count;

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
      last_event_id: event.id,
    })
    .eq('stripe_subscription_id', subscription);

  // Get user details
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id, users(email, full_name)')
    .eq('stripe_subscription_id', subscription)
    .single();

  if (subData?.users) {
    const { email, full_name } = subData.users;

    // Create Customer Portal session for payment update
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: invoice.customer as string,
      return_url: 'https://moneko.io/dashboard/membership',
    });

    let subject, message;
    if (attemptCount === 1) {
      subject = '⚠️ Payment Failed - Please Update Your Card';
      message = 'Your payment didn\'t go through. Update your payment method to keep your subscription active.';
    } else if (attemptCount >= 4) {
      subject = '🚨 Final Notice - Subscription Will Be Canceled';
      message = 'This is the final attempt. Update your payment method now to avoid losing access.';
    } else {
      subject = '⚠️ Payment Failed - Retry Attempt';
      message = `Payment attempt ${attemptCount} failed. Please update your payment method.`;
    }

    await supabase.functions.invoke('send-email', {
      body: {
        type: 'direct',
        to: email,
        subject,
        html: `
          <h1>Payment Failed</h1>
          <p>Hi ${full_name},</p>
          <p>${message}</p>
          ${invoice.last_finalization_error?.message ? `<p><strong>Reason:</strong> ${invoice.last_finalization_error.message}</p>` : ''}
          <p><a href="${portalSession.url}">Update Payment Method</a></p>
          <p><a href="${invoice.hosted_invoice_url}">View Invoice</a></p>
        `,
        text: `${message}\n\nUpdate payment: ${portalSession.url}\nView invoice: ${invoice.hosted_invoice_url}`
      }
    });
  }

  console.log(`Payment failed email sent, attempt ${attemptCount}`);
  break;
}
```

### 🧪 Testing

1. **Test Subscription Creation**:
```bash
stripe trigger customer.subscription.created
```
Check that welcome email is received.

2. **Test Trial Ending**:
```bash
stripe trigger customer.subscription.trial_will_end
```
Check that reminder email is received.

3. **Test Payment Failure**:
```bash
stripe trigger invoice.payment_failed
```
Check that payment failure email with portal link is received.

### ✅ Acceptance Criteria
- [ ] Users receive welcome email on new subscription
- [ ] Users receive notification on plan changes
- [ ] Users receive trial ending reminder 3 days before
- [ ] Users receive payment failure emails with recovery link
- [ ] Webhook processing continues even if email fails

---

## P0-2: Automatic Downgrade Implementation

### 🎯 Objective
Automatically downgrade users to the free plan when their subscription is canceled or expires.

### 📚 Stripe Documentation Reference
- **Subscription Cancellation**: https://docs.stripe.com/billing/subscriptions/cancel
- **Subscription Statuses**: https://docs.stripe.com/billing/subscriptions/overview#subscription-statuses

### 🔍 Current State
When `customer.subscription.deleted` webhook fires, the system updates status to "canceled" but **does NOT**:
- Set plan back to 'free'
- Clear stripe_subscription_id
- Properly revoke premium features

### ✅ Implementation Steps

#### Step 1: Update `customer.subscription.deleted` Handler

**File**: `supabase/functions/stripe-webhook/index.ts`

**Find** (around line 538):
```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription
  const userId = subscription.metadata.user_id

  console.log(`Subscription deleted for user: ${userId}`)

  // Update subscription status to canceled
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
```

**Replace with**:
```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription
  const userId = subscription.metadata.user_id

  console.log(`Subscription deleted for user: ${userId}, downgrading to free plan`)

  // ✅ Downgrade to free tier and clear Stripe references
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      plan: 'free',                    // ← SET TO FREE
      status: 'canceled',
      cancel_at_period_end: false,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      ended_at: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : new Date().toISOString(),
      stripe_subscription_id: null,   // ← CLEAR STRIPE ID
      stripe_customer_id: subscription.customer as string,  // Keep for history
      updated_at: new Date().toISOString(),
      last_event_id: event.id,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (updateError) {
    console.error('Error downgrading canceled subscription:', updateError)
    return new Response(JSON.stringify({
      received: true,
      processed: false,
      error: updateError.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Send cancellation confirmation email
  await sendSubscriptionEmail(supabase, 'UPDATE', {
    user_id: userId,
    plan: 'free',
    status: 'canceled',
    stripe_subscription_id: null
  });

  console.log('Subscription downgraded to free tier and email sent')

  return new Response(JSON.stringify({
    received: true,
    processed: true,
    action: 'downgraded_to_free'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

#### Step 2: Verify Frontend Access Control

**File**: `src/hooks/use-subscription.ts`

Ensure the hook checks the `plan` field, not just `status`:

```typescript
// Around line 270-280
const hasActiveSub = computed(() => {
  if (!subscriptionData.value) return false;

  // Check BOTH plan and status
  const isActiveStatus = ['active', 'trialing'].includes(subscriptionData.value.status);
  const isPaidPlan = ['plus', 'premium'].includes(subscriptionData.value.plan);

  // Must have active status AND paid plan
  return isActiveStatus && isPaidPlan;
});
```

#### Step 3: Add Database Check Function

**File**: `supabase/migrations/new_check_subscription_access.sql`

```sql
-- Function to check if user has premium access
CREATE OR REPLACE FUNCTION public.has_premium_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE
            s.user_id = p_user_id
            AND s.plan IN ('plus', 'premium')  -- Must be paid plan
            AND s.status IN ('active', 'trialing')  -- Must be active status
            AND (
                s.current_period_end > now()  -- Not expired
                OR s.status = 'trialing'      -- Or in trial
            )
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_premium_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_premium_access(UUID) TO service_role;
```

### 🧪 Testing

1. **Test Immediate Cancellation**:
```bash
# Cancel subscription immediately
curl -X DELETE https://api.stripe.com/v1/subscriptions/sub_xxx \
  -u $STRIPE_SECRET_KEY:
```
Expected: Plan changes to 'free', stripe_subscription_id becomes null

2. **Test End of Period Cancellation**:
```bash
# Cancel at period end
curl -X POST https://api.stripe.com/v1/subscriptions/sub_xxx \
  -u $STRIPE_SECRET_KEY: \
  -d "cancel_at_period_end=true"
```
Wait for period to end, then verify webhook fires and downgrade occurs.

3. **Frontend Access Test**:
- Subscribe to Plus plan
- Verify premium features accessible
- Cancel subscription
- Verify webhook processes
- Verify premium features immediately revoked
- Verify user shown free tier content

### ✅ Acceptance Criteria
- [ ] Canceled subscriptions automatically set plan to 'free'
- [ ] stripe_subscription_id is cleared (set to null)
- [ ] canceled_at and ended_at timestamps are recorded
- [ ] Frontend immediately revokes premium access
- [ ] Confirmation email sent to user
- [ ] Database function correctly checks access

---

## P0-3: Billing Interval Tracking

### 🎯 Objective
Properly track and store billing_interval (monthly/yearly) for all subscriptions.

### 📚 Stripe Documentation Reference
- **Subscription Object**: https://docs.stripe.com/api/subscriptions/object
- **Price Object**: https://docs.stripe.com/api/prices/object

### 🔍 Current State
The `billing_interval` column exists in the database but is **NOT populated** in webhook handlers.

### ✅ Implementation Steps

#### Step 1: Create Billing Interval Extraction Helper

**File**: `supabase/functions/stripe-webhook/index.ts`

Add this helper function after imports:

```typescript
/**
 * Extracts billing interval from Stripe subscription
 * Tries metadata first, then price lookup, then direct price check
 */
function extractBillingInterval(subscription: Stripe.Subscription): 'monthly' | 'yearly' {
  // 1. Try metadata (most reliable if set during creation)
  if (subscription.metadata?.billing_interval) {
    const interval = subscription.metadata.billing_interval;
    if (interval === 'monthly' || interval === 'yearly') {
      return interval;
    }
  }

  // 2. Try price ID lookup in our constants
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId) {
    try {
      const priceInfo = getPlanFromPriceId(priceId);
      if (priceInfo?.interval) {
        return priceInfo.interval;
      }
    } catch (err) {
      console.log('Could not find price in constants, using direct check');
    }
  }

  // 3. Check price interval directly from Stripe
  const recurringInterval = subscription.items.data[0]?.price.recurring?.interval;

  // Map Stripe intervals to our format
  if (recurringInterval === 'year') {
    return 'yearly';
  }

  // Default to monthly
  return 'monthly';
}
```

#### Step 2: Add to All Subscription INSERT Operations

**Location**: `checkout.session.completed` handler

**Find** (around line 366):
```typescript
await supabase.from('subscriptions').insert({
  user_id: userId,
  plan,
  status: subscription.status,
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  stripe_subscription_id: subscription.id,
  stripe_customer_id: customerId,
  cancel_at_period_end: subscription.cancel_at_period_end,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

**Replace with**:
```typescript
await supabase.from('subscriptions').insert({
  user_id: userId,
  plan,
  billing_interval: extractBillingInterval(subscription),  // ← ADD THIS
  status: subscription.status,
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  stripe_subscription_id: subscription.id,
  stripe_customer_id: customerId,
  cancel_at_period_end: subscription.cancel_at_period_end,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

#### Step 3: Add to All Subscription UPDATE Operations

**Locations**:
- `customer.subscription.created`
- `customer.subscription.updated`

**Find** (multiple locations):
```typescript
await supabase.from('subscriptions').update({
  plan,
  status: subscription.status,
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  cancel_at_period_end: subscription.cancel_at_period_end,
  updated_at: new Date().toISOString(),
})
```

**Replace with**:
```typescript
await supabase.from('subscriptions').update({
  plan,
  billing_interval: extractBillingInterval(subscription),  // ← ADD THIS
  status: subscription.status,
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  cancel_at_period_end: subscription.cancel_at_period_end,
  updated_at: new Date().toISOString(),
})
```

#### Step 4: Update Frontend to Display Billing Interval

**File**: `src/components/membership/MembershipDashboard.tsx`

```typescript
// Around line 100-120, in the Overview tab
<div className="grid grid-cols-2 gap-4">
  <div>
    <p className="text-sm text-muted-foreground">Plan</p>
    <p className="text-lg font-semibold capitalize">{subscription.plan}</p>
  </div>
  <div>
    <p className="text-sm text-muted-foreground">Billing</p>
    <p className="text-lg font-semibold capitalize">
      {subscription.billing_interval || 'monthly'}
    </p>
  </div>
  <div>
    <p className="text-sm text-muted-foreground">Status</p>
    <p className="text-lg font-semibold capitalize">{subscription.status}</p>
  </div>
  <div>
    <p className="text-sm text-muted-foreground">Next Payment</p>
    <p className="text-lg font-semibold">
      {subscription.next_payment_date
        ? new Date(subscription.next_payment_date).toLocaleDateString()
        : 'No upcoming payment'}
    </p>
  </div>
</div>
```

### 🧪 Testing

1. **Test Monthly Subscription**:
```bash
# Create checkout with monthly price
curl -X POST https://api.stripe.com/v1/checkout/sessions \
  -u $STRIPE_SECRET_KEY: \
  -d "line_items[0][price]=$STRIPE_PLUS_MONTHLY_PRICE_ID" \
  -d "mode=subscription"
```
Verify billing_interval is 'monthly' in database.

2. **Test Yearly Subscription**:
```bash
# Create checkout with yearly price
curl -X POST https://api.stripe.com/v1/checkout/sessions \
  -u $STRIPE_SECRET_KEY: \
  -d "line_items[0][price]=$STRIPE_PLUS_YEARLY_PRICE_ID" \
  -d "mode=subscription"
```
Verify billing_interval is 'yearly' in database.

3. **Frontend Display Test**:
- Subscribe with monthly plan
- Check dashboard shows "Billing: Monthly"
- Subscribe with yearly plan
- Check dashboard shows "Billing: Yearly"

### ✅ Acceptance Criteria
- [ ] billing_interval field populated on subscription creation
- [ ] billing_interval field updated on subscription changes
- [ ] Helper function correctly identifies interval from metadata
- [ ] Helper function falls back to price lookup if metadata missing
- [ ] Frontend correctly displays billing interval
- [ ] Proration calculations use correct interval

---

## P0-4: Trial Period Implementation

### 🎯 Objective
Track and display trial period information for subscriptions with free trials.

### 📚 Stripe Documentation Reference
- **Trial Periods**: https://docs.stripe.com/billing/subscriptions/trials
- **Subscription Statuses**: https://docs.stripe.com/billing/subscriptions/overview#subscription-statuses

### 🔍 Current State
Database has `trial_start` and `trial_end` fields but they're **NEVER populated** from Stripe webhooks.

### ✅ Implementation Steps

#### Step 1: Create Trial Extraction Helper

**File**: `supabase/functions/stripe-webhook/index.ts`

```typescript
/**
 * Extracts trial period timestamps from Stripe subscription
 */
function extractTrialFields(subscription: Stripe.Subscription): {
  trial_start: string | null;
  trial_end: string | null;
} {
  return {
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  };
}
```

#### Step 2: Add to Subscription INSERT

**Location**: `checkout.session.completed` handler

```typescript
await supabase.from('subscriptions').insert({
  user_id: userId,
  plan,
  billing_interval: extractBillingInterval(subscription),
  status: subscription.status,
  ...extractTrialFields(subscription),  // ← ADD THIS
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  stripe_subscription_id: subscription.id,
  stripe_customer_id: customerId,
  cancel_at_period_end: subscription.cancel_at_period_end,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

#### Step 3: Add to Subscription UPDATE

**Locations**: `customer.subscription.created`, `customer.subscription.updated`

```typescript
await supabase.from('subscriptions').update({
  plan,
  billing_interval: extractBillingInterval(subscription),
  status: subscription.status,
  ...extractTrialFields(subscription),  // ← ADD THIS
  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  cancel_at_period_end: subscription.cancel_at_period_end,
  updated_at: new Date().toISOString(),
})
```

#### Step 4: Implement Trial Ending Reminder

**Location**: Add new case in webhook switch statement

```typescript
case 'customer.subscription.trial_will_end': {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata.user_id;

  console.log(`Trial will end soon for user: ${userId}`);

  // Get user details
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    console.error('Error fetching user for trial ending:', userError);
    return new Response(JSON.stringify({
      received: true,
      processed: false,
      error: 'User not found'
    }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const trialEndDate = new Date(subscription.trial_end! * 1000);
  const planName = subscription.metadata.plan || 'Premium';

  console.log(`Sending trial ending email to: ${userData.email}`);

  // Send trial ending reminder email
  await supabase.functions.invoke('send-email', {
    body: {
      type: 'direct',
      to: userData.email,
      subject: `🎯 Your Moneko ${planName} Trial Ends in 3 Days`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1F2937; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { background: #F9FAFB; padding: 30px; border-radius: 8px; }
            .button { display: inline-block; background: #7458FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Your Trial is Ending Soon</h1>
            </div>
            <div class="content">
              <p>Hi ${userData.full_name},</p>

              <p>Your <strong>Moneko ${planName}</strong> trial ends in <strong>3 days</strong> on ${trialEndDate.toLocaleDateString()}.</p>

              <p>After your trial ends, your subscription will automatically continue at ${
                subscription.metadata.billing_interval === 'yearly' ? '$50/year' : '$9.99/month'
              }.</p>

              <p><strong>What happens next:</strong></p>
              <ul>
                <li>✨ Keep enjoying all premium features</li>
                <li>💳 First payment on ${trialEndDate.toLocaleDateString()}</li>
                <li>🔄 Cancel anytime before then to avoid charges</li>
              </ul>

              <div style="text-align: center;">
                <a href="https://moneko.io/dashboard/membership" class="button">
                  Manage Subscription
                </a>
              </div>

              <p>Questions? Reply to this email or reach out to <a href="mailto:hello@moneko.io">hello@moneko.io</a></p>
            </div>
            <div class="footer">
              <p>Thanks for trying Moneko!</p>
              <p>The Moneko Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userData.full_name},

Your Moneko ${planName} trial ends in 3 days on ${trialEndDate.toLocaleDateString()}.

After your trial ends, your subscription will automatically continue.

Manage your subscription: https://moneko.io/dashboard/membership

Questions? Email hello@moneko.io

Thanks for trying Moneko!
The Moneko Team
      `
    }
  });

  console.log('Trial ending reminder sent successfully');

  return new Response(JSON.stringify({
    received: true,
    processed: true,
    action: 'trial_reminder_sent'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

#### Step 5: Update Frontend to Display Trial Status

**File**: `src/components/membership/MembershipDashboard.tsx`

```typescript
// Add trial status indicator
{subscription.status === 'trialing' && subscription.trial_end && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2">
      <span className="text-2xl">🎉</span>
      <div>
        <h3 className="font-semibold text-blue-900">Trial Active</h3>
        <p className="text-sm text-blue-700">
          Your trial ends on {new Date(subscription.trial_end).toLocaleDateString()}.
          {' '}
          ({Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
        </p>
      </div>
    </div>
  </div>
)}
```

### 🧪 Testing

1. **Test Trial Creation**:
```bash
# Create subscription with 30-day trial
curl -X POST https://api.stripe.com/v1/subscriptions \
  -u $STRIPE_SECRET_KEY: \
  -d "customer=cus_xxx" \
  -d "items[0][price]=$STRIPE_PLUS_MONTHLY_PRICE_ID" \
  -d "trial_period_days=30"
```
Verify trial_start and trial_end are populated.

2. **Test Trial Ending Event**:
```bash
# Trigger trial ending reminder (3 days before)
stripe trigger customer.subscription.trial_will_end
```
Verify email is sent 3 days before trial ends.

3. **Frontend Display Test**:
- Create trial subscription
- Check dashboard shows "Trial Active" banner
- Check days remaining calculated correctly
- Check trial end date displayed

### ✅ Acceptance Criteria
- [ ] trial_start and trial_end populated on subscription creation
- [ ] trial_start and trial_end updated on subscription changes
- [ ] Trial ending reminder email sent 3 days before expiration
- [ ] Frontend displays trial status banner
- [ ] Frontend shows days remaining in trial
- [ ] Status changes from 'trialing' to 'active' after trial ends

---

## P0-5: Premium Plan Decision

### 🎯 Objective
Make a decision: fully implement Premium plan OR completely remove it from the application.

### 📚 Stripe Documentation Reference
- **Subscription Creation**: https://docs.stripe.com/api/subscriptions/create
- **Pricing Tables**: https://docs.stripe.com/payments/checkout/pricing-table

### 🔍 Current State
Premium plan appears in UI but redirects to email waitlist. No actual Stripe integration exists.

### ✅ Option A: Remove Premium Plan (Recommended for Quick Launch)

**Estimated Time**: 1 hour
**Recommended**: ✅ Yes - cleaner, faster to deploy

#### Step 1: Update Pricing Plans Data

**File**: `src/data/pricing-plans.ts`

```typescript
// Remove premium plan from exports
export const pricingPlans = [
  freePlan,
  plusPlan,
  // premiumPlan, // ❌ REMOVE THIS LINE
];

// Or keep it but mark as "Coming Soon"
export const premiumPlan = {
  ...premiumPlan,
  comingSoon: true,  // Add this flag
};
```

#### Step 2: Update Plan Selector

**File**: `src/components/membership/PlanSelector.tsx`

```typescript
// Filter out premium or mark as disabled
const availablePlans = pricingPlans.filter(p => p.id !== 'premium');

// OR disable premium selection
<Button
  disabled={plan.id === 'premium' || plan.comingSoon}
  onClick={() => handleSelectPlan(plan.id)}
>
  {plan.id === 'premium' ? 'Coming Soon' : 'Select Plan'}
</Button>
```

#### Step 3: Update Database Constraint

**File**: New migration `supabase/migrations/remove_premium_plan.sql`

```sql
-- Update constraint to only allow free and plus
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS check_plan_valid;

ALTER TABLE public.subscriptions
ADD CONSTRAINT check_plan_valid CHECK (plan IN ('free', 'plus'));

-- Update subscription constants
ALTER TABLE public.subscription_events
DROP CONSTRAINT IF EXISTS check_plan_valid;

ALTER TABLE public.subscription_events
ADD CONSTRAINT check_plan_valid CHECK (
  old_plan IN ('free', 'plus') OR old_plan IS NULL
  AND new_plan IN ('free', 'plus') OR new_plan IS NULL
);
```

#### Step 4: Update Constants

**File**: `supabase/functions/shared/subscription-constants.ts`

```typescript
export const PLAN_HIERARCHY = {
  free: 0,
  plus: 1,
  // premium: 2, // ❌ REMOVE THIS
} as const;

export type PlanType = 'free' | 'plus'; // Remove 'premium'
```

### ✅ Option B: Fully Implement Premium Plan

**Estimated Time**: 6 hours
**Recommended**: ❌ No - unless premium features are ready

#### Step 1: Create Premium Prices in Stripe Dashboard

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create "Moneko Premium" product
3. Add two prices:
   - Monthly: $19.99/month → Copy price ID
   - Yearly: $100/year ($8.33/month) → Copy price ID

#### Step 2: Add Environment Variables

```bash
# .env.local and Supabase Edge Function secrets
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxxxxxxxxxxx
```

#### Step 3: Update Price Configuration

**File**: `supabase/functions/shared/stripe-subscription-prices.ts`

```typescript
export interface SubscriptionPrices {
  plus: {
    monthly: string;
    yearly: string;
  };
  premium: {  // ← ADD THIS
    monthly: string;
    yearly: string;
  };
}

export function getSubscriptionPrices(): SubscriptionPrices {
  const env = getValidatedEnv();

  return {
    plus: {
      monthly: env.stripePlusMonthlyPriceId,
      yearly: env.stripePlusYearlyPriceId,
    },
    premium: {  // ← ADD THIS
      monthly: env.stripePremiumMonthlyPriceId,
      yearly: env.stripePremiumYearlyPriceId,
    },
  };
}
```

#### Step 4: Remove Waitlist Redirects

**File**: `src/routes/pricing.tsx`

```typescript
const handleSubscribe = async (plan: string, isTrial: boolean = false) => {
  // Remove this check:
  // if (plan === "premium") {
  //   window.location.href = "mailto:hello@moneko.io?subject=Waitlist%20Request..."
  //   return;
  // }

  // Just proceed with normal flow for all plans
  if (hasActiveSub) {
    navigate({ to: "/dashboard" });
    return;
  }

  // Normal checkout flow works for premium now
  const { error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan, billingInterval, userId, successUrl, cancelUrl, isTrial }
  });
  // ...
}
```

**File**: `src/components/membership/PlanSelector.tsx`

```typescript
const handleSelectPlan = (planId: string) => {
  // Remove this check:
  // if(planId === "premium") {
  //   toast.info("Premium plan is coming soon!");
  //   return;
  // }

  // Normal flow for all plans
  if(planId === "free") {
    toast.info("To downgrade to free, please cancel your subscription");
    return;
  }

  // Rest of normal logic...
}
```

### 🧪 Testing

**For Option A (Remove)**:
- [ ] Premium plan not shown in pricing page
- [ ] Premium plan not selectable in dashboard
- [ ] Database rejects premium plan values
- [ ] No references to premium in codebase

**For Option B (Implement)**:
- [ ] Premium monthly checkout works
- [ ] Premium yearly checkout works
- [ ] Premium features accessible after subscription
- [ ] Upgrade from Plus to Premium works
- [ ] Downgrade from Premium to Plus works

### ✅ Acceptance Criteria
- [ ] Decision documented and implemented
- [ ] UI consistent with decision (removed OR fully functional)
- [ ] Database constraints match decision
- [ ] No half-implemented premium references remain

---

## P0-6: Scheduled Downgrade Tracking

### 🎯 Objective
Track and apply pending plan changes scheduled for end of billing period (downgrades).

### 📚 Stripe Documentation Reference
- **Subscription Updates**: https://docs.stripe.com/api/subscriptions/update
- **Proration Behavior**: https://docs.stripe.com/billing/subscriptions/prorations

### 🔍 Current State
Database has `pending_plan`, `pending_interval`, `pending_effective_date` fields but they're **NEVER used**.

### ✅ Implementation Steps

#### Step 1: Update Subscription Change Handler

**File**: `supabase/functions/update-subscription/index.ts`

**Find** the `change_plan` case (around line 165):

```typescript
case 'change_plan': {
  // ... existing validation code ...

  const isUpgrade = PLAN_HIERARCHY[plan] > PLAN_HIERARCHY[currentPlan];
  const prorationBehavior = isUpgrade ? 'always_invoice' : 'create_prorations';

  // Update Stripe subscription
  const updatedSubscription = await stripe.subscriptions.update(
    subscription.stripe_subscription_id,
    {
      items: [{ id: subscriptionItemId, price: priceId }],
      proration_behavior: prorationBehavior,
      proration_date: prorationDate,
    }
  );

  // ... existing response code ...
}
```

**Replace with**:

```typescript
case 'change_plan': {
  // ... existing validation code ...

  const isUpgrade = PLAN_HIERARCHY[plan] > PLAN_HIERARCHY[currentPlan];
  const prorationBehavior = isUpgrade ? 'always_invoice' : 'create_prorations';

  console.log(`${isUpgrade ? 'Upgrade' : 'Downgrade'} from ${currentPlan} to ${plan}`);

  // Update Stripe subscription
  const updatedSubscription = await stripe.subscriptions.update(
    subscription.stripe_subscription_id,
    {
      items: [{ id: subscriptionItemId, price: priceId }],
      proration_behavior: prorationBehavior,
      proration_date: prorationDate,
    }
  );

  // ✅ For downgrades, track pending change in database
  if (!isUpgrade) {
    const effectiveDate = new Date(updatedSubscription.current_period_end * 1000);

    console.log(`Tracking pending downgrade to ${plan}, effective ${effectiveDate.toISOString()}`);

    const { error: pendingError } = await supabase
      .from('subscriptions')
      .update({
        pending_plan: plan,
        pending_interval: billingInterval,
        pending_effective_date: effectiveDate.toISOString(),
        previous_plan: currentPlan,
        previous_interval: subscription.billing_interval,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (pendingError) {
      console.error('Error tracking pending downgrade:', pendingError);
    }
  }

  // ... existing response code ...
}
```

#### Step 2: Validate Pending Changes in Webhook

**File**: `supabase/functions/stripe-webhook/index.ts`

Add this to the `customer.subscription.updated` handler:

```typescript
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;

  // ... existing extraction code ...

  // Get current subscription from database
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  // ✅ Check if this update matches a pending change
  let updateData: any = {
    plan,
    billing_interval: extractBillingInterval(subscription),
    status: subscription.status,
    ...extractTrialFields(subscription),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
    last_event_id: event.id,
  };

  // ✅ If pending change has been applied, clear pending fields
  if (currentSub?.pending_plan) {
    const effectiveDate = new Date(currentSub.pending_effective_date);
    const now = new Date();

    console.log(`Checking pending change: ${currentSub.pending_plan}, effective ${effectiveDate.toISOString()}`);

    // Check if we've reached the effective date AND plan matches
    if (now >= effectiveDate && plan === currentSub.pending_plan) {
      console.log('Pending change has been applied, clearing pending fields');

      updateData = {
        ...updateData,
        pending_plan: null,
        pending_interval: null,
        pending_effective_date: null,
        previous_plan: currentSub.plan,  // Track what we changed from
        previous_interval: currentSub.billing_interval,
      };
    }
  }

  // Apply update
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  // ... rest of handler ...
}
```

#### Step 3: Display Pending Changes in Frontend

**File**: `src/components/membership/MembershipDashboard.tsx`

```typescript
// Add pending change indicator in Overview tab
{subscription.pending_plan && subscription.pending_effective_date && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
    <div className="flex items-center gap-2">
      <span className="text-2xl">⏳</span>
      <div>
        <h3 className="font-semibold text-yellow-900">Scheduled Change</h3>
        <p className="text-sm text-yellow-700">
          Your plan will change to <strong className="capitalize">{subscription.pending_plan}</strong>
          {' '}
          ({subscription.pending_interval}) on{' '}
          <strong>{new Date(subscription.pending_effective_date).toLocaleDateString()}</strong>
        </p>
        <button
          onClick={handleCancelPendingChange}
          className="text-sm text-yellow-800 underline mt-2"
        >
          Cancel this change
        </button>
      </div>
    </div>
  </div>
)}
```

#### Step 4: Add Cancel Pending Change Function

**File**: `src/hooks/use-subscription.ts`

```typescript
const cancelPendingChange = async () => {
  if (!userId || !subscription.value) return;

  try {
    const { error } = await supabase.functions.invoke('update-subscription', {
      body: {
        userId,
        action: 'cancel_pending_change'
      }
    });

    if (error) throw error;

    // Refetch subscription
    await refetch();

    toast.success('Scheduled plan change canceled');
  } catch (err) {
    console.error('Error canceling pending change:', err);
    toast.error('Failed to cancel scheduled change');
  }
};

return {
  // ... existing returns ...
  cancelPendingChange,
};
```

#### Step 5: Add Cancel Pending Change Handler

**File**: `supabase/functions/update-subscription/index.ts`

```typescript
case 'cancel_pending_change': {
  // Clear pending fields
  const { error: clearError } = await supabase
    .from('subscriptions')
    .update({
      pending_plan: null,
      pending_interval: null,
      pending_effective_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (clearError) {
    console.error('Error clearing pending change:', clearError);
    return new Response(JSON.stringify({
      error: 'Failed to cancel pending change'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  console.log('Pending change canceled successfully');

  return new Response(JSON.stringify({
    success: true,
    message: 'Scheduled plan change canceled'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### 🧪 Testing

1. **Test Downgrade Scheduling**:
- Subscribe to Plus plan
- Downgrade to Free
- Check database: `pending_plan` = 'free', `pending_effective_date` = end of period
- Check dashboard shows "Scheduled Change" banner

2. **Test Downgrade Application**:
- Wait for period to end (or manually trigger webhook)
- Trigger `customer.subscription.updated` webhook
- Check database: `pending_*` fields cleared, `plan` = 'free'
- Check dashboard no longer shows pending change

3. **Test Cancel Pending Change**:
- Schedule a downgrade
- Click "Cancel this change" in dashboard
- Check database: `pending_*` fields cleared
- Check dashboard: banner disappears

### ✅ Acceptance Criteria
- [ ] Downgrades set pending_* fields in database
- [ ] Webhook validates and clears pending fields when applied
- [ ] Frontend displays scheduled change banner
- [ ] User can cancel pending changes
- [ ] Previous plan tracked for analytics

---

## P0-7: Payment Failure Recovery

### 🎯 Objective
Implement comprehensive payment failure recovery with retry emails, Customer Portal links, and 3DS authentication handling.

### 📚 Stripe Documentation Reference
- **Smart Retries**: https://docs.stripe.com/billing/revenue-recovery/smart-retries
- **Payment Intents**: https://docs.stripe.com/payments/payment-intents
- **3D Secure**: https://docs.stripe.com/payments/3d-secure

### 🔍 Current State
`invoice.payment_failed` webhook updates status but:
- Does NOT send email to user
- Does NOT provide retry link
- Does NOT handle 3DS authentication
- Does NOT implement smart retry logic

### ✅ Implementation Steps

#### Step 1: Implement Payment Failed Handler (Already shown in P0-1)

This was covered in detail in P0-1 Step 4. Ensure that implementation is complete.

#### Step 2: Add 3DS Authentication Handler

**File**: `supabase/functions/stripe-webhook/index.ts`

Add new case to switch statement:

```typescript
case 'invoice.payment_action_required': {
  const invoice = event.data.object as Stripe.Invoice;
  const subscription = invoice.subscription;

  console.log(`Payment requires action (3DS) for invoice ${invoice.id}`);

  // Get user details
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id, users(email, full_name)')
    .eq('stripe_subscription_id', subscription)
    .single();

  if (subData?.users) {
    const { email, full_name } = subData.users;

    // Send 3DS authentication email
    await supabase.functions.invoke('send-email', {
      body: {
        type: 'direct',
        to: email,
        subject: '🔐 Authentication Required for Your Payment',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1F2937; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .content { background: #F9FAFB; padding: 30px; border-radius: 8px; }
              .button { display: inline-block; background: #7458FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                <h1>🔐 Authentication Required</h1>
                <p>Hi ${full_name},</p>

                <p>Your bank requires additional authentication to complete your payment for Moneko.</p>

                <p>This is a standard security measure (3D Secure) to protect you from unauthorized charges.</p>

                <div style="text-align: center;">
                  <a href="${invoice.hosted_invoice_url}" class="button">
                    Complete Authentication
                  </a>
                </div>

                <p><strong>What to expect:</strong></p>
                <ul>
                  <li>🔒 Secure authentication with your bank</li>
                  <li>⏱️ Takes less than 1 minute</li>
                  <li>✅ Subscription continues after authentication</li>
                </ul>

                <p>If you have questions, reply to this email or contact <a href="mailto:hello@moneko.io">hello@moneko.io</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hi ${full_name},

Your bank requires additional authentication to complete your payment for Moneko.

Complete authentication: ${invoice.hosted_invoice_url}

This is a standard 3D Secure security measure and takes less than 1 minute.

Questions? Email hello@moneko.io
        `
      }
    });

    console.log('3DS authentication email sent');
  }

  return new Response(JSON.stringify({
    received: true,
    processed: true,
    action: '3ds_email_sent'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

#### Step 3: Configure Smart Retries in Stripe Dashboard

1. Go to [Stripe Dashboard > Settings > Billing > Failed Payments](https://dashboard.stripe.com/settings/billing/automatic)
2. Enable **Smart Retries** (Stripe's ML-optimized retry schedule)
3. Set **Number of retries**: 4 attempts
4. Set **Final action**: Cancel subscription

This ensures Stripe automatically retries failed payments at optimal times over ~3 weeks.

#### Step 4: Add Subscription Reactivation Function

**File**: `supabase/functions/update-subscription/index.ts`

Add new case:

```typescript
case 'reactivate': {
  // For past_due or unpaid subscriptions, attempt to collect payment
  if (!['past_due', 'unpaid'].includes(subscription.status)) {
    return new Response(JSON.stringify({
      error: 'Subscription is not in a state that can be reactivated'
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  console.log(`Attempting to reactivate subscription ${subscription.stripe_subscription_id}`);

  // Get the latest invoice
  const invoices = await stripe.invoices.list({
    subscription: subscription.stripe_subscription_id,
    limit: 1,
    status: 'open'
  });

  if (invoices.data.length === 0) {
    return new Response(JSON.stringify({
      error: 'No open invoices to collect'
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const invoice = invoices.data[0];

  // Attempt to pay the invoice
  try {
    const paidInvoice = await stripe.invoices.pay(invoice.id);

    console.log('Invoice paid successfully, subscription reactivated');

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription reactivated successfully',
      invoice: {
        id: paidInvoice.id,
        status: paidInvoice.status,
        amount_paid: paidInvoice.amount_paid / 100
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error reactivating subscription:', err);

    return new Response(JSON.stringify({
      error: 'Failed to reactivate subscription',
      details: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
```

#### Step 5: Add Frontend Payment Issue Banner

**File**: `src/components/membership/MembershipDashboard.tsx`

```typescript
// Add payment issue indicator at top of Overview tab
{['past_due', 'unpaid'].includes(subscription.status) && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2">
      <span className="text-2xl">⚠️</span>
      <div className="flex-1">
        <h3 className="font-semibold text-red-900">Payment Issue</h3>
        <p className="text-sm text-red-700">
          {subscription.status === 'past_due'
            ? 'Your last payment failed. Update your payment method to keep your subscription active.'
            : 'Your subscription is unpaid. Please update your payment method immediately to restore access.'}
        </p>
      </div>
      <Button
        onClick={handleUpdatePaymentMethod}
        variant="destructive"
      >
        Update Payment
      </Button>
    </div>
  </div>
)}
```

### 🧪 Testing

1. **Test Payment Failure**:
```bash
# Use test card that always declines
stripe trigger invoice.payment_failed
```
Expected: Email sent with portal link, status updated to past_due

2. **Test 3DS Required**:
```bash
# Use test card that requires authentication (4000 0025 0000 3155)
stripe trigger invoice.payment_action_required
```
Expected: Email sent with invoice link for authentication

3. **Test Smart Retries**:
- Create subscription with declining card
- Check Stripe Dashboard for retry schedule
- Verify retry attempts logged in webhook_events table

4. **Test Reactivation**:
- Create past_due subscription
- Update payment method via Customer Portal
- Call reactivate endpoint
- Verify subscription becomes active

### ✅ Acceptance Criteria
- [ ] Payment failure emails sent with attempt count
- [ ] Customer Portal link included for payment update
- [ ] 3DS authentication emails sent when required
- [ ] Smart Retries configured in Dashboard (4 attempts)
- [ ] Subscription reactivation function works
- [ ] Frontend shows payment issue banner
- [ ] Failed payment reason included in email

---

## Testing Guide

### Stripe CLI Testing

Install and configure Stripe CLI:
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

### Test Event Triggers

```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test payment succeeded
stripe trigger invoice.payment_succeeded

# Test payment failed
stripe trigger invoice.payment_failed

# Test trial ending
stripe trigger customer.subscription.trial_will_end

# Test subscription updated
stripe trigger customer.subscription.updated

# Test subscription deleted
stripe trigger customer.subscription.deleted
```

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0341 | Decline (generic) |
| 4000 0025 0000 3155 | Requires 3DS authentication |
| 4000 0000 0000 9995 | Decline (insufficient funds) |

### Manual Testing Checklist

- [ ] Create subscription with trial
- [ ] Verify welcome email received
- [ ] Check trial banner shows in dashboard
- [ ] Wait for trial to end or manually trigger
- [ ] Verify trial ending email received 3 days before
- [ ] Create subscription without trial
- [ ] Upgrade from monthly to yearly
- [ ] Verify immediate charge and proration
- [ ] Downgrade from yearly to monthly
- [ ] Verify scheduled change banner
- [ ] Let subscription reach period end
- [ ] Verify downgrade applied
- [ ] Cancel subscription
- [ ] Verify immediate downgrade to free
- [ ] Verify cancellation email
- [ ] Test payment failure with declining card
- [ ] Verify failure email with portal link
- [ ] Update payment method via portal
- [ ] Verify subscription reactivates

---

## Deployment Checklist

### Pre-Deployment

- [ ] All P0 issues implemented
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Webhook endpoint registered in Stripe
- [ ] Webhook signature verified
- [ ] Email templates tested
- [ ] Smart Retries enabled in Dashboard

### Environment Variables

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Subscription Price IDs
STRIPE_PLUS_MONTHLY_PRICE_ID=price_...
STRIPE_PLUS_YEARLY_PRICE_ID=price_...
# Only if implementing premium:
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...

# Application URLs
NEXT_PUBLIC_SITE_URL=https://moneko.io
```

### Post-Deployment Monitoring

Monitor these for 48 hours after deployment:

1. **Webhook Success Rate**: Target >99.5%
2. **Email Delivery Rate**: Target >98%
3. **Subscription Creation Rate**: Compare to previous period
4. **Payment Failure Rate**: Should remain <5%
5. **Customer Support Tickets**: Watch for subscription issues

### Rollback Plan

If critical issues occur:

1. **Immediate**: Disable webhook endpoint in Stripe Dashboard
2. **Within 1 hour**: Deploy previous version
3. **Within 4 hours**: Fix issue and redeploy
4. **Manual recovery**: Process missed events via Stripe Dashboard

---

## 📞 Support Resources

- **Stripe Documentation**: https://docs.stripe.com
- **Stripe Support**: https://support.stripe.com
- **Stripe API Reference**: https://docs.stripe.com/api
- **Stripe CLI**: https://docs.stripe.com/stripe-cli
- **Stripe Testing**: https://docs.stripe.com/testing

---

**Implementation Guide Complete**
**Estimated Total Implementation Time**: 17.5 hours (2-3 days)
**Priority**: All P0 issues are CRITICAL - must be completed before production launch
