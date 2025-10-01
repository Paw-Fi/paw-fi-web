# How to Remove/Increase Email Rate Limits in Supabase

## Overview

Supabase Auth has built-in rate limiting for email operations. The default limit is typically **3-4 emails per hour** per email address. You can increase or effectively remove this limit using the Supabase Management API.

## Quick Solution

### Option 1: Using the Script (Recommended)

1. **Get your credentials:**
   - Access Token: https://supabase.com/dashboard/account/tokens
   - Project Ref: From your Supabase project URL (e.g., `abcdefghijklmnop`)

2. **Run the script:**
```bash
cd scripts
chmod +x update-email-rate-limits.sh

export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

./update-email-rate-limits.sh
```

### Option 2: Manual cURL Command

```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

# Update rate limits
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_limit_email_sent": 100
  }'
```

## Rate Limit Values

You can set `rate_limit_email_sent` to different values based on your needs:

| Value | Description | Use Case |
|-------|-------------|----------|
| `3-4` | Default | Standard security (current) |
| `10` | Moderate | Small apps with occasional resends |
| `50` | High | Medium traffic apps |
| `100` | Very High | High traffic apps |
| `1000` | Effectively Unlimited | Development/Testing |

## All Available Rate Limit Parameters

You can configure multiple rate limits at once:

```json
{
  "rate_limit_anonymous_users": 10,
  "rate_limit_email_sent": 100,
  "rate_limit_sms_sent": 10,
  "rate_limit_verify": 10,
  "rate_limit_token_refresh": 10,
  "rate_limit_otp": 10,
  "rate_limit_web3": 10
}
```

### Parameter Descriptions

- **`rate_limit_email_sent`**: Maximum emails per hour per email address (signup, recovery, magic link)
- **`rate_limit_anonymous_users`**: Rate limit for anonymous user operations
- **`rate_limit_sms_sent`**: Maximum SMS messages per hour
- **`rate_limit_verify`**: Rate limit for verification attempts
- **`rate_limit_token_refresh`**: Rate limit for token refresh operations
- **`rate_limit_otp`**: Rate limit for OTP generation
- **`rate_limit_web3`**: Rate limit for Web3 authentication

## Check Current Rate Limits

```bash
curl -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq 'to_entries | map(select(.key | startswith("rate_limit_"))) | from_entries'
```

## Alternative: Custom Auth Hook (Complete Control)

If you want **complete control** over email sending and bypass Supabase's rate limits entirely, implement a custom auth hook:

### Step 1: Create Edge Function

```typescript
// supabase/functions/send-email-hook/index.ts
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as any

    // Send email directly via Resend (no Supabase rate limits!)
    const { error } = await resend.emails.send({
      from: 'Moneko <noreply@moneko.io>',
      to: [user.email],
      subject: getSubject(email_action_type),
      html: getEmailTemplate(email_action_type, token, token_hash, redirect_to),
    })
    
    if (error) throw error
    
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function getSubject(type: string): string {
  const subjects = {
    signup: 'Confirm Your Email',
    recovery: 'Reset Your Password',
    magiclink: 'Your Magic Link',
    email_change: 'Confirm Email Change',
  }
  return subjects[type] || 'Verify Your Email'
}

function getEmailTemplate(type: string, token: string, token_hash: string, redirect_to: string): string {
  const confirmUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${redirect_to}`
  
  return `
    <h2>Email Verification</h2>
    <p>Click the link below to verify your email:</p>
    <p><a href="${confirmUrl}">Verify Email</a></p>
    <p>Or use this code: <strong>${token}</strong></p>
  `
}
```

### Step 2: Deploy Function

```bash
supabase functions deploy send-email-hook --no-verify-jwt
```

### Step 3: Set Secrets

```bash
# Create .env file
cat > supabase/functions/.env << EOF
RESEND_API_KEY=your_resend_api_key
SEND_EMAIL_HOOK_SECRET=your_webhook_secret
SUPABASE_URL=your_supabase_url
EOF

# Upload secrets
supabase secrets set --env-file supabase/functions/.env
```

### Step 4: Configure Hook in Supabase Dashboard

1. Go to **Authentication > Hooks** in your Supabase dashboard
2. Enable **Send Email Hook**
3. Set the hook URL to your deployed function
4. Add the webhook secret

**Benefits of Custom Hook:**
- ✅ **No rate limits** (you control everything)
- ✅ **Custom email templates**
- ✅ **Better tracking and analytics**
- ✅ **Use any email provider**
- ✅ **Custom retry logic**

## Recommendations

### For Development
```json
{
  "rate_limit_email_sent": 1000
}
```

### For Production (Small App)
```json
{
  "rate_limit_email_sent": 50
}
```

### For Production (High Traffic)
- Use **Custom Auth Hook** for complete control
- Or set `rate_limit_email_sent: 1000`

## Security Considerations

⚠️ **Important**: While removing rate limits gives you flexibility, consider:

1. **Abuse Prevention**: Without limits, malicious actors could spam emails
2. **Cost**: More emails = higher Resend costs
3. **Reputation**: Too many emails can hurt your sender reputation

### Recommended Safeguards

If you increase/remove limits, implement your own protections:

1. **Client-side cooldown** (already implemented - 60 seconds)
2. **IP-based rate limiting** (via Cloudflare or similar)
3. **Email validation** (check for disposable emails)
4. **Monitoring** (alert on unusual email volumes)
5. **CAPTCHA** (for signup forms)

## Troubleshooting

### "Unauthorized" Error
- Check your access token is valid
- Ensure you have admin permissions on the project

### Changes Not Taking Effect
- Wait 2-3 minutes for changes to propagate
- Clear your application cache
- Restart your Supabase client

### Still Getting Rate Limited
- Verify the update was successful (check current limits)
- Ensure you're using the correct project ref
- Check if you have multiple Supabase projects

## Documentation Links

- **Supabase Rate Limits**: https://supabase.com/docs/guides/auth/rate-limits
- **Custom Auth Hooks**: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
- **Management API**: https://supabase.com/docs/reference/api/introduction

## Summary

**Quick Fix (5 minutes):**
```bash
export SUPABASE_ACCESS_TOKEN="your-token"
export PROJECT_REF="your-ref"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rate_limit_email_sent": 100}'
```

**Complete Control (30 minutes):**
- Implement custom auth hook
- Deploy to Supabase Edge Functions
- Configure in dashboard
- No rate limits, full customization
