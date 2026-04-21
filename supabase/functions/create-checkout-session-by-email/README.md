# Create Checkout Session by Email API

## Overview
This edge function allows creating Stripe checkout sessions using only a user's email address, without requiring authentication. This is useful for sending checkout links via email, SMS, or other channels.

## Endpoint
```
POST /functions/v1/create-checkout-session-by-email
```

## Request Body
```json
{
  "email": "user@example.com",           // required - valid email format
  "plan": "plus",                        // required - "plus" or "lifetime"
  "billingInterval": "yearly",           // optional - "monthly" or "yearly" (not for lifetime)
  "successUrl": "https://...",           // optional - custom success URL
  "cancelUrl": "https://...",            // optional - custom cancel URL  
  "promoCode": "PROMO123"                // optional - promotion code
}
```

## Response
```json
{
  "clientSecret": "pi_...",
  "checkoutUrl": "https://checkout.stripe.com/pay/...",
  "sessionId": "cs_..."
}
```

## Security Features
- Email format validation
- User existence verification in database
- All existing household binding checks
- IAP subscription conflict prevention
- Trial eligibility based on subscription history
- Stripe customer creation/attachment
- Proper error handling and logging

## Usage Example
```bash
curl -X POST "https://<project>.supabase.co/functions/v1/create-checkout-session-by-email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "plan": "plus", 
    "billingInterval": "yearly"
  }'
```

## Deployment
Deploy using the updated payments script:
```bash
./deploy-payments-functions.sh
```

## Monitoring
View logs:
```bash
supabase functions logs create-checkout-session-by-email --project-ref <project-ref>
```
