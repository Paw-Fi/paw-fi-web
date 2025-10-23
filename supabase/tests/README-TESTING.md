# Households Feature Testing Guide

## Overview

Comprehensive test suite for the Joint Accounts (Households) feature, covering:
- RLS policies (database-level security)
- Edge Functions (API endpoints)
- Push notifications (FCM delivery)
- Feature flags (progressive rollout)

## Test Structure

```
supabase/
├── tests/
│   ├── households_rls_tests.sql       # RLS policy validation (pgTAP)
│   └── README-TESTING.md              # This file
└── functions/
    └── _tests/
        └── households_edge_functions_test.ts  # Edge Function integration tests (Deno)
```

## Running Tests

### 1. RLS Policy Tests (SQL)

**Prerequisites**:
```bash
# Install pgTAP extension
supabase db reset  # Resets database and applies all migrations
```

**Run tests**:
```bash
# Run all SQL tests
supabase test db

# Run specific test file
psql $DATABASE_URL -f supabase/tests/households_rls_tests.sql
```

**Expected output**:
```
1..50
ok 1 - Household owner can SELECT their household
ok 2 - Invites INSERT policy does not have tautological comparison
ok 3 - expense_split_groups INSERT policy does not have tautological comparison
...
ok 50 - cron_job_logs table exists (created before scheduled jobs)
```

### 2. Edge Function Tests (Deno)

**Prerequisites**:
```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Set environment variables
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Run tests**:
```bash
# Run all Edge Function tests
cd supabase/functions
deno test --allow-net --allow-env _tests/households_edge_functions_test.ts

# Run with verbose output
deno test --allow-net --allow-env --fail-fast _tests/households_edge_functions_test.ts
```

**Expected output**:
```
running 20 tests from ./_tests/households_edge_functions_test.ts
test validate-invite: rejects missing token ... ok (15ms)
test validate-invite: rejects invalid token ... ok (12ms)
test register-device: requires authentication ... ok (10ms)
...
test CORS: allows moneko.app origin ... ok (8ms)

test result: ok. 20 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 3. End-to-End Manual Testing

**Invite Lifecycle Test**:
1. **Create Household** (Web or Mobile)
   - Login as User A
   - Navigate to Households
   - Create new household "Family Budget"
   - Verify household appears in list

2. **Create Invite** (Web)
   - Click "Invite Member"
   - Enter email or generate link
   - Copy invite URL: `https://moneko.app/invites/{token}`

3. **Validate Invite** (Mobile)
   - Login as User B (different device/account)
   - Click invite link from email/SMS
   - App should deep link to invitation handler
   - Verify household details displayed correctly

4. **Accept Invite** (Mobile)
   - User B clicks "Accept Invitation"
   - Verify navigation to household overview
   - Verify User B sees household in their list

5. **Verify Notifications** (Mobile)
   - User A should receive push notification: "🎉 New Member!"
   - Check notification appears in device notification center
   - Tap notification to open household

6. **Test Re-Acceptance** (Mobile - Bug Fix Verification)
   - User B clicks same invite link again
   - **Expected**: No 409 error, navigates to household
   - **Actual**: Should call validateInvite first, detect ALREADY_MEMBER, skip acceptInvite

7. **Create Expense Split** (Mobile)
   - User A creates expense in household
   - Split with User B
   - Verify User B receives notification: "💰 New Expense Split"

8. **Test Quiet Hours** (Mobile)
   - User B sets quiet hours: 22:00 - 08:00
   - User A creates split at 23:00 (during quiet hours)
   - **Expected**: Notification queued but not sent immediately
   - **Actual**: Notification sent after 08:00

### 4. Performance Testing

