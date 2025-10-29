# Feature Flags System

## Overview

Centralized feature flag management system for progressive feature rollout, A/B testing, and environment-specific features.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Feature Flags Table                    │
│  • key (unique identifier)                                  │
│  • enabled (global on/off)                                  │
│  • rollout_percentage (0-100)                               │
│  • user_whitelist / user_blacklist                          │
│  • environment (dev/staging/production/all)                 │
│  • metadata (docs, release date, dependencies, etc.)        │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                ┌─────────────┴──────────────┐
                │                            │
┌───────────────▼──────────────┐  ┌─────────▼─────────────┐
│  is_feature_enabled()        │  │  feature-flags-check  │
│  (Postgres Function)         │  │  (Edge Function)      │
│  • Checks global enabled     │  │  • HTTP API wrapper   │
│  • Validates environment     │  │  • Returns metadata   │
│  • Applies whitelist/        │  │  • Used by mobile app │
│    blacklist                 │  └───────────────────────┘
│  • Consistent percentage     │
│    rollout with hashing      │
└──────────────────────────────┘
```

## Usage

### 1. Database Function (Direct, Faster)

```sql
-- Check if feature is enabled for current user
SELECT is_feature_enabled('households.enabled');

-- Check for specific user
SELECT is_feature_enabled('households.enabled', 'user-uuid-here');

-- Check with environment
SELECT is_feature_enabled('households.enabled', auth.uid(), 'production');
```

### 2. Edge Function (HTTP API)

**Endpoint**: `POST /functions/v1/feature-flags-check`

**Request**:
```json
{
  "feature_key": "households.enabled",
  "user_id": "optional-user-uuid",
  "environment": "production"
}
```

**Response**:
```json
{
  "enabled": true,
  "feature_key": "households.enabled",
  "metadata": {
    "documentation_url": "https://docs.moneko.app/features/households",
    "release_date": "2025-10-21"
  }
}
```

### 3. Flutter (Mobile App)

```dart
// Using the service
final featureFlagService = ref.read(featureFlagServiceProvider);
final enabled = await featureFlagService.isEnabled('households.enabled');

// Using the provider (cached)
final householdsEnabled = ref.watch(householdsEnabledProvider);
householdsEnabled.when(
  data: (enabled) {
    if (enabled) {
      return HouseholdsFeature();
    } else {
      return FeatureDisabledMessage();
    }
  },
  loading: () => CircularProgressIndicator(),
  error: (err, stack) => ErrorWidget(err),
);

// Generic flag provider
final exportPdfEnabled = ref.watch(featureFlagProvider('export.pdf'));
```

## Rollout Strategy

### Phase 1: Development (0%)
```sql
-- Create flag (disabled by default)
INSERT INTO feature_flags (key, enabled, description, rollout_percentage, environment)
VALUES ('households.enabled', FALSE, 'Joint Accounts feature', 0, 'development');
```

### Phase 2: Internal Testing (Whitelist)
```sql
-- Enable for specific beta testers
UPDATE feature_flags
SET enabled = TRUE,
    user_whitelist = ARRAY[
      'beta-tester-1-uuid',
      'beta-tester-2-uuid',
      'internal-team-uuid'
    ]
WHERE key = 'households.enabled';
```

### Phase 3: Limited Rollout (10%)
```sql
-- Enable for 10% of users (deterministic random assignment)
UPDATE feature_flags
SET enabled = TRUE,
    rollout_percentage = 10
WHERE key = 'households.enabled';
```

### Phase 4: Progressive Rollout (25% → 50% → 75%)
```sql
-- Gradually increase rollout percentage
UPDATE feature_flags SET rollout_percentage = 25 WHERE key = 'households.enabled';
UPDATE feature_flags SET rollout_percentage = 50 WHERE key = 'households.enabled';
UPDATE feature_flags SET rollout_percentage = 75 WHERE key = 'households.enabled';
```

### Phase 5: Full Rollout (100%)
```sql
-- Enable for all users
UPDATE feature_flags
SET enabled = TRUE,
    rollout_percentage = 100
