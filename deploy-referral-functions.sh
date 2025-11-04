#!/bin/bash

# Referral Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

PROJECT_REF="${1:-qbuynyxyemigtnvdujts}"  # Allow override via first arg

echo "════════════════════════════════════════════════════════════"
echo "  🎁 Deploying Referral-related Functions"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# 1) validate-referral-code (PUBLIC)
echo "📦 [1/5] Deploying validate-referral-code (public) ..."
supabase functions deploy validate-referral-code --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ validate-referral-code deployed"
echo ""

# 2) get-referral-code (AUTH REQUIRED)
echo "📦 [2/5] Deploying get-referral-code ..."
supabase functions deploy get-referral-code --project-ref $PROJECT_REF
echo "✅ get-referral-code deployed"
echo ""

# 3) accept-referral (AUTH REQUIRED)
echo "📦 [3/5] Deploying accept-referral ..."
supabase functions deploy accept-referral --project-ref $PROJECT_REF
echo "✅ accept-referral deployed"
echo ""

# 4) create-checkout-session (AUTH REQUIRED, used for 30-day no-card trials)
echo "📦 [4/5] Deploying create-checkout-session ..."
supabase functions deploy create-checkout-session --project-ref $PROJECT_REF
echo "✅ create-checkout-session deployed"
echo ""

# 5) stripe-webhook (PUBLIC - Stripe posts without JWT)
echo "📦 [5/5] Deploying stripe-webhook (public) ..."
supabase functions deploy stripe-webhook --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ stripe-webhook deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All referral functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""

