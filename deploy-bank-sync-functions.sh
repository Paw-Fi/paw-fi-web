#!/bin/bash

# Bank Sync Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
# 
# Required Supabase secrets (shared between environments)
#
# NOTE: This repository reads these via Deno.env.get(...) inside Supabase Edge Functions.
# Set them with: `supabase secrets set --project-ref <ref> NAME=value ...`
#
# --- Plaid ---
# PLAID_CLIENT_ID
#   Example: "5f..." (string)
#   Where to get: Plaid Dashboard -> Developers -> Keys (client_id)
#   Docs: https://plaid.com/docs/quickstart/#introduction
#
# PLAID_SECRET
#   Example: "sandbox-..." / "development-..." / "production-..."
#   Where to get: Plaid Dashboard -> Developers -> Keys (secret per environment)
#   Docs: https://plaid.com/docs/quickstart/#introduction
#
# PLAID_ENV
#   Example: "sandbox" | "development" | "production"
#   Where to get: choose the Plaid environment you are targeting.
#   Docs: https://plaid.com/docs/quickstart/#introduction
#
# PLAID_PRODUCTS
#   Example: "transactions" (comma-separated)
#   Where to get: your Plaid product enablements; this maps to /link/token/create "products".
#   Docs: https://plaid.com/docs/api/link/#linktokencreate
#
# PLAID_COUNTRY_CODES
#   Example: "US,CA" (comma-separated ISO-3166-1 alpha-2)
#   Where to get: your Plaid country enablements; this maps to /link/token/create "country_codes".
#   Docs: https://plaid.com/docs/api/link/#linktokencreate
#
# PLAID_CLIENT_NAME
#   Example: "Moneko" (<= 30 chars, shown in Link)
#   Where to get: your app branding; maps to /link/token/create "client_name".
#   Docs: https://plaid.com/docs/api/link/#linktokencreate
#
#
# PLAID_LINK_CUSTOMIZATION_NAME
#   Example: "default" (or your Link customization name)
#   Where to get: Plaid Dashboard -> Link -> Customizations (name).
#   Docs: https://plaid.com/docs/api/link/#linktokencreate
#
# PLAID_ENCRYPTION_KEY
#   Example: base64-encoded AES-GCM key bytes (recommend 32 bytes)
#   How to generate: `openssl rand -base64 32`
#   Where to use: configured as a Supabase secret; used to encrypt access/refresh tokens at rest.
#
# SKIP_WEBHOOK_VERIFICATION (optional, dev-only)
#   Example: "true" to disable Plaid/Tink webhook signature verification.
#   WARNING: Never enable in production.
#
# --- Tink ---
# NOTE: Tink documentation sites are not fetchable from this environment (JS-only / network).
# Docs (open in a browser): https://docs.tink.com/
# Values below are based on how our code reads them in `supabase/functions/shared/tink-client.ts`.
#
# TINK_CLIENT_ID
#   Example: "..." (string)
#   Where to get: Tink developer console / application settings.
#
# TINK_CLIENT_SECRET
#   Example: "..." (string)
#   Where to get: Tink developer console / application settings.
#
# TINK_ENV
#   Example: "sandbox" | "production" (repo default is sandbox)
#   Where to get: choose the Tink environment for your app.
#
# TINK_REDIRECT_URI
#   Example: "moneko://tink" (must match your registered redirect URI in Tink)
#   Where to get: set in Tink app settings + must match your mobile deep link.
#
# TINK_SCOPES
#   Example: "accounts:read,transactions:read,offline_access"
#   Where to get: configured per your Tink app + consent requirements.
#
# TINK_DEFAULT_MARKET
#   Example: "GB" (ISO country code)
#
# TINK_DEFAULT_LOCALE
#   Example: "en_US"
#
# TINK_WEBHOOK_SECRET
#   Example: "..." (string)
#   Where to get: Tink webhook signing secret from Tink console (used to verify X-Tink-Signature).
#
# --- Internal auth ---
# INTERNAL_SERVICE_SECRET
#   Example: long random string
#   How to generate: `openssl rand -hex 32`
#   Where to use: Supabase secrets + database setting app.settings.internal_service_secret
#   Used by: bank-sync-processor and internal calls to sync endpoints.

