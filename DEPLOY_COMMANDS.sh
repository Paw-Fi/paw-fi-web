#!/bin/bash
# Stripe Functions Deployment Script
# Project: Moneko Web
# Project Ref: qbuynyxyemigtnvdujts

set -e  # Exit on error

PROJECT_REF="qbuynyxyemigtnvdujts"

echo "🎯 Stripe Functions Deployment"
echo "================================"
echo ""

# Step 1: Set webhook secret
echo "📝 Step 1: Set Webhook Secret"
echo "Run this command with your actual webhook secret:"
echo "   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here --project-ref $PROJECT_REF"
echo ""
read -p "Have you set the webhook secret? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Please set the webhook secret first!"
    exit 1
fi

# Step 2: Deploy functions
echo ""
echo "🚀 Step 2: Deploying Functions..."
echo ""

# Deploy core Stripe functions
echo "📦 Deploying stripe-webhook..."
supabase functions deploy stripe-webhook --project-ref $PROJECT_REF --no-verify-jwt

echo "📦 Deploying create-checkout-session..."
supabase functions deploy create-checkout-session --project-ref $PROJECT_REF --no-verify-jwt

echo "📦 Deploying get-subscription..."
supabase functions deploy get-subscription --project-ref $PROJECT_REF --no-verify-jwt

echo "📦 Deploying update-subscription..."
supabase functions deploy update-subscription --project-ref $PROJECT_REF --no-verify-jwt

echo "📦 Deploying preview-subscription-change..."
supabase functions deploy preview-subscription-change --project-ref $PROJECT_REF --no-verify-jwt

echo ""
echo "✅ All functions deployed successfully!"
echo ""

# Step 3: Verification
echo "🔍 Step 3: Verification"
echo "======================="
echo ""
echo "1. Test webhook endpoint:"
echo "   curl -X OPTIONS https://qbuynyxyemigtnvdujts.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "2. Test create-checkout-session:"
echo "   curl -X OPTIONS https://qbuynyxyemigtnvdujts.supabase.co/functions/v1/create-checkout-session"
echo ""
echo "3. Check Stripe webhook configuration:"
echo "   https://dashboard.stripe.com/webhooks"
echo ""
echo "4. View logs:"
echo "   supabase functions log stripe-webhook --project-ref $PROJECT_REF --tail"
echo ""

# Step 4: Next steps
echo "📋 Next Steps"
echo "============="
echo ""
echo "1. Configure webhook events in Stripe Dashboard:"
echo "   - checkout.session.completed"
echo "   - customer.subscription.created"
echo "   - customer.subscription.updated"
echo "   - customer.subscription.deleted"
echo "   - customer.subscription.trial_will_end"
echo "   - invoice.payment_succeeded"
echo "   - invoice.payment_failed"
echo "   - invoice.upcoming"
echo ""
echo "2. Test free trial signup (no credit card required)"
echo "3. Test upgrade/downgrade flows"
echo "4. Monitor webhook deliveries in Stripe Dashboard"
echo ""
echo "✨ Deployment Complete!"
