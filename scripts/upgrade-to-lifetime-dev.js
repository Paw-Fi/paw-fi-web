/**
 * Upgrade User to Lifetime Subscription (DEV)
 * 
 * Simple dev-only script that sets a user's subscription to lifetime.
 * No Stripe cancellation, no email, no prompts.
 * 
 * Usage:
 *   node scripts/upgrade-to-lifetime-dev.js <email_or_user_id>
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.development') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required env vars: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const userInput = process.argv[2]

if (!userInput) {
  console.error('Usage: node scripts/upgrade-to-lifetime-dev.js <email_or_user_id>')
  process.exit(1)
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInput)
const isUuid = uuidRegex.test(userInput)

if (!isEmail && !isUuid) {
  console.error('❌ Input must be a valid email or UUID')
  process.exit(1)
}

async function main() {
  let userId

  if (isEmail) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userInput)
      .single()
    if (error || !data) {
      console.error(`❌ User not found: ${error?.message}`)
      process.exit(1)
    }
    userId = data.id
    console.log(`User: ${data.email} (${userId})`)
  } else {
    userId = userInput
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan: 'lifetime',
      status: 'active',
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      stripe_subscription_id: null,
      stripe_customer_id: `manual_lifetime_${userId}`,
      lifetime_source: 'manual',
      lifetime_source_id: userId,
      last_event_id: 'manual_upgrade_script_dev',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error(`❌ Failed: ${error.message}`)
    process.exit(1)
  }

  console.log('✅ Subscription updated to lifetime')
}

main()
