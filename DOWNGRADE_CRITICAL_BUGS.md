# 🚨 CRITICAL BUGS IN DOWNGRADE IMPLEMENTATION

## Summary

After deep analysis against **Stripe Official API Documentation (2023-10-16)**, I found **CRITICAL MISMATCHES** between what the code promises and what it actually does.

---

## ❌ CRITICAL BUG #1: Preview Says "End of Period", Update Does "Immediate"

### The Problem

**preview-subscription-change/index.ts** (Line 199-205):
```typescript
} else if (isDowngrade) {
  // Downgrades: apply at period end
  billingBehavior = 'end_of_period'
  const periodEnd = new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString()
  message = `Your plan will change to ${newPlan} on ${periodEnd}...`
}
```

**update-subscription/index.ts** (Line 176-198):
```typescript
const prorationBehavior = isUpgrade ? 'always_invoice' : 'create_prorations'

const updateParams: any = {
  items: [{
    id: subscriptionItemId,
    price: priceId,
  }],
  proration_behavior: prorationBehavior, // ❌ 'create_prorations' = IMMEDIATE CHANGE
  // ❌ NO scheduling, NO period end logic!
}

await stripe.subscriptions.update(subscription.stripe_subscription_id, updateParams)
```

### What Happens

**User sees in preview:**
> "Your plan will change to Plus on December 31st. You'll continue to have access to your current plan until then."

**What actually happens:**
- ❌ Subscription changes to Plus **IMMEDIATELY**
- ❌ User loses Premium features **RIGHT NOW**
- ❌ Credit applied to next invoice
- ❌ Change does NOT wait until period end

### Impact

- **CRITICAL UX BUG**: Users are misled
- **Potential refund requests**: "You said I'd have Premium until Dec 31!"
- **Trust issue**: Preview lies about behavior

---

## ❌ CRITICAL BUG #2: Wrong `proration_behavior` for Downgrades

### Current Implementation

```typescript
const prorationBehavior = isUpgrade ? 'always_invoice' : 'create_prorations'
```

### Stripe Documentation Says

**`proration_behavior` values:**
1. **`always_invoice`** - Create prorations AND invoice immediately (✅ Correct for upgrades)
2. **`create_prorations`** - Create proration line items, apply to next invoice (❌ WRONG for "end of period")
3. **`none`** - No proration (❌ Not used at all)

### The Problem

`create_prorations` does:
- ✅ Creates proration credit
- ❌ Applies subscription change **IMMEDIATELY**
- ❌ Does NOT wait until period end

### What It Should Do

For "end of period" downgrades per Stripe docs:
- Use **Subscription Schedules** API
- Schedule the change for `current_period_end`
- Keep current subscription active until then

---

## ❌ CRITICAL BUG #3: Missing Subscription Schedules Implementation

### According to Stripe Official Docs

**To apply changes at period end, you MUST use Subscription Schedules:**

```typescript
await stripe.subscriptionSchedules.create({
  from_subscription: subscriptionId,
  phases: [
    {
      // Phase 1: Current plan until period end
      items: [{price: currentPriceId}],
      end_date: currentPeriodEnd,
    },
    {
      // Phase 2: New plan from period end onwards
      items: [{price: newPriceId}],
      iterations: null, // Repeat indefinitely
    }
  ]
})
```

### Current Code

- ❌ NO use of `subscriptionSchedules` API
- ❌ NO scheduling logic
- ❌ NO "apply at period end" implementation
- ❌ Preview promises it, update doesn't deliver it

---

## ❌ CRITICAL BUG #4: Billing Interval Changes Mishandled

### Scenario

User on Plus Monthly ($9/month) changes to Plus Yearly ($79/year)

**Current code treats as downgrade** (Line 72):
```typescript
const isDowngrade = PLAN_HIERARCHY[newPlan] < PLAN_HIERARCHY[currentPlan]
// Plus = Plus, so isDowngrade = false
// Actually goes to isSamePlan logic
```

