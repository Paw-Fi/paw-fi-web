#!/bin/bash

# Telegram Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf
#
# Required Supabase secrets for Telegram flow
#
# TELEGRAM_BOT_TOKEN
#   Telegram bot token from @BotFather.
#
# GEMINI_API_KEY
#   API key used by telegram-ai-bot for intent/media extraction.
#
# ALLOWED_ORIGINS
#   First origin is used to build verification links (e.g. https://moneko.io).
#
# EDGE_FUNCTION_KEY
#   Required for update/delete transaction actions called internally by telegram-ai-bot.
#
# Required migrations for Telegram parity
#   supabase/migrations/20251008_user_contacts_preferred_currency.sql
#   supabase/migrations/20251019_rls_policies.sql
#   supabase/migrations/20260206_telegram_integration.sql
#   supabase/migrations/20260315_whatsapp_context_portfolio_flag.sql
#   supabase/migrations/20260323_telegram_context_portfolio_flag.sql

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
echo "  🚀 Deploying Telegram functions"
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
  echo "✅ ${NAME} deployed (webhook/internal entry)"
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

# Public webhook entrypoint from Telegram (no JWT)
deploy_internal_function "twilio-whatsapp-ai-bot"
deploy_internal_function "telegram-ai-bot"

# App verification function (JWT from mobile app)
deploy_function "verify-telegram-binding"

# Called by telegram-ai-bot for tool parity actions
deploy_internal_function "update-expense"
deploy_internal_function "delete-expense"
deploy_internal_function "update-preferred-language"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Telegram functions deployed successfully"
echo ""
echo "  📋 Deployment summary:"
echo "     Webhook/internal entry (--no-verify-jwt):"
echo "       - telegram-ai-bot"
echo ""
echo "     App/API (JWT verified):"
echo "       - verify-telegram-binding"
echo ""
echo "     Internal tool/API hybrid (--no-verify-jwt, still authenticated in-function):"
echo "       - update-expense"
echo "       - delete-expense"
echo "       - update-preferred-language"
echo ""
echo "  📝 Post-deployment checklist:"
echo "     1. Ensure migrations are applied (supabase db push)"
echo "     2. Verify secrets: supabase secrets list --project-ref $PROJECT_REF"
echo "     3. Verify Telegram webhook points to /functions/v1/telegram-ai-bot"
echo "     4. Verify web app deploy includes route /verify-telegram"
echo "════════════════════════════════════════════════════════════"
