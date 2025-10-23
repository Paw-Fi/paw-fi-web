#!/bin/bash

# Households (Joint Accounts) Functions Deployment Script
# Project: Moneko
# Project Dev Ref: qbuynyxyemigtnvdujts
# Project Prod Ref: pbopcsmrcykdzbilpilf

set -e  # Exit on any error

PROJECT_REF="${1:-qbuynyxyemigtnvdujts}"  # Can override with arg

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

# Step 10: Deploy households-process-notifications (SERVICE ROLE - called by cron)
echo "📦 [10/11] Deploying households-process-notifications function..."
supabase functions deploy households-process-notifications --project-ref $PROJECT_REF
echo "✅ households-process-notifications deployed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ All Households functions deployed successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "📋 Next Steps:"
echo ""
echo "1. Run Database Migrations:"
echo "   cd moneko-web"
echo "   supabase db push --project-ref $PROJECT_REF"
echo "   Required migrations:"
echo "   - 20251021_households_joint_accounts.sql (core tables, RLS policies)"
echo "   - 20251021_households_scheduled_jobs.sql (pg_cron jobs)"
echo "   - 20251021_feature_flags.sql (feature flag system)"
echo ""
echo "2. Verify Environment Variables in Supabase Dashboard:"
echo "   Required for Push Notifications:"
echo "   - FCM_SERVER_KEY=AAAA... (from Firebase Console)"
echo "   - SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "   - SUPABASE_SERVICE_ROLE_KEY=eyJ..."
echo ""
echo "   Set with:"
echo "   supabase secrets set FCM_SERVER_KEY=AAAA... --project-ref $PROJECT_REF"
echo ""
echo "3. Configure Firebase Cloud Messaging:"
echo "   a. Upload APNs Certificates:"
echo "      - Development: Apple Developer → Certificates → APNs Development"
echo "      - Production: Apple Developer → Certificates → APNs Production"
echo "      - Upload both to Firebase Console → Project Settings → Cloud Messaging"
echo ""
echo "   b. Get FCM Server Key:"
echo "      Firebase Console → Project Settings → Cloud Messaging → Server key"
echo "      Set as FCM_SERVER_KEY environment variable (see step 2)"
echo ""
echo "4. Deploy Domain Verification Files:"
echo "   Files created at: moneko-web/public/.well-known/"
echo "   - apple-app-site-association (iOS Universal Links)"
echo "   - assetlinks.json (Android App Links)"
echo ""
echo "   ⚠️  IMPORTANT: Replace placeholders before deploying:"
echo "   - TEAM_ID → Your Apple Developer Team ID"
echo "   - SHA-256 fingerprints → Your Android app signing certificates"
echo ""
echo "   Deploy to: https://moneko.app/.well-known/"
echo "   Verify with: curl https://moneko.app/.well-known/apple-app-site-association"
echo ""
echo "5. Enable Feature Flag (Progressive Rollout):"
echo "   Phase 1 - Internal Testing (Whitelist):"
echo "   UPDATE feature_flags"
echo "   SET enabled = true,"
echo "       user_whitelist = ARRAY['internal-user-uuid-1', 'internal-user-uuid-2']"
echo "   WHERE key = 'households.enabled';"
echo ""
echo "   Phase 2 - Beta (10%):"
echo "   UPDATE feature_flags SET rollout_percentage = 10 WHERE key = 'households.enabled';"
echo ""
echo "   Phase 3 - Progressive (25% → 50% → 75%):"
echo "   UPDATE feature_flags SET rollout_percentage = 25 WHERE key = 'households.enabled';"
echo ""
echo "   Phase 4 - Full Rollout (100%):"
echo "   UPDATE feature_flags SET rollout_percentage = 100 WHERE key = 'households.enabled';"
echo ""
echo "   Emergency Rollback:"
echo "   UPDATE feature_flags SET enabled = false WHERE key = 'households.enabled';"
echo ""
echo "6. Test Endpoints:"
echo "   # Test feature flag check (should require auth)"
echo "   curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/feature-flags-check \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"feature_key\": \"households.enabled\"}'"
echo ""
echo "   # Test invite validation (public endpoint)"
echo "   curl https://$PROJECT_REF.supabase.co/functions/v1/households-validate-invite?token=test-token"
echo ""
echo "   # Test CORS (from moneko.app)"
echo "   curl -X OPTIONS https://$PROJECT_REF.supabase.co/functions/v1/households-accept-invite \\"
echo "     -H 'Origin: https://moneko.app' -v"
echo ""
echo "7. Verify pg_cron Jobs:"
echo "   SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'households%' OR jobname LIKE '%notification%';"
echo ""
echo "   Expected jobs:"
echo "   - expire-old-invites (every hour)"
echo "   - process-notification-events (every 5 minutes)"
echo "   - cleanup-old-notifications (weekly)"
echo ""
echo "8. Monitor Logs:"
echo "   supabase functions logs feature-flags-check --project-ref $PROJECT_REF"
echo "   supabase functions logs households-accept-invite --project-ref $PROJECT_REF"
echo "   supabase functions logs households-process-notifications --project-ref $PROJECT_REF"
echo "   supabase functions logs households-send-nudge --project-ref $PROJECT_REF"
echo ""
echo "9. Test Push Notifications:"
echo "   a. Register a test device (run app and grant notification permissions)"
echo "   b. Create a household and invite another user"
echo "   c. Accept invite and verify push notification received"
echo "   d. Check notification_events table for sent_at timestamp"
echo "   e. Review Edge Function logs for any errors"
echo ""
echo "10. Monitoring Queries (see README-FEATURE-FLAGS.md):"
echo "   - Invite acceptance rate"
echo "   - Notification delivery rate"
echo "   - Edge Function error rates"
echo "   - Feature flag distribution"
echo ""
echo "📖 For detailed setup guide, see:"
echo "   - moneko-web/supabase/migrations/README-FEATURE-FLAGS.md"
echo "   - moneko-web/supabase/tests/README-TESTING.md"
echo "   - moneko-mobile/ios/README-PUSH-NOTIFICATIONS.md"
echo "   - HOUSEHOLDS-AUDIT-REMEDIATION-COMPLETE.md"
echo ""
echo "🎉 Deployment complete!"
echo ""
