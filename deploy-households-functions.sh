#!/bin/bash

# Households (Joint Accounts) Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

PROJECT_REF="${1:-pbopcsmrcykdzbilpilf}"  # Can override with arg

echo "════════════════════════════════════════════════════════════"
echo "  🏠 Deploying Households (Joint Accounts) Functions"
echo "  Project: $PROJECT_REF"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Deploy feature-flags-check (REQUIRED FIRST - other features may depend on it)
echo "📦 [1/11] Deploying feature-flags-check function..."
supabase functions deploy feature-flags-check --project-ref $PROJECT_REF
echo "✅ feature-flags-check deployed"
echo ""

# Step 2: Deploy households-validate-invite (PUBLIC - no JWT verification)
echo "📦 [2/11] Deploying households-validate-invite function..."
supabase functions deploy households-validate-invite --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ households-validate-invite deployed (public endpoint)"
echo ""

# Step 3: Deploy households-accept-invite
echo "📦 [3/11] Deploying households-accept-invite function..."
supabase functions deploy households-accept-invite --project-ref $PROJECT_REF
echo "✅ households-accept-invite deployed"
echo ""

# Step 4: Deploy households-create-invite
echo "📦 [4/11] Deploying households-create-invite function..."
supabase functions deploy households-create-invite --project-ref $PROJECT_REF
echo "✅ households-create-invite deployed"
echo ""

# Step 5: Deploy households-revoke-invite
echo "📦 [5/11] Deploying households-revoke-invite function..."
supabase functions deploy households-revoke-invite --project-ref $PROJECT_REF
echo "✅ households-revoke-invite deployed"
echo ""

# Step 6: Deploy households-register-device
echo "📦 [6/11] Deploying households-register-device function..."
supabase functions deploy households-register-device --project-ref $PROJECT_REF
echo "✅ households-register-device deployed"
echo ""

# Step 7: Deploy households-compute-splits
echo "📦 [7/11] Deploying households-compute-splits function..."
supabase functions deploy households-compute-splits --project-ref $PROJECT_REF
echo "✅ households-compute-splits deployed"
echo ""

# Step 8: Deploy households-summary
echo "📦 [8/11] Deploying households-summary function..."
supabase functions deploy households-summary --project-ref $PROJECT_REF
echo "✅ households-summary deployed"
echo ""

# Step 9: Deploy households-send-nudge (SERVICE ROLE - called by triggers/cron)
echo "📦 [9/11] Deploying households-send-nudge function..."
supabase functions deploy households-send-nudge --project-ref $PROJECT_REF
echo "✅ households-send-nudge deployed"
echo ""

# Step 9: Deploy households-send-push (SERVICE ROLE - called by triggers/cron)
echo "📦 [9/11] Deploying households-send-push-notification function..."
supabase functions deploy households-send-push-notification --project-ref $PROJECT_REF
echo "✅ households-send-push-notification deployed"
echo ""

# Step 10: Deploy households-process-notifications (SERVICE ROLE - called by cron)
echo "📦 [10/11] Deploying households-process-notifications function..."
supabase functions deploy households-process-notifications --project-ref $PROJECT_REF
echo "✅ households-process-notifications deployed"
echo ""

# Step 11: Deploy households-remind-member (SERVICE ROLE - called by cron)
echo "📦 [11/11] Deploying households-remind-member function..."
supabase functions deploy households-remind-member --project-ref $PROJECT_REF
echo "✅ households-remind-member deployed"
echo ""

# Step 12: Deploy expense-daily-nudges (SERVICE ROLE - called by cron)
echo "📦 [12/12] Deploying expense-daily-nudges function..."
supabase functions deploy expense-daily-nudges --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ expense-daily-nudges deployed"
echo ""

# Step 12: Deploy edge-error-digest (SERVICE ROLE - called by cron)
echo "📦 [12/12] Deploying edge-error-digest function..."
supabase functions deploy edge-error-digest --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ edge-error-digest deployed"
echo ""

# Step 13: Deploy households-process-invite-reminders (SERVICE ROLE - called by cron)
echo "📦 [13/13] Deploying households-process-invite-reminders function..."
supabase functions deploy households-process-invite-reminders --project-ref $PROJECT_REF
echo "✅ households-process-invite-reminders deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All Households functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""