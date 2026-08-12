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
echo "📦 [1/19] Deploying feature-flags-check function..."
supabase functions deploy feature-flags-check --project-ref $PROJECT_REF
echo "✅ feature-flags-check deployed"
echo ""

# Step 2: Deploy households-validate-invite (PUBLIC - no JWT verification)
echo "📦 [2/19] Deploying households-validate-invite function..."
supabase functions deploy households-validate-invite --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ households-validate-invite deployed (public endpoint)"
echo ""

# Step 3: Deploy households-accept-invite
echo "📦 [3/19] Deploying households-accept-invite function..."
supabase functions deploy households-accept-invite --project-ref $PROJECT_REF
echo "✅ households-accept-invite deployed"
echo ""

# Step 4: Deploy households-create-invite
echo "📦 [4/19] Deploying households-create-invite function..."
supabase functions deploy households-create-invite --project-ref $PROJECT_REF
echo "✅ households-create-invite deployed"
echo ""

# Step 5: Deploy households-revoke-invite
echo "📦 [5/19] Deploying households-revoke-invite function..."
supabase functions deploy households-revoke-invite --project-ref $PROJECT_REF
echo "✅ households-revoke-invite deployed"
echo ""

# Step 6: Deploy households-register-device
echo "📦 [6/19] Deploying households-register-device function..."
supabase functions deploy households-register-device --project-ref $PROJECT_REF
echo "✅ households-register-device deployed"
echo ""

# Step 7: Deploy households-compute-splits
echo "📦 [7/19] Deploying households-compute-splits function..."
supabase functions deploy households-compute-splits --project-ref $PROJECT_REF
echo "✅ households-compute-splits deployed"
echo ""

# Step 8: Deploy households-summary
echo "📦 [8/19] Deploying households-summary function..."
supabase functions deploy households-summary --project-ref $PROJECT_REF
echo "✅ households-summary deployed"
echo ""

# Step 9: Deploy households-send-nudge (SERVICE ROLE - called by triggers/cron)
echo "📦 [9/19] Deploying households-send-nudge function..."
supabase functions deploy households-send-nudge --project-ref $PROJECT_REF
echo "✅ households-send-nudge deployed"
echo ""

# Step 10: Deploy households-send-push (SERVICE ROLE - called by triggers/cron)
echo "📦 [10/19] Deploying households-send-push-notification function..."
supabase functions deploy households-send-push-notification --project-ref $PROJECT_REF
echo "✅ households-send-push-notification deployed"
echo ""

# Step 11: Deploy households-process-notifications (SERVICE ROLE - called by cron)
echo "📦 [11/19] Deploying households-process-notifications function..."
supabase functions deploy households-process-notifications --project-ref $PROJECT_REF
echo "✅ households-process-notifications deployed"
echo ""

# Step 12: Deploy households-remind-member (SERVICE ROLE - called by cron)
echo "📦 [12/19] Deploying households-remind-member function..."
supabase functions deploy households-remind-member --project-ref $PROJECT_REF
echo "✅ households-remind-member deployed"
echo ""

# Step 13: Deploy expense-daily-nudges (SERVICE ROLE - called by cron)
echo "📦 [13/19] Deploying expense-daily-nudges function..."
supabase functions deploy expense-daily-nudges --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ expense-daily-nudges deployed"
echo ""

# Step 14: Deploy edge-error-digest (SERVICE ROLE - called by cron)
echo "📦 [14/19] Deploying edge-error-digest function..."
supabase functions deploy edge-error-digest --project-ref $PROJECT_REF --no-verify-jwt
echo "✅ edge-error-digest deployed"
echo ""

# Step 15: Deploy households-process-invite-reminders (SERVICE ROLE - called by cron)
echo "📦 [15/19] Deploying households-process-invite-reminders function..."
supabase functions deploy households-process-invite-reminders --project-ref $PROJECT_REF
echo "✅ households-process-invite-reminders deployed"
echo ""

# Step 16: Deploy update-recurring-occurrence
echo "📦 [16/19] Deploying update-recurring-occurrence function..."
supabase functions deploy update-recurring-occurrence --project-ref $PROJECT_REF
echo "✅ update-recurring-occurrence deployed"
echo ""

# Step 17: Deploy unconfirm-recurring-occurrence
echo "📦 [17/19] Deploying unconfirm-recurring-occurrence function..."
supabase functions deploy unconfirm-recurring-occurrence --project-ref $PROJECT_REF
echo "✅ unconfirm-recurring-occurrence deployed"
echo ""

# Step 18: Deploy list-recurring-occurrences
echo "📦 [18/19] Deploying list-recurring-occurrences function..."
supabase functions deploy list-recurring-occurrences --project-ref $PROJECT_REF
echo "✅ list-recurring-occurrences deployed"
echo ""

# Step 19: Deploy confirm-recurring-occurrence
echo "📦 [19/19] Deploying confirm-recurring-occurrence function..."
supabase functions deploy confirm-recurring-occurrence --project-ref $PROJECT_REF
echo "✅ confirm-recurring-occurrence deployed"
echo ""

echo "📦 Deploying save-recurring-occurrence-override function..."
supabase functions deploy save-recurring-occurrence-override --project-ref $PROJECT_REF
echo "✅ save-recurring-occurrence-override deployed"
echo ""

# Step 19: Deploy skip-recurring-occurrence
echo "📦 [19/19] Deploying skip-recurring-occurrence function..."
supabase functions deploy skip-recurring-occurrence --project-ref $PROJECT_REF
echo "✅ skip-recurring-occurrence deployed"
echo ""

# Step 19: Deploy recurring-read 
echo "📦 [19/19] Deploying recurring-read function..."
supabase functions deploy recurring-read  --project-ref $PROJECT_REF
echo "✅recurring-read  deployed"
echo ""

# Deploy delete-recurring-template
echo "📦 Deploying delete-recurring-template function..."
supabase functions deploy delete-recurring-template --project-ref $PROJECT_REF
echo "✅ delete-recurring-template deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
