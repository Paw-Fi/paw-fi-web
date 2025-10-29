# Firebase Cloud Messaging API V1 Setup Guide (2025)

## ⚠️ Important: Legacy API Deprecated

As of **June 20, 2024**, the legacy Firebase Cloud Messaging HTTP API has been **deprecated** and **removed**. You MUST use the Firebase Cloud Messaging API V1.

**What Changed:**
- ❌ **OLD**: Server Key from Firebase Console (no longer available)
- ✅ **NEW**: Service Account JSON + OAuth 2.0 access tokens

---

## 📋 Prerequisites

1. Firebase project set up
2. Firebase Cloud Messaging enabled
3. Supabase project with Edge Functions

---

## 🔧 Step-by-Step Setup

### Step 1: Get Firebase Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., "Moneko")
3. Click the **gear icon** ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"** button
6. Click **"Generate key"** in the confirmation dialog
7. Save the downloaded JSON file securely (e.g., `moneko-firebase-service-account.json`)

**The JSON file looks like this:**
```json
{
  "type": "service_account",
  "project_id": "moneko-xxxxx",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@moneko-xxxxx.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40moneko-xxxxx.iam.gserviceaccount.com"
}
```

⚠️ **SECURITY WARNING**: This file grants **FULL ACCESS** to your Firebase project. NEVER commit it to git or expose it publicly!

---

### Step 2: Get Firebase Project ID

From the same JSON file, note the `project_id` value. You'll need this.

Example: `"project_id": "moneko-xxxxx"`

---

### Step 3: Configure Supabase Edge Function Environment Variables

#### Option A: Using Supabase CLI (Recommended for local development)

1. Create `.env` file in your Supabase functions directory:

```bash
cd moneko-web/supabase/functions
```

2. Create/edit `.env` file:

```env
# Firebase Cloud Messaging V1 API Configuration
FIREBASE_PROJECT_ID=moneko-xxxxx
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"moneko-xxxxx","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@moneko-xxxxx.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40moneko-xxxxx.iam.gserviceaccount.com"}
```

**Important:** The `FIREBASE_SERVICE_ACCOUNT_JSON` must be a **single-line JSON string** (no line breaks in the middle of the JSON).

3. Add to `.gitignore`:

```bash
echo "functions/.env" >> .gitignore
```

#### Option B: Using Supabase Dashboard (For Production)

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Settings** → **Secrets**
3. Add two secrets:

| Secret Name | Secret Value |
|-------------|--------------|
| `FIREBASE_PROJECT_ID` | `moneko-xxxxx` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Paste the **entire JSON** content as a single line |

**To convert JSON to single line:**
```bash
cat moneko-firebase-service-account.json | jq -c
```

This outputs a compact single-line JSON that you can copy-paste.

---

### Step 4: Deploy Edge Function

```bash
cd moneko-web/supabase

# Deploy the push notification function
supabase functions deploy households-send-push-notification

# Verify deployment
supabase functions list
```

---

### Step 5: Apply Database Migrations

```bash
# Apply the real-time notification trigger migration
supabase db push

# Or manually apply:
psql -h your-db-host -U postgres -d postgres -f migrations/20251024_realtime_notifications.sql
```

---

### Step 6: Configure Database Settings

Connect to your Supabase database and run:

```sql
-- Set Supabase URL (replace with your actual project URL)
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project-ref.supabase.co';

-- Set Service Role Key (from Supabase Dashboard → Settings → API → service_role key)
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

-- Verify settings
SELECT current_setting('app.settings.supabase_url');
SELECT current_setting('app.settings.service_role_key');
```

---

### Step 7: Enable pg_net Extension

```sql
-- Enable HTTP requests from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

---

## 🧪 Testing

### Test 1: Verify Environment Variables

```bash
# Test locally
supabase functions serve households-send-push-notification

# In another terminal, call the function
curl -X POST http://localhost:54321/functions/v1/households-send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_event_id": "test-123",
    "household_id": "test-household",
    "user_id": "test-user",
    "event_type": "expense_added",
    "payload": {
      "expense_data": {
        "amount": 25.00,
        "currency": "USD",
        "category": "Test"
      }
    }
  }'
