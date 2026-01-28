#!/bin/bash

# GPT Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

PROJECT_REF="${1:-pbopcsmrcykdzbilpilf}"  # Can override with arg

echo "════════════════════════════════════════════════════════════"
echo "  🤖 Deploying GPT Functions"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📦 [1/8] Deploying analyze-expense function..."
supabase functions deploy analyze-expense --project-ref $PROJECT_REF
echo "✅ analyze-expense deployed"
echo ""

echo "📦 [2/8] Deploying expenses-summary function..."
supabase functions deploy expenses-summary --project-ref $PROJECT_REF
echo "✅ expenses-summary deployed"
echo ""

echo "📦 [3/8] Deploying get-budget function..."
supabase functions deploy get-budget --project-ref $PROJECT_REF
echo "✅ get-budget deployed" 
echo ""

echo "📦 [4/8] Deploying list-expenses function..."
supabase functions deploy list-expenses --project-ref $PROJECT_REF
echo "✅ list-expenses deployed"
echo ""

echo "📦 [5/8] Deploying save-expense function..."
supabase functions deploy save-expense --project-ref $PROJECT_REF
echo "✅ save-expense deployed"
echo ""

echo "📦 [6/8] Deploying set-budget function..."
supabase functions deploy set-budget --project-ref $PROJECT_REF
echo "✅ set-budget deployed"
echo ""

echo "📦 [7/8] Deploying delete-expense function..."
supabase functions deploy delete-expense --project-ref $PROJECT_REF
echo "✅ delete-expense deployed"
echo ""

echo "📦 [8/8] Deploying update-expense function..."
supabase functions deploy update-expense --project-ref $PROJECT_REF
echo "✅ update-expense deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All GPT functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""