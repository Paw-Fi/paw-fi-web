/**
 * Downgrade User to Free Plan
 *
 * This script downgrades a user's subscription back to Free by:
 * 1. Looking up user by email or user ID
 * 2. Canceling their current Stripe subscription immediately (if any)
 * 3. Updating the database to reflect Free plan status
 * 4. Optionally sending them a confirmation email
 *
 * Usage:
 *   node scripts/downgrade-to-free.js <email_or_user_id> [--no-email]
 *
 * Options:
 *   --no-email            Skip sending confirmation email
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.production') })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY
const APP_URL = process.env.VITE_APP_URL || 'https://moneko.io'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY (or VITE_STRIPE_SECRET_KEY)')
  console.error('\nYour .env file has:')
  console.error(`  VITE_SUPABASE_URL: ${SUPABASE_URL ? '✓' : '✗'}`)
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗ MISSING'}`)
  console.error(`  STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY ? '✓' : '✗ MISSING'}`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
})

const args = process.argv.slice(2)
const userInput = args[0]
const skipEmail = args.includes('--no-email')

if (!userInput) {
  console.error('❌ Error: Email or User ID is required')
  console.error('Usage: node scripts/downgrade-to-free.js <email_or_user_id> [--no-email]')
  process.exit(1)
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isEmail = emailRegex.test(userInput)
const isUuid = uuidRegex.test(userInput)

if (!isEmail && !isUuid) {
  console.error('❌ Error: Input must be a valid email address or UUID')
  console.error(`Received: ${userInput}`)
  process.exit(1)
}

console.log('\n🧹 Starting Downgrade to Free Process')
console.log('=====================================')
console.log(`Input: ${userInput} (${isEmail ? 'Email' : 'User ID'})`)
console.log(`Skip Email: ${skipEmail}`)
console.log(`Cancel Stripe: Immediate (to stop billing)`) 
console.log('=====================================\n')

async function downgradeToFree() {
  try {
    console.log('📋 Step 1: Fetching user details...')

    let userData
    let userId

    if (isEmail) {
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
    } else {
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
      console.log('ℹ️  No existing subscription row found (user likely already free)')
    } else {
      console.log('✅ Current subscription:')
      console.log(`   - Plan: ${currentSub.plan}`)
      console.log(`   - Status: ${currentSub.status}`)
      console.log(`   - Stripe Subscription ID: ${currentSub.stripe_subscription_id || 'None'}`)
      console.log(`   - Billing Interval: ${currentSub.billing_interval || 'N/A'}`)

      if (currentSub.plan === 'free') {
        const proceed = await askYesNo('User is already on Free plan. Proceed anyway?')
        if (!proceed) {
          console.log('❌ Operation canceled by user')
          process.exit(0)
        }
      }
    }

    if (currentSub?.stripe_subscription_id) {
      console.log('\n📋 Step 3: Canceling Stripe subscription...')

      try {
        await stripe.subscriptions.cancel(currentSub.stripe_subscription_id, {
          prorate: false,
        })

        console.log('✅ Stripe subscription canceled immediately')
        console.log('   Waiting 5 seconds for Stripe to process cancellation...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      } catch (stripeError) {
        console.error(`⚠️  Warning: Could not cancel Stripe subscription: ${stripeError.message}`)
        console.log('   Proceeding with database downgrade anyway...')
      }
    } else {
      console.log('\n📋 Step 3: No Stripe subscription to cancel')
    }

    console.log('\n📋 Step 4: Updating database to Free plan...')

    const stripeCustomerId = currentSub?.stripe_customer_id ?? `manual_free_${userId}`

    const freeData = {
      user_id: userId,
      plan: 'free',
      status: 'canceled',
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      stripe_subscription_id: null,
      stripe_customer_id: stripeCustomerId,
      last_event_id: 'manual_downgrade_script',
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert(freeData, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`)
    }

    console.log('✅ Database updated successfully to Free plan')

    if (!skipEmail) {
      console.log('\n📋 Step 5: Sending confirmation email...')

      try {
        const greetingName = userData.full_name || 'there'
        const dashboardUrl = `${APP_URL}/dashboard/user-settings/membership`

        const htmlBody = `
          <p>Hi ${greetingName},</p>
          <p>Your Moneko account has been downgraded to the <strong>Free</strong> plan. Premium features are no longer active.</p>
          <p>You can review your membership status anytime from your dashboard.</p>
          <p><a href="${dashboardUrl}" style="background-color:#7458FF;color:#ffffff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block;">Go to Membership Dashboard</a></p>
          <p>If you believe this is a mistake, just reply to this email and we’ll help you.</p>
          <p>— The Moneko Team</p>
        `

        const textBody = `Hi ${greetingName},\n\nYour Moneko account has been downgraded to the Free plan. Premium features are no longer active.\n\nMembership dashboard: ${dashboardUrl}\n\nIf you believe this is a mistake, reply to this email and we’ll help you.\n\n— The Moneko Team`

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'direct',
            to: userData.email,
            subject: 'Your Moneko Plan Has Been Downgraded to Free',
            html: htmlBody,
            text: textBody,
            replyTo: 'hello@moneko.io',
          },
        })

        if (emailError) {
          console.error(`⚠️  Warning: Could not send email: ${emailError.message}`)
        } else if (!emailResult?.success) {
          console.error(`⚠️  Warning: Email function responded with an error: ${emailResult?.error || 'Unknown error'}`)
        } else {
          console.log(`✅ Confirmation email sent to ${userData.email}`)
        }
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : JSON.stringify(emailError)
        console.error(`⚠️  Warning: Could not send email: ${message}`)
      }
    } else {
      console.log('\n📋 Step 5: Skipping email (--no-email flag)')
    }

    console.log('\n🎉 SUCCESS!')
    console.log('=====================================')
    console.log(`✅ ${userData.email} downgraded to Free`)
    console.log('✅ Plan: free')
    console.log('✅ Status: canceled')
    if (currentSub?.stripe_subscription_id) {
      console.log('✅ Stripe: canceled immediately')
    }
    console.log('=====================================\n')
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

function askYesNo(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    readline.question(`${question} (y/n): `, (answer) => {
      readline.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

downgradeToFree()
