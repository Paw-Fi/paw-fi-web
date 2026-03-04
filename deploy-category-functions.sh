#!/bin/bash

# Category Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required migrations for category lifecycle
#   supabase/migrations/20260302_user_custom_categories.sql
#   supabase/migrations/20260302_user_category_remaps.sql
#   supabase/migrations/20260302_user_hidden_transaction_categories.sql
#   supabase/migrations/20260304_rename_user_custom_category_rpc.sql
#   supabase/migrations/20260304_user_custom_category_management_rpc.sql

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
echo "  🚀 Deploying Category functions"
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

deploy_internal_function() {
  local NAME=$1
  echo "📦 Deploying ${NAME} (--no-verify-jwt)..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF" --no-verify-jwt
  echo "✅ ${NAME} deployed (internal/JWT-optional)"
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

# Category lifecycle and ingestion/save functions that apply category logic
deploy_function "manage-user-categories"
deploy_function "analyze-expense"
deploy_internal_function "save-expense"
deploy_internal_function "save-income"
deploy_internal_function "save-transactions-batch"
deploy_internal_function "update-expense"
deploy_internal_function "delete-expense"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Category functions deployed successfully"
echo ""
echo "  📋 Deployment summary:"
echo "     - manage-user-categories"
echo "     - analyze-expense"
echo "     - save-expense"
echo "     - save-income"
echo "     - save-transactions-batch"
echo "     - update-expense"
echo "     - delete-expense"
echo ""
echo "  📝 Post-deployment checklist:"
echo "     1. Apply migrations (supabase db push)"
echo "     2. Verify functions list: supabase functions list --project-ref $PROJECT_REF"
echo "     3. Smoke test rename/hide/delete/upsert from Settings"
echo "     4. Validate new expenses keep remapped custom categories"
echo "════════════════════════════════════════════════════════════"
