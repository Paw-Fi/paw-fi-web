# Subscription Plan Change Flow Diagram

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   1. User selects     │
                        │   new plan + billing  │
                        │   interval            │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   2. Click "Review    │
                        │   Change" button      │
                        └───────────┬───────────┘
                                    │
┌─────────────────────────────────┼─────────────────────────────────┐
│                                 ▼                                 │
│                    PREVIEW API CALL                               │
│                                                                   │
│   Frontend (PlanSelector.tsx)                                    │
│   ├─ onPreviewPlanChange(selectedPlan, billingInterval)         │
│   │                                                               │
│   └─▶ use-subscription.ts                                        │
│       └─▶ previewPlanChange()                                    │
│                                                                   │
│   Backend (/preview-subscription-change)                         │
│   ├─ Get current subscription from DB                            │
│   ├─ Determine upgrade vs downgrade                              │
│   ├─ Retrieve Stripe subscription                                │
│   ├─ Call Stripe Invoices.upcoming() with new price              │
│   ├─ Calculate proration amounts                                 │
│   └─ Return preview with proration_date                          │
│                                                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   3. Show beautiful   │
                    │   confirmation dialog │
                    │   with all details    │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌───────────────┐      ┌──────────────┐
            │  User cancels │      │ User confirms│
            └───────┬───────┘      └──────┬───────┘
                    │                     │
                    ▼                     │
            ┌───────────────┐             │
            │ Reset preview │             │
            │ Close dialog  │             │
            └───────────────┘             │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       UPDATE API CALL                           │
│                                                                 │
│   Frontend (PlanSelector.tsx)                                  │
│   └─▶ onChangePlan(plan, interval, prorationDate)             │
│                                                                 │
│   use-subscription.ts                                          │
│   └─▶ changePlan() with prorationDate from preview            │
│                                                                 │
│   Backend (/update-subscription)                               │
│   ├─ Get current subscription                                  │
│   ├─ Determine upgrade vs downgrade                            │
│   ├─ Retrieve Stripe subscription (1 call)                     │
│   ├─ Get subscription item ID                                  │
│   ├─ Choose proration_behavior:                                │
│   │   • Upgrade: 'always_invoice' (immediate)                  │
│   │   • Downgrade: 'create_prorations' (period end)            │
│   ├─ Update Stripe subscription with:                          │
│   │   • New price ID                                           │
│   │   • Proration date from preview                            │
│   │   • Payment behavior: error_if_incomplete                  │
│   ├─ Update database                                           │
│   └─ Return success                                            │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   4. Success!         │
                  │   - Close dialog      │
                  │   - Refresh data      │
                  │   - Show toast        │
                  └───────────────────────┘
```

## Stripe API Calls

### Preview Phase
```
1. GET /subscriptions/{id}
   └─ Retrieve current subscription details

2. GET /invoices/upcoming?
   ├─ customer={customer_id}
   ├─ subscription={subscription_id}
   ├─ subscription_items[0][id]={item_id}
   ├─ subscription_items[0][price]={new_price_id}
   └─ subscription_proration_date={proration_date}
   
   Returns:
   ├─ amount_due (immediate charge)
   ├─ lines.data[] (line items with proration flags)
   └─ total proration amount
```

### Update Phase
```
1. GET /subscriptions/{id}
   └─ Get subscription item ID (single call)

2. POST /subscriptions/{id}
   ├─ items[0][id]={item_id}
   ├─ items[0][price]={new_price_id}
   ├─ proration_behavior={upgrade ? 'always_invoice' : 'create_prorations'}
   ├─ proration_date={from_preview}
   ├─ payment_behavior='error_if_incomplete'
   └─ metadata[plan]={new_plan}
   
   Returns:
   └─ Updated subscription object
```

## Upgrade vs Downgrade Logic

```
Plan Hierarchy:
free: 0
plus: 1  
premium: 2

Upgrade Examples:
├─ free → plus:    1 > 0  ✓ (immediate charge)
├─ free → premium: 2 > 0  ✓ (immediate charge)  
└─ plus → premium: 2 > 1  ✓ (immediate charge)

Downgrade Examples:
├─ premium → plus: 1 < 2  ✓ (period end)
├─ premium → free: 0 < 2  ✓ (period end)
└─ plus → free:    0 < 1  ✓ (period end)

Proration Behavior:
├─ Upgrade:   'always_invoice'    → Immediate charge with proration
└─ Downgrade: 'create_prorations' → Apply at period end with credit
```

## Data Models

### Preview Response
```typescript
{
  action: 'update_subscription' | 'new_subscription',
  isUpgrade: boolean,
  isDowngrade: boolean,
  currentPlan: string,
  newPlan: string,
  newBillingInterval: 'monthly' | 'yearly',
  billingBehavior: 'immediate' | 'end_of_period',
  immediateCharge: number,  // in cents
  futureRecurringAmount: number,  // in cents
  totalProration: number,  // in cents (can be negative)
  currency: string,
  currentPeriodEnd: number,  // unix timestamp
  message: string,  // human-readable explanation
  prorationDate: number,  // unix timestamp - USE THIS IN UPDATE!
  preview: {
    amountDue: number,
    subtotal: number,
    total: number,
    lineItems: [{
      description: string,
      amount: number,
      proration: boolean,
      period: { start: number, end: number }
    }]
  }
}
```

### Update Request
```typescript
{
  userId: string,
  action: 'change_plan',
  plan: string,
  billingInterval: 'monthly' | 'yearly',
  prorationDate: number  // CRITICAL: Use value from preview!
}
```

## Error Handling

```
Preview Errors:
├─ Invalid plan/interval      → 400 Bad Request
├─ Subscription not found      → 500 Internal Error
├─ Stripe API error           → 500 with details
└─ Network error              → Toast: "Failed to preview"

Update Errors:
├─ Payment method failed       → 402 Payment Required
├─ Invalid proration date     → 400 Bad Request
├─ Subscription locked        → 409 Conflict
└─ Stripe webhook failure     → Handled separately
```

## Success Scenarios

```
Immediate Charge (Upgrade):
1. Stripe charges payment method
2. Subscription updated in Stripe
3. Webhook updates database
4. Frontend invalidates cache
5. User sees new plan immediately

Period End (Downgrade):
1. Subscription marked for change
2. cancel_at_period_end set based on context
3. Webhook confirms schedule
4. Database updated with pending change
5. User sees "Changes on [date]"
```
