/**
 * Upgrade User to Lifetime Subscription
 * 
 * This script upgrades a user's subscription to Lifetime by:
 * 1. Looking up user by email or user ID
 * 2. Canceling their current Stripe subscription (if any)
 * 3. Updating the database to reflect Lifetime status
 * 4. Optionally sending them a confirmation email
 * 
 * Usage:
 *   node scripts/upgrade-to-lifetime.js <email_or_user_id> [--no-email] [--cancel-immediately]
 * 
 * Options:
 *   --no-email            Skip sending confirmation email
 *   --cancel-immediately  Cancel Stripe subscription immediately (default: at period end)
 * 
 * Examples:
 *   node scripts/upgrade-to-lifetime.js user@example.com
 *   node scripts/upgrade-to-lifetime.js abc123-def-456-ghi-789
 *   node scripts/upgrade-to-lifetime.js user@example.com --no-email
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
dotenv.config({ path: path.join(__dirname, '../.env.production') })

// Validate required environment variables
// Use SUPABASE_URL if available, otherwise fall back to VITE_SUPABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
// Support both STRIPE_SECRET_KEY and VITE_STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY
const APP_URL = process.env.VITE_APP_URL || 'https://moneko.io'
console.log("SUPABASE_URL",SUPABASE_URL)
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY (or VITE_STRIPE_SECRET_KEY)')
  console.error('\nYour .env file has:')
  console.error(`  VITE_SUPABASE_URL: ${SUPABASE_URL ? '✓' : '✗'}`)
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗ MISSING'}`)
  console.error(`  STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY ? '✓' : '✗ MISSING'}`)
  console.error('\n💡 To get your service role key:')
  console.error('  1. Go to your Supabase project dashboard')
  console.error('  2. Settings → API')
  console.error('  3. Copy the "service_role" key (NOT the anon key)')
  console.error('  4. Add to .env: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
})

// Parse command line arguments
const args = process.argv.slice(2)
const userInput = args[0]
const skipEmail = args.includes('--no-email')
const cancelImmediately = args.includes('--cancel-immediately')

if (!userInput) {
  console.error('❌ Error: Email or User ID is required')
  console.error('Usage: node scripts/upgrade-to-lifetime.js <email_or_user_id> [--no-email] [--cancel-immediately]')
  console.error('\nExamples:')
  console.error('  node scripts/upgrade-to-lifetime.js user@example.com')
  console.error('  node scripts/upgrade-to-lifetime.js abc123-def-456-ghi-789')
  process.exit(1)
}

// Detect if input is email or UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isEmail = emailRegex.test(userInput)
const isUuid = uuidRegex.test(userInput)

if (!isEmail && !isUuid) {
  console.error('❌ Error: Input must be a valid email address or UUID')
  console.error(`Received: ${userInput}`)
  process.exit(1)
}

console.log('\n🚀 Starting Lifetime Upgrade Process')
console.log('=====================================')
console.log(`Input: ${userInput} (${isEmail ? 'Email' : 'User ID'})`)
console.log(`Skip Email: ${skipEmail}`)
console.log(`Cancel Immediately: ${cancelImmediately}`)
console.log('=====================================\n')

async function upgradeToLifetime() {
  try {
    // Step 1: Get user details (lookup by email or UUID)
    console.log('📋 Step 1: Fetching user details...')
    
    let userData
    let userId
    
    if (isEmail) {
      // Look up user by email
      console.log(`   Looking up user by email: ${userInput}`)
      const { data, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', userInput)
        .single()

      if (userError || !data) {
        throw new Error(`User not found with email "${userInput}": ${userError?.message || 'No data returned'}`)
      }
      
      userData = data
      userId = data.id
      console.log(`   Found user ID: ${userId}`)
    } else {
      // Look up user by UUID
      userId = userInput
      const { data, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single()

      if (userError || !data) {
        throw new Error(`User not found with ID "${userId}": ${userError?.message || 'No data returned'}`)
      }
      
      userData = data
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
          const targetTimestamp = canceledSub.cancel_at ?? canceledSub.current_period_end ?? canceledSub.ended_at ?? null
          const formattedDate = formatStripeTimestamp(targetTimestamp)

          if (formattedDate) {
            console.log(`✅ Stripe subscription will cancel at period end: ${formattedDate}`)
          } else {
            console.log('ℹ️  Stripe subscription cancellation scheduled, but the period end date could not be determined. Please verify directly in Stripe.')
          }
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

    if (currentSub?.current_period_end) {
      const { error: clearPeriodEndError } = await supabase
        .from('subscriptions')
        .update({ current_period_end: null })
        .eq('user_id', userId)

      if (clearPeriodEndError) {
        throw new Error(`Failed to clear current_period_end: ${clearPeriodEndError.message}`)
      }

      console.log('   - Cleared existing current_period_end value')
    }

    if (currentSub?.status !== 'active') {
      const { error: activateStatusError } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('user_id', userId)

      if (activateStatusError) {
        throw new Error(`Failed to update status to active: ${activateStatusError.message}`)
      }

      console.log('   - Updated subscription status to active')
    }

    const lifetimeData = {
      user_id: userId,
      plan: 'lifetime',
      status: 'active',
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      stripe_subscription_id: null,
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
        const greetingName = userData.full_name || 'there'
        const dashboardUrl = `${APP_URL}/dashboard/membership`

        const htmlBody = `
          <p>Hi ${greetingName},</p>
          <p>Great news — your Moneko account has been upgraded to the <strong>Lifetime</strong> membership. You now have ongoing access to every premium feature with no future billing.</p>
          <p>Visit your membership dashboard anytime to review what’s included and explore new capabilities.</p>
          <p><a href="${dashboardUrl}" style="background-color:#7458FF;color:#ffffff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block;">Go to Membership Dashboard</a></p>
          <p>If you ever need help, just reply to this email and our team will take care of you.</p>
          <p>— The Moneko Team</p>
        `

        const textBody = `Hi ${greetingName},\n\nYour Moneko account has been upgraded to the Lifetime membership. You now have ongoing access to every premium feature with no future billing.\n\nVisit your membership dashboard: ${dashboardUrl}\n\nIf you ever need help, reply to this email and our team will assist you.\n\n— The Moneko Team`

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'direct',
            to: userData.email,
            subject: 'Your Moneko Lifetime Membership Is Active',
            html: htmlBody,
            text: textBody,
            replyTo: 'hello@moneko.io',
          }
        })

        if (emailError) {
          console.error(`⚠️  Warning: Could not send email: ${emailError.message}`)
          console.log('   User was upgraded successfully, but they did not receive confirmation email')
        } else if (!emailResult?.success) {
          console.error(`⚠️  Warning: Email function responded with an error: ${emailResult?.error || 'Unknown error'}`)
          console.log('   User was upgraded successfully, but they did not receive confirmation email')
        } else {
          console.log(`✅ Confirmation email sent to ${userData.email}`)
        }
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : JSON.stringify(emailError)
        console.error(`⚠️  Warning: Could not send email: ${message}`)
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

function formatStripeTimestamp(timestamp) {
  if (timestamp === null || timestamp === undefined) {
    return null
  }

  const numeric = typeof timestamp === 'string'
    ? Number.parseInt(timestamp, 10)
    : Number(timestamp)

  if (Number.isNaN(numeric) || numeric <= 0) {
    return null
  }

  const date = new Date(numeric * 1000)

  return Number.isNaN(date.getTime()) ? null : date.toLocaleString()
}

// Run the script
upgradeToLifetime()
