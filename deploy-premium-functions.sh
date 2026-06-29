#!/bin/bash

# Premium Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required Supabase secrets
#
# SUPABASE_URL
#   URL of the Supabase project.
#
# SUPABASE_SERVICE_ROLE_KEY
#   Service role key used by the functions.
#

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
echo "  🚀 Deploying Premium functions"
echo "  Environment: $ENV_NAME"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

deploy_function() {
  local NAME=$1
  echo "📦 Deploying ${NAME}..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF"
  echo "✅ ${NAME} deployed"
  echo ""
}

if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
  echo ""
  echo "⚠️  WARNING: You are about to deploy to PRODUCTION"
  echo ""
  read -r -p "Type 'deploy' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "deploy" ]]; then
    echo "❌ Deployment cancelled"
    exit 1
  fi
  echo ""
fi

# App/API (JWT verified)
deploy_function "premium-dashboard-summary"
deploy_function "premium-export-center"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Premium functions deployed successfully"
echo ""
echo "  📋 Deployment summary:"
echo "     App/API (JWT verified):"
echo "       - premium-dashboard-summary"
echo "       - premium-export-center"
echo ""
echo "  📝 Post-deployment checklist:"
echo "     1. Ensure migrations are applied (supabase db push)"
echo "     2. Verify secrets: supabase secrets list --project-ref $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
