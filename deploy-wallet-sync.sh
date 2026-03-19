#!/bin/bash

# Apple Pay Integration Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required Supabase secrets for Apple Pay Integration flow
#
# GEMINI_API_KEY
#   API key used by save-wallet-transaction for AI categorization.
#
# Required migrations for Apple Pay Integration
#   supabase/migrations/20251008_user_contacts_preferred_currency.sql
#   supabase/migrations/20251019_rls_policies.sql
#   supabase/migrations/20260327_user_contacts_wallet_capture_enabled.sql

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
echo "  Deploying Apple Pay Integration functions"
echo "  Environment: $ENV_NAME"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

deploy_function() {
  local NAME=$1
  echo "Deploying ${NAME}..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF"
  echo "${NAME} deployed"
  echo ""
}

if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
  echo ""
  echo "WARNING: You are about to deploy to PRODUCTION"
  echo ""
  read -r -p "Type 'deploy' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "deploy" ]]; then
    echo "Deployment cancelled"
    exit 1
  fi
  echo ""
fi

# Transaction capture endpoint (JWT verified — called by iOS Shortcuts / Android NotificationListenerService)
deploy_function "save-wallet-transaction"

# Settings toggle endpoint (JWT verified — called by Flutter app)
deploy_function "update-wallet-capture-setting"

echo "════════════════════════════════════════════════════════════"
echo "  Apple Pay Integration functions deployed successfully"
echo ""
echo "  Deployment summary:"
echo "     App/API (JWT verified):"
echo "       - save-wallet-transaction"
echo "       - update-wallet-capture-setting"
echo ""
echo "  Post-deployment checklist:"
echo "     1. Ensure migrations are applied (supabase db push)"
echo "     2. Verify secrets: supabase secrets list --project-ref $PROJECT_REF"
echo "     3. Verify GEMINI_API_KEY is set for AI categorization"
echo "     4. Test iOS: trigger a Shortcuts automation and confirm 200"
echo "     5. Test Android: toggle capture ON, send a bank notification, confirm 200"
echo "════════════════════════════════════════════════════════════"