```

Check logs for:
- `[fcm-v1] FIREBASE_SERVICE_ACCOUNT_JSON not configured` ❌ (if not set)
- `[fcm-v1] Token exchange failed` ❌ (if JSON is invalid)
- `[fcm-v1] Push notification sent successfully` ✅ (success!)

### Test 2: Test OAuth Token Generation

Create a test function to verify token generation:

```typescript
// Test in Deno REPL or create a test function
const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
const serviceAccount = JSON.parse(serviceAccountJson);
console.log('Project ID:', serviceAccount.project_id);
console.log('Client Email:', serviceAccount.client_email);
// If this works, your JSON is valid
```

### Test 3: End-to-End Test

1. **Add an expense** to a household via mobile app
2. **Check database** for notification event:
```sql
SELECT * FROM notification_events
WHERE event_type = 'expense_added'
ORDER BY created_at DESC LIMIT 1;
```

3. **Check if sent**:
```sql
SELECT
  id,
  event_type,
  is_sent,
  sent_at,
  EXTRACT(EPOCH FROM (sent_at - created_at)) as latency_seconds,
  delivery_error
FROM notification_events
WHERE id = 'notification-id-from-above';
```

4. **Check Edge Function logs**:
```bash
supabase functions logs households-send-push-notification --limit 50
```

Look for:
- `[send-push] Processing notification: ...`
- `[fcm-v1] Push notification sent successfully`
- `[fcm-v1] FCM API error: ...` (if there's an error)

---

## 🐛 Troubleshooting

### Issue 1: "FIREBASE_SERVICE_ACCOUNT_JSON not configured"

**Cause:** Environment variable not set or function not redeployed after setting it.

**Solution:**
1. Verify variable is set in Supabase Dashboard → Edge Functions → Secrets
2. Redeploy the function: `supabase functions deploy households-send-push-notification`
3. Check logs: `supabase functions logs households-send-push-notification`

### Issue 2: "Token exchange failed"

**Cause:** Invalid JSON format or corrupted private key.

**Solutions:**
1. Verify JSON is valid: `cat service-account.json | jq`
2. Ensure no line breaks in the middle of the JSON when setting as env var
3. Re-download the service account JSON from Firebase Console
4. Make sure you're using the **entire** JSON content, not truncated

### Issue 3: "PERMISSION_DENIED" or "Authentication failed"

**Cause:** Service account doesn't have correct permissions.

**Solution:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **"Manage service account permissions"**
3. Ensure the service account has **"Firebase Cloud Messaging Admin"** role
4. Or use the default Firebase Admin SDK service account (it has all permissions)

### Issue 4: "Invalid device token" or "UNREGISTERED"

**Cause:** Device token is expired, invalid, or user uninstalled the app.

**Solution:**
1. Device tokens should be refreshed periodically
2. Remove invalid tokens from `devices` table:
```sql
-- Check for problematic devices
SELECT * FROM devices WHERE last_seen_at < NOW() - INTERVAL '30 days';

-- Delete old devices
DELETE FROM devices WHERE last_seen_at < NOW() - INTERVAL '180 days';
```

### Issue 5: Notifications not arriving on device

**Checklist:**
- [ ] Firebase project has Cloud Messaging enabled
- [ ] Mobile app has correct `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)
- [ ] User granted notification permissions
- [ ] Device is registered in `devices` table with `is_active = true`
- [ ] Edge Function logs show "Push notification sent successfully"
- [ ] Check FCM delivery reports in Firebase Console → Cloud Messaging → Reports

---

## 📊 Firebase Cloud Messaging API V1 Endpoints

### Send Single Message
```
POST https://fcm.googleapis.com/v1/projects/{project_id}/messages:send
Authorization: Bearer {oauth_access_token}
Content-Type: application/json

{
  "message": {
    "token": "device_fcm_token",
    "notification": {
      "title": "Test",
      "body": "Hello"
    },
    "data": {
      "key": "value"
    },
    "android": {
      "priority": "high"
    },
    "apns": {
      "payload": {
        "aps": {
          "sound": "default"
        }
      }
    }
  }
}
```

### Response Format

**Success (200 OK):**
```json
{
  "name": "projects/moneko-xxxxx/messages/0:1234567890123456%abcd1234"
}
```

**Error (400/404):**
```json
{
  "error": {
    "code": 400,
    "message": "Invalid argument: Token is invalid",
    "status": "INVALID_ARGUMENT",
    "details": [...]
  }
}
```

### Common Error Codes

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `INVALID_ARGUMENT` | Invalid device token | Remove token from database |
| `UNREGISTERED` | Token no longer valid | Device uninstalled app, remove token |
| `PERMISSION_DENIED` | Invalid OAuth token | Regenerate access token |
| `QUOTA_EXCEEDED` | Rate limit hit | Implement exponential backoff |
| `UNAVAILABLE` | FCM service down | Retry with exponential backoff |

---

## 🔐 Security Best Practices

### 1. Service Account Protection

**DO:**
- ✅ Store service account JSON in Supabase Secrets (encrypted)
- ✅ Use environment variables, never hardcode
- ✅ Restrict service account permissions to minimum required
- ✅ Rotate service account keys periodically (every 90 days)
- ✅ Use separate service accounts for dev/staging/production

