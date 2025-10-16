/**
 * Upgrade User to Lifetime Subscription
 * 
 * This script upgrades a user's subscription to Lifetime by:
 * 1. Canceling their current Stripe subscription (if any)
 * 2. Updating the database to reflect Lifetime status
 * 3. Optionally sending them a confirmation email
 * 
 * Usage:
 *   node scripts/upgrade-to-lifetime.js <user_id> [--no-email] [--cancel-immediately]
 * 
 * Options:
 *   --no-email            Skip sending confirmation email
 *   --cancel-immediately  Cancel Stripe subscription immediately (default: at period end)
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') })

// Validate required environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL = process.env.VITE_APP_URL || 'https://moneko.io'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
})

// Parse command line arguments
const args = process.argv.slice(2)
const userId = args[0]
const skipEmail = args.includes('--no-email')
const cancelImmediately = args.includes('--cancel-immediately')

if (!userId) {
  console.error('❌ Error: User ID is required')
  console.error('Usage: node scripts/upgrade-to-lifetime.js <user_id> [--no-email] [--cancel-immediately]')
  process.exit(1)
}

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(userId)) {
  console.error('❌ Error: Invalid user ID format (must be UUID)')
  process.exit(1)
}

console.log('\n🚀 Starting Lifetime Upgrade Process')
console.log('=====================================')
console.log(`User ID: ${userId}`)
console.log(`Skip Email: ${skipEmail}`)
console.log(`Cancel Immediately: ${cancelImmediately}`)
console.log('=====================================\n')

async function upgradeToLifetime() {
  try {
    // Step 1: Get user details
    console.log('📋 Step 1: Fetching user details...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      throw new Error(`User not found: ${userError?.message || 'No data returned'}`)
    }

    console.log(`✅ User found: ${userData.email} (${userData.full_name || 'No name'})`)

    // Step 2: Get current subscription
    console.log('\n📋 Step 2: Checking current subscription...')
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (subError) {
      throw new Error(`Error fetching subscription: ${subError.message}`)
    }

    if (!currentSub) {
      console.log('ℹ️  No existing subscription found (user may be on free plan)')
    } else {
      console.log(`✅ Current subscription:`)
      console.log(`   - Plan: ${currentSub.plan}`)
      console.log(`   - Status: ${currentSub.status}`)
      console.log(`   - Stripe Subscription ID: ${currentSub.stripe_subscription_id || 'None'}`)
      console.log(`   - Billing Interval: ${currentSub.billing_interval || 'N/A'}`)

      // Check if already lifetime
      if (currentSub.plan === 'lifetime') {
        console.log('\n⚠️  User is already on Lifetime plan!')
        const proceed = await askYesNo('Do you want to proceed anyway?')
        if (!proceed) {
          console.log('❌ Operation canceled by user')
          process.exit(0)
        }
      }
    }

    // Step 3: Cancel Stripe subscription if exists
    if (currentSub?.stripe_subscription_id) {
      console.log('\n📋 Step 3: Canceling Stripe subscription...')
      
      try {
        const cancelAtPeriodEnd = !cancelImmediately
        
        const canceledSub = await stripe.subscriptions.update(
          currentSub.stripe_subscription_id,
          {
            cancel_at_period_end: cancelAtPeriodEnd,
            // If canceling immediately, also set cancel_at to now
            ...(cancelImmediately && { cancel_at: Math.floor(Date.now() / 1000) })
          }
        )

        if (cancelImmediately) {
          // For immediate cancellation, we need to actually delete it
          await stripe.subscriptions.cancel(currentSub.stripe_subscription_id)
          console.log(`✅ Stripe subscription canceled immediately`)
        } else {
          const periodEnd = new Date(canceledSub.current_period_end * 1000).toLocaleDateString()
          console.log(`✅ Stripe subscription will cancel at period end: ${periodEnd}`)
        }
      } catch (stripeError) {
        console.error(`⚠️  Warning: Could not cancel Stripe subscription: ${stripeError.message}`)
        console.log('   This may be okay if subscription was already canceled')
      }
    } else {
      console.log('\n📋 Step 3: No Stripe subscription to cancel (user may have been on free plan)')
    }

    // Step 4: Update database to Lifetime
    console.log('\n📋 Step 4: Updating database to Lifetime plan...')
    
    const lifetimeData = {
      user_id: userId,
      plan: 'lifetime',
      status: 'active',
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      stripe_subscription_id: null, // Lifetime has no recurring subscription
      // Keep the stripe_customer_id if it exists
      ...(currentSub?.stripe_customer_id && { stripe_customer_id: currentSub.stripe_customer_id }),
      last_event_id: 'manual_upgrade_script',
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert(lifetimeData, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`)
    }

    console.log('✅ Database updated successfully to Lifetime plan')

    // Step 5: Send confirmation email (optional)
    if (!skipEmail) {
      console.log('\n📋 Step 5: Sending confirmation email...')
      
      try {
        // Call the email edge function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: userData.email,
            name: userData.full_name || 'there',
            template: 'subscription_created',
            data: {
              planName: 'Lifetime',
              dashboardUrl: `${APP_URL}/dashboard/membership`,
              isLifetime: true,
            }
          }
        })

        if (emailError) {
          console.error(`⚠️  Warning: Could not send email: ${emailError.message}`)
          console.log('   User was upgraded successfully, but they did not receive confirmation email')
        } else {
          console.log(`✅ Confirmation email sent to ${userData.email}`)
        }
      } catch (emailError) {
        console.error(`⚠️  Warning: Could not send email: ${emailError.message}`)
        console.log('   User was upgraded successfully, but they did not receive confirmation email')
      }
    } else {
      console.log('\n📋 Step 5: Skipping email (--no-email flag)')
    }

    // Success summary
    console.log('\n🎉 SUCCESS!')
    console.log('=====================================')
    console.log(`✅ ${userData.email} upgraded to Lifetime`)
    console.log(`✅ Plan: lifetime`)
    console.log(`✅ Status: active`)
    console.log(`✅ Expires: Never`)
    if (currentSub?.stripe_subscription_id) {
      console.log(`✅ Previous Stripe subscription: ${cancelImmediately ? 'Canceled immediately' : 'Will cancel at period end'}`)
    }
    console.log('=====================================\n')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

// Helper function to ask yes/no questions
function askYesNo(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    readline.question(`${question} (y/n): `, (answer) => {
      readline.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

// Run the script
upgradeToLifetime()
