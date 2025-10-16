# Moneko Administration Scripts

This directory contains administrative scripts for managing Moneko subscriptions and users.

## Quick Reference

```bash
# Basic upgrade (recommended)
npm run upgrade:lifetime <user_id>

# Skip email notification
npm run upgrade:lifetime <user_id> -- --no-email

# Cancel Stripe subscription immediately
npm run upgrade:lifetime <user_id> -- --cancel-immediately
```

---

## Upgrade User to Lifetime

Script to manually upgrade a user to Lifetime subscription.

### Prerequisites

1. Node.js installed
2. Environment variables configured in `moneko-web/.env`:
   - `VITE_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (service role key, not anon key!)
   - `STRIPE_SECRET_KEY`
   - `VITE_APP_URL` (optional, defaults to https://moneko.io)

### Installation

```bash
cd moneko-web
npm install  # Make sure all dependencies are installed
```

### Usage

You can run the script directly with `node` or use the npm script:

**Using npm script** (recommended):
```bash
# Basic usage
npm run upgrade:lifetime <user_id>

# With options
npm run upgrade:lifetime <user_id> -- --no-email
npm run upgrade:lifetime <user_id> -- --cancel-immediately
npm run upgrade:lifetime <user_id> -- --no-email --cancel-immediately
```

**Using node directly:**
```bash
# Basic usage (cancels Stripe subscription at period end, sends email)
node scripts/upgrade-to-lifetime.js <user_id>

# Skip confirmation email
node scripts/upgrade-to-lifetime.js <user_id> --no-email

# Cancel Stripe subscription immediately
node scripts/upgrade-to-lifetime.js <user_id> --cancel-immediately

# Both options
node scripts/upgrade-to-lifetime.js <user_id> --no-email --cancel-immediately
```

### What It Does

1. **Validates user exists** - Fetches user details from database
2. **Checks current subscription** - Shows current plan, status, and Stripe subscription
3. **Cancels Stripe subscription** (if exists):
   - Default: Marks for cancellation at period end (user keeps access until then)
   - With `--cancel-immediately`: Cancels subscription immediately
4. **Updates database** to Lifetime:
   - Sets `plan = 'lifetime'`
   - Sets `status = 'active'`
   - Clears `billing_interval` (one-time payment)
   - Clears `current_period_end` (never expires)
   - Removes `stripe_subscription_id` (no recurring subscription)
5. **Sends confirmation email** (unless `--no-email` is used)

### Examples

**Scenario 1: Upgrade existing Plus subscriber**
```bash
# User has Plus monthly, want them to keep access until period end
npm run upgrade:lifetime abc123-def-456-ghi-789

# User immediately gets Lifetime status in database
# Their Stripe subscription will cancel at period end
# They receive welcome email for Lifetime
```

**Scenario 2: Upgrade free user**
```bash
# User is on free plan, just upgrade them
npm run upgrade:lifetime abc123-def-456-ghi-789

# No Stripe subscription to cancel
# Database updated to Lifetime
# Welcome email sent
```

**Scenario 3: Manual upgrade without email** (for bulk operations)
```bash
npm run upgrade:lifetime abc123-def-456-ghi-789 -- --no-email
```

**Scenario 4: Immediate cancellation** (for refunds/disputes)
```bash
npm run upgrade:lifetime abc123-def-456-ghi-789 -- --cancel-immediately

# Stripe subscription canceled immediately
# User upgraded to Lifetime
```

### Finding User IDs

**From Supabase Dashboard:**
1. Go to Table Editor → `users` table
2. Find user by email
3. Copy their `id` column

**From SQL:**
```sql
SELECT id, email, full_name 
FROM users 
WHERE email = 'user@example.com';
```

**From Stripe:**
1. Find customer in Stripe Dashboard
2. Look at metadata for `userId` or `user_id`

### Safety Features

- ✅ Validates UUID format before running
- ✅ Shows current subscription details before proceeding
- ✅ Warns if user is already on Lifetime (asks for confirmation)
- ✅ Gracefully handles missing Stripe subscriptions
- ✅ Continues even if email sending fails
- ✅ Detailed logging of each step

### Troubleshooting

**"User not found"**
- Check that the user ID is correct and exists in the `users` table

**"Could not cancel Stripe subscription"**
- Subscription may already be canceled
- Stripe API key may be incorrect
- Check Stripe Dashboard to verify subscription status

**"Could not send email"**
- Email function may not be deployed
- User will still be upgraded successfully
- Manually notify user if needed

**"Invalid user ID format"**
- User ID must be a valid UUID
- Check for typos or extra spaces

### Database Schema

The script updates the `subscriptions` table:

```sql
{
  user_id: UUID (primary key)
  plan: 'lifetime'
  status: 'active'
  billing_interval: NULL
  current_period_end: NULL
  cancel_at_period_end: FALSE
  trial_start: NULL
  trial_end: NULL
  stripe_subscription_id: NULL
  stripe_customer_id: <kept from previous>
  last_event_id: 'manual_upgrade_script'
  updated_at: <timestamp>
}
```

### When to Use This Script

**Good use cases:**
- ✅ Rewarding early supporters
- ✅ Compensating users for issues
- ✅ Converting from another payment platform
- ✅ Contest winners or giveaways
- ✅ Special partnerships or affiliates

**Bad use cases:**
- ❌ Regular subscription upgrades (use Stripe checkout flow)
- ❌ Trial extensions (modify trial_end instead)
- ❌ Refunds (use Stripe refund flow instead)

### Notes

- Script uses service role key (full database access) - **keep secure!**
- Always test with a test user first
- Review changes in Supabase Dashboard after running
- Check Stripe Dashboard to confirm subscription cancellation
- User will see Lifetime status immediately in app
- Lifetime subscriptions never expire (no end date)

### Support

If you encounter issues:
1. Check environment variables are set correctly
2. Verify service role key has proper permissions
3. Review script output for specific error messages
4. Check Supabase logs for database errors
5. Check Stripe Dashboard for subscription status
