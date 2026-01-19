#!/bin/bash

# Plaid Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
# 
# Required Supabase secrets (shared between environments):
#   PLAID_CLIENT_ID              # Plaid client id (dev/prod)
#   PLAID_SECRET                 # Plaid secret matching PLAID_ENV
#   PLAID_ENV                    # plaid environment: sandbox|development|production
#   PLAID_PRODUCTS               # comma list, default "transactions"
#   PLAID_COUNTRY_CODES          # comma list of allowed country codes (e.g. US,CA,GB)
#   PLAID_CLIENT_NAME            # shown in Link
#   PLAID_WEBHOOK_URL            # optional webhook for plaid transactions
#   PLAID_LINK_CUSTOMIZATION_NAME# optional Link customization
#   PLAID_ENCRYPTION_KEY         # base64 AES key for encrypting access tokens
#   TINK_CLIENT_ID               # Tink client id
#   TINK_CLIENT_SECRET           # Tink client secret
#   TINK_ENV                     # tink environment: sandbox|production
#   TINK_REDIRECT_URI            # redirect used by Tink Link (default moneko://tink)
#   TINK_SCOPES                  # space/comma separated scopes (accounts:read,transactions:read,offline_access)
#   TINK_DEFAULT_MARKET          # default market/country (e.g. GB or IE)
#   TINK_DEFAULT_LOCALE          # default locale (e.g. en_US)

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
deploy_function "tink-create-link-token"
deploy_function "tink-exchange-auth-code"
deploy_function "tink-sync-transactions"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Plaid functions deployed successfully"
echo "════════════════════════════════════════════════════════════"
