#!/bin/bash

# Stripe Functions Deployment Script
# Project: Moneko
# Projectm Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

PROJECT_REF="qbuynyxyemigtnvdujts"

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Deploying Stripe Functions to Supabase"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Deploy stripe-webhook (CRITICAL)
echo "📦 [1/7] Deploying stripe-webhook function..."
supabase functions deploy stripe-webhook --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ stripe-webhook deployed"
echo ""

# Step 2: Deploy create-checkout-session
echo "📦 [2/7] Deploying create-checkout-session function..."
supabase functions deploy create-checkout-session --project-ref $PROJECT_REF
echo "✅ create-checkout-session deployed"
echo ""

# Step 3: Deploy verify-payment
echo "📦 [3/7] Deploying verify-payment function..."
supabase functions deploy verify-payment --project-ref $PROJECT_REF
echo "✅ verify-payment deployed"
echo ""

# Step 4: Deploy get-subscription
echo "📦 [4/7] Deploying get-subscription function..."
supabase functions deploy get-subscription --project-ref $PROJECT_REF
echo "✅ get-subscription deployed"
echo ""

# Step 5: Deploy update-subscription
echo "📦 [5/7] Deploying update-subscription function..."
supabase functions deploy update-subscription --project-ref $PROJECT_REF
echo "✅ update-subscription deployed"
echo ""

# Step 6: Deploy preview-subscription-change
echo "📦 [6/7] Deploying preview-subscription-change function..."
supabase functions deploy preview-subscription-change --project-ref $PROJECT_REF
echo "✅ preview-subscription-change deployed"
echo ""

# Step 7: Deploy create-portal-session
echo "📦 [7/7] Deploying create-portal-session function..."
supabase functions deploy create-portal-session --project-ref $PROJECT_REF
echo "✅ create-portal-session deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All Stripe functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📋 Next Steps:"
echo ""
echo "1. Verify Environment Variables in Supabase Dashboard:"
echo "   Required:"
echo "   - STRIPE_SECRET_KEY=sk_..."
echo "   - STRIPE_WEBHOOK_SECRET=whsec_..."
echo "   - STRIPE_MONTHLY_PLUS_PLAN_ID=price_... (or STRIPE_PLUS_MONTHLY_PRICE_ID)"
echo "   - STRIPE_YEARLY_PLUS_PLAN_ID=price_... (or STRIPE_PLUS_YEARLY_PRICE_ID)"
echo "   - STRIPE_LIFETIME_PRICE_ID=price_... (one-time payment)"
echo "   - SUPABASE_URL=https://qbuynyxyemigtnvdujts.supabase.co"
echo "   - SUPABASE_SERVICE_ROLE_KEY=eyJ..."
echo ""
echo "   Optional:"
echo "   - APP_URL=https://moneko.io"
echo "   - ALLOWED_ORIGINS=http://localhost:3000,https://moneko.io,https://www.moneko.io"
echo "   - ENVIRONMENT=production"
echo ""
echo "2. Configure Stripe Webhook (if not done):"
echo "   URL: https://qbuynyxyemigtnvdujts.supabase.co/functions/v1/stripe-webhook"
echo "   Events to select:"
echo "   - checkout.session.completed (REQUIRED for both subscription & Lifetime)"
echo "   - checkout.session.async_payment_succeeded"
echo "   - checkout.session.async_payment_failed"
echo "   - payment_intent.succeeded (REQUIRED for Lifetime one-time payments)"
echo "   - charge.refunded (REQUIRED to revoke Lifetime access on refunds)"
echo "   - customer.subscription.created"
echo "   - customer.subscription.updated"
echo "   - customer.subscription.deleted"
echo "   - customer.subscription.trial_will_end"
echo "   - invoice.payment_succeeded"
echo "   - invoice.payment_failed"
echo "   - invoice.finalized"
echo "   - invoice.upcoming"
echo "   - payment_method.attached"
echo ""
echo "3. Test Endpoints:"
echo "   # Check create-checkout-session (should return CORS headers)"
echo "   curl -X OPTIONS https://qbuynyxyemigtnvdujts.supabase.co/functions/v1/create-checkout-session -H \"Origin: https://moneko.io\" -v"
echo ""
echo "4. Monitor Logs:"
echo "   supabase functions logs create-checkout-session --project-ref $PROJECT_REF"
echo "   supabase functions logs stripe-webhook --project-ref $PROJECT_REF"
echo ""
echo "📖 For detailed setup guide, see: DEPLOYMENT_INSTRUCTIONS.md"
echo ""
echo "🎉 Deployment complete!"
echo ""