**Rate Limiting Test** (Budget Nudges):
```bash
# Send warn nudge
curl -X POST "$SUPABASE_URL/functions/v1/households-send-nudge" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "household_id": "uuid-here",
    "budget_id": "uuid-here",
    "nudge_type": "warn",
    "currency": "USD",
    "spent_cents": 9000,
    "budget_cents": 10000,
    "percentage_used": 90
  }'

# Expected: 200 OK

# Send same nudge immediately
curl -X POST "$SUPABASE_URL/functions/v1/households-send-nudge" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "household_id": "uuid-here",
    "budget_id": "uuid-here",
    "nudge_type": "warn",
    "currency": "USD",
    "spent_cents": 9500,
    "budget_cents": 10000,
    "percentage_used": 95
  }'

# Expected: 429 Rate Limit
# Error: "Rate limit: warn nudge was sent within last 24 hours"
```

**Notification Processing Test**:
```sql
-- Create test notification event
INSERT INTO public.notification_events (
  household_id,
  event_type,
  payload,
  is_sent
) VALUES (
  'household-uuid-here',
  'member_joined',
  '{"household_name": "Test Household"}'::jsonb,
  false
);

-- Trigger processing manually
SELECT net.http_post(
  url := current_setting('app.settings.supabase_url') || '/functions/v1/households-process-notifications',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
  ),
  body := '{}'::jsonb
);

-- Verify event was processed
SELECT * FROM public.notification_events
WHERE household_id = 'household-uuid-here'
AND is_sent = true
AND sent_at IS NOT NULL;
```

## Test Coverage Matrix

### RLS Policies (✅ = Tested, ⚠️ = Partial, ❌ = Not Tested)

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| households | ✅ | ⚠️ | ⚠️ | ⚠️ | Needs session context for full coverage |
| household_members | ✅ | ⚠️ | ⚠️ | ⚠️ | Needs session context |
| invites | ✅ | ✅ | ⚠️ | ⚠️ | INSERT tautology fix validated |
| expense_split_groups | ⚠️ | ✅ | ⚠️ | ⚠️ | INSERT tautology fix validated |
| shared_budgets | ⚠️ | ✅ | ⚠️ | ⚠️ | INSERT tautology fix validated |
| notification_events | ❌ | ❌ | ❌ | ❌ | Needs session context tests |
| devices | ❌ | ❌ | ❌ | ❌ | Needs session context tests |
| feature_flags | ✅ | ❌ | ❌ | ❌ | Read-only access validated |

### Edge Functions (✅ = Tested, ⚠️ = Partial, ❌ = Not Tested)

| Function | Auth | Validation | Business Logic | Error Handling | CORS |
|----------|------|------------|----------------|----------------|------|
| validate-invite | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| accept-invite | ✅ | ✅ | ❌ | ⚠️ | ✅ |
| register-device | ✅ | ✅ | ❌ | ⚠️ | ✅ |
| send-nudge | ⚠️ | ✅ | ❌ | ⚠️ | ✅ |
| process-notifications | ❌ | ❌ | ❌ | ❌ | ✅ |
| feature-flags-check | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |

### Feature Coverage

- ✅ RLS tautological comparison fix (critical security bug)
- ✅ Feature flag system implementation
- ✅ CORS configuration for moneko.app
- ✅ Rate limiting for budget nudges (24 hours)
- ✅ Quiet hours respect for notifications
- ✅ Mobile deep link re-acceptance fix (409 error)
- ⚠️ Push notification delivery (requires FCM credentials)
- ⚠️ Percentage-based feature rollout (requires multiple test users)
- ❌ Data model alignment (transactions vs expenses) - decision pending
- ❌ Production iOS APNs configuration - requires manual verification

## Known Limitations

### Test Infrastructure Gaps

1. **No User Session Context**:
   - pgTAP tests cannot easily simulate `auth.uid()` context
   - RLS policies that depend on session user cannot be fully tested
   - **Workaround**: Manual testing with real user sessions

2. **No FCM Mock Server**:
   - Push notification delivery cannot be tested without real FCM credentials
   - **Workaround**: Use FCM test tokens or skip push delivery tests

3. **No Time Manipulation**:
   - Rate limiting (24-hour windows) cannot be tested without waiting
   - Quiet hours testing requires setting system time
   - **Workaround**: Use smaller time windows in test environment