WHERE key = 'households.enabled';
```

### Emergency Rollback
```sql
-- Instantly disable feature for everyone
UPDATE feature_flags SET enabled = FALSE WHERE key = 'households.enabled';

-- Or add users to blacklist while keeping feature active
UPDATE feature_flags
SET user_blacklist = array_append(user_blacklist, 'problematic-user-uuid')
WHERE key = 'households.enabled';
```

## Households Feature Rollout Plan

### Prerequisites
1. ✅ RLS policies tested and validated
2. ✅ Edge Functions deployed and tested
3. ✅ Mobile deep links verified
4. ✅ Push notifications working
5. ⏳ Domain verification files deployed (.well-known)
6. ⏳ Production APNs certificates uploaded to Firebase
7. ⏳ Data model alignment decision (transactions vs expenses)

### Recommended Rollout Timeline

**Week 1: Internal Testing**
- Enable for internal team (whitelist)
- Verify all critical paths work
- Monitor error rates in Edge Functions

**Week 2-3: Beta Testing (10%)**
- Enable for 10% of users
- Monitor:
  - Invite acceptance rate
  - Split creation success rate
  - Push notification delivery rate
  - Device registration success rate
- Gather user feedback

**Week 4-5: Gradual Rollout (50%)**
- Increase to 50% if no critical issues
- Continue monitoring metrics
- Address any edge cases

**Week 6: Full Rollout (100%)**
- Enable for all users
- Update documentation
- Announce feature publicly

## Flag Evaluation Logic

```
┌─────────────────────────────────────────────────────────────┐
│ is_feature_enabled(feature_key, user_id, environment)      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Does flag exist?      │──────► NO ─────► return FALSE
              └───────────────────────┘
                          │ YES
                          ▼
              ┌───────────────────────┐
              │ Is globally enabled?  │──────► NO ─────► return FALSE
              └───────────────────────┘
                          │ YES
                          ▼
              ┌───────────────────────┐
              │ Environment match?    │──────► NO ─────► return FALSE
              └───────────────────────┘
                          │ YES
                          ▼
              ┌───────────────────────┐
              │ User in blacklist?    │──────► YES ────► return FALSE
              └───────────────────────┘
                          │ NO
                          ▼
              ┌───────────────────────┐
              │ User in whitelist?    │──────► YES ────► return TRUE
              └───────────────────────┘
                          │ NO
                          ▼
              ┌───────────────────────┐
              │ Rollout < 100%?       │──────► NO ─────► return TRUE
              └───────────────────────┘
                          │ YES
                          ▼
              ┌───────────────────────────────────────────┐
              │ Hash(user_id + feature_key) % 100         │
              │          < rollout_percentage?            │
              └───────────────────────────────────────────┘
                          │
                    YES   │   NO
                    ┌─────┴─────┐
                    ▼           ▼
               return TRUE  return FALSE
