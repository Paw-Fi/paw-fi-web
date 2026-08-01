#!/bin/bash

# Financial Reset Function Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required secrets
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   INTERNAL_SERVICE_SECRET
#
# Required migration
#   supabase/migrations/20260801180000_finalize_financial_data_reset.sql

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
echo "  Deploying Financial Reset function"
echo "  Environment: $ENV_NAME"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

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

FUNCTION_NAME="reset-financial-storage-cleanup"

echo "Deploying ${FUNCTION_NAME}..."
supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"
echo "${FUNCTION_NAME} deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  Financial Reset function deployed successfully"
echo ""
echo "  Post-deployment checklist:"
echo "     1. Apply migration 20260801180000_finalize_financial_data_reset.sql"
echo "     2. Verify secrets: supabase secrets list --project-ref $PROJECT_REF"
echo "     3. Verify SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and INTERNAL_SERVICE_SECRET are set"
echo "     4. Retry financial data reset and confirm the cleanup job completes"
echo "════════════════════════════════════════════════════════════"
