/**
 * Upgrade User to Annual Plus Subscription with MONEKO100 Voucher
 * 
 * This script upgrades a user's subscription to Annual Plus by:
 * 1. Looking up user by email or user ID
 * 2. Getting or creating their Stripe customer
 * 3. Canceling their current Stripe subscription immediately (if any)
 * 4. Creating a new annual subscription with MONEKO100 voucher (100% off)
 * 5. Updating the database with the new subscription details
 * 6. Optionally sending them a confirmation email
 * 
 * The MONEKO100 voucher must exist in Stripe and provide 100% off.
 * 
 * Usage:
 *   node scripts/upgrade-to-annual.js <email_or_user_id> [--no-email]
 * 
 * Options:
 *   --no-email            Skip sending confirmation email
 * 
 * Examples:
 *   node scripts/upgrade-to-annual.js user@example.com
 *   node scripts/upgrade-to-annual.js abc123-def-456-ghi-789
 *   node scripts/upgrade-to-annual.js user@example.com --no-email
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
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY
const STRIPE_YEARLY_PLUS_PRICE_ID = "price_1RijISHaakOh5GyTsqE9C5Ki"
const APP_URL = process.env.VITE_APP_URL || 'https://moneko.io'
const VOUCHER_CODE = 'MONEKO100'

console.log("SUPABASE_URL", SUPABASE_URL)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY (or VITE_STRIPE_SECRET_KEY)')
  console.error('\nYour .env file has:')
  console.error(`  VITE_SUPABASE_URL: ${SUPABASE_URL ? '✓' : '✗'}`)
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗ MISSING'}`)
  console.error(`  STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY ? '✓' : '✗ MISSING'}`)
  process.exit(1)
}

if (!STRIPE_YEARLY_PLUS_PRICE_ID) {
  console.error('❌ Error: Missing STRIPE_YEARLY_PLUS_PLAN_ID or STRIPE_PLUS_YEARLY_PRICE_ID')
  console.error('This is required to create the annual subscription.')
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

if (!userInput) {
  console.error('❌ Error: Email or User ID is required')
  console.error('Usage: node scripts/upgrade-to-annual.js <email_or_user_id> [--no-email]')
  console.error('\nExamples:')
  console.error('  node scripts/upgrade-to-annual.js user@example.com')
  console.error('  node scripts/upgrade-to-annual.js abc123-def-456-ghi-789')
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

console.log('\n🚀 Starting Annual Plus Upgrade Process with MONEKO100 Voucher')
console.log('===============================================================')
console.log(`Input: ${userInput} (${isEmail ? 'Email' : 'User ID'})`)
console.log(`Skip Email: ${skipEmail}`)
console.log(`Voucher Code: ${VOUCHER_CODE}`)
console.log(`Plan: Plus Annual (yearly)`)
console.log('===============================================================\n')

async function upgradeToAnnual() {
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
        throw new Error(`User not found with email: ${userInput}`)
      }

      userData = data
      userId = data.id
    } else {
      // Look up user by UUID
      console.log(`   Looking up user by ID: ${userInput}`)
      const { data, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userInput)
        .single()

      if (userError || !data) {
        throw new Error(`User not found with ID: ${userInput}`)
      }

      userData = data
      userId = data.id
    }

    console.log(`✅ Found user: ${userData.email} (${userId})`)

    // Step 2: Get or create Stripe customer
    console.log('\n📋 Step 2: Getting or creating Stripe customer...')
    
    const { data: mappingData } = await supabase
      .from('user_stripe_mapping')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()
    
    let customerId = mappingData?.stripe_customer_id

    if (!customerId) {
      console.log('   Creating new Stripe customer...')
      
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.full_name || undefined,
        metadata: {
          userId,
        },
      })

      customerId = customer.id

      // Store customer ID in user_stripe_mapping table
      await supabase
        .from('user_stripe_mapping')
        .upsert({ 
          user_id: userId, 
          stripe_customer_id: customerId 
        }, {
          onConflict: 'user_id'
        })

      console.log(`✅ Created Stripe customer: ${customerId}`)
    } else {
      // Verify customer exists in Stripe
      try {
        await stripe.customers.retrieve(customerId)
        console.log(`✅ Using existing Stripe customer: ${customerId}`)
      } catch (error) {
        console.log('   Customer not found in Stripe, creating new one...')
        
        const customer = await stripe.customers.create({
          email: userData.email,
          name: userData.full_name || undefined,
          metadata: {
            userId,
          },
        })

        customerId = customer.id

        await supabase
          .from('user_stripe_mapping')
          .upsert({ 
            user_id: userId, 
            stripe_customer_id: customerId 
          }, {
            onConflict: 'user_id'
          })
        
        console.log(`✅ Created new Stripe customer: ${customerId}`)
      }
    }

    // Step 3: Get current subscription and cancel if exists
    console.log('\n📋 Step 3: Checking for existing subscription...')
    
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (currentSub?.stripe_subscription_id && currentSub.plan !== 'lifetime') {
      console.log(`   Found existing subscription: ${currentSub.stripe_subscription_id}`)
      console.log(`   Current plan: ${currentSub.plan}`)
      console.log('   Canceling immediately...')
      
      try {
        await stripe.subscriptions.cancel(currentSub.stripe_subscription_id)
        console.log('✅ Previous subscription canceled')
      } catch (cancelError) {
        console.warn(`⚠️  Warning: Could not cancel subscription: ${cancelError.message}`)
        console.log('   Continuing anyway...')
      }
    } else if (currentSub?.plan === 'lifetime') {
      throw new Error('User has a Lifetime subscription. Cannot downgrade to annual.')
    } else {
      console.log('   No existing active subscription to cancel')
    }

    // Step 4: Check if customer already has an active subscription in Stripe
    console.log('\n📋 Step 4: Checking for existing Stripe subscription...')
    
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10,
    })
    
    let fullSubscription = null
    
    // Look for an active yearly Plus subscription
    const yearlyPlusSubscription = existingSubscriptions.data.find(sub => 
      sub.items.data.some(item => item.price.id === STRIPE_YEARLY_PLUS_PRICE_ID)
    )
    
    if (yearlyPlusSubscription) {
      console.log(`   Found existing yearly Plus subscription: ${yearlyPlusSubscription.id}`)
      console.log(`   Status: ${yearlyPlusSubscription.status}`)
      console.log('   Skipping creation, will use existing subscription')
      fullSubscription = await stripe.subscriptions.retrieve(yearlyPlusSubscription.id)
    } else {
      console.log('   No existing yearly Plus subscription found')
      
      // Step 5: Retrieve the promotion code from Stripe
      console.log(`\n📋 Step 5: Looking up promotion code "${VOUCHER_CODE}"...`)
      
      const promotionCodes = await stripe.promotionCodes.list({
        code: VOUCHER_CODE,
        limit: 1,
      })

      if (!promotionCodes.data || promotionCodes.data.length === 0) {
        throw new Error(`Promotion code "${VOUCHER_CODE}" not found in Stripe. Please create it first.`)
      }

      const promotionCode = promotionCodes.data[0]
      
      if (!promotionCode.active) {
        throw new Error(`Promotion code "${VOUCHER_CODE}" is not active.`)
      }

      console.log(`✅ Found promotion code: ${promotionCode.id}`)
      console.log(`   Coupon: ${promotionCode.coupon.id}`)
      console.log(`   Discount: ${promotionCode.coupon.percent_off}% off` || `Amount off: ${promotionCode.coupon.amount_off}`)

      // Step 6: Create new annual subscription with promotion code
      console.log('\n📋 Step 6: Creating annual subscription with voucher...')
      console.log(`   Price ID: ${STRIPE_YEARLY_PLUS_PRICE_ID}`)
      console.log(`   Applying promotion code: ${VOUCHER_CODE}`)
      
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: STRIPE_YEARLY_PLUS_PRICE_ID,
          },
        ],
        discounts: [
          {
            promotion_code: promotionCode.id,
          },
        ],
        metadata: {
          user_id: userId,
          plan: 'plus',
          billing_interval: 'yearly',
        },
        expand: ['latest_invoice'], // Expand to get more details
      })
      
      // Retrieve the full subscription with all fields populated
      fullSubscription = await stripe.subscriptions.retrieve(subscription.id)
      
      console.log('   Debug - Full subscription object:')
      console.log(JSON.stringify(fullSubscription, null, 2))

      console.log(`\n✅ Subscription created: ${fullSubscription.id}`)
    }
    
    console.log(`\n📋 Subscription Details:`)
    console.log(`   ID: ${fullSubscription.id}`)
    console.log(`   Status: ${fullSubscription.status}`)
    console.log(`   Current period start: ${formatStripeTimestamp(fullSubscription.current_period_start)}`)
    console.log(`   Current period end: ${formatStripeTimestamp(fullSubscription.current_period_end)}`)
    console.log(`   Amount due: $${(fullSubscription.items.data[0].price.unit_amount || 0) / 100}`)
    
    // Calculate the actual amount after discount
    const invoice = fullSubscription.latest_invoice
    if (typeof invoice === 'string') {
      const invoiceDetails = await stripe.invoices.retrieve(invoice)
      console.log(`   Amount charged: $${(invoiceDetails.amount_paid || 0) / 100}`)
    }

    // Step 7: Update database with subscription
    console.log('\n📋 Step 7: Updating database...')
    
    // Handle different subscription states
    // When a subscription has 100% discount, it might be incomplete or require confirmation
    let currentPeriodEnd
    
    if (fullSubscription.current_period_end) {
      const currentPeriodEndDate = new Date(fullSubscription.current_period_end * 1000)
      if (isNaN(currentPeriodEndDate.getTime())) {
        throw new Error(`Invalid current_period_end timestamp: ${fullSubscription.current_period_end}`)
      }
      currentPeriodEnd = currentPeriodEndDate.toISOString()
    } else if (fullSubscription.current_period_start) {
      // Fallback: Calculate period end as 1 year from start for yearly subscriptions
      console.log('   ⚠️  current_period_end is missing, calculating from current_period_start')
      const periodStartDate = new Date(fullSubscription.current_period_start * 1000)
      const periodEndDate = new Date(periodStartDate)
      periodEndDate.setFullYear(periodEndDate.getFullYear() + 1)
      currentPeriodEnd = periodEndDate.toISOString()
      console.log(`   Calculated period end: ${currentPeriodEnd}`)
    } else {
      // Last resort: Set to 1 year from now
      console.log('   ⚠️  Both period dates missing, setting to 1 year from now')
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
      currentPeriodEnd = oneYearFromNow.toISOString()
      console.log(`   Set period end: ${currentPeriodEnd}`)
    }
    
    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: fullSubscription.id,
      stripe_customer_id: customerId,
      plan: 'plus',
      billing_interval: 'yearly',
      status: fullSubscription.status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }
    
    console.log('   Subscription data to insert:', JSON.stringify(subscriptionData, null, 2))

    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`)
    }

    console.log('✅ Database updated successfully')

    // Step 8: Send confirmation email (optional)
    if (!skipEmail) {
      console.log('\n📋 Step 8: Sending confirmation email...')
      
      try {
        const greetingName = userData.full_name || 'there'
        const dashboardUrl = `${APP_URL}/dashboard/user-settings/membership`

        const htmlBody = `
          <p>Hi ${greetingName},</p>
          <p>Great news — your Moneko account has been upgraded to the <strong>Plus Annual</strong> membership with the ${VOUCHER_CODE} voucher applied!</p>
          <p>You now have access to all premium features for the next year at no cost.</p>
          <p>Visit your membership dashboard anytime to review what's included and explore new capabilities.</p>
          <p><a href="${dashboardUrl}" style="background-color:#7458FF;color:#ffffff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block;">Go to Membership Dashboard</a></p>
          <p>If you ever need help, just reply to this email and our team will take care of you.</p>
          <p>— The Moneko Team</p>
        `

        const textBody = `Hi ${greetingName},\n\nYour Moneko account has been upgraded to the Plus Annual membership with the ${VOUCHER_CODE} voucher applied!\n\nYou now have access to all premium features for the next year at no cost.\n\nVisit your membership dashboard: ${dashboardUrl}\n\nIf you ever need help, reply to this email and our team will assist you.\n\n— The Moneko Team`

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'direct',
            to: userData.email,
            subject: 'Your Moneko Plus Annual Membership Is Active',
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
      console.log('\n📋 Step 8: Skipping email (--no-email flag)')
    }

    // Success summary
    console.log('\n🎉 SUCCESS!')
    console.log('===============================================================')
    console.log(`✅ ${userData.email} upgraded to Plus Annual`)
    console.log(`✅ Plan: plus`)
    console.log(`✅ Billing Interval: yearly`)
    console.log(`✅ Status: ${fullSubscription.status}`)
    console.log(`✅ Stripe Subscription ID: ${fullSubscription.id}`)
    console.log(`✅ Stripe Customer ID: ${customerId}`)
    console.log(`✅ Promotion Code: ${VOUCHER_CODE} applied`)
    console.log(`✅ Current period ends: ${formatStripeTimestamp(fullSubscription.current_period_end)}`)
    console.log('===============================================================\n')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
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
upgradeToAnnual()
