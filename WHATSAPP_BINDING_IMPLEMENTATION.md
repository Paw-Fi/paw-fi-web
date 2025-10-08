# WhatsApp Binding Implementation

## Overview
Secure system to bind WhatsApp numbers to user accounts using OTP verification.

## Database Changes

### Migration: `20251008_whatsapp_verification.sql`
- Creates `whatsapp_verifications` table for temporary OTP storage
- Stores: phone_e164, verification_code, user_id, expires_at, verified
- Auto-cleanup function for expired verifications
- Indexes for fast lookups

## Backend Functions

### 1. `initiate-whatsapp-binding`
**Purpose**: Generate and send OTP to WhatsApp

**Flow**:
1. Validates authenticated user
2. Rate limiting: max 3 attempts per hour per phone
3. Generates 6-digit OTP (10-minute expiry)
4. Stores in `whatsapp_verifications` table
5. Sends OTP via Twilio WhatsApp API

**Request**:
```json
{
  "phone": "+1234567890"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification code sent to WhatsApp"
}
```

### 2. `verify-whatsapp-binding`
**Purpose**: Verify OTP and bind phone to user

**Flow**:
1. Validates authenticated user
2. Checks verification code (valid, not expired, not used)
3. Marks verification as used
4. Updates `user_contacts` table:
   - Sets `user_id` to authenticated user
   - Sets `verified` to `true`

**Request**:
```json
{
  "code": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "phone": "+1234567890",
  "message": "WhatsApp number verified and linked successfully"
}
```

## Webhook Changes

### `twilio-whatsapp-webhook`
**New Verification Check**:
- Before processing any message (except `/verify`), checks if user is verified
- Queries `user_contacts` for `verified=true` AND `user_id IS NOT NULL`
- If not verified, returns prompt message:

```
🔐 *Account Not Verified*

To use Moneko, please:
1. Go to https://moneko.app/settings
2. Link your WhatsApp number
3. Enter the verification code

Or send */verify* for help.
```

## Frontend Component

### `src/components/settings/whatsapp-binding.tsx`
**Two-step flow**:

**Step 1: Enter Phone Number**
- Input field for phone with country code
- "Send Verification Code" button
- Calls `initiate-whatsapp-binding` function

**Step 2: Enter OTP**
- Input field for 6-digit code
- "Verify" button
- Calls `verify-whatsapp-binding` function
- Shows success state when verified

## Security Features

✅ **Authentication Required**: Both functions require valid JWT token
✅ **Rate Limiting**: Max 3 OTP requests per hour per phone
✅ **Expiration**: OTP valid for 10 minutes only
✅ **One-Time Use**: Code marked as used immediately after verification
✅ **User Isolation**: Can only verify codes for own user_id

## Deployment Steps

1. **Run Migration**:
```bash
supabase db push
```

2. **Deploy Backend Functions**:
```bash
supabase functions deploy initiate-whatsapp-binding --no-verify-jwt
supabase functions deploy verify-whatsapp-binding --no-verify-jwt
supabase functions deploy twilio-whatsapp-webhook --no-verify-jwt
```

3. **Add Component to Settings Page**:
```tsx
import { WhatsAppBinding } from '@/components/settings/whatsapp-binding';

// In your settings page:
<WhatsAppBinding />
```

## User Flow

1. User logs into web app
2. Goes to Settings page
3. Enters phone number with country code
4. Clicks "Send Verification Code"
5. Receives OTP on WhatsApp
6. Enters 6-digit code in web app
7. Clicks "Verify"
8. Phone number is now linked and verified
9. Can use WhatsApp to track expenses

## Testing

1. **Test OTP Generation**:
   - Enter phone number
   - Check WhatsApp for OTP message
   - Verify 10-minute expiry

2. **Test Verification**:
   - Enter correct OTP → Success
   - Enter wrong OTP → Error
   - Enter expired OTP → Error
   - Try same OTP twice → Error

3. **Test Webhook**:
   - Send message before verification → Prompt to verify
   - Send message after verification → Normal processing
   - Send `/verify` before verification → Help message

## Environment Variables Required

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
