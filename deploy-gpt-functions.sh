#!/bin/bash

# Households (Joint Accounts) Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

PROJECT_REF="${1:-qbuynyxyemigtnvdujts}"  # Can override with arg

echo "════════════════════════════════════════════════════════════"
echo "  🏠 Deploying GPT Functions"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📦 [1/6] Deploying analyze-expense function..."
supabase functions deploy analyze-expense --project-ref $PROJECT_REF
echo "✅ analyze-expense deployed"
echo ""

echo "📦 [2/6] Deploying expenses-summary function..."
supabase functions deploy expenses-summary --project-ref $PROJECT_REF
echo "✅ expenses-summary deployed"
echo ""

echo "📦 [3/6] Deploying get-budget function..."
supabase functions deploy get-budget --project-ref $PROJECT_REF
echo "✅ get-budget deployed"
echo ""

echo "📦 [4/6] Deploying list-expenses function..."
supabase functions deploy list-expenses --project-ref $PROJECT_REF
echo "✅ list-expenses deployed"
echo ""

echo "📦 [5/6] Deploying save-expense function..."
supabase functions deploy save-expense --project-ref $PROJECT_REF
echo "✅ save-expense deployed"
echo ""

echo "📦 [6/6] Deploying set-budget function..."
supabase functions deploy set-budget --project-ref $PROJECT_REF
echo "✅ set-budget deployed"
echo ""


echo "════════════════════════════════════════════════════════════"
echo "  ✅ All GPT functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""