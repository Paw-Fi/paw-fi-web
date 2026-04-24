#!/bin/bash

# Email File Import Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required Supabase secrets for Email File Import flow
#
# GEMINI_API_KEY
#   API key used by resend-inbound-webhook for AI extraction.
# RESEND_API_KEY
#   API key used for Resend inbound fetches and follow-up emails.
# RESEND_WEBHOOK_SECRET
#   Webhook signing secret used to verify Resend inbound deliveries.
# EMAIL_IMPORT_INBOX_EMAIL / EMAIL_IMPORT_INBOX_EMAILS
#   Optional inbox override(s). Example for dev:
#   EMAIL_IMPORT_INBOX_EMAIL=test-files@inbound.moneko.io
# FIREBASE_SERVICE_ACCOUNT_JSON
#   Service account used to send push notifications through FCM.
# FIREBASE_PROJECT_ID
#   Firebase project ID used by FCM v1.
# IOS_BUNDLE_ID
#   APNs topic for iOS push delivery.
#
# Required migrations for Email File Import
#   supabase/migrations/20251008_user_contacts_preferred_currency.sql
#   supabase/migrations/20251019_rls_policies.sql
#   supabase/migrations/20260421120000_email_import_settings.sql

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
echo "  Deploying Email File Import functions"
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

deploy_public_function() {
  local NAME=$1
  echo "Deploying ${NAME} (--no-verify-jwt)..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF" --no-verify-jwt
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

# Settings endpoint (JWT verified — called by Flutter app)
deploy_function "email-import-settings"

# Shared mailbox webhook (Resend verified — called by Resend inbound webhooks)
deploy_public_function "resend-inbound-webhook"

echo "════════════════════════════════════════════════════════════"
echo "  Email File Import functions deployed successfully"
echo ""
echo "  Deployment summary:"
echo "     App/API (JWT verified):"
echo "       - email-import-settings"
echo ""
echo "     External webhooks (provider verified, --no-verify-jwt):"
echo "       - resend-inbound-webhook"
echo ""
echo "  Post-deployment checklist:"
echo "     1. Ensure migrations are applied (supabase db push)"
echo "     2. Verify secrets: supabase secrets list --project-ref $PROJECT_REF"
echo "     3. Verify GEMINI_API_KEY, RESEND_API_KEY, and RESEND_WEBHOOK_SECRET are set"
echo "     3a. In dev, set EMAIL_IMPORT_INBOX_EMAIL=test-files@inbound.moneko.io"
echo "     4. Verify FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_PROJECT_ID, and IOS_BUNDLE_ID are set"
echo "     5. Configure Resend inbound webhook to call resend-inbound-webhook"
echo "     6. Test with a forwarded email to the configured import inbox and confirm logs + follow-up email"
echo "════════════════════════════════════════════════════════════"