**DON'T:**
- ❌ Commit service account JSON to git
- ❌ Expose in client-side code
- ❌ Share via email or messaging
- ❌ Use the same service account across multiple projects
- ❌ Log the private key in console/logs

### 2. Access Token Caching

**Current Implementation:** Tokens are generated on-demand (valid for 1 hour).

**Optimization (Future):**
```typescript
// Cache access token in memory with expiration
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getCachedAccessToken(): Promise<string | null> {
  const now = Date.now() / 1000;

  if (cachedToken && cachedToken.expiresAt > now + 300) {
    // Token still valid for at least 5 minutes
    return cachedToken.token;
  }

  // Generate new token
  const token = await getAccessToken();
  if (token) {
    cachedToken = {
      token,
      expiresAt: now + 3600 // 1 hour from now
    };
  }

  return token;
}
```

### 3. Rate Limiting

Firebase Cloud Messaging has rate limits:
- **Default:** 600,000 messages/minute
- **Burst:** Can exceed briefly, then throttled

**Best Practices:**
- Batch notifications when possible
- Implement exponential backoff on `QUOTA_EXCEEDED`
- Use topics for messages to >1000 devices

---

## 📱 Mobile App Integration

### Android Setup

1. Download `google-services.json` from Firebase Console
2. Place in `android/app/google-services.json`
3. Ensure FCM token is sent to backend on login

**Verify Token Format:**
```
Android FCM Token (V1):
dXJKl4...:APA91bH... (usually starts with random chars, then :APA91b)
```

### iOS Setup

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place in `ios/Runner/GoogleService-Info.plist`
3. Enable Push Notifications capability in Xcode
4. Upload APNs certificate to Firebase Console

**Verify Token Format:**
```
iOS FCM Token:
c4aG9X... (random alphanumeric, ~64+ characters)
```

---

## 🎯 Migration from Legacy API

### If you had Legacy Server Key before:

1. **Remove** `FCM_SERVER_KEY` environment variable
2. **Add** `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_PROJECT_ID`
3. **Update** Edge Function to use FCM V1 API (already done in `households-send-push-notification/index.ts`)
4. **Deploy** updated function
5. **Test** with existing device tokens (they still work with V1 API)

### Changes in API:

| Aspect | Legacy API | FCM V1 API |
|--------|-----------|------------|
| **Auth** | Server Key in header | OAuth Bearer token |
| **Endpoint** | `/fcm/send` | `/v1/projects/{id}/messages:send` |
| **Request Format** | `{ to: token, notification: {...} }` | `{ message: { token: ..., notification: {...} } }` |
| **Token Generation** | Static key | Dynamic OAuth (1hr expiry) |
| **Deprecation** | ❌ June 2024 | ✅ Current standard |

---

## ✅ Final Checklist

Before going to production:

- [ ] Firebase Service Account JSON downloaded and stored securely
- [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` set in Supabase Edge Function secrets
- [ ] `FIREBASE_PROJECT_ID` set in Supabase Edge Function secrets
- [ ] Database settings configured (`app.settings.supabase_url`, `app.settings.service_role_key`)
- [ ] `pg_net` extension enabled
- [ ] Real-time notification trigger created
- [ ] Edge Function `households-send-push-notification` deployed
- [ ] Tested with real expense creation
- [ ] Verified notification arrives on device in < 2 seconds
- [ ] Checked Edge Function logs for errors
- [ ] Device registration working on mobile app
- [ ] Invalid tokens cleaned up from database

---

## 📚 Official Documentation

- **Firebase Cloud Messaging V1 API**: https://firebase.google.com/docs/cloud-messaging/migrate-v1
- **Send Messages to Multiple Devices**: https://firebase.google.com/docs/cloud-messaging/send-message
- **Service Account Authentication**: https://cloud.google.com/docs/authentication/production
- **OAuth 2.0 for Server Applications**: https://developers.google.com/identity/protocols/oauth2/service-account

---

## 🆘 Support

If you encounter issues:

1. Check Edge Function logs: `supabase functions logs households-send-push-notification --limit 100`
2. Verify environment variables: Edge Functions → Settings → Secrets
3. Test OAuth token generation locally with service account JSON
4. Check Firebase Console → Cloud Messaging → Reports for delivery stats
5. Verify device tokens are valid and registered in `devices` table

**Common Success Indicators:**
- ✅ `[fcm-v1] Push notification sent successfully` in logs
- ✅ `is_sent = true` in `notification_events` table
- ✅ `sent_at` timestamp within 2 seconds of `created_at`
- ✅ Notification appears on user's device
