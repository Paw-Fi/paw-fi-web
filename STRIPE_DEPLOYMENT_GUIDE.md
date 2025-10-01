# Stripe Subscription Deployment Guide - Production Ready

## Prerequisites

Before deploying, ensure you have:

1. ✅ Access to Stripe Dashboard (live and test modes)
2. ✅ Supabase project with CLI access
3. ✅ All required Stripe Price IDs created
4. ✅ Webhook endpoint URL ready

## Step 1: Create Stripe Products and Prices

### 1.1 Create Products in Stripe Dashboard

Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)

**Plus Plan:**
- Name: "Moneko Plus"
- Description: "Enhanced financial planning tools"
- Create two prices:
  - Monthly: $9.99/month (recurring)
  - Yearly: $99/year (recurring)

**Premium Plan:**
- Name: "Moneko Premium"
- Description: "Complete financial planning suite"
- Create two prices:
  - Monthly: $19.99/month (recurring)
  - Yearly: $199/year (recurring)

### 1.2 Note Down Price IDs

After creating, note the Price IDs (format: `price_...`):
- `price_xxxPlusMonthly`
- `price_xxxPlusYearly`
- `price_xxxPremiumMonthly`
- `price_xxxPremiumYearly`

## Step 2: Configure Environment Variables

### 2.1 Supabase Edge Functions Environment Variables

Set in Supabase Dashboard > Edge Functions > Secrets:

```bash
# Supabase (automatically set, verify they exist)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe Core (use test keys first!)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PLUS_MONTHLY_PRICE_ID=price_xxxPlusMonthly
STRIPE_PLUS_YEARLY_PRICE_ID=price_xxxPlusYearly
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxxPremiumMonthly
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxPremiumYearly

# Application
APP_URL=https://moneko.io
ENVIRONMENT=development
```

**Command Line Method:**

```bash
# Set each secret individually
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PLUS_MONTHLY_PRICE_ID=price_...
supabase secrets set STRIPE_PLUS_YEARLY_PRICE_ID=price_...
supabase secrets set STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
supabase secrets set STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
supabase secrets set APP_URL=https://moneko.io
supabase secrets set ENVIRONMENT=development
```

### 2.2 Frontend Environment Variables

Update `.env.production`:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Use test key first
# ... other existing vars
```

## Step 3: Run Database Migration

### 3.1 Apply the Migration

```bash
# Navigate to project root
cd /Users/charles/side-projects/Moneko/moneko-web

# Apply migration
supabase db push

# Or specific migration
supabase migration up
```

### 3.2 Verify Migration

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('webhook_events', 'idempotency_keys', 'subscription_events');

-- Check new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name IN ('billing_interval', 'trial_start', 'trial_end', 'pending_plan');
```

## Step 4: Deploy Edge Functions

### 4.1 Deploy Updated Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy update-subscription
supabase functions deploy get-subscription
```

### 4.2 Test Function Deployment

```bash
# Test webhook function (should fail without signature - this is correct!)
curl -X POST https://your-project.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Expected: 400 Bad Request "No signature provided"

# Test environment validation
supabase functions invoke create-checkout-session --method POST \
  -d '{"userId": "test"}' 
# Should fail if env vars not set
```

## Step 5: Configure Stripe Webhooks

### 5.1 Create Webhook Endpoint

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "+ Add endpoint"
3. Set endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 5.2 Get Webhook Secret

1. After creating webhook, click on it
2. Click "Reveal" under "Signing secret"
3. Copy the secret (format: `whsec_...`)
4. Update environment variable:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5.3 Test Webhook

```bash
# Use Stripe CLI to send test event
stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook

# In another terminal, trigger test event
stripe trigger customer.subscription.created
```

## Step 6: Configure Stripe Customer Portal

### 6.1 Enable Customer Portal

1. Go to [Stripe Dashboard > Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Click "Activate Customer Portal"
3. Configure settings:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to cancel subscriptions
   - ✅ Set cancellation behavior: "Cancel at end of billing period"

### 6.2 Customize Portal Branding

1. Upload Moneko logo
2. Set brand colors to match app
3. Set business information
4. Save settings

## Step 7: Testing Phase (TEST MODE)

### 7.1 Create Test Subscription

```bash
# 1. Create test user in Supabase
# 2. Use Stripe test card: 4242 4242 4242 4242
# 3. Test checkout flow
# 4. Verify webhook events received
# 5. Check database for subscription record
```

### 7.2 Test Scenarios

**Test 1: New Subscription**
- [ ] Create Plus monthly subscription
- [ ] Verify webhook `customer.subscription.created` received
- [ ] Check `subscriptions` table has correct data
- [ ] Verify welcome email sent
- [ ] Check `subscription_events` audit trail

**Test 2: Trial Subscription**
- [ ] Create trial subscription
- [ ] Verify payment method REQUIRED
- [ ] Check trial dates in database
- [ ] Test trial ending notification (simulate time)

**Test 3: Upgrade**
- [ ] Upgrade Plus to Premium
- [ ] Verify immediate proration
- [ ] Check `previous_plan` stored
- [ ] Verify upgrade email sent

**Test 4: Downgrade**
- [ ] Downgrade Premium to Plus
- [ ] Verify applied at period end
- [ ] Check `pending_plan` set
- [ ] Verify downgrade email sent

**Test 5: Cancellation**
- [ ] Cancel subscription
- [ ] Verify `cancel_at_period_end = true`
- [ ] Check cancellation email sent
- [ ] Test reactivation

**Test 6: Failed Payment**
- [ ] Use test card `4000 0000 0000 0341` (fails)
- [ ] Verify `invoice.payment_failed` webhook
- [ ] Check status updated to `past_due`
- [ ] Verify payment failed email

**Test 7: Customer Portal**
- [ ] Create portal session
- [ ] Update payment method
- [ ] Download invoice
- [ ] Cancel subscription via portal

**Test 8: Idempotency**
- [ ] Submit same checkout request twice
- [ ] Verify only one session created
- [ ] Send duplicate webhook event
- [ ] Verify not processed twice

**Test 9: Environment Validation**
- [ ] Remove an env var
- [ ] Restart function
- [ ] Verify fails fast with clear error

**Test 10: Error Handling**
- [ ] Test with invalid price ID
- [ ] Test with invalid user ID
- [ ] Test with missing parameters
- [ ] Verify appropriate error messages

## Step 8: Switch to Production

### 8.1 Update to Live API Keys

```bash
# Replace TEST keys with LIVE keys
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... # Get new secret for live webhook
supabase secrets set ENVIRONMENT=production