# Required database migrations (fresh bank-sync deploy)
# Apply these in order (or ensure they're already applied):
#   supabase/migrations/20260115_salt_edge_integration.sql
#     - Creates bank_connections, bank_accounts (+ base RLS/indexes)
#   supabase/migrations/20260119_bank_provider_normalization.sql
#     - Provider-neutral columns + UNIQUE index on (user_id, provider, provider_item_id)
#   supabase/migrations/20260120_bank_sync_resilience.sql
#     - Creates bank_webhook_events, bank_sync_jobs (+ RLS/indexes)
#   supabase/migrations/20260128_bank_sync_hardening.sql
#     - Idempotency, locks, tink_auth_states (with connection_id for delegated auth)
#     - Atomic RPC upsert_bank_connection_with_household
#   supabase/migrations/20260129_bank_sync_cron_scheduler.sql
#     - pg_cron schedules (bank-sync-processor + cleanup) + verify_bank_sync_cron_config()

# Optional clean reset (DESTRUCTIVE)
# If you need to wipe bank-sync schema/data and redeploy from scratch, run:
#   - In Supabase SQL editor: paste `supabase/scripts/bank_sync_reset.sql`
#   - Or via psql: `psql "$DATABASE_URL" -f supabase/scripts/bank_sync_reset.sql`
# Then re-apply the migrations above.

set -euo pipefail

# Environment selection
DEV_PROJECT_REF="qbuynyxyemigtnvdujts"
PROD_PROJECT_REF="pbopcsmrcykdzbilpilf"

# Default to dev, use --prod flag for production
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
echo "  🚀 Deploying bank sync functions"
echo "  Environment: $ENV_NAME"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# Standard function deployment (with JWT verification)
deploy_function() {
  local NAME=$1
  echo "📦 Deploying ${NAME}..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF"
  echo "✅ ${NAME} deployed"
  echo ""
}

# Internal function deployment (without JWT verification - uses internal secret auth)
# These functions are called by pg_cron/pg_net or other edge functions
deploy_internal_function() {
  local NAME=$1
  echo "📦 Deploying ${NAME} (--no-verify-jwt)..."
  supabase functions deploy "${NAME}" --project-ref "$PROJECT_REF" --no-verify-jwt
  echo "✅ ${NAME} deployed (internal auth only)"
  echo ""
}

# Production safety confirmation
if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
  echo ""
  echo "⚠️  WARNING: You are about to deploy to PRODUCTION"
  echo ""
  read -p "Type 'deploy' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "deploy" ]]; then
    echo "❌ Deployment cancelled"
    exit 1
  fi
  echo ""
fi

# User-facing functions (require JWT from mobile app)
deploy_function "plaid-create-link-token"
deploy_function "plaid-exchange-public-token"
deploy_function "tink-create-link-token"
deploy_function "tink-exchange-auth-code"

# Internal/dual-auth functions (called by pg_cron or other functions)
# These use X-Internal-Service-Secret header for internal calls
# and can also accept user JWT for direct user-initiated syncs
deploy_internal_function "plaid-sync-transactions"
deploy_internal_function "tink-sync-transactions"
deploy_internal_function "bank-sync-processor"

# Webhook handlers (called by external providers, verify their own signatures)
deploy_internal_function "plaid-webhook"
deploy_internal_function "tink-webhook"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Bank sync functions deployed successfully"
echo ""
echo "  📋 Deployment summary:"
echo "     User-facing (JWT required):"
echo "       - plaid-create-link-token"
echo "       - plaid-exchange-public-token"
echo "       - tink-create-link-token"
echo "       - tink-exchange-auth-code"
echo ""
echo "     Internal (--no-verify-jwt, uses internal secret):"
echo "       - plaid-sync-transactions"
echo "       - tink-sync-transactions"
echo "       - bank-sync-processor"
echo "       - plaid-webhook"
echo "       - tink-webhook"
echo ""
echo "  📝 Post-deployment checklist:"
echo "     1. Verify secrets are set: supabase secrets list --project-ref $PROJECT_REF"
echo "     2. Verify cron config: SELECT * FROM public.verify_bank_sync_cron_config();"
echo "     3. Test webhook endpoints with provider test tools"
echo "════════════════════════════════════════════════════════════"
