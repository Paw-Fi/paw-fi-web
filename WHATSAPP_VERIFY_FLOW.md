# WhatsApp Verification Flow - Complete Implementation

## User Flow

### **Scenario 1: User Not Logged In**

1. User sends `/verify` to WhatsApp
2. Receives message:
   ```
   🔗 *Account Verification*
   
   Click this link to verify your account:
   https://moneko.app/verify-whatsapp?otp=123456
   
   Or enter code: *123456*
   
   Valid for 10 minutes.
   ```
3. User clicks link → Opens browser
4. **Not authenticated** → Redirected to `/login?redirect=/verify-whatsapp?otp=123456`
5. User logs in or registers
6. **After successful login** → Automatically redirected back to `/verify-whatsapp?otp=123456`
7. **Auto-verification** → OTP is automatically verified
8. Shows success message ✅

### **Scenario 2: User Already Logged In**

1. User sends `/verify` to WhatsApp
2. Receives verification link
3. User clicks link → Opens browser
4. **Already authenticated** → Stays on `/verify-whatsapp?otp=123456`
5. **Auto-verification** → OTP is automatically verified
6. Shows success message ✅

### **Scenario 3: Manual Code Entry**

1. User sends `/verify` to WhatsApp
2. Receives code: `123456`
3. User manually navigates to `/verify-whatsapp`
4. If not logged in → Redirected to login → Back to verification page
5. User enters code manually
6. Clicks "Verify" button
7. Shows success or error message

## Technical Implementation

### **1. WhatsApp Webhook (`/verify` command)**
```typescript
// Location: supabase/functions/twilio-whatsapp-webhook/index.ts
// Lines: 585-612

if (matched.name.toLowerCase() === '/verify') {
  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in whatsapp_verifications table (10-minute expiry)
  await supabase.from('whatsapp_verifications').insert({
    phone_e164: from!,
    verification_code: code,
    user_id: null, // Not linked yet
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  
  // Build verification URL with OTP
  const appUrl = Deno.env.get('ALLOWED_ORIGINS') || 'https://moneko.app';
  const verificationUrl = `${appUrl}/verify-whatsapp?otp=${code}`;
  
  // Send formatted message
  return {
    text: `🔗 *Account Verification*\n\nClick this link...\n${verificationUrl}`
  };
}
```

### **2. Verify WhatsApp Route**
```typescript
// Location: src/routes/verify-whatsapp.tsx

export const Route = createFileRoute("/verify-whatsapp")({
  component: VerifyWhatsappPage,
  validateSearch: (search) => ({
    otp: (search.otp as string) || undefined,
  }),
  beforeLoad: async ({ search }) => {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Preserve OTP in redirect URL
      const otp = (search as { otp?: string }).otp;
      const redirectUrl = otp 
        ? `/verify-whatsapp?otp=${otp}`
        : '/verify-whatsapp';
      
      // Redirect to login with return URL
      throw redirect({
        to: '/login',
        search: { redirect: redirectUrl },
      });
    }
  },
});
```

### **3. WhatsApp Binding Component**
```typescript
// Location: src/components/settings/whatsapp-binding.tsx

export function WhatsAppBinding({ otpFromUrl }: WhatsAppBindingProps) {
  // Auto-verify when OTP is in URL
  useEffect(() => {
    if (otpFromUrl) {
      setCode(otpFromUrl);
      verifyCode(otpFromUrl); // Auto-verify
    }
  }, [otpFromUrl]);
  
  const verifyCode = async (codeToVerify?: string) => {
    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call verify-whatsapp-binding function
    const { data, error } = await supabase.functions.invoke(
      'verify-whatsapp-binding',
      {
        body: { code: verificationCode },
        headers: { Authorization: `Bearer ${session.access_token}` },
      }
    );
    
    // Show success or error
    if (data?.success) {
      setVerified(true);
    } else {
      setError(data?.error);
    }
  };
}
```

### **4. Login Page**
```typescript
// Location: src/routes/login/index.tsx

export const Route = createFileRoute('/login/')({
  validateSearch: (search) => ({
    redirect: (search.redirect as string) || undefined,
  }),
});

export function Login() {
  const { redirect } = Route.useSearch();
  
  return (
    <ShadcnSignInForm
      redirectUrl={redirect} // Passes to form
    />
  );
}
```

### **5. Sign-In Form**
```typescript
// Location: src/components/auth/shadcn-sign-in-form.tsx

export function ShadcnSignInForm({ redirectUrl }: Props) {
  const handleSignIn = async () => {
    // After successful login
    if (needsAvatar) {
      navigate({ to: "/avatar-customizer" });
    } else {
      navigate({ to: redirectUrl || "/dashboard" }); // Redirects back
    }
  };
}
```

## Component States

### **Loading State**
```
┌─────────────────────────┐
│ Verifying...            │
│ [Spinner Animation]     │
└─────────────────────────┘
```

### **Success State**
```
┌─────────────────────────┐
│ ✅ WhatsApp Verified    │
│ Your WhatsApp number is │
│ successfully linked     │
└─────────────────────────┘
```

### **Error State**
```
┌─────────────────────────┐
│ ❌ Verification Failed  │
│ [Error Message]         │
│                         │
│ Send /verify to get new │
│ link                    │
│                         │
│ Or enter code: [Input] │
│ [Verify Button]         │
└─────────────────────────┘
```

### **Default State**
```
┌─────────────────────────┐
│ WhatsApp Verification   │
│ Send /verify to WhatsApp│
│                         │
│ Verification Code:      │
│ [123456 Input]          │
│ [Verify Button]         │
└─────────────────────────┘
```

## Security Features

✅ **Authentication Required**: Must be logged in to verify
✅ **OTP Expiration**: 10-minute validity
✅ **One-Time Use**: Code marked as used after verification
✅ **Session Validation**: JWT token required for verification
✅ **Redirect Preservation**: OTP parameter preserved through login flow

## Database Schema

```sql
-- whatsapp_verifications table
CREATE TABLE whatsapp_verifications (
  id UUID PRIMARY KEY,
  phone_e164 TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- user_contacts table (updated after verification)
CREATE TABLE user_contacts (
  id UUID PRIMARY KEY,
  phone_e164 TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  verified BOOLEAN DEFAULT false,
  -- ... other fields
);
```

## Testing Checklist

- [ ] User not logged in → Redirects to login → Redirects back with OTP
- [ ] User logged in → Auto-verifies immediately
- [ ] Invalid OTP → Shows error message
- [ ] Expired OTP → Shows error message
- [ ] Manual code entry → Works correctly
- [ ] OTP parameter preserved through login flow
- [ ] Success state displays correctly
- [ ] Error state allows retry
