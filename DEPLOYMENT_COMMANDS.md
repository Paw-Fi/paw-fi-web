# 🚀 Supabase Functions Deployment Commands

## Required Secrets Setup

Before deploying, ensure these secrets are set in Supabase:

```bash
# Check current secrets
supabase secrets list --project-ref qbuynyxyemigtnvdujts

# Already configured ✅:
# - STRIPE_SECRET_KEY
# - STRIPE_MONTHLY_PLUS_PLAN_ID  
# - STRIPE_YEARLY_PLUS_PLAN_ID

# MISSING - Need to add:
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE --project-ref qbuynyxyemigtnvdujts

# Optional (for when Premium launches):
# supabase secrets set STRIPE_MONTHLY_PREMIUM_PLAN_ID=price_xxx --project-ref qbuynyxyemigtnvdujts
# supabase secrets set STRIPE_YEARLY_PREMIUM_PLAN_ID=price_xxx --project-ref qbuynyxyemigtnvdujts
```

## Deploy All Updated Functions

Run these commands to deploy all functions that were updated:

```bash
# 1. Deploy create-checkout-session (updated env var names)
supabase functions deploy create-checkout-session --project-ref qbuynyxyemigtnvdujts

# 2. Deploy stripe-webhook (updated to require webhook secret)
supabase functions deploy stripe-webhook --project-ref qbuynyxyemigtnvdujts

# 3. Deploy update-subscription (uses updated env vars)
supabase functions deploy update-subscription --project-ref qbuynyxyemigtnvdujts

# 4. Deploy preview-subscription-change (uses updated env vars)
supabase functions deploy preview-subscription-change --project-ref qbuynyxyemigtnvdujts

# 5. Deploy create-portal-session (if it uses env validation)
supabase functions deploy create-portal-session --project-ref qbuynyxyemigtnvdujts
```

## Deploy All at Once

```bash
# Deploy all subscription-related functions together
supabase functions deploy create-checkout-session \
  stripe-webhook \
  update-subscription \
  preview-subscription-change \
  create-portal-session \
  --project-ref qbuynyxyemigtnvdujts
```

## Verify Deployment

After deployment, check function logs:

```bash
# View logs for create-checkout-session
supabase functions logs create-checkout-session --project-ref qbuynyxyemigtnvdujts

# View logs for stripe-webhook  
supabase functions logs stripe-webhook --project-ref qbuynyxyemigtnvdujts
```

## Test the Fix

1. **Go to your app**: http://localhost:3000/checkout
2. **Select a plan** (Plus Monthly or Plus Yearly)
3. **Verify**: Should create checkout session without CORS error
4. **Check**: Function logs should show proper env validation

## Environment Variable Mapping

### OLD (WRONG) Variable Names:
- ❌ `STRIPE_PLUS_MONTHLY_PRICE_ID`
- ❌ `STRIPE_PLUS_YEARLY_PRICE_ID`
- ❌ `STRIPE_PREMIUM_MONTHLY_PRICE_ID`
- ❌ `STRIPE_PREMIUM_YEARLY_PRICE_ID`

### NEW (CORRECT) Variable Names:
- ✅ `STRIPE_MONTHLY_PLUS_PLAN_ID`
- ✅ `STRIPE_YEARLY_PLUS_PLAN_ID`
- ✅ `STRIPE_MONTHLY_PREMIUM_PLAN_ID` (optional)
- ✅ `STRIPE_YEARLY_PREMIUM_PLAN_ID` (optional)

## Files Updated

1. `/supabase/functions/shared/env-validation.ts` - Fixed env var names, made webhook secret conditional
2. `/supabase/functions/shared/stripe-subscription-prices.ts` - Updated to use correct env vars
3. `/supabase/functions/stripe-webhook/index.ts` - Added requireWebhookSecret option

## Next Steps

1. ✅ Set `STRIPE_WEBHOOK_SECRET` in Supabase secrets
2. ✅ Deploy all updated functions
3. ✅ Test checkout flow
4. ✅ Verify webhook signature verification works
5. ✅ Test upgrade/downgrade flows

## Troubleshooting

### If CORS error persists:
```bash
# Check if function is deployed
supabase functions list --project-ref qbuynyxyemigtnvdujts | grep create-checkout-session

# Check function logs
supabase functions logs create-checkout-session --project-ref qbuynyxyemigtnvdujts --tail
```

### If env validation fails:
```bash
# Verify secrets are set
supabase secrets list --project-ref qbuynyxyemigtnvdujts

# Check for typos in secret names
```

### If webhook signature fails:
```bash
# Get webhook secret from Stripe Dashboard
# Webhooks > Add endpoint > Get signing secret
# Then set it: 
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx --project-ref qbuynyxyemigtnvdujts
```

