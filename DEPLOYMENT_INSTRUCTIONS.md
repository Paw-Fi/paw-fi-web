# Stripe Subscription Deployment Instructions

## Critical Fixes Applied

### 1. Database Schema Issues
- **Fixed**: Functions were trying to access `users.stripe_customer_id` which doesn't exist
- **Solution**: Now correctly uses `user_stripe_mapping` table with `stripe_customer_id` column
- **Files Changed**:
  - `supabase/functions/create-checkout-session/index.ts`
  - `supabase/functions/stripe-webhook/index.ts`

### 2. Environment Variable Mismatch
- **Fixed**: Code expected different environment variable names than what exists in Supabase
- **Solution**: Updated `env-validation.ts` to support both naming conventions:
  - Primary: `STRIPE_MONTHLY_PLUS_PLAN_ID`, `STRIPE_YEARLY_PLUS_PLAN_ID`
  - Fallback: `STRIPE_PLUS_MONTHLY_PRICE_ID`, `STRIPE_PLUS_YEARLY_PRICE_ID`
- **Files Changed**:
  - `supabase/functions/shared/env-validation.ts`

### 3. CORS Issues
- **Fixed**: Single origin CORS was blocking requests from production domains
- **Solution**: Implemented multi-origin CORS support with dynamic origin detection
- **Files Changed**:
  - `supabase/functions/shared/cors.ts`
  - `supabase/functions/create-checkout-session/index.ts`

### 4. Stripe Webhook Events
- **Status**: Webhook handler already supports required events:
  - ✅ `checkout.session.completed` - Creates subscription on successful checkout
  - ✅ `checkout.session.async_payment_succeeded` - Handles async payment success
  - ✅ `checkout.session.async_payment_failed` - Handles async payment failures
  - ✅ `customer.subscription.created` - Sends welcome email
  - ✅ `customer.subscription.updated` - Sends update notification
  - ✅ `customer.subscription.deleted` - Sends cancellation confirmation
  - ✅ `customer.subscription.trial_will_end` - Sends trial ending reminder (3 days before)
  - ✅ `invoice.payment_succeeded` - Confirms successful payment
  - ✅ `invoice.payment_failed` - Sends payment failure notification
  - ✅ `invoice.finalized` - Handles invoice finalization
  - ✅ `invoice.upcoming` - Sends upcoming payment reminder
  - ✅ `payment_method.attached` - Logs payment method updates

## Deployment Commands

### 1. Set Environment Variables in Supabase

Run these commands or set via Supabase Dashboard:

```bash
# Core Stripe Configuration
supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref qbuynyxyemigtnvdujts
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref qbuynyxyemigtnvdujts

# Existing Price IDs (already set, verify they exist)
supabase secrets set STRIPE_MONTHLY_PLUS_PLAN_ID=price_... --project-ref qbuynyxyemigtnvdujts
supabase secrets set STRIPE_YEARLY_PLUS_PLAN_ID=price_... --project-ref qbuynyxyemigtnvdujts

# Application Configuration
supabase secrets set APP_URL=https://moneko.io --project-ref qbuynyxyemigtnvdujts
supabase secrets set ALLOWED_ORIGINS=http://localhost:3000,https://moneko.io,https://www.moneko.io --project-ref qbuynyxyemigtnvdujts

# Supabase Configuration (usually already set)
supabase secrets set SUPABASE_URL=https://qbuynyxyemigtnvdujts.supabase.co --project-ref qbuynyxyemigtnvdujts
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... --project-ref qbuynyxyemigtnvdujts
```

### 2. Deploy All Stripe-Related Functions

```bash
# Deploy all subscription-related functions
supabase functions deploy create-checkout-session --project-ref qbuynyxyemigtnvdujts
supabase functions deploy stripe-webhook --project-ref qbuynyxyemigtnvdujts
supabase functions deploy update-subscription --project-ref qbuynyxyemigtnvdujts
supabase functions deploy preview-subscription-change --project-ref qbuynyxyemigtnvdujts
supabase functions deploy get-subscription --project-ref qbuynyxyemigtnvdujts
supabase functions deploy create-portal-session --project-ref qbuynyxyemigtnvdujts
supabase functions deploy verify-payment --project-ref qbuynyxyemigtnvdujts
```

### 3. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Create a new webhook endpoint with URL:
   ```
   https://qbuynyxyemigtnvdujts.supabase.co/functions/v1/stripe-webhook
   ```

3. Select these events (CRITICAL):

   **Checkout Events** (For initial subscription creation):
   - ✅ `checkout.session.completed`
   - ✅ `checkout.session.async_payment_succeeded`
   - ✅ `checkout.session.async_payment_failed`

   **Subscription Events** (For subscription lifecycle):
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.trial_will_end`

   **Invoice Events** (For payment handling):
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.finalized`
   - ✅ `invoice.upcoming`

   **Payment Method Events** (For payment updates):
   - ✅ `payment_method.attached`