But then at line 206-215:
```typescript
} else if (isSamePlan) {
  const currentInterval = stripeSubscription.items.data[0].price.recurring?.interval
  if (currentInterval !== newBillingInterval) {
    // Billing interval change: immediate charge
    message = `Switching to ${newBillingInterval} billing. You'll be charged immediately...`
  }
}
```

### The Problem

- Billing interval changes ARE handled correctly in preview
- They apply immediately with proration (✅ Correct per Stripe)
- But then update uses `create_prorations` which is also immediate (✅ Correct)

**This part is actually OK**, but the message could be clearer.

---

## ❌ CRITICAL BUG #5: No Handling for Subscription Schedules

### Current Database Schema

The `subscriptions` table likely doesn't track:
- ❌ `subscription_schedule_id`
- ❌ Scheduled changes
- ❌ Future plan changes

### What Happens

If we use Subscription Schedules:
1. Subscription gets a `schedule` attached
2. Current code can't query or display this
3. User dashboard won't show "Changing to Plus on Dec 31"
4. Webhook for `subscription_schedule.updated` not handled

---

## 🔧 REQUIRED FIXES

### Fix #1: Implement True "End of Period" Downgrades

**update-subscription/index.ts** - Replace downgrade logic:

```typescript
// For downgrades: Use Subscription Schedules
if (isDowngrade) {
  const currentPhase = {
    items: [{
      price: stripeSubscription.items.data[0].price.id,
    }],
    end_date: stripeSubscription.current_period_end,
  }
  
  const newPhase = {
    items: [{
      price: priceId,
    }],
    iterations: null, // Indefinite
  }
  
  // Check if subscription already has a schedule
  if (stripeSubscription.schedule) {
    // Update existing schedule
    await stripe.subscriptionSchedules.update(stripeSubscription.schedule, {
      phases: [currentPhase, newPhase],
    })
  } else {
    // Create new schedule
    await stripe.subscriptionSchedules.create({
      from_subscription: subscription.stripe_subscription_id,
      phases: [currentPhase, newPhase],
    })
  }
  
  // Update database to track schedule
  await supabase
    .from('subscriptions')
    .update({
      pending_plan: plan,
      pending_billing_interval: billingInterval,
      pending_change_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
    
  return new Response(JSON.stringify({
    success: true,
    message: `Subscription will change to ${plan} at period end`,
    scheduled: true,
    effectiveDate: stripeSubscription.current_period_end,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

### Fix #2: Update Database Schema

Add columns to `subscriptions` table:
```sql
ALTER TABLE subscriptions 
ADD COLUMN pending_plan TEXT,
ADD COLUMN pending_billing_interval TEXT,
ADD COLUMN pending_change_date TIMESTAMPTZ,
ADD COLUMN subscription_schedule_id TEXT;
```

### Fix #3: Handle Subscription Schedule Webhooks

**stripe-webhook/index.ts** - Add new event handlers:

```typescript
case 'customer.subscription.updated':
  // Check if schedule was attached/updated
  const schedule = event.data.object.schedule
  if (schedule) {
    await supabase
      .from('subscriptions')
      .update({ subscription_schedule_id: schedule })
      .eq('stripe_subscription_id', event.data.object.id)
  }
  break

case 'subscription_schedule.updated':
case 'subscription_schedule.completed':
  // Handle schedule updates
  const scheduleData = event.data.object
  await supabase
    .from('subscriptions')
    .update({
      plan: scheduleData.current_phase?.items[0]?.price?.lookup_key || 'unknown',
      pending_plan: null,
      pending_change_date: null,
    })
    .eq('subscription_schedule_id', scheduleData.id)
  break
```

### Fix #4: Update Preview to Match Actual Behavior

**Either:**
- Option A: Make preview match current behavior (immediate change)
- Option B: Fix update to match preview promise (use schedules)

**Recommendation**: Option B - Use schedules for true "end of period"

### Fix #5: Update Proration Logic

```typescript
// For immediate changes (upgrades, billing interval changes)
if (isUpgrade || (isSamePlan && billingIntervalChanged)) {
  proration_behavior: 'always_invoice',
  // Change applies immediately with proration
}

// For downgrades with end-of-period
if (isDowngrade) {
  // Use Subscription Schedules (see Fix #1)
}
```

---

## 📊 BEHAVIOR COMPARISON

| Scenario | Current Behavior | Stripe Best Practice | Status |
|----------|------------------|---------------------|---------|
| Upgrade (Free → Plus) | ✅ Immediate + invoice | ✅ Immediate + invoice | ✅ CORRECT |
| Upgrade (Plus → Premium) | ✅ Immediate + invoice | ✅ Immediate + invoice | ✅ CORRECT |
| Downgrade (Premium → Plus) | ❌ **Immediate + credit** | ✅ **Scheduled at period end** | ❌ WRONG |
| Downgrade (Plus → Free) | ✅ Cancel at period end | ✅ Cancel at period end | ✅ CORRECT |
| Billing change (Monthly → Yearly) | ✅ Immediate + proration | ✅ Immediate + proration | ✅ CORRECT |
| Billing change (Yearly → Monthly) | ❌ **Immediate + credit** | ⚠️ **Could be end of period** | ⚠️ QUESTIONABLE |

---

## 🎯 RECOMMENDED SOLUTION

### Option A: Simple Fix (Quick)
- Update preview to show "immediate" change
- Keep current implementation
- Add clear messaging about credits

**Pros:**
- Quick to implement
- No database changes
- Simpler code

**Cons:**
- Not true "downgrade at period end"
- User loses access immediately
- Industry standard is to keep access until period end

### Option B: Correct Fix (Recommended)
- Implement Subscription Schedules for downgrades
- Update database schema
- Add webhook handlers
- Match preview promise

**Pros:**
- ✅ Follows Stripe best practices
- ✅ Better UX (keep access until period end)
- ✅ Industry standard behavior
- ✅ Preview matches reality

**Cons:**
- More complex implementation
- Database migration required
- Additional webhook handling

---

## 🚨 SEVERITY

**P0 - CRITICAL**

**Reasons:**
1. Preview lies to users
2. Immediate access loss on downgrade
3. Not following Stripe best practices
4. Potential refund/support issues
5. Trust/credibility problem

**Must fix before production!**

---

**Created**: January 1, 2025
**Stripe API Version**: 2023-10-16
**Status**: 🔴 CRITICAL - REQUIRES IMMEDIATE FIX

