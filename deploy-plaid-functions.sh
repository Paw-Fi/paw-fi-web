#!/bin/bash

# Plaid Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -euo pipefail

PROJECT_REF="qbuynyxyemigtnvdujts"

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Deploying Plaid banking functions"
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

deploy_function "plaid-create-link-token"
deploy_function "plaid-exchange-public-token"
deploy_function "plaid-sync-transactions"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Plaid functions deployed successfully"
echo "════════════════════════════════════════════════════════════"