4. Copy the webhook signing secret (starts with `whsec_`)
5. Set it as environment variable:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref qbuynyxyemigtnvdujts
   ```

6. Re-deploy webhook function after setting the secret:
   ```bash
   supabase functions deploy stripe-webhook --project-ref qbuynyxyemigtnvdujts
   ```

### 4. Verify Deployment

Test each endpoint:

```bash
# Test checkout session creation
curl -X POST https://qbuynyxyemigtnvdujts.supabase.co/functions/v1/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Origin: https://moneko.io" \
  -d '{
    "userId": "YOUR_USER_ID",
    "plan": "plus",
    "billingInterval": "monthly",
    "isTrial": false
  }'

# Test webhook (will fail signature but should not give CORS error)
curl -X POST https://qbuynyxyemigtnvdujts.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "Origin: https://moneko.io"

# Check function logs
supabase functions logs create-checkout-session --project-ref qbuynyxyemigtnvdujts
supabase functions logs stripe-webhook --project-ref qbuynyxyemigtnvdujts
```

## Critical Email Notification Flow

### Trial Period Emails
1. **Trial Started**: Sent when subscription created with `status: trialing`
   - Triggered by: `customer.subscription.created` (when trial_end exists)
   - Content: Welcome email with trial end date

2. **Trial Ending Soon**: Sent 3 days before trial ends
   - Triggered by: `customer.subscription.trial_will_end`
   - Content: Reminder to add payment method before trial ends

3. **Trial Ended**: 
   - If payment method attached: Subscription becomes active → renewal email
   - If no payment method: Subscription becomes `incomplete_expired` → cancellation email

### Subscription Lifecycle Emails
1. **Subscription Created**: Welcome email with plan details
2. **Subscription Updated**: Notification of plan/price changes
3. **Subscription Canceled**: Confirmation with access end date
4. **Payment Failed**: Alert with retry information
5. **Payment Succeeded**: Confirmation of successful payment
6. **Invoice Upcoming**: Reminder 7 days before next payment

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes all domains (dev, staging, production)
- Redeploy affected functions after updating origins

### Environment Variable Errors
- Check function logs: `supabase functions logs <function-name> --project-ref qbuynyxyemigtnvdujts`
- Verify all required secrets are set via Supabase Dashboard → Project Settings → Edge Functions → Secrets

### Database Errors
- Migration `20250629_subscription_functions.sql` creates required tables
- Verify `user_stripe_mapping` table exists
- Verify `subscriptions` table has `billing_interval` column (added in `20250101_subscription_enhancements.sql`)

### Webhook Not Receiving Events
- Verify webhook URL is correct in Stripe Dashboard
- Verify webhook secret is set correctly
- Check webhook delivery attempts in Stripe Dashboard
- Check function logs for signature verification errors

### No Email Notifications
- Verify email service is configured in `shared/email-service.ts`
- Check email templates in `shared/email-templates.ts`
- Verify SMTP or email service credentials are set
- Check function logs for email sending errors

## Testing Checklist

### Basic Flow
- [ ] User can create account
- [ ] User can view pricing page
- [ ] User can start trial (checkout redirects to success)
- [ ] Trial subscription appears in dashboard
- [ ] Trial ending email sent 3 days before end

### Upgrade Flow
- [ ] User on Free can upgrade to Plus (via checkout)
- [ ] User on trial can upgrade (immediate charge with prorated amount)
- [ ] Upgrade email sent
- [ ] Subscription updated in database

### Downgrade Flow
- [ ] User on Plus can request downgrade (shows preview dialog)
- [ ] Downgrade scheduled for period end
- [ ] Confirmation email sent
- [ ] Access maintained until period end
- [ ] Downgrade applied at period end

### Payment Flow
- [ ] Successful payment triggers confirmation email
- [ ] Failed payment triggers alert email
- [ ] Multiple failures eventually cancel subscription
- [ ] Cancellation email sent

### Cancellation Flow
- [ ] User can cancel from dashboard
- [ ] Cancel at period end is set
- [ ] Cancellation email sent
- [ ] Access maintained until period end
- [ ] Subscription deleted at period end

## Production Readiness

### Completed ✅
1. Database schema fixes (user_stripe_mapping)
2. Environment variable handling (multiple naming conventions)
3. CORS multi-origin support
4. Comprehensive webhook event handling
5. Email notifications for all lifecycle events
6. Idempotency for webhook events
7. Error handling and logging

### Recommended Before Production
1. Set up monitoring/alerting (e.g., Sentry for errors)
2. Configure production Stripe account (move from test to live keys)
3. Set up email service with production credentials
4. Test complete flow in staging environment
5. Review and test all email templates
6. Set up database backups
7. Configure rate limiting on edge functions
8. Review and optimize function timeout settings

## Support

For issues or questions:
1. Check function logs first
2. Review Stripe webhook delivery logs
3. Verify all environment variables are set
4. Test in Stripe test mode before production
