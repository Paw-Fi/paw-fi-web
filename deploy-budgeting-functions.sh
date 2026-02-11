#!/bin/bash

# Budgeting Functions Deployment Script
# Project: Moneko
# Projectm Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -euo pipefail  # Exit on error, unset vars, and pipe fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEFAULT_PROJECT_REF="qbuynyxyemigtnvdujts"
PROJECT_REF="${1:-${PROJECT_REF:-$DEFAULT_PROJECT_REF}}"

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Deploying Budgeting Functions to Supabase"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Deploy Twilio WhatsApp entrypoints (CRITICAL)
# echo "📦 [1/18] Deploying twilio-whatsapp-ai-bot function..."
# supabase functions deploy twilio-whatsapp-ai-bot --project-ref "$PROJECT_REF" --no-verify-jwt
# echo "✅ twilio-whatsapp-ai-bot deployed"
# echo ""

# echo "📦 [2/18] Deploying twilio-whatsapp-fallback function..."
# supabase functions deploy twilio-whatsapp-fallback --project-ref "$PROJECT_REF" --no-verify-jwt
# echo "✅ twilio-whatsapp-fallback deployed"
# echo ""

# Step 2: Deploy finance-update
echo "📦 [3/18] Deploying finance-update function..."
supabase functions deploy finance-update --project-ref "$PROJECT_REF"
echo "✅ finance-update deployed"
echo ""

# Step 3: Deploy initiate-whatsapp-binding
echo "📦 [4/18] Deploying initiate-whatsapp-binding function..."
supabase functions deploy initiate-whatsapp-binding --project-ref "$PROJECT_REF"
echo "✅ initiate-whatsapp-binding deployed"
echo ""

# Step 4: Deploy verify-whatsapp-binding
echo "📦 [5/18] Deploying verify-whatsapp-binding function..."
supabase functions deploy verify-whatsapp-binding --project-ref "$PROJECT_REF"
echo "✅ verify-whatsapp-binding deployed"
echo ""

# Step 5: Deploy set-budget
echo "📦 [6/18] Deploying set-budget function..."
supabase functions deploy set-budget --project-ref "$PROJECT_REF"
echo "✅ set-budget deployed"
echo ""

# Step 6: Deploy update-preferred-currency
echo "📦 [7/18] Deploying update-preferred-currency function..."
supabase functions deploy update-preferred-currency --project-ref "$PROJECT_REF"
echo "✅ update-preferred-currency deployed"
echo ""

echo "📦 [8/18] Deploying process-expenses function..."
supabase functions deploy process-expenses --project-ref "$PROJECT_REF"
echo "✅ process-expenses deployed"
echo ""

echo "📦 [9/18] Deploying save-income function..."
supabase functions deploy save-income --project-ref "$PROJECT_REF" --no-verify-jwt
echo "✅ save-income deployed"
echo ""

echo "📦 [10/18] Deploying save-expense function..."
supabase functions deploy save-expense --project-ref "$PROJECT_REF" --no-verify-jwt
echo "✅ save-expense deployed"
echo ""

echo "📦 [11/18] Deploying save-transactions-batch function..."
supabase functions deploy save-transactions-batch --project-ref "$PROJECT_REF" --no-verify-jwt
echo "✅ save-transactions-batch deployed"
echo ""

echo "📦 [12/18] Deploying update-expense function..."
supabase functions deploy update-expense --project-ref "$PROJECT_REF" --no-verify-jwt
echo "✅ update-expense deployed"
echo ""

echo "📦 [13/18] Deploying delete-expense function..."
supabase functions deploy delete-expense --project-ref "$PROJECT_REF" --no-verify-jwt
echo "✅ delete-expense deployed"
echo ""

echo "📦 [14/18] Deploying analyze-expense function..."
supabase functions deploy analyze-expense --project-ref "$PROJECT_REF"
echo "✅ analyze-expense deployed"
echo ""

echo "📦 [15/18] Deploying categories function..."
supabase functions deploy categories --project-ref "$PROJECT_REF"
echo "✅ categories deployed"
echo ""

echo "📦 [16/18] Deploying ai-scenario-planner function..."
supabase functions deploy ai-scenario-planner --project-ref "$PROJECT_REF"
echo "✅ ai-scenario-planner deployed"
echo ""

echo "📦 [17/18] Deploying update-preferred-language function..."
supabase functions deploy update-preferred-language --project-ref "$PROJECT_REF"
echo "✅ update-preferred-language deployed"
echo ""

echo "📦 [18/18] Deploying update-preferred-timezone function..."
supabase functions deploy update-preferred-timezone --project-ref "$PROJECT_REF"
echo "✅ update-preferred-timezone deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All budgeting functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
