#!/bin/bash

# Budgeting Functions Deployment Script
# Project: Moneko
# Projectm Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -euo pipefail  # Exit on error, unset vars, and pipe fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEFAULT_PROJECT_REF="pbopcsmrcykdzbilpilf"
PROJECT_REF="${1:-${PROJECT_REF:-$DEFAULT_PROJECT_REF}}"

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Deploying Budgeting Functions to Supabase"
echo "  Project: $PROJECT_REF"
echo "═══════════════════════════════════════════   ═════════════════"
echo ""

# Step 2: Deploy finance-update
echo "📦 [3/24] Deploying finance-update function..."
supabase functions deploy finance-update --project-ref "$PROJECT_REF"
echo "✅ finance-update deployed"
echo ""

# Step 3: Deploy initiate-whatsapp-binding
echo "📦 [4/24] Deploying initiate-whatsapp-binding function..."
supabase functions deploy initiate-whatsapp-binding --project-ref "$PROJECT_REF"
echo "✅ initiate-whatsapp-binding deployed"
echo ""

# Step 4: Deploy verify-whatsapp-binding
echo "📦 [5/24] Deploying verify-whatsapp-binding function..."
supabase functions deploy verify-whatsapp-binding --project-ref "$PROJECT_REF"
echo "✅ verify-whatsapp-binding deployed"
echo ""

# Step 5: Deploy set-budget
echo "📦 [6/24] Deploying set-budget function..."
supabase functions deploy set-budget --project-ref "$PROJECT_REF"
echo "✅ set-budget deployed"
echo ""

# Step 6: Deploy update-preferred-currency
echo "📦 [7/24] Deploying update-preferred-currency function..."
supabase functions deploy update-preferred-currency --project-ref "$PROJECT_REF"
echo "✅ update-preferred-currency deployed"
echo ""

echo "📦 [8/24] Deploying process-expenses function..."
supabase functions deploy process-expenses --project-ref "$PROJECT_REF"
echo "✅ process-expenses deployed"
echo ""

echo "📦 [9/24] Deploying save-income function..."
supabase functions deploy save-income --project-ref "$PROJECT_REF"
echo "✅ save-income deployed"
echo ""

echo "📦 [10/24] Deploying save-expense function..."
supabase functions deploy save-expense --project-ref "$PROJECT_REF"
echo "✅ save-expense deployed"
echo ""

echo "📦 [11/24] Deploying save-transactions-batch function..."
supabase functions deploy save-transactions-batch --project-ref "$PROJECT_REF"
echo "✅ save-transactions-batch deployed"
echo ""

echo "📦 [12/24] Deploying update-expense function..."
supabase functions deploy update-expense --project-ref "$PROJECT_REF"
echo "✅ update-expense deployed"
echo ""

echo "📦 [13/24] Deploying delete-expense function..."
supabase functions deploy delete-expense --project-ref "$PROJECT_REF"
echo "✅ delete-expense deployed"
echo ""

echo "📦 [14/24] Deploying list-wallets function..."
supabase functions deploy list-wallets --project-ref "$PROJECT_REF"
echo "✅ list-wallets deployed"
echo ""

echo "📦 [15/24] Deploying save-wallet function..."
supabase functions deploy save-wallet --project-ref "$PROJECT_REF"
echo "✅ save-wallet deployed"
echo ""

echo "📦 [16/24] Deploying update-wallet function..."
supabase functions deploy update-wallet --project-ref "$PROJECT_REF"
echo "✅ update-wallet deployed"
echo ""

echo "📦 [17/24] Deploying create-wallet-transfer function..."
supabase functions deploy create-wallet-transfer --project-ref "$PROJECT_REF"
echo "✅ create-wallet-transfer deployed"
echo ""

echo "📦 [19/24] Deploying analyze-expense function..."
supabase functions deploy analyze-expense --project-ref "$PROJECT_REF"
echo "✅ analyze-expense deployed"
echo ""

echo "📦 [20/24] Deploying categories function..."
supabase functions deploy categories --project-ref "$PROJECT_REF"
echo "✅ categories deployed"
echo ""

echo "📦 [21/24] Deploying ai-scenario-planner function..."
supabase functions deploy ai-scenario-planner --project-ref "$PROJECT_REF"
echo "✅ ai-scenario-planner deployed"
echo ""

echo "📦 [22/24] Deploying update-preferred-language function..."
supabase functions deploy update-preferred-language --project-ref "$PROJECT_REF"
echo "✅ update-preferred-language deployed"
echo ""

echo "📦 [23/24] Deploying update-preferred-timezone function..."
supabase functions deploy update-preferred-timezone --project-ref "$PROJECT_REF"
echo "✅ update-preferred-timezone deployed"
echo ""

echo "📦 [24/24] Deploying update-preferred-platform function..."
supabase functions deploy update-preferred-platform --project-ref "$PROJECT_REF"
echo "✅ update-preferred-platform deployed"
echo ""

echo "📦 [25/24] Deploying update-financial-month-start-dayfunction..."
supabase functions deploy update-financial-month-start-day --project-ref "$PROJECT_REF"
echo "✅ update-preferred-platform deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All budgeting functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
