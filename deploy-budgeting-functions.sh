#!/bin/bash

# Budgeting Functions Deployment Script
# Project: Moneko
# Project Ref: qbuynyxyemigtnvdujts

set -e  # Exit on any error

PROJECT_REF="qbuynyxyemigtnvdujts"

echo "════════════════════════════════════════════════════════════"
echo "  🚀 Deploying Budgeting Functions to Supabase"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Deploy twilio-whatsapp-webhook (CRITICAL)
echo "📦 [1/5] Deploying twilio-whatsapp-webhook function..."
supabase functions deploy twilio-whatsapp-webhook --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ twilio-whatsapp-webhook deployed"
echo ""

# Step 2: Deploy finance-update
echo "📦 [2/5] Deploying finance-update function..."
supabase functions deploy finance-update --project-ref $PROJECT_REF
echo "✅ finance-update deployed"
echo ""

# Step 3: Deploy initiate-whatsapp-binding
echo "📦 [3/5] Deploying initiate-whatsapp-binding function..."
supabase functions deploy initiate-whatsapp-binding --project-ref $PROJECT_REF
echo "✅ initiate-whatsapp-binding deployed"
echo ""

# Step 4: Deploy verify-whatsapp-binding
echo "📦 [3/5] Deploying verify-whatsapp-binding function..."
supabase functions deploy verify-whatsapp-binding --project-ref $PROJECT_REF
echo "✅ verify-whatsapp-binding deployed"
echo ""

# Step 4: Deploy set-budget
echo "📦 [4/5] Deploying set-budget function..."
supabase functions deploy set-budget --project-ref $PROJECT_REF
echo "✅ set-budget deployed"
echo ""

# Step 5: Deploy update-preferred-currency
echo "📦 [5/5] Deploying update-preferred-currency function..."
supabase functions deploy update-preferred-currency --project-ref $PROJECT_REF
echo "✅ update-preferred-currency deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All budgeting functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""