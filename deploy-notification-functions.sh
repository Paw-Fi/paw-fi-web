#!/bin/bash

# Notification Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required migration (apply before running this script):
#   supabase/migrations/20260716170000_restore_notification_fallback_processing.sql
#
# The migration installs the notification claim, device registration, and
# member reminder RPCs used by these functions. It also installs the fallback
# cron in a paused state so functions can be deployed safely before activation.
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
#   service_role_key

set -euo pipefail

DEV_PROJECT_REF="qbuynyxyemigtnvdujts"
PROD_PROJECT_REF="pbopcsmrcykdzbilpilf"
REQUIRED_MIGRATION="20260716170000_restore_notification_fallback_processing.sql"

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
echo "Required migration:"
echo "  supabase/migrations/$REQUIRED_MIGRATION"
echo ""
read -r -p "Type 'migrated' to confirm it is applied: " MIGRATION_CONFIRM
if [[ "$MIGRATION_CONFIRM" != "migrated" ]]; then
  echo "Deployment cancelled. Apply the required migration first."
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

# Producers and recipient/device management.
deploy_function "households-accept-invite"
deploy_function "households-compute-splits"
deploy_function "households-register-device"
deploy_function "households-remind-member"
deploy_function "households-send-nudge"

# Primary Database Webhook consumer and delayed fallback worker.
deploy_function "households-send-push-notification"
deploy_function "households-process-notifications"

# Called by pg_cron. JWT verification is disabled at the gateway, but the
# function requires the exact service-role Authorization header internally.
deploy_internal_function "expense-daily-nudges"

echo "============================================================"
echo "  Notification functions deployed successfully"
echo "============================================================"
echo ""
echo "Post-deployment steps:"
echo "  1. Confirm the Database Webhook for notification_events sends the"
echo "     service-role Authorization header to:"
echo "     /functions/v1/households-send-push-notification"
echo ""
echo "  2. Activate the fallback cron only after all functions are deployed:"
echo ""
echo "     update cron.job"
echo "     set active = true"
echo "     where jobname = 'process-notification-events';"
echo ""
echo "  3. Verify the cron is active and new notification events are delivered."
echo ""
echo "Note: mobile notification contract changes require a separate mobile app"
echo "release and are not deployed by this script."