4. **No Test Data Seeding**:
   - Tests require manual creation of households, invites, users
   - **Workaround**: Create setup scripts for test data

## Extending the Test Suite

### Adding RLS Policy Tests

```sql
-- Template for RLS tests
BEGIN;
SELECT plan(1);

-- Set up test data
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_household_id UUID := gen_random_uuid();
BEGIN
  -- Create test records
  INSERT INTO public.households (id, name, owner_id)
  VALUES (test_household_id, 'Test', test_user_id);

  -- Test the policy
  PERFORM ok(
    EXISTS (SELECT 1 FROM public.households WHERE id = test_household_id),
    'Test passes'
  );
END;
$$;

SELECT * FROM finish();
ROLLBACK;
```

### Adding Edge Function Tests

```typescript
Deno.test("function-name: test description", async () => {
  const response = await makeRequest('function-name', {
    // Request body
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.expected_field, expected_value);
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Households Feature

on: [push, pull_request]

jobs:
  test-rls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase test db
      - run: supabase stop

  test-edge-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      - run: |
          cd supabase/functions
          deno test --allow-net --allow-env _tests/households_edge_functions_test.ts
```

## Monitoring and Alerts

### Production Monitoring Queries

```sql
-- Monitor invite acceptance rate
SELECT
  COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired,
  COUNT(*) FILTER (WHERE status = 'revoked') AS revoked,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'accepted') / NULLIF(COUNT(*), 0), 2) AS acceptance_rate
FROM public.invites
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Monitor notification delivery rate
SELECT
  COUNT(*) FILTER (WHERE is_sent = true) AS sent,
  COUNT(*) FILTER (WHERE is_sent = false) AS pending,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_sent = true) / NULLIF(COUNT(*), 0), 2) AS delivery_rate
FROM public.notification_events
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Monitor Edge Function error rates
SELECT * FROM cron_job_logs
WHERE job_name IN ('process-notification-events', 'expire-old-invites')
AND error_message IS NOT NULL
ORDER BY executed_at DESC
LIMIT 10;

-- Monitor feature flag rollout distribution
SELECT
  'households.enabled' AS feature,
  COUNT(*) FILTER (WHERE is_feature_enabled('households.enabled', id)) AS enabled_users,
  COUNT(*) AS total_users,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_feature_enabled('households.enabled', id)) / COUNT(*), 2) AS percentage
FROM auth.users
WHERE deleted_at IS NULL;
```

## Troubleshooting Test Failures

### "RLS policy test fails: household_id = household_id"

**Symptom**: Test detects tautological comparison in RLS policy

**Solution**:
```sql
-- Fix the policy to use proper table aliases
CREATE POLICY "Fixed policy" ON public.table_name
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members AS hm
      WHERE hm.household_id = table_name.household_id  -- Properly qualified!
        AND hm.user_id = auth.uid()
    )
  );
```

### "Edge Function test fails: 401 Unauthorized"

**Symptom**: Tests fail with authentication errors

**Solution**:
1. Verify `SUPABASE_ANON_KEY` environment variable is set
2. Check that key is valid and not expired
3. Ensure Supabase local instance is running: `supabase status`

### "Notification delivery test fails"

**Symptom**: Notifications are not sent/received

**Solution**:
1. Verify FCM_SERVER_KEY is set in Edge Function environment
2. Check Firebase Console for APNs certificates
3. Verify device is registered: `SELECT * FROM devices WHERE user_id = 'uuid'`
4. Check quiet hours: `SELECT * FROM sharing_prefs WHERE user_id = 'uuid'`

## References

- [pgTAP Testing Framework](https://pgtap.org/)
- [Deno Testing](https://deno.land/manual/testing)
- [Supabase Testing Guide](https://supabase.com/docs/guides/cli/testing)
- [Feature Flag Testing Best Practices](https://martinfowler.com/articles/feature-toggles.html#TestingToggledFeatures)

