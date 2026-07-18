#!/bin/bash

# Notification Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required migration (apply after the internal functions are deployed):
#   supabase/migrations/20260718100000_unify_notification_internal_auth.sql
#
# The migration replaces the Database Webhook and notification crons with one
# Vault-backed sb_secret authentication path.
#
# Required Edge Function secrets:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   FIREBASE_SERVICE_ACCOUNT_JSON
#   FIREBASE_PROJECT_ID
#   IOS_BUNDLE_ID
#
# Required Vault secrets for the fallback cron:
#   supabase_url
#   notification_internal_secret_key (an active sb_secret_* API key)

set -euo pipefail

DEV_PROJECT_REF="qbuynyxyemigtnvdujts"
PROD_PROJECT_REF="pbopcsmrcykdzbilpilf"
REQUIRED_MIGRATION="20260718100000_unify_notification_internal_auth.sql"

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

echo "============================================================"
echo "  Deploying notification functions"
echo "  Environment: $ENV_NAME"
echo "  Project: $PROJECT_REF"
echo "============================================================"
echo ""
echo "Required Vault secret:"
echo "  notification_internal_secret_key (active sb_secret_* key)"
echo ""
read -r -p "Type 'secret-configured' to confirm it exists: " SECRET_CONFIRM
if [[ "$SECRET_CONFIRM" != "secret-configured" ]]; then
  echo "Deployment cancelled. Configure the Vault secret first."
  exit 1
fi

if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
  echo ""
  echo "WARNING: You are about to deploy notification functions to PRODUCTION."
  read -r -p "Type 'deploy' to confirm: " DEPLOY_CONFIRM
  if [[ "$DEPLOY_CONFIRM" != "deploy" ]]; then
    echo "Deployment cancelled."
    exit 1
  fi
  echo ""
fi

deploy_internal_function() {
  local NAME=$1
  echo "Deploying ${NAME} (--no-verify-jwt)..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF" --no-verify-jwt
  echo "${NAME} deployed"
  echo ""
}

# Internal notification endpoints only. Producers and device registration are
# deliberately not redeployed by this auth-only correction.
deploy_internal_function "households-send-nudge"

# Primary Database Webhook consumer and delayed fallback worker.
deploy_internal_function "households-send-push-notification"
deploy_internal_function "households-process-notifications"

# Called by pg_cron. All internal endpoints validate the Vault-backed apikey in
# their handlers while retaining legacy service-role bearer compatibility.
deploy_internal_function "expense-daily-nudges"

echo ""
echo "Apply the required migration now:"
echo "  supabase/migrations/$REQUIRED_MIGRATION"
echo ""
read -r -p "Type 'migrated' after it is applied: " MIGRATION_CONFIRM
if [[ "$MIGRATION_CONFIRM" != "migrated" ]]; then
  echo "Deployment incomplete. Apply the migration before testing notifications."
  exit 1
fi

echo "============================================================"
echo "  Notification functions deployed successfully"
echo "============================================================"
echo ""
echo "Post-deployment steps:"
echo "  1. Verify notification_event_realtime_push is the only INSERT trigger."
echo "  2. Verify both notification cron jobs are active."
echo "  3. Create a test event and confirm its pg_net response is HTTP 200."
echo ""
echo "Note: mobile notification contract changes require a separate mobile app"
echo "release and are not deployed by this script."
