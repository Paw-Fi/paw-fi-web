#!/bin/bash

# Merchant Logo and Identity Functions Deployment Script
# Project: Moneko
# Source commit: 076cd3d562f51332d00fabd9e94d17df769872e0
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required Supabase secrets
#
# LOGO_DEV_SECRET_KEY
#   Logo.dev secret key used only by server-side candidate discovery.
#
# GEMINI_API_KEY
#   Required by analyze-expense.
#
# SECRET_SUPABASE_SERVICE_ROLE_API_KEY
#   Internal function authentication secret used by hybrid callers.
#
# INTERNAL_SERVICE_SECRET
#   Optional legacy/internal authentication secret accepted by shared auth.
#
# MONEKO_INTERNAL_API_KEY
#   Required by merchant-resolution-worker for its X-Moneko-Internal-Key header.
#
# Supabase supplies SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
# SUPABASE_ANON_KEY to deployed Edge Functions. Do not put Logo.dev secrets in
# the mobile app or a VITE_* client variable.
#
# Required migration
#   supabase/migrations/20260915130000_merchant_identity_resolution.sql

set -euo pipefail

DEV_PROJECT_REF="qbuynyxyemigtnvdujts"
PROD_PROJECT_REF="pbopcsmrcykdzbilpilf"

if [[ "${1:-}" == "--prod" ]]; then
  PROJECT_REF="$PROD_PROJECT_REF"
  ENV_NAME="PRODUCTION"
elif [[ "${1:-}" == "--dev" ]] || [[ -z "${1:-}" ]]; then
  PROJECT_REF="$DEV_PROJECT_REF"
  ENV_NAME="DEVELOPMENT"
else
  echo "Usage: $0 [--dev|--prod]"
  echo "  --dev   Deploy to development (default)"
  echo "  --prod  Deploy to production"
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "  Deploying Merchant Logo and Identity functions"
echo "  Environment: $ENV_NAME"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

deploy_function() {
  local name="$1"
  echo "📦 Deploying ${name}..."
  supabase functions deploy "$name" --project-ref "$PROJECT_REF"
  echo "✅ ${name} deployed"
  echo ""
}

deploy_internal_function() {
  local name="$1"
  echo "📦 Deploying ${name} (--no-verify-jwt)..."
  supabase functions deploy "$name" --project-ref "$PROJECT_REF" --no-verify-jwt
  echo "✅ ${name} deployed (in-function authentication)"
  echo ""
}

if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
  echo ""
  echo "⚠️  WARNING: You are about to deploy to PRODUCTION"
  echo ""
  read -r -p "Type 'deploy' to confirm: " confirm
  if [[ "$confirm" != "deploy" ]]; then
    echo "❌ Deployment cancelled"
    exit 1
  fi
  echo ""
fi

# JWT-verified app/API entrypoints.
deploy_function "analyze-expense"
deploy_function "merchant-logo-bootstrap"
deploy_function "merchant-user-search"

# Internal or hybrid entrypoints. Gateway JWT verification is disabled because
# these functions authenticate their own internal headers/secrets.
deploy_internal_function "merchant-resolution-worker"
deploy_internal_function "recurring-read"
deploy_internal_function "save-expense"
deploy_internal_function "save-income"
deploy_internal_function "save-transactions-batch"
deploy_internal_function "update-transactions-batch"
deploy_internal_function "save-wallet-transaction"
deploy_internal_function "update-expense"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Merchant Logo and Identity functions deployed successfully"
echo ""
echo "  📋 Post-deployment checklist:"
echo "     1. Apply migration:"
echo "        supabase db push --project-ref $PROJECT_REF"
echo "        Migration: supabase/migrations/20260915130000_merchant_identity_resolution.sql"
echo "     2. Verify required secrets:"
echo "        supabase secrets list --project-ref $PROJECT_REF"
echo "        LOGO_DEV_SECRET_KEY"
echo "        GEMINI_API_KEY"
echo "        SECRET_SUPABASE_SERVICE_ROLE_API_KEY"
echo "        MONEKO_INTERNAL_API_KEY"
echo "     3. Test explicit merchant search and bootstrap flows."
echo "     4. Verify merchant-resolution-worker internal authentication and logs."
echo "════════════════════════════════════════════════════════════"
