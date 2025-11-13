#!/bin/bash

# Income & Goals Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -euo pipefail  # Exit on error, undefined vars are errors, and pipefail

PROJECT_REF="${1:-qbuynyxyemigtnvdujts}"  # Override with first arg

# Ensure Supabase CLI exists
if ! command -v supabase >/dev/null 2>&1; then
  echo "❌ supabase CLI not found. Install it: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "  💵 Deploying Income & Goals Functions"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# ---------------------------
# Income-related functions
# ---------------------------

echo "📦 [1/8] Deploying save-income..."
supabase functions deploy save-income --project-ref "$PROJECT_REF"
echo "✅ save-income deployed"
echo ""

echo "📦 [2/8] Deploying list-income..."
supabase functions deploy list-income --project-ref "$PROJECT_REF"
echo "✅ list-income deployed"
echo ""

echo "📦 [3/8] Deploying income-summary..."
supabase functions deploy income-summary --project-ref "$PROJECT_REF"
echo "✅ income-summary deployed"
echo ""

echo "📦 [4/8] Deploying acknowledge-income..."
supabase functions deploy acknowledge-income --project-ref "$PROJECT_REF"
echo "✅ acknowledge-income deployed"
echo ""

# ---------------------------
# Goals-related functions
# ---------------------------

# echo "📦 [5/8] Deploying create-goal..."
# supabase functions deploy create-goal --project-ref "$PROJECT_REF"
# echo "✅ create-goal deployed"
# echo ""

# echo "📦 [6/8] Deploying list-goals..."
# supabase functions deploy list-goals --project-ref "$PROJECT_REF"
# echo "✅ list-goals deployed"
# echo ""

# echo "📦 [7/8] Deploying add-contribution..."
# supabase functions deploy add-contribution --project-ref "$PROJECT_REF"
# echo "✅ add-contribution deployed"
# echo ""

# echo "📦 [8/8] Deploying acknowledge-goal..."
# supabase functions deploy acknowledge-goal --project-ref "$PROJECT_REF"
# echo "✅ acknowledge-goal deployed"
# echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All Income & Goals functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""

