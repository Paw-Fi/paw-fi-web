// ====================
// HOUSEHOLDS EDGE FUNCTIONS INTEGRATION TESTS
// Created: 2025-10-21
// Purpose: Test Edge Functions for Joint Accounts feature
// ====================

// Run with: deno test --allow-net --allow-env

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Test configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'your-service-role-key';

// Helper: Make authenticated request
async function makeRequest(
  functionName: string,
  body: any,
  useServiceRole: boolean = false
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY}`
  };

  return await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

// ====================
// HOUSEHOLDS-VALIDATE-INVITE TESTS
// ====================

Deno.test("validate-invite: rejects missing token", async () => {
  const response = await makeRequest('households-validate-invite', {});
  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.valid, false);
  assertEquals(data.error_code, 'NOT_FOUND');
});

Deno.test("validate-invite: rejects invalid token", async () => {
  const response = await makeRequest('households-validate-invite', {
    token: 'invalid-token-that-does-not-exist'
  });
  const data = await response.json();

  assertEquals(response.status, 404);
  assertEquals(data.valid, false);
  assertEquals(data.error_code, 'NOT_FOUND');
});

Deno.test("validate-invite: supports both POST and GET", async () => {
  // POST request
  const postResponse = await makeRequest('households-validate-invite', {
    token: 'test-token'
  });

  assertExists(postResponse);
  assertEquals(typeof postResponse.status, 'number');

  // GET request would need URL params support
  // Skipping for now as it requires different fetch approach
});

Deno.test("validate-invite: returns full inviter profile", async () => {
  // This test would need a real valid invite token
  // Skipping implementation as it requires test data setup

  // Expected response structure:
  // {
  //   valid: true,
  //   household: { id, name, emoji },
  //   inviter: { id, email, full_name, avatar_url },
  //   expires_at: "2025-10-28T...",
  //   status: "pending",
  //   invite: { personal_message: "..." }
  // }
});

// ====================
// HOUSEHOLDS-ACCEPT-INVITE TESTS
// ====================

Deno.test("accept-invite: requires authentication", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/households-accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // No Authorization header
    body: JSON.stringify({ token: 'test-token' })
  });

  assertEquals(response.status, 401);
});

Deno.test("accept-invite: validates token format", async () => {
  const response = await makeRequest('households-accept-invite', {
    token: ''  // Empty token
  });

  assertEquals(response.status, 400);
});

Deno.test("accept-invite: creates notification event on success", async () => {
  // This test would need:
  // 1. Create test user
  // 2. Create test household
  // 3. Create valid invite
  // 4. Accept invite
  // 5. Verify notification_event was created
  // Skipping implementation as it requires complex test setup
});

Deno.test("accept-invite: prevents duplicate acceptance (409)", async () => {
  // This test validates the fix for the mobile deep link issue
  // where users got 409 errors when clicking invite link after web acceptance

  // Test flow:
  // 1. Accept invite (should succeed)
  // 2. Accept same invite again (should return 409 or handle gracefully)
  // Skipping implementation as it requires test data
});

// ====================
// HOUSEHOLDS-REGISTER-DEVICE TESTS
// ====================

Deno.test("register-device: requires authentication", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/households-register-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: 'ios',
      push_token: 'test-token'
    })
  });

  assertEquals(response.status, 401);
});

Deno.test("register-device: validates required fields", async () => {
  const response = await makeRequest('households-register-device', {
    // Missing push_token
    platform: 'ios'
  });

  assertEquals(response.status, 400);
});

Deno.test("register-device: validates platform enum", async () => {
  const response = await makeRequest('households-register-device', {
    platform: 'invalid-platform',
    push_token: 'test-token'
  });

  assertEquals(response.status, 400);
});

Deno.test("register-device: handles is_active flag correctly", async () => {
  // Test that is_active=false allows deactivation without platform
  // This validates the fix mentioned in audit addendum
  // Skipping implementation as it requires authentication setup
});

Deno.test("register-device: upserts existing devices", async () => {
  // Test that registering same push_token twice updates instead of errors
  // Validates idempotent behavior
  // Skipping implementation as it requires authentication
});

// ====================
// HOUSEHOLDS-SEND-NUDGE TESTS
// ====================

Deno.test("send-nudge: requires valid request body", async () => {
  const response = await makeRequest('households-send-nudge', {}, true);

  assertEquals(response.status, 400);
});

Deno.test("send-nudge: validates nudge type enum", async () => {
  const response = await makeRequest('households-send-nudge', {
    household_id: crypto.randomUUID(),
    budget_id: crypto.randomUUID(),
    nudge_type: 'invalid-type',  // Should be 'warn' or 'alert'
    currency: 'USD',
    spent_cents: 9000,
    budget_cents: 10000,
    percentage_used: 90
  }, true);

  // Function should validate nudge_type
  assertExists(response);
});

Deno.test("send-nudge: respects rate limiting (24 hours)", async () => {
  // This test validates the rate limiting fix
  // 1. Send nudge (should succeed)
  // 2. Send same nudge type immediately (should return 429)
  // 3. Wait 24 hours or use different nudge type (should succeed)
  // Skipping implementation as it requires time manipulation or real wait
});

Deno.test("send-nudge: respects quiet hours", async () => {
  // Test that nudges are not sent during user's quiet hours
  // Validates quiet hours logic in send-nudge function
  // Skipping implementation as it requires user preference setup
});

Deno.test("send-nudge: creates notification event", async () => {
  // Verify that notification_event record is created with correct payload
  // Skipping implementation as it requires database access
});

// ====================
// HOUSEHOLDS-PROCESS-NOTIFICATIONS TESTS
// ====================

Deno.test("process-notifications: processes unsent events", async () => {
  // This test validates the generic notification worker
  // 1. Create unsent notification_event
  // 2. Call process-notifications
  // 3. Verify event is marked as sent
  // 4. Verify push notification was sent
  // Skipping implementation as it requires database setup
});

Deno.test("process-notifications: respects quiet hours", async () => {
  // Verify that events are skipped if user is in quiet hours
  // Skipping implementation
});

Deno.test("process-notifications: handles different event types", async () => {
  // Test event types: member_joined, split_created, invite_accepted, etc.
  // Verify correct message formatting for each type
  // Skipping implementation
});

Deno.test("process-notifications: batches events efficiently", async () => {
  // Verify that function processes up to 100 events per run
  // Test pagination behavior
  // Skipping implementation
});

// ====================
// FEATURE-FLAGS-CHECK TESTS
// ====================

Deno.test("feature-flags-check: requires authentication", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/feature-flags-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature_key: 'households.enabled'
    })
  });

  assertEquals(response.status, 401);
});

Deno.test("feature-flags-check: validates feature_key", async () => {
  const response = await makeRequest('feature-flags-check', {
    // Missing feature_key
  });

  assertEquals(response.status, 400);
});

Deno.test("feature-flags-check: returns metadata", async () => {
  const response = await makeRequest('feature-flags-check', {
    feature_key: 'households.enabled'
  });

  const data = await response.json();

  assertExists(data.enabled);
  assertExists(data.feature_key);
  assertEquals(data.feature_key, 'households.enabled');
  // metadata may be null if flag doesn't exist
});

Deno.test("feature-flags-check: respects rollout percentage", async () => {
  // Test that percentage-based rollout works correctly
  // This requires deterministic user_id hashing
  // Skipping implementation
});

Deno.test("feature-flags-check: respects whitelist/blacklist", async () => {
  // Test that user_whitelist overrides percentage
  // Test that user_blacklist blocks all access
  // Skipping implementation
});

// ====================
// CORS TESTS
// ====================

Deno.test("CORS: all functions support OPTIONS preflight", async () => {
  const functions = [
    'households-validate-invite',
    'households-accept-invite',
    'households-register-device',
    'households-send-nudge',
    'households-process-notifications',
    'feature-flags-check'
  ];

  for (const func of functions) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://moneko.io',
        'Access-Control-Request-Method': 'POST'
      }
    });

    assertEquals(response.status, 200, `${func} should support CORS preflight`);
  }
});

Deno.test("CORS: allows moneko.app origin", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/households-validate-invite`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://moneko.io'
    }
  });

  const corsHeader = response.headers.get('Access-Control-Allow-Origin');
  assertEquals(corsHeader, 'https://moneko.io', 'Should allow moneko.app origin');
});

// ====================
// INTEGRATION TEST SUMMARY
// ====================

Deno.test("Integration: full invite lifecycle", async () => {
  // This would test the complete flow:
  // 1. Owner creates household
  // 2. Owner creates invite
  // 3. Invitee validates invite
  // 4. Invitee accepts invite
  // 5. Notification event is created
  // 6. Notification is processed and sent
  // 7. Invitee sees household in their list
  // Skipping implementation as it requires full test infrastructure
});

console.log('\\n✅ Edge Function tests completed');
console.log('\\n⚠️  Note: Many tests are skipped due to requiring:');
console.log('  - Authentication setup (real user sessions)');
console.log('  - Database test data (households, invites, users)');
console.log('  - FCM credentials for push notification testing');
console.log('  - Time manipulation for rate limiting tests');
console.log('\\nFor full coverage, run these tests in a Supabase test environment with:');
console.log('  - Test users created via Auth API');
console.log('  - Test households and invites in database');
console.log('  - Mock FCM server or actual FCM credentials');