# Frontend
# Update .env.production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 8.2 Update Stripe Prices (if different in production)

```bash
# Update to production price IDs
supabase secrets set STRIPE_PLUS_MONTHLY_PRICE_ID=price_live_...
supabase secrets set STRIPE_PLUS_YEARLY_PRICE_ID=price_live_...
supabase secrets set STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_live_...
supabase secrets set STRIPE_PREMIUM_YEARLY_PRICE_ID=price_live_...
```

### 8.3 Create Live Webhook

1. Go to Stripe Dashboard (switch to LIVE mode)
2. Create new webhook with LIVE endpoint
3. Copy new signing secret
4. Update `STRIPE_WEBHOOK_SECRET`

### 8.4 Redeploy

```bash
# Redeploy with production config
supabase functions deploy
```

## Step 9: Monitoring and Maintenance

### 9.1 Set Up Monitoring

**Stripe Dashboard:**
- Monitor webhook delivery success rate
- Check failed webhooks
- Review payment success/failure rates

**Supabase Dashboard:**
- Monitor function invocation count
- Check function error rates
- Review function logs

**Database Monitoring:**
```sql
-- Check recent webhook events
SELECT * FROM webhook_events 
ORDER BY processed_at DESC 
LIMIT 10;

-- Check subscription changes
SELECT * FROM subscription_events 
ORDER BY created_at DESC 
LIMIT 20;

-- Check active subscriptions
SELECT COUNT(*) FROM subscriptions 
WHERE status IN ('active', 'trialing');

-- Check past due subscriptions
SELECT COUNT(*) FROM subscriptions 
WHERE status = 'past_due';
```

### 9.2 Set Up Cleanup Cron Job

```sql
-- Create cron job to cleanup old data (if using pg_cron)
SELECT cron.schedule(
  'cleanup-tracking-data',
  '0 2 * * *', -- Run daily at 2 AM
  $$ SELECT public.cleanup_old_tracking_data(); $$
);
```

**Or run manually via script:**

```bash
#!/bin/bash
# cleanup-old-data.sh
psql $DATABASE_URL -c "SELECT public.cleanup_old_tracking_data();"
```

### 9.3 Alert Configuration

Set up alerts for:
- Webhook delivery failures > 5% in 1 hour
- Function error rate > 1% in 1 hour
- Past due subscriptions > 10% of active
- Failed payments > 5% in 1 day

## Step 10: Documentation and Handoff

### 10.1 Update Internal Documentation

Document:
- Subscription lifecycle flows
- Webhook event handling
- Error recovery procedures
- Customer support procedures
- Refund policy implementation

### 10.2 Customer Support Training

Train support team on:
- Accessing customer subscriptions
- Handling cancellation requests
- Issuing refunds (via Stripe Dashboard)
- Troubleshooting payment failures

## Rollback Procedure

If issues occur in production:

```bash
# 1. Revert to previous function deployment
supabase functions deploy --restore <previous-version>

# 2. Revert database migration
supabase db reset --db-url <production-url>

# 3. Switch back to test mode temporarily
supabase secrets set ENVIRONMENT=staging
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# 4. Investigate issues in staging
# 5. Fix and redeploy
```

## Success Criteria

Before considering deployment complete:

- ✅ All test scenarios pass
- ✅ Webhook delivery success rate > 99%
- ✅ Function error rate < 0.1%
- ✅ Subscription creation success rate > 95%
- ✅ Emails delivered successfully
- ✅ Customer portal fully functional
- ✅ Monitoring and alerts configured
- ✅ Support team trained
- ✅ Rollback procedure tested

## Support Contacts

- **Stripe Support**: https://support.stripe.com/
- **Supabase Support**: https://supabase.com/support
- **Internal Escalation**: [Your team's contact]

## Appendix: Useful Commands

```bash
# View function logs
supabase functions logs stripe-webhook --tail

# Test function locally
supabase functions serve stripe-webhook

# Check secret values
supabase secrets list

# Rollback migration
supabase migration rollback

# Check function status
supabase functions status
```

---

**Deployment Checklist:**

- [ ] Step 1: Stripe Products and Prices created
- [ ] Step 2: Environment variables configured
- [ ] Step 3: Database migration applied
- [ ] Step 4: Edge Functions deployed
- [ ] Step 5: Webhooks configured
- [ ] Step 6: Customer Portal configured
- [ ] Step 7: All test scenarios passing
- [ ] Step 8: Production keys configured
- [ ] Step 9: Monitoring set up
- [ ] Step 10: Documentation complete

**Post-Deployment:**

- [ ] Monitor for 24 hours
- [ ] Review all webhook events
- [ ] Check subscription creation rate
- [ ] Verify email delivery
- [ ] Customer support ready
- [ ] Rollback procedure documented

🎉 **Ready for Production Deployment!**