```

## Monitoring and Metrics

### Key Metrics to Track

1. **Flag Check Success Rate**
   - Monitor Edge Function logs for errors
   - Track RPC call failures

2. **Rollout Distribution**
   ```sql
   -- Check how many users have feature enabled
   SELECT
     feature_key,
     COUNT(DISTINCT user_id) FILTER (WHERE is_enabled) AS enabled_users,
     COUNT(DISTINCT user_id) AS total_users,
     ROUND(100.0 * COUNT(DISTINCT user_id) FILTER (WHERE is_enabled) / COUNT(DISTINCT user_id), 2) AS percentage
   FROM (
     SELECT
       'households.enabled' AS feature_key,
       id AS user_id,
       is_feature_enabled('households.enabled', id) AS is_enabled
     FROM auth.users
     WHERE deleted_at IS NULL
   ) subquery
   GROUP BY feature_key;
   ```

3. **Feature Usage Metrics**
   ```sql
   -- Track feature adoption after enabling flag
   SELECT
     DATE_TRUNC('day', created_at) AS day,
     COUNT(*) AS households_created,
     COUNT(DISTINCT owner_id) AS unique_users
   FROM households
   WHERE created_at >= '2025-10-21'  -- Flag enabled date
   GROUP BY DATE_TRUNC('day', created_at)
   ORDER BY day DESC;
   ```

## Best Practices

### 1. Flag Naming Convention
- Use dot notation: `feature.subfeature`
- Examples: `households.enabled`, `export.pdf`, `analytics.advanced`

### 2. Default to Disabled
- Always create flags as `enabled = FALSE` initially
- Explicitly enable after testing

### 3. Progressive Rollout
- Never jump from 0% to 100%
- Use incremental rollout: 10% → 25% → 50% → 75% → 100%
- Monitor metrics at each stage

### 4. Metadata Documentation
- Always include:
  - `documentation_url`: Link to feature docs
  - `release_date`: When flag was created
  - `requires_migration`: List of required migrations

### 5. Environment Isolation
- Use `environment = 'development'` for experimental features
- Use `environment = 'staging'` for pre-production testing
- Use `environment = 'production'` for production-ready features
- Use `environment = 'all'` for features ready across all environments

### 6. Emergency Rollback Plan
- Keep flag keys in documentation
- Have SQL snippets ready for instant disable
- Monitor error rates closely during rollout

## Security Considerations

### RLS Policies
- ✅ Authenticated users can read flags (for client-side checks)
- ✅ Only service role can modify flags (admin dashboard, CI/CD)
- ✅ Blacklist takes precedence over whitelist
- ✅ Consistent hashing prevents gaming the system

### Sensitive Features
For features that should not be visible to end users:
```sql
-- Use Edge Function only (don't expose in client)
CREATE POLICY "Sensitive flags are service role only" ON public.feature_flags
  FOR SELECT USING (
    key NOT LIKE 'admin.%' OR auth.role() = 'service_role'
  );
```

## Troubleshooting

### "Feature flag check failed"
**Symptom**: Mobile app logs feature flag check errors

**Solutions**:
1. Verify Edge Function is deployed: `supabase functions list`
2. Check Edge Function logs: `supabase functions logs feature-flags-check`
3. Verify RLS policies allow authenticated users to read feature_flags table

### "Flag returns different values for same user"
**Symptom**: Inconsistent flag evaluation

**Solutions**:
1. Verify using same `user_id` in all checks
2. Check if user is being added/removed from whitelist/blacklist
3. Verify flag's `rollout_percentage` hasn't changed
4. Hashing is deterministic: same user + same flag = same result

### "Rollout percentage seems off"
**Symptom**: 10% rollout shows 15% of users

**Solutions**:
1. Hashing provides statistical distribution, not exact percentage
2. Expect ±5% variance with small user bases
3. Variance decreases with larger user populations
4. Use SQL query above to verify actual distribution

## Migration Path to Remove Flags

Once a feature is fully rolled out and stable:

```sql
-- 1. Set flag to 100% for grace period (1-2 months)
UPDATE feature_flags SET rollout_percentage = 100 WHERE key = 'households.enabled';

-- 2. Update code to remove flag checks
-- Replace:
--   if (await isEnabled('households.enabled')) { ... }
-- With:
--   // households feature (fully rolled out)
--   { ... }

-- 3. After code deployment, archive the flag
UPDATE feature_flags SET metadata = metadata || '{"archived": true, "archived_date": "2025-12-21"}'::jsonb
WHERE key = 'households.enabled';

-- 4. Eventually delete the flag (after confirming no references)
DELETE FROM feature_flags WHERE key = 'households.enabled';
```

## References

- [Feature Toggles (Martin Fowler)](https://martinfowler.com/articles/feature-toggles.html)
- [LaunchDarkly Feature Flag Best Practices](https://launchdarkly.com/blog/dos-and-donts-of-feature-flags/)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

