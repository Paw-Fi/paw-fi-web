# Stripe Subscription Implementation Fixes - Production Ready

## Overview
This document tracks the systematic implementation of all fixes identified in STRIPE_SUBSCRIPTION_AUDIT.md.
All changes are production-ready with NO mock data or placeholders.

## Critical (P0) Fixes - MUST FIX IMMEDIATELY

### ✅ P0-1: Webhook Signature Verification
**Status**: PARTIAL - Needs hardening
**Issue**: Webhook accepts events without signature in development
**Fix**: Remove fallback, enforce signature always
- File: `supabase/functions/stripe-webhook/index.ts`
- Line: 61-63
- Action: Remove JSON.parse fallback, fail if no endpointSecret

### ✅ P0-2: Idempotency Keys
**Status**: NOT IMPLEMENTED
**Issue**: No idempotency keys on critical operations
**Fix**: Add idempotency keys to all mutation operations
- Files: 
  - `create-checkout-session/index.ts`
  - `update-subscription/index.ts`
  - `stripe-webhook/index.ts`

### ✅ P0-3: Plan/Price ID Validation
**Status**: CRITICAL - Duplicate IDs
**Issue**: Plus and Premium use same price IDs
**Fix**: Create proper environment variable mapping with validation
- File: `shared/stripe-subscription-prices.ts`
- Action: Add unique price IDs per plan + validation function

### ✅ P0-4: Customer Attachment
**Status**: NOT IMPLEMENTED
**Issue**: No customer creation/attachment in checkout
**Fix**: Get or create customer before checkout session
- File: `create-checkout-session/index.ts`

### ✅ P0-5: Trial Payment Method Collection
**Status**: BROKEN
**Issue**: Trial doesn't require payment method
**Fix**: Change to 'always' payment_method_collection with trial
- File: `create-checkout-session/index.ts`
- Line: 93

### ✅ P0-6: Database Schema Extensions
**Status**: INCOMPLETE
**Issue**: Missing critical subscription tracking fields
**Fix**: Add migration with all required fields
- New file: `supabase/migrations/20250101_subscription_enhancements.sql`

### ✅ P0-7: Webhook Idempotency
**Status**: NOT IMPLEMENTED  
**Issue**: Duplicate webhook events not handled
**Fix**: Track processed events in DB
- Add `webhook_events` table + deduplication logic

### ✅ P0-8: Error Handling & Retries
**Status**: PARTIAL
**Issue**: No exponential backoff for Stripe API failures
**Fix**: Add retry logic with exponential backoff

### ✅ P0-9: Security - Input Validation
**Status**: PARTIAL
**Issue**: Weak parameter validation
**Fix**: Strict validation with Zod schemas

### ✅ P0-10: Environment Variable Validation
**Status**: NOT IMPLEMENTED
**Issue**: No startup validation of required env vars
**Fix**: Add env validation utility

## High Priority (P1) Fixes

### P1-1: Store Prior Plan for Upgrade/Downgrade Detection
### P1-2: Persist Pending Downgrades
### P1-3: Consolidate Subscription Creation
### P1-4: Background Job for Expiration
### P1-5: Customer Portal Session Endpoint
### P1-6: Billing Interval Change Logic
### P1-7: Plan Enum Constraint
### P1-8: Cancellation Email on Scheduling

## Medium Priority (P2) Fixes

### P2-1: Dynamic Price Fetching from Stripe
### P2-2: Feature Enforcement (RLS)
### P2-3: Multi-Environment Config
### P2-4: Structured Logging
### P2-5: Proration Display
### P2-6: Unit Tests

## Implementation Order

1. **Phase 1: Security & Data Integrity (P0)**
   - Database schema enhancements
   - Environment validation
   - Webhook security
   - Idempotency
   
2. **Phase 2: Business Logic (P0 + P1)**
   - Customer management
   - Trial fixes
   - Subscription lifecycle
   - Portal endpoint
   
3. **Phase 3: Operations (P1 + P2)**
   - Background jobs
   - Monitoring
   - Testing
   
## Files to Modify

### New Files to Create
1. `supabase/migrations/20250101_subscription_enhancements.sql`
2. `supabase/functions/shared/env-validation.ts`
3. `supabase/functions/shared/idempotency.ts`
4. `supabase/functions/shared/stripe-retry.ts`
5. `supabase/functions/create-portal-session/index.ts`
6. `supabase/functions/shared/plan-validation.ts`
7. `supabase/functions/shared/subscription-constants.ts`

### Files to Modify
1. `supabase/functions/shared/stripe-subscription-prices.ts` - Fix duplicate IDs
2. `supabase/functions/stripe-webhook/index.ts` - Security + idempotency
3. `supabase/functions/create-checkout-session/index.ts` - Customer + trial fixes
4. `supabase/functions/update-subscription/index.ts` - Enhanced logic
5. `supabase/functions/verify-payment/index.ts` - Remove redundancy
6. `supabase/functions/get-subscription/index.ts` - Enhanced response

