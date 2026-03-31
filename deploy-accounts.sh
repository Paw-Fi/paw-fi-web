#!/bin/bash

# Accounts Feature Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required migrations for Accounts feature
#   supabase/migrations/20260331_accounts_feature.sql

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
echo "  Deploying Accounts feature functions"
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

# Core account management endpoints
deploy_function "list-accounts"
deploy_function "save-account"
deploy_function "update-account"
deploy_function "archive-account"
deploy_function "restore-account"
deploy_function "create-account-transfer"
deploy_function "update-account-balance"

# Transaction endpoints that now support account_id/accountId
deploy_function "list-expenses"
deploy_function "save-expense"
deploy_function "save-income"
deploy_function "update-expense"

echo "════════════════════════════════════════════════════════════"
echo "  Accounts feature functions deployed successfully"
echo ""
echo "  Deployment summary:"
echo "     Account management:"
echo "       - list-accounts"
echo "       - save-account"
echo "       - update-account"
echo "       - archive-account"
echo "       - restore-account"
echo "       - create-account-transfer"
echo "       - update-account-balance"
echo ""
echo "     Account-aware transactions:"
echo "       - list-expenses"
echo "       - save-expense"
echo "       - save-income"
echo "       - update-expense"
echo ""
echo "  Post-deployment checklist:"
echo "     1. Apply migrations: supabase db push --project-ref $PROJECT_REF"
echo "     2. Verify functions: supabase functions list --project-ref $PROJECT_REF"
echo "     3. Smoke test account CRUD + transfer endpoints"
echo "     4. Smoke test expense/income create + update with accountId"
echo "════════════════════════════════════════════════════════════"
