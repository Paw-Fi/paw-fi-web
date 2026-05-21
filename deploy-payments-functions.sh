#!/bin/bash

# Payments & Subscription Functions Deployment Script
# Project: Moneko
#
# Deploys:
# - Stripe checkout + verification functions (web + Android)
# - IAP catalog + verification functions (iOS)
#
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

PROJECT_REF="qbuynyxyemigtnvdujts"

echo "════════════════════════════════════════════════════════════"
echo "  Deploying Payments Functions to Supabase"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# ---------------------------------------------------------------------------
# Stripe (web + Android) functions
# ---------------------------------------------------------------------------

echo "[1/13] Deploying stripe-webhook function..."
supabase functions deploy stripe-webhook --project-ref $PROJECT_REF --no-verify-jwt
echo "OK: stripe-webhook deployed"
echo ""

echo "[2/13] Deploying create-checkout-session function..."
supabase functions deploy create-checkout-session --project-ref $PROJECT_REF
echo "OK: create-checkout-session deployed"
echo ""

echo "[3/13] Deploying verify-payment function..."
# Public endpoint: used by logged-out web payment-status page.
supabase functions deploy verify-payment --project-ref $PROJECT_REF --no-verify-jwt
echo "OK: verify-payment deployed"
echo ""

echo "[4/13] Deploying get-subscription function..."
supabase functions deploy get-subscription --project-ref $PROJECT_REF
echo "OK: get-subscription deployed"
echo ""

echo "[5/13] Deploying update-subscription function..."
supabase functions deploy update-subscription --project-ref $PROJECT_REF
echo "OK: update-subscription deployed"
echo ""

echo "[6/13] Deploying preview-subscription-change function..."
supabase functions deploy preview-subscription-change --project-ref $PROJECT_REF
echo "OK: preview-subscription-change deployed"
echo ""

echo "[7/13] Deploying create-portal-session function..."
supabase functions deploy create-portal-session --project-ref $PROJECT_REF
echo "OK: create-portal-session deployed"
echo ""

echo "[8/13] Deploying manage-payment-method function..."
supabase functions deploy manage-payment-method --project-ref $PROJECT_REF
echo "OK: manage-payment-method deployed"
echo ""

# ---------------------------------------------------------------------------
# IAP (iOS) functions
# ---------------------------------------------------------------------------

echo "[9/13] Deploying get-subscription-products function..."
supabase functions deploy get-subscription-products --project-ref $PROJECT_REF
echo "OK: get-subscription-products deployed"
echo ""

echo "[10/13] Deploying verify-iap-purchase function..."
supabase functions deploy verify-iap-purchase --project-ref $PROJECT_REF
echo "OK: verify-iap-purchase deployed"

echo "[11/13] Deploying app-store-notifications function..."
supabase functions deploy app-store-notifications --project-ref $PROJECT_REF --no-verify-jwt
echo "OK: app-store-notifications deployed"
echo ""

echo "[12/13] Deploying subscription-founder-followup function..."
supabase functions deploy subscription-founder-followup --project-ref $PROJECT_REF --no-verify-jwt
echo "OK: subscription-founder-followup deployed"
echo ""

echo "[13/13] Deploying process-subscription-followup-emails function..."
supabase functions deploy process-subscription-followup-emails --project-ref $PROJECT_REF --no-verify-jwt
echo "OK: process-subscription-followup-emails deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  OK: All payments functions deployed successfully"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "Next Steps:"
echo ""
echo "1) Apply DB migrations (if not already applied):"
echo "   - moneko-web/supabase/migrations/20260122_iap_subscription_catalog.sql"
echo "   - moneko-web/supabase/migrations/20260122_seed_ios_subscription_products.sql"
echo "   - moneko-web/supabase/migrations/20260329_subscription_followup_email_queue.sql"
echo ""
echo "2) Verify Environment Variables in Supabase Dashboard (Project -> Settings -> Secrets):"
echo "   Required (Stripe / web checkout):"
echo "   - STRIPE_SECRET_KEY=sk_..."
echo "   - STRIPE_WEBHOOK_SECRET=whsec_..."
echo "   - STRIPE_MONTHLY_PLUS_PLAN_ID=price_... (or STRIPE_PLUS_MONTHLY_PRICE_ID)"
echo "   - STRIPE_YEARLY_PLUS_PLAN_ID=price_... (or STRIPE_PLUS_YEARLY_PRICE_ID)"
echo "   - STRIPE_LIFETIME_PRICE_ID=price_..."
echo "   - SUPABASE_URL=https://<project>.supabase.co"
echo "   - SUPABASE_SERVICE_ROLE_KEY=..."
echo ""
echo "   Required (iOS IAP verification):"
echo "   - APP_STORE_SHARED_SECRET=<App Store Connect -> App Information -> App-Specific Shared Secret>"
echo "   - APPLE_BUNDLE_ID=com.moneko.mobile"
echo "   - APPLE_APP_ID=<App Store numeric ID>"
echo "   - APPLE_APP_STORE_ISSUER_ID=<App Store Server API Issuer ID>"
echo "   - APPLE_APP_STORE_KEY_ID=<App Store Server API Key ID>"
echo "   - APPLE_APP_STORE_PRIVATE_KEY=<.p8 private key contents>"
echo ""
echo "   Optional (Android server-side verification, if/when you enable Android IAP):"
echo "   - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={...}"
echo "   - ANDROID_PACKAGE_NAME=com.moneko.mobile"
echo ""
echo "3) Monitor logs:"
echo "   supabase functions logs create-checkout-session --project-ref $PROJECT_REF"
echo "   supabase functions logs verify-payment --project-ref $PROJECT_REF"
echo "   supabase functions logs verify-iap-purchase --project-ref $PROJECT_REF"
echo ""
