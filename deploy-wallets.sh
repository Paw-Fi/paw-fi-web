#!/bin/bash

# Accounts Feature Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required migrations for Accounts feature
#   supabase/migrations/20260331_wallets_feature.sql

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

# Core wallet management endpoints
deploy_function "wallets-overview"
deploy_function "list-wallets"
deploy_function "save-wallet"
deploy_function "update-wallet"
deploy_function "archive-wallet"
deploy_function "restore-wallet"
deploy_function "create-wallet-transfer"
deploy_function "update-wallet-transfer"
deploy_function "delete-wallet-transfer"
deploy_function "update-wallet-balance"

# Transaction endpoints that now support wallet_id/walletId
deploy_function "list-expenses"
deploy_function "save-expense"
deploy_function "save-income"
deploy_function "update-expense"

echo "════════════════════════════════════════════════════════════"
echo "  Accounts feature functions deployed successfully"
echo ""
echo "  Deployment summary:"
echo "     Account management:"
echo "       - list-wallets"
echo "       - save-wallet"
echo "       - update-wallet"
echo "       - archive-wallet"
echo "       - restore-wallet"
echo "       - create-wallet-transfer"
echo "       - update-wallet-transfer"
echo "       - delete-wallet-transfer"
echo "       - update-wallet-balance"
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
echo "     3. Smoke test wallet CRUD + transfer endpoints"
echo "     4. Smoke test expense/income create + update with walletId"
echo "════════════════════════════════════════════════════════════"
