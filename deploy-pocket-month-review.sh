#!/bin/bash

# Pocket AI Suggestions and Monthly Reminder Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Functions deployed:
#   generate-pocket-month-review       Authenticated Plus-only AI suggestions
#   pockets-month-review-notifications Internal monthly reminder producer
#   households-send-push-notification  Push delivery and Pockets deep link
#
# Required Supabase secrets:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   GOOGLE_CLOUD_SERVICE_ACCOUNT
#   GOOGLE_CLOUD_PROJECT (unless present in the service-account JSON)
#   FIREBASE_SERVICE_ACCOUNT_JSON
#   FIREBASE_PROJECT_ID
#   IOS_BUNDLE_ID
#   SUPABASE_SECRET_KEYS
#
# Required Vault secret for the hourly reminder cron:
#   supabase_url
#   notification_internal_secret_key (an active sb_secret_* API key)
#
# Required migrations:
#   supabase/migrations/20260908160000_add_pockets_month_review_notification_event.sql
#   supabase/migrations/20260908170000_pockets_month_review_ai_and_notifications.sql

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

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: Supabase CLI is not installed or not available in PATH."
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "  Deploying Pocket AI Suggestions and Monthly Reminder"
echo "  Environment: $ENV_NAME"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
  echo "WARNING: You are about to deploy to PRODUCTION"
  echo ""
  read -r -p "Type 'deploy' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "deploy" ]]; then
    echo "Deployment cancelled"
    exit 1
  fi
  echo ""
fi

deploy_function() {
  local NAME=$1
  echo "Deploying ${NAME}..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF"
  echo "${NAME} deployed"
  echo ""
}

deploy_internal_function() {
  local NAME=$1
  echo "Deploying ${NAME} (--no-verify-jwt)..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF" --no-verify-jwt
  echo "${NAME} deployed"
  echo ""
}

# Called by the authenticated mobile app. The function validates the user and
# Plus entitlement itself, so gateway JWT verification remains enabled.
deploy_function "generate-pocket-month-review"

# Called by pg_cron and by the notification dispatcher, respectively. Both
# validate service-to-service credentials in their handlers.
deploy_internal_function "pockets-month-review-notifications"
deploy_internal_function "households-send-push-notification"

echo "════════════════════════════════════════════════════════════"
echo "  Pocket AI Suggestions and Monthly Reminder deployed"
echo ""
echo "  Post-deployment checklist:"
echo "     1. Apply the two required Pockets reminder migrations."
echo "     2. Verify secrets: supabase secrets list --project-ref $PROJECT_REF"
echo "     3. Verify Vault has supabase_url and notification_internal_secret_key."
echo "     4. Confirm the pockets-month-review-notifications cron job is active."
echo "     5. Call generate-pocket-month-review as a Plus user with current pockets."
echo "     6. Create a test pockets_month_review event and verify its push deep link."
echo "════════════════════════════════════════════════════════════"
