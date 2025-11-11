import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { corsHeaders } from '../shared/cors.ts'
import { sendUserEmail } from '../shared/email-service.ts'
import { referralAcceptedTemplate } from '../shared/email-templates.ts'
import {
  subscriptionCreatedTemplate,
  subscriptionUpdatedTemplate,
  subscriptionCanceledTemplate,
  paymentFailedTemplate,
  trialEndingTemplate,
  invoiceFinalizedTemplate,
  invoiceUpcomingTemplate,
  paymentActionRequiredTemplate,
  paymentMethodUpdatedTemplate,
  invoicePaymentSucceededTemplate,
  discountExpiringTemplate
} from '../shared/email-templates.ts'
import { validateEnvironment } from '../shared/env-validation.ts'
import { isWebhookEventProcessed, markWebhookEventProcessed } from '../shared/idempotency.ts'
import { getChangeType, PlanType, BillingInterval } from '../shared/subscription-constants.ts'
import { getPlanFromPriceId } from '../shared/stripe-subscription-prices.ts'

// Validate environment on startup - FAIL FAST if misconfigured
// Webhook function REQUIRES webhook secret
const env = validateEnvironment({ requireWebhookSecret: true })

// Initialize Stripe with validated configuration - using latest API version
const stripe = new Stripe(env.stripeSecretKey, {
  // Use account's default API version for maximum compatibility and to follow Stripe guidance
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase client
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)

// Dashboard URL for links in emails
const DASHBOARD_URL = env.appUrl

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the signature from the header
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      console.error('Webhook rejected: No signature provided')
      return new Response(JSON.stringify({ error: 'No signature provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the raw request body
    const body = await req.text()
    let event: Stripe.Event

    // CRITICAL: Always verify webhook signature - NO FALLBACK
    // MUST use constructEventAsync in Deno (async crypto)
    try {
      if (!env.stripeWebhookSecret) {
        throw new Error('Webhook secret not configured')
      }
      
      // Use ASYNC version for Deno Edge Functions (required for SubtleCrypto)
      event = await stripe.webhooks.constructEventAsync(
        body, 
        signature, 
        env.stripeWebhookSecret
      )
      
      console.log(`Webhook verified: ${event.type} (${event.id})`)
    } catch (err) {
      console.error(`Webhook signature verification failed:`, {
        error: err.message,
        hasSignature: !!signature,
        hasSecret: !!env.stripeWebhookSecret,
      })
      
      return new Response(
        JSON.stringify({ error: `Webhook verification failed: ${err.message}` }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // IDEMPOTENCY: Check if event was already processed
    const alreadyProcessed = await isWebhookEventProcessed(supabase, event.id)
    
    if (alreadyProcessed) {
      console.log(`Event ${event.id} already processed (duplicate delivery)`)
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'duplicate' }), 
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Handle specific webhook events
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event.id)
          break
        case 'checkout.session.async_payment_succeeded':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event.id)
          break
        case 'checkout.session.async_payment_failed':
          await handleCheckoutSessionAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session)
          break
        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge, event.id)
          break
        case 'payment_intent.succeeded':
          // Handle successful one-time payments (lifetime) as additional verification
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, event.id)
          break
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.id)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event.id)
          break
        case 'customer.subscription.trial_will_end':
          await handleSubscriptionTrialEnding(event.data.object as Stripe.Subscription)
          break
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.id)
          break
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break
        case 'invoice.payment_action_required':
          await handleInvoicePaymentActionRequired(event.data.object as Stripe.Invoice)
          break
        case 'invoice.finalized':
          await handleInvoiceFinalized(event.data.object as Stripe.Invoice)
          break
        case 'invoice.upcoming':
          await handleInvoiceUpcoming(event.data.object as Stripe.Invoice)
          break
        case 'payment_method.attached':
          await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
          break
        case 'setup_intent.succeeded':
          await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent)
          break
        case 'setup_intent.setup_failed':
          await handleSetupIntentFailed(event.data.object as Stripe.SetupIntent)
          break
        case 'customer.subscription.pending_update_applied':
          await handleSubscriptionPendingUpdateApplied(event.data.object as Stripe.Subscription, event.id)
          break
        case 'customer.subscription.pending_update_expired':
          await handleSubscriptionPendingUpdateExpired(event.data.object as Stripe.Subscription)
          break
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      // Mark event as processed with processing time
      const processingTime = Date.now() - startTime
      await markWebhookEventProcessed(
        supabase, 
        event.id, 
        event.type,
        { processing_time_ms: processingTime }
      )
      
      console.log(`Event ${event.id} processed successfully in ${processingTime}ms`)

      return new Response(
        JSON.stringify({ received: true, processed: true, event_id: event.id }), 
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      console.error(`Error handling webhook ${event.id}:`, {
        type: event.type,
        error: error.message,
        stack: error.stack,
      })
      
      // Still return 200 to acknowledge receipt, but log the processing error
      // Stripe will retry if we return non-2xx, but we want to avoid infinite retries
      // for persistent errors
      return new Response(
        JSON.stringify({ 
          received: true, 
          processed: false,
          error: error.message,
          event_id: event.id,
        }), 
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    console.error(`Unexpected webhook error:`, {
      error: error.message,
      stack: error.stack,
    })
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Handler for refunded charges (revoke lifetime access if applicable)
async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  try {
    console.log('Processing charge.refunded:', charge.id)

    // Get customer and payment intent info
    const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

    if (!customerId || !paymentIntentId) {
      console.log('Missing customer or payment_intent on charge, skipping refund handling')
      return
    }

    // Retrieve PaymentIntent to access metadata
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    const plan = pi.metadata?.plan
    const userId = (pi.metadata?.user_id || pi.metadata?.userId || null) as string | null

    // Only revoke if it was a Lifetime purchase
    if (plan !== 'lifetime' || !userId) {
      console.log('Refund is not for a Lifetime purchase or missing user id, skipping')
      return
    }

    // Downgrade user to free plan
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        billing_interval: null,
        stripe_subscription_id: null,
        ended_at: new Date().toISOString(),
        last_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error downgrading user after refund:', updateError)
      return
    }

    // CRITICAL: Cascade cancellation to all household members bound to this lifetime subscription
    try {
      const { data: cascadeResult, error: cascadeError } = await supabase
        .rpc('cascade_subscription_cancellation', { p_owner_user_id: userId });

      if (cascadeError) {
        console.error('Error cascading lifetime refund cancellation to household members:', cascadeError);
      } else {
        console.log(`✅ Cascaded lifetime refund cancellation to ${cascadeResult} household members`);
      }
    } catch (error) {
      console.error('Unexpected error during lifetime refund cascade cancellation:', error);
    }

    // Notify user of revocation
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (userData) {
      const name = userData.full_name || ''
      const emailTemplate = subscriptionCanceledTemplate({
        name,
        planName: 'Lifetime',
        endDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        immediateCancel: true,
      })
      await sendUserEmail(userData.email, name, emailTemplate)
      console.log(`Refund revocation email sent to ${userData.email}`)
    }
  } catch (error) {
    console.error('Error in handleChargeRefunded:', {
      error: (error as any).message,
      stack: (error as any).stack,
    })
    throw error
  }
}

// Handler for successful payment intents (one-time payments like Lifetime)
// This provides additional verification layer for payment mode checkouts
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  try {
    console.log('Processing payment_intent.succeeded:', paymentIntent.id)
    
    // Only process one-time payments for lifetime (not invoices with subscriptions)
    const plan = paymentIntent.metadata?.plan
    const userId = paymentIntent.metadata?.user_id
    
    if (!plan || !userId) {
      console.log('No plan or user_id in payment_intent metadata, skipping')
      return
    }
    
    if (plan === 'lifetime') {
      console.log(`Payment intent for lifetime plan, user ${userId}`)
      
      // This is logged for monitoring - actual fulfillment should happen in checkout.session.completed
      // We don't create subscription here to avoid duplicates
      console.log('ℹ️  Lifetime payment confirmed - fulfillment handled by checkout.session.completed or invoice.payment_succeeded')
    }
  } catch (error) {
    console.error('Error in handlePaymentIntentSucceeded:', {
      paymentIntentId: paymentIntent.id,
      error: (error as any).message,
      stack: (error as any).stack,
    })
    // Don't throw - this is just for logging/monitoring
  }
}

// Helper function to safely extract product ID from price object
// Handles both string and expanded object formats
function getProductIdFromPrice(price: any): string | null {
  if (!price?.product) return null;
  return typeof price.product === 'string' ? price.product : price.product?.id || null;
}

// Handler for subscription created or updated events
// Helper function to get user by Stripe customer ID
async function getUserByCustomerId(customerId: string) {
  // Query user_stripe_mapping table to get user_id
  const { data: mappingData, error: mappingError } = await supabase
    .from('user_stripe_mapping')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  
  if (mappingError || !mappingData) {
    console.error('Error finding user mapping:', mappingError)
    return null
  }
  
  // Get user details
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('id', mappingData.user_id)
    .maybeSingle()
  
  if (userError) {
    console.error('Error finding user:', userError)
    return null
  }
  
  return userData
}

// Helper function to get plan name from product ID
async function getPlanNameFromProductId(productId) {
  if (!productId) return 'Premium'
  
  try {
    // Try to get product name from Stripe
    const product = await stripe.products.retrieve(productId)
    return product.name || 'Premium'
  } catch (error) {
    console.error('Error getting product name:', error)
    return 'Premium'
  }
}

// Helper function to create lifetime subscription payload
// Reduces code duplication for referral system and lifetime upgrades
function createLifetimeSubscriptionPayload(
  userId: string,
  customerId: string | null | undefined,
  eventId: string
) {
  return {
    user_id: userId,
    plan: 'lifetime' as const,
    status: 'active' as const,
    stripe_customer_id: customerId || `manual_lifetime_${userId}`,
    stripe_subscription_id: null,
    billing_interval: null,
    current_period_end: null,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    last_event_id: eventId,
    updated_at: new Date().toISOString(),
  }
}

// Handler for subscription created or updated events
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventId: string
) {
  try {
    console.log('Processing subscription update:', subscription.id)
    
    // Extract customer ID
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id
    
    if (!customerId) {
      console.error('No customer ID in subscription:', subscription.id)
      return
    }
    
    // Find user with this Stripe customer ID
    const user = await getUserByCustomerId(customerId)
    
    if (!user) {
      console.error('No user found with customer ID:', customerId)
      return
    }
    
    const userId = user.id
    
    // Extract subscription details - Read from metadata (snake_case per Stripe conventions)
    const status = subscription.status
    // Get current_period_end from subscription items (more reliable than subscription level)
    const itemPeriodEnd = subscription.items?.data?.[0]?.current_period_end
    const currentPeriodEnd = itemPeriodEnd && !isNaN(itemPeriodEnd)
      ? new Date(itemPeriodEnd * 1000).toISOString()
      : null
    const cancelAtPeriodEnd = subscription.cancel_at_period_end

    // HANDLE PAUSED STATUS - Log and preserve subscription data
    // NOTE: After fixing checkout to use 'create_invoice', paused status should be rare
    // If it occurs, preserve subscription data and don't auto-downgrade
    if (status === 'paused') {
      console.log(`⚠️ Subscription ${subscription.id} is paused - preserving subscription data`)

      // Check if subscription has active discount for monitoring
      const hasDiscount = subscription.discount || (subscription.discounts && subscription.discounts.length > 0)

      if (hasDiscount) {
        console.log(`🎫 Paused subscription has discount - checking if 100% off`)

        let isFullDiscount = false
        try {
          // CRITICAL: Re-retrieve subscription with expanded discounts to get full objects
          // The webhook event only contains discount IDs (di_*), not full objects
          // Per Stripe API 2025 docs: Use expand parameter to get discount objects with coupon data
          const expandedSubscription = await stripe.subscriptions.retrieve(
            subscription.id,
            { expand: ['discounts.coupon'] }
          )

          // Check subscription.discount (single discount object - deprecated but may exist)
          if (expandedSubscription.discount && typeof expandedSubscription.discount === 'object') {
            const coupon = expandedSubscription.discount.coupon
            if (typeof coupon === 'object' && coupon !== null) {
              isFullDiscount = coupon.percent_off === 100
              console.log(`Single discount detected: ${coupon.percent_off}% off (${coupon.id})`)
            }
          }

          // Check subscription.discounts array (current Stripe API standard)
          if (!isFullDiscount && expandedSubscription.discounts && Array.isArray(expandedSubscription.discounts)) {
            console.log(`Checking ${expandedSubscription.discounts.length} discount(s) in array`)
            
            for (const discountItem of expandedSubscription.discounts) {
              // After expansion, discountItem is a full Discount object with nested coupon
              if (typeof discountItem === 'object' && discountItem !== null) {
                const coupon = discountItem.coupon
                if (typeof coupon === 'object' && coupon !== null) {
                  const percentOff = coupon.percent_off || 0
                  console.log(`Discount ${discountItem.id}: ${percentOff}% off (coupon: ${coupon.id})`)
                  
                  if (percentOff === 100) {
                    isFullDiscount = true
                    console.log(`✅ Found 100% discount: ${coupon.id}`)
                    break
                  }
                } else {
                  console.log(`⚠️ Discount ${discountItem.id} has no expanded coupon`)
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching expanded subscription discounts:', error)
        }

        if (isFullDiscount) {
          console.log(`✅ 100% discount confirmed - user should maintain plan access`)
        } else {
          console.log(`⚠️ Partial discount or no 100% discount detected`)
        }
      } else {
        console.log(`⚠️ No discount found on paused subscription`)
      }

      // TEMPORARY FIX: Exit early to prevent paused status from being written to database
      // TODO: Remove this early return after fixing checkout flow to use payment collection 'charge_automatically'
      console.log(`🚨 EARLY EXIT: Paused status will NOT be written to database`)
      console.log(`   Existing subscription data preserved in database`)
      console.log(`   User: ${userId}, Stripe Sub ID: ${subscription.id}`)
      return
    }

    // Handle incomplete_expired and unpaid statuses - downgrade to free
    if (status === 'incomplete_expired' || status === 'unpaid') {
      console.log(`Subscription ${subscription.id} is ${status}, downgrading user to free plan`)

      const { error: downgradeError } = await supabase
        .from('subscriptions')
        .update({
          plan: 'free',
          status: status === 'incomplete_expired' ? 'canceled' : 'unpaid',
          stripe_subscription_id: null,
          ended_at: new Date().toISOString(),
          last_event_id: eventId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (downgradeError) {
        console.error('Error downgrading subscription:', downgradeError)
      } else {
        // CRITICAL: Cascade cancellation to all bound household members
        try {
          const { data: cascadeResult, error: cascadeError } = await supabase
            .rpc('cascade_subscription_cancellation', { p_owner_user_id: userId });

          if (cascadeError) {
            console.error('Error cascading downgrade to household members:', cascadeError);
          } else {
            console.log(`✅ Cascaded downgrade to ${cascadeResult} household members`);
          }
        } catch (error) {
          console.error('Unexpected error during downgrade cascade:', error);
        }
      }

      // Send email notification
      // Get plan name from subscription - use safe extraction
      const productId = subscription.items?.data?.length > 0
        ? getProductIdFromPrice(subscription.items.data[0]?.price)
        : null
      const planName = await getPlanNameFromProductId(productId)
      
      const emailTemplate = subscriptionCanceledTemplate({
        name: user.full_name || '',
        planName,
        endDate: null,
        immediateCancel: true,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      })

      await sendUserEmail(user.email, user.full_name || '', emailTemplate)
      console.log(`Downgrade notification sent to ${user.email}`)

      return
    }

    // Extract plan and interval from subscription metadata (set during checkout)
    const plan = (subscription.metadata?.plan || subscription.metadata?.user_plan || 'plus') as PlanType
    const billingInterval = (subscription.metadata?.billing_interval || 'monthly') as BillingInterval
    
    // Fallback: Try to determine from price ID if metadata is missing
    let finalPlan = plan
    let finalInterval = billingInterval
    
    if (!subscription.metadata?.plan) {
      const priceId = subscription.items.data[0]?.price?.id
      const planInfo = getPlanFromPriceId(priceId)
      if (planInfo) {
        finalPlan = planInfo.plan
        finalInterval = planInfo.interval
      }
    }
    
    // Extract trial information - handle null/undefined safely
    const trialStart = subscription.trial_start && !isNaN(subscription.trial_start)
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null
    const trialEnd = subscription.trial_end && !isNaN(subscription.trial_end)
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null
    
    // Get previous subscription data for change detection
    const { data: previousSub } = await supabase
      .from('subscriptions')
      .select('plan, billing_interval, status')
      .eq('user_id', userId)
      .maybeSingle()
    
    const previousPlan = previousSub?.plan as PlanType | null
    const previousInterval = previousSub?.billing_interval as BillingInterval | null
    
    console.log('Updating subscription for user:', userId, {
      plan: finalPlan,
      billingInterval: finalInterval,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      previousPlan,
      previousInterval,
    })
    
    // Upsert subscription data with enhanced fields
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          plan: finalPlan,
          billing_interval: finalInterval,
          status,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          trial_start: trialStart,
          trial_end: trialEnd,
          current_price_id: subscription.items.data[0]?.price?.id,
          previous_plan: previousPlan,
          previous_interval: previousInterval,
          last_event_id: eventId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    
    if (subscriptionError) {
      console.error('Error updating subscription in database:', subscriptionError)
      return
    }
    
    console.log('Subscription updated successfully for user:', userId)
    
    // CRITICAL: Cascade ALL subscription changes to bound household members
    // Bound members must stay in EXACT sync with owner's subscription lifecycle
    // This includes: active, trialing, past_due, etc.
    // Note: canceled/incomplete_expired/unpaid are handled separately above
    try {
      const { data: cascadeResult, error: cascadeError } = await supabase
        .rpc('cascade_subscription_upgrade', { 
          p_owner_user_id: userId,
          p_new_plan: finalPlan,
          p_new_status: status
        });

      if (cascadeError) {
        console.error('Error cascading subscription update to household members:', cascadeError);
      } else if (cascadeResult && cascadeResult > 0) {
        console.log(`✅ Cascaded subscription update to ${cascadeResult} household members (status: ${status})`);
      }
    } catch (error) {
      console.error('Unexpected error during subscription update cascade:', error);
    }
    
    // Prepare email notification - use safe extraction
    const productId = subscription.items?.data?.length > 0
      ? getProductIdFromPrice(subscription.items.data[0]?.price)
      : null
    const planName = await getPlanNameFromProductId(productId)
    // Reuse itemPeriodEnd from line 289 instead of redeclaring
    const endDate = itemPeriodEnd && !isNaN(itemPeriodEnd)
      ? new Intl.DateTimeFormat('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }).format(new Date(itemPeriodEnd * 1000))
      : 'N/A'
    
    // Determine if this is a new subscription or an update
    // A subscription is "new" if:
    // 1. It's active OR trialing (new subscriptions can start with either status) AND
    // 2. There was no previous subscription record (previousSub is null)
    const isNew = (subscription.status === 'active' || subscription.status === 'trialing') && !previousSub
    
    const name = user.full_name || ''
    
    if (isNew) {
      // Send welcome email for new subscriptions
      const isLifetime = finalPlan === 'lifetime'
      const emailTemplate = subscriptionCreatedTemplate({
        name,
        planName,
        endDate: isLifetime ? undefined : endDate, // Lifetime has no end date
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        isLifetime
      })

      await sendUserEmail(user.email, name, emailTemplate)
      console.log(`Welcome email sent to ${user.email}`)
    } else if (cancelAtPeriodEnd && previousSub?.status === 'active') {
      // User scheduled cancellation - send cancellation confirmation
      // but tell them they have access until period end
      const emailTemplate = subscriptionCanceledTemplate({
        name,
        planName,
        endDate, // Show when access will end
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        immediateCancel: false, // They keep access until period end
      })
      
      await sendUserEmail(user.email, name, emailTemplate)
      console.log(`Scheduled cancellation email sent to ${user.email}`)
    } else if (previousPlan && (previousPlan !== finalPlan || previousInterval !== finalInterval)) {
      // Send update email for plan changes or billing interval changes
      const changeType = getChangeType(
        previousPlan, 
        finalPlan,
        previousInterval || undefined,
        finalInterval
      )
      
      const emailTemplate = subscriptionUpdatedTemplate({
        name,
        planName,
        endDate,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        changeType
      })
      
      await sendUserEmail(user.email, name, emailTemplate)
      console.log(`Subscription ${changeType} email sent to ${user.email}`)
    }
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    })
    throw error // Re-throw to be caught by webhook handler
  }
}

// Handler for subscription deleted events
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventId: string) {
  try {
    console.log('Processing subscription deletion:', subscription.id)
    
    // Get customer ID
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
    
    if (!customerId) {
      console.error('No customer ID in subscription:', subscription.id)
      return
    }
    
    // Find user by customer ID
    const user = await getUserByCustomerId(customerId);
    
    // Find the subscription in our database
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle()
    
    if (subError) {
      console.error('Error finding subscription:', subError)
      return
    }
    
    if (!subData || !subData.user_id) {
      console.error('No subscription found with ID:', subscription.id)
      return
    }
    
    const userId = subData.user_id
    
    console.log('Downgrading user to free plan:', userId)
    
    // CRITICAL FIX: Reset to free plan when subscription is deleted
    // According to Stripe best practices: when subscription is deleted, revoke access
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan: 'free', // Reset to free plan
        status: 'canceled',
        billing_interval: null, // Clear billing interval
        stripe_subscription_id: null, // Clear stripe subscription ID
        ended_at: new Date().toISOString(), // Mark when it ended
        last_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('Error updating subscription status:', updateError)
    } else {
      console.log('User downgraded to free plan:', userId)
      
      // CRITICAL: Cascade cancellation to all household members bound to this subscription
      try {
        const { data: cascadeResult, error: cascadeError } = await supabase
          .rpc('cascade_subscription_cancellation', { p_owner_user_id: userId });

        if (cascadeError) {
          console.error('Error cascading subscription cancellation to household members:', cascadeError);
        } else {
          console.log(`✅ Cascaded cancellation to ${cascadeResult} household members`);
        }
      } catch (error) {
        console.error('Unexpected error during cascade cancellation:', error);
      }
      
      // Send cancellation email if we have user info
      if (user) {
        // Use safe extraction for product ID
        const planId = subscription.items?.data?.length > 0
          ? getProductIdFromPrice(subscription.items.data[0]?.price)
          : null;
        
        const planName = await getPlanNameFromProductId(planId);
        const name = user.full_name || '';
        
        // subscription.deleted means the subscription has already ended
        // Access is revoked immediately when this event fires
        // Show when it ended using ended_at timestamp
        const endedAt = subscription.ended_at;
        const endDate = endedAt && !isNaN(endedAt)
          ? new Intl.DateTimeFormat('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }).format(new Date(endedAt * 1000))
          : null;
        
        const emailTemplate = subscriptionCanceledTemplate({
          name,
          planName,
          endDate,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
          immediateCancel: true, // subscription.deleted always means immediate end
        });
        
        await sendUserEmail(user.email, name, emailTemplate);
        console.log(`Subscription cancellation email sent to ${user.email}`);
      }
    }
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    })
    throw error // Re-throw to be caught by webhook handler
  }
}

// Handler for successful invoice payments
// CRITICAL: Send invoice receipt email with PDF to customer
// HANDLES BOTH: Recurring subscription invoices AND one-time payment invoices (lifetime)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
  try {
    console.log('Processing successful payment for invoice:', invoice.id)
    
    // Process RECURRING subscription invoices
    if (invoice.subscription) {
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription.id
      
      // Get the subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      // Update subscription in our database
      await handleSubscriptionUpdated(subscription, eventId)
      
      // SEND INVOICE RECEIPT EMAIL WITH PDF
      // Get customer ID safely
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id
      
      if (!customerId) {
        console.error('No customer ID in invoice:', invoice.id)
        return
      }
      
      // Get user details
      const user = await getUserByCustomerId(customerId)
      
      if (!user) {
        console.error('No user found for customer:', customerId)
        return
      }
      
      // Get plan name from invoice line items - use safe extraction
      const productId = invoice.lines?.data?.length > 0
        ? getProductIdFromPrice(invoice.lines.data[0]?.price)
        : null
      const planName = await getPlanNameFromProductId(productId)
      
      // Format payment date
      const paymentDate = invoice.status_transitions?.paid_at && !isNaN(invoice.status_transitions.paid_at)
        ? new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(new Date(invoice.status_transitions.paid_at * 1000))
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
      
      // Prepare invoice receipt email with PDF
      const emailTemplate = invoicePaymentSucceededTemplate({
        name: user.full_name || '',
        planName,
        amount: (invoice.amount_paid / 100).toFixed(2),
        currency: invoice.currency.toUpperCase(),
        invoiceNumber: invoice.number || invoice.id,
        paymentDate,
        invoiceUrl: invoice.hosted_invoice_url || `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        invoicePdfUrl: invoice.invoice_pdf || undefined,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      })
      
      await sendUserEmail(user.email, user.full_name || '', emailTemplate)
      console.log(`Invoice receipt email sent to ${user.email} with PDF link`)
    } else {
      // CRITICAL: Handle ONE-TIME invoices (e.g., Lifetime), including manual $0 invoices with discounts
      // invoice.subscription === null. This is a backup/verification path for Checkout mode=payment
      console.log('Processing one-time payment invoice (no subscription):', invoice.id)

      // Get customer and mapped user
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

      if (!customerId) {
        console.error('No customer ID in one-time payment invoice:', invoice.id)
        return
      }

      const user = await getUserByCustomerId(customerId)
      const mappedUserId = user?.id as string | undefined

      // Try to determine plan and user by multiple fallbacks
      // 1) PaymentIntent metadata (preferred when present)
      const paymentIntentId = typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id

      let determinedPlan: PlanType | null = null
      let determinedUserId: string | null = null

      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
          const piPlan = paymentIntent.metadata?.plan as PlanType | undefined
          const piUserId = paymentIntent.metadata?.user_id as string | undefined
          if (piPlan) determinedPlan = piPlan
          if (piUserId) determinedUserId = piUserId
        } catch (piErr) {
          console.error('Error retrieving payment_intent metadata:', piErr)
        }
      }

      // 2) Invoice metadata fallback (plan)
      if (!determinedPlan && (invoice as any).metadata?.plan) {
        determinedPlan = ((invoice as any).metadata.plan as string) as PlanType
      }

      // 2b) Invoice metadata fallback (user id)
      if (!determinedUserId && (invoice as any).metadata) {
        const meta: any = (invoice as any).metadata
        if (meta.user_id || meta.userId) {
          determinedUserId = (meta.user_id || meta.userId) as string
        }
      }

      // 3) Price ID mapping from invoice lines
      if (!determinedPlan && invoice.lines?.data?.length) {
        const lineAny: any = invoice.lines.data[0]
        const priceId = lineAny?.price?.id || lineAny?.pricing?.price_details?.price
        if (priceId) {
          const planInfo = getPlanFromPriceId(priceId)
          if (planInfo?.plan) {
            determinedPlan = planInfo.plan
          }
        }
      }

      // 4) Product name heuristic (last resort)
      if (!determinedPlan && invoice.lines?.data?.length) {
        const productId = getProductIdFromPrice(invoice.lines.data[0]?.price)
        if (productId) {
          try {
            const product = await stripe.products.retrieve(productId)
            if (product?.name && /lifetime/i.test(product.name)) {
              determinedPlan = 'lifetime'
            }
          } catch (prodErr) {
            console.error('Error retrieving product for invoice line:', prodErr)
          }
        }
      }

      // Resolve userId: prefer PI metadata, else mapped user from customer
      const userId = determinedUserId || mappedUserId

      if (!determinedPlan) {
        console.log('One-time invoice without determinable plan; skipping fulfillment', {
          invoiceId: invoice.id,
          hasPaymentIntent: !!paymentIntentId,
          linePriceId: invoice.lines?.data?.[0]?.price?.id || null,
        })
        return
      }

      if (!userId) {
        console.error('Cannot fulfill one-time invoice: user not resolved from customer mapping or metadata', {
          invoiceId: invoice.id,
          customerId,
        })
        return
      }

      // Only fulfill one-time Lifetime. Recurring plans must come via subscriptions
      if (determinedPlan === 'lifetime') {
        // Note: invoice.amount_paid can be 0 (100% discount). Stripe marks status=paid; honor that.
        console.log(`ONE-TIME LIFETIME FULFILLMENT: user=${userId}, invoice=${invoice.id}, amount_paid=${invoice.amount_paid}`)

        // Referral sidecar: Handle referrer upgrade for referral acceptances
        try {
          let refProcessed = false
          const paymentIntentId = typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : invoice.payment_intent?.id
          
          if (paymentIntentId) {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
            const checkoutType = (pi.metadata?.checkout_type as string) || ''
            const referralCodeId = pi.metadata?.referral_code_id as string | undefined
            const referrerUserId = pi.metadata?.referrer_user_id as string | undefined
            const refereeUserId = pi.metadata?.referee_user_id as string | undefined
            
            if (checkoutType === 'referral_acceptance' && referralCodeId && referrerUserId && refereeUserId) {
              console.log('Referral acceptance detected via metadata')
              
              // Idempotency: Check if already completed
              const { data: existingAcceptance } = await supabase
                .from('referral_acceptances')
                .select('status')
                .eq('referral_code_id', referralCodeId)
                .eq('referee_user_id', refereeUserId)
                .maybeSingle()

              if (!existingAcceptance || existingAcceptance.status !== 'completed') {
                // Upgrade referrer to lifetime via upsert (creates row if missing)
                const { data: referrerOldSub } = await supabase
                  .from('subscriptions')
                  .select('stripe_subscription_id, plan')
                  .eq('user_id', referrerUserId)
                  .maybeSingle()

                const { data: referrerMapping } = await supabase
                  .from('user_stripe_mapping')
                  .select('stripe_customer_id')
                  .eq('user_id', referrerUserId)
                  .maybeSingle()

                // Cancel any old subscription FIRST (to match manual lifetime upgrade behavior)
                const oldId = referrerOldSub?.stripe_subscription_id
                if (oldId && oldId !== 'null' && oldId.startsWith('sub_')) {
                  try {
                    await stripe.subscriptions.cancel(oldId, { prorate: false })
                  } catch (cancelErr) {
                    console.error('Warning: Could not cancel referrer old sub:', (cancelErr as any)?.message)
                  }
                }

                // Wait 5 seconds to let Stripe process cancellation/webhooks
                await new Promise((resolve) => setTimeout(resolve, 5000))

                // Then upsert referrer to lifetime
                const referrerLifetimeData = createLifetimeSubscriptionPayload(
                  referrerUserId,
                  referrerMapping?.stripe_customer_id,
                  eventId
                )

                const { error: referrerUpsertError } = await supabase
                  .from('subscriptions')
                  .upsert(referrerLifetimeData, { onConflict: 'user_id', ignoreDuplicates: false })

                if (referrerUpsertError) {
                  console.error('Error upserting referrer lifetime:', referrerUpsertError)
                } else {
                  console.log('Referrer upgraded to lifetime')
                }

                // Mark acceptance as completed
                await supabase
                  .from('referral_acceptances')
                  .upsert({
                    referral_code_id: referralCodeId,
                    referrer_user_id: referrerUserId,
                    referee_user_id: refereeUserId,
                    referral_code_text: (pi.metadata?.referral_code as string) || '',
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    stripe_checkout_session_id: null,
                  }, { onConflict: 'referee_user_id,referral_code_id' })

                // Send email to referrer
                const { data: referrerUser } = await supabase
                  .from('users')
                  .select('email, full_name')
                  .eq('id', referrerUserId)
                  .single()
                const { data: refereeUser } = await supabase
                  .from('users')
                  .select('full_name')
                  .eq('id', refereeUserId)
                  .single()
                if (referrerUser) {
                  const template = referralAcceptedTemplate({
                    referrerName: referrerUser.full_name || 'there',
                    refereeName: refereeUser?.full_name || 'A friend',
                  })
                  await sendUserEmail(referrerUser.email, referrerUser.full_name || '', template)
                }
                refProcessed = true
              }
            }
          }

          // Fallback: If metadata missing, check DB for pending acceptance
          if (!refProcessed) {
            const { data: pendingAcceptance } = await supabase
              .from('referral_acceptances')
              .select('referral_code_id, referrer_user_id, referee_user_id, status')
              .eq('referee_user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (pendingAcceptance && pendingAcceptance.status !== 'completed') {
              const referralCodeId = pendingAcceptance.referral_code_id
              const referrerUserId = pendingAcceptance.referrer_user_id
              const refereeUserId = pendingAcceptance.referee_user_id

              const { data: referrerOldSub } = await supabase
                .from('subscriptions')
                .select('stripe_subscription_id, plan')
                .eq('user_id', referrerUserId)
                .maybeSingle()

              const { data: referrerMapping } = await supabase
                .from('user_stripe_mapping')
                .select('stripe_customer_id')
                .eq('user_id', referrerUserId)
                .maybeSingle()

              // Cancel old subscription FIRST (if any)
              const oldId = referrerOldSub?.stripe_subscription_id
              if (oldId && oldId !== 'null' && oldId.startsWith('sub_')) {
                try {
                  await stripe.subscriptions.cancel(oldId, { prorate: false })
                } catch (cancelErr) {
                  console.error('Warning: Could not cancel referrer old sub:', (cancelErr as any)?.message)
                }
              }

              // Wait 5 seconds to let Stripe process cancellation/webhooks
              await new Promise((resolve) => setTimeout(resolve, 5000))

              // Then upsert referrer to lifetime
              const referrerLifetimeData = createLifetimeSubscriptionPayload(
                referrerUserId,
                referrerMapping?.stripe_customer_id,
                eventId
              )

              const { error: referrerUpsertError } = await supabase
                .from('subscriptions')
                .upsert(referrerLifetimeData, { onConflict: 'user_id', ignoreDuplicates: false })

              if (referrerUpsertError) {
                console.error('Error upserting referrer lifetime (fallback):', referrerUpsertError)
              }

              await supabase
                .from('referral_acceptances')
                .upsert({
                  referral_code_id: referralCodeId,
                  referrer_user_id: referrerUserId,
                  referee_user_id: refereeUserId,
                  referral_code_text: '',
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  stripe_checkout_session_id: null,
                }, { onConflict: 'referee_user_id,referral_code_id' })

              const { data: referrerUser } = await supabase
                .from('users')
                .select('email, full_name')
                .eq('id', referrerUserId)
                .single()
              const { data: refereeUser } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', refereeUserId)
                .single()
              if (referrerUser) {
                const template = referralAcceptedTemplate({
                  referrerName: referrerUser.full_name || 'there',
                  refereeName: refereeUser?.full_name || 'A friend',
                })
                await sendUserEmail(referrerUser.email, referrerUser.full_name || '', template)
              }
            }
          }
        } catch (sidecarErr) {
          console.error('Referral sidecar error:', (sidecarErr as any)?.message || sidecarErr)
        }

        // Check existing sub
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', userId)
          .maybeSingle()

        const payerAlreadyLifetime = existingSub?.plan === 'lifetime' && existingSub?.status === 'active'
        if (payerAlreadyLifetime) {
          console.log(`✅ User ${userId} already has active lifetime subscription`)
          // Do not return here — still need to process inviter (referrer) sidecar flow
        }

        if (!payerAlreadyLifetime) {
          const lifetimeData = {
            user_id: userId,
            plan: 'lifetime',
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            billing_interval: null,
            current_period_end: null,
            cancel_at_period_end: false,
            trial_start: null,
            trial_end: null,
            last_event_id: `invoice_${eventId}`,
            updated_at: new Date().toISOString(),
          }

          const { error: upsertError } = await supabase
            .from('subscriptions')
            .upsert(lifetimeData, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            })

          if (upsertError) {
            console.error('CRITICAL: Lifetime fulfillment upsert failed:', upsertError)
            throw upsertError
          }

          // Send confirmation email to payer
          const { data: userData } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .single()

          if (userData) {
            const emailTemplate = subscriptionCreatedTemplate({
              name: userData.full_name || '',
              planName: 'Lifetime',
              dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
              isLifetime: true
            })
            await sendUserEmail(userData.email, userData.full_name || '', emailTemplate)
          }
        }
      } else {
        // Safety: do not create recurring subscriptions from manual invoices without subscription ID
        console.log('One-time invoice maps to non-lifetime plan; skipping DB subscription creation', {
          invoiceId: invoice.id,
          plan: determinedPlan,
        })
      }
    }
  } catch (error) {
    console.error('Error in handleInvoicePaymentSucceeded:', {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    })
    throw error // Re-throw to be caught by webhook handler
  }
}

// Handler for failed invoice payments
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Processing failed payment for invoice:', invoice.id)
    
    // Only process subscription invoices
    if (invoice.subscription) {
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription.id
      
      // Find user with this subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()
      
      if (subError) {
        console.error('Error finding subscription:', subError)
        return
      }
      
      if (!subData || !subData.user_id) {
        console.error('No subscription found with ID:', subscriptionId)
        return
      }
      
      const userId = subData.user_id
      
      console.log('Updating subscription status to past_due for user:', userId)
      
      // Update subscription status to past_due
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      
      if (updateError) {
        console.error('Error updating subscription status:', updateError)
        return
      }
      
      console.log('Subscription marked as past_due for user:', userId)
      
      // Get user details for email
      const { data: userData } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single()
        
      if (userData) {
        // Get plan details - use safe extraction
        let planName = 'Premium'
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        if (subscription.items?.data?.length > 0) {
          const productId = getProductIdFromPrice(subscription.items.data[0]?.price)
          planName = await getPlanNameFromProductId(productId)
        }
        
        const name = userData.full_name || ''
        
        // Send payment failure email with downgrade notification
        // User will be downgraded when subscription status changes to unpaid/incomplete_expired
        const emailTemplate = paymentFailedTemplate({
          name,
          planName,
          dashboardUrl: 'https://moneko.io/dashboard/user-settings/membership',
          updatePaymentUrl: 'https://moneko.io/dashboard/user-settings/membership',
          isDowngraded: true, // Indicate user will be/has been downgraded
          resubscribeUrl: 'https://moneko.io/dashboard/user-settings/membership', // CTA for resubscription
        })
        
        await sendUserEmail(userData.email, name, emailTemplate)
        console.log(`💳 Payment failure with downgrade notification sent to ${userData.email}`)
      }
    }
  } catch (error) {
    console.error('Error in handleInvoicePaymentFailed:', {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    })
    throw error // Re-throw to be caught by webhook handler
  }
}

// Handler for invoice payment action required (3DS authentication)
async function handleInvoicePaymentActionRequired(invoice: Stripe.Invoice) {
  try {
    console.log('Processing payment action required for invoice:', invoice.id)
    
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id
    
    if (!customerId) {
      console.error('No customer ID in invoice:', invoice.id)
      return
    }
    
    const user = await getUserByCustomerId(customerId)
    
    if (!user) {
      console.error('No user found for customer:', customerId)
      return
    }
    
    // Get user data for personalized email
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('Could not fetch user data for payment action required email')
      return
    }

    const name = userData.full_name || 'there'
    
    // Get plan name from invoice - use safe extraction
    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromPrice(invoice.lines.data[0]?.price)
      : null
    const planName = await getPlanNameFromProductId(productId)
    
    // Send 3DS authentication required email
    console.log(`Payment requires authentication for ${userData.email}`)
    console.log(`Invoice hosted page: ${invoice.hosted_invoice_url}`)
    
    const emailTemplate = paymentActionRequiredTemplate({
      name,
      planName,
      amount: (invoice.amount_due / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
      authenticationUrl: invoice.hosted_invoice_url || `${DASHBOARD_URL}/dashboard/user-settings/membership?tab=payment`,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
    })

    await sendUserEmail(userData.email, name, emailTemplate)
    console.log(`Payment action required email sent to ${userData.email}`)
    
  } catch (error) {
    console.error('Error in handleInvoicePaymentActionRequired:', {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for trial ending notification
async function handleSubscriptionTrialEnding(subscription: Stripe.Subscription) {
  try {
    console.log('Processing trial ending for subscription:', subscription.id)
    
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id
    
    if (!customerId) {
      console.error('No customer ID in subscription:', subscription.id)
      return
    }
    
    const user = await getUserByCustomerId(customerId)
    
    if (!user) {
      console.error('No user found for customer:', customerId)
      return
    }
    
    // Get plan details - use safe extraction
    let planName = 'Premium'
    if (subscription.items?.data?.length > 0) {
      const productId = getProductIdFromPrice(subscription.items.data[0]?.price)
      planName = await getPlanNameFromProductId(productId)
    }
    
    const trialEndDate = subscription.trial_end && !isNaN(subscription.trial_end)
      ? new Intl.DateTimeFormat('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }).format(new Date(subscription.trial_end * 1000))
      : 'N/A'
    
    // Send trial ending email
    const name = user.full_name || ''
    const emailTemplate = trialEndingTemplate({
      name,
      planName,
      trialEndDate,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`
    })
    
    await sendUserEmail(user.email, name, emailTemplate)
    console.log(`Trial ending email sent to ${user.email}`)
    
  } catch (error) {
    console.error('Error in handleSubscriptionTrialEnding:', {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    })
    throw error // Re-throw to be caught by webhook handler
  }
}

// Handler for checkout session completed (CRITICAL for immediate access)
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  try {
    console.log('Processing checkout session completed:', session.id)
    
    // Resolve user ID from session metadata/client_reference_id; fallback to PaymentIntent metadata
    let userId: string | undefined = (session.metadata?.user_id || (session.metadata as any)?.userId || session.client_reference_id) as string | undefined
    if (!userId && session.payment_intent) {
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
        userId = (pi.metadata?.user_id || (pi.metadata as any)?.userId) as string | undefined
      } catch (e) {
        console.error('Error retrieving PaymentIntent for user_id fallback:', (e as any)?.message || e)
      }
    }
    if (!userId) {
      console.error('No user ID in checkout session (and PI fallback failed):', session.id)
      return
    }
    
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id
    
    if (!customerId) {
      console.error('No customer ID in checkout session:', session.id)
      return
    }
    
    // Update user's customer ID if not set
    await supabase
      .from('user_stripe_mapping')
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId
      }, {
        onConflict: 'user_id'
      })

    // For subscriptions, the customer.subscription.created event will handle the subscription
    // For one-time payments (Lifetime), handle fulfillment here
    if (session.mode === 'subscription') {
      console.log('Subscription checkout completed, subscription will be created via webhook')
    } else if (session.mode === 'payment') {
      console.log('One-time payment completed:', session.id)

      // LIFETIME PLAN: Create subscription record with special handling
      // Resolve plan from session metadata; fallback to PaymentIntent metadata
      let plan: string | undefined = session.metadata?.plan as string | undefined
      if (!plan && session.payment_intent) {
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
          plan = pi.metadata?.plan as string | undefined
          // Also backfill userId if still missing (defensive)
          if (!userId) {
            userId = (pi.metadata?.user_id || (pi.metadata as any)?.userId) as string | undefined
          }
        } catch (e) {
          console.error('Error retrieving PaymentIntent for plan fallback:', (e as any)?.message || e)
        }
      }
      
      if (!plan) {
        console.error('CRITICAL: Payment mode checkout without plan metadata!', {
          sessionId: session.id,
          userId,
          customerId,
          metadata: session.metadata,
        })
        throw new Error('Invalid checkout session: payment mode requires plan metadata')
      }

      if (plan === 'lifetime') {
        console.log('Processing Lifetime plan purchase for user:', userId)

        // CRITICAL: Fetch old subscription ID BEFORE upserting lifetime
        // We need to cancel any existing Stripe subscription when user upgrades to lifetime
        const { data: oldSubData } = await supabase
          .from('subscriptions')
          .select('stripe_subscription_id, plan, status')
          .eq('user_id', userId)
          .maybeSingle()

        const oldStripeSubscriptionId = oldSubData?.stripe_subscription_id
        console.log('Existing subscription before lifetime upgrade:', {
          oldPlan: oldSubData?.plan,
          oldStatus: oldSubData?.status,
          oldSubscriptionId: oldStripeSubscriptionId,
        })

        // Create or update subscription record for Lifetime plan
        // Use helper function to create consistent lifetime payload
        const lifetimeSubscriptionData = createLifetimeSubscriptionPayload(
          userId,
          customerId,
          eventId
        )

        console.log('Upserting Lifetime subscription with data:', lifetimeSubscriptionData)

        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert(lifetimeSubscriptionData, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })

        if (upsertError) {
          console.error('Error creating Lifetime subscription:', {
            error: upsertError,
            userId,
            customerId,
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint
          })
          throw upsertError
        }

        console.log('✅ Lifetime subscription created successfully for user:', userId)

        // REFERRAL HANDLING: Check if this is a referral acceptance
        const checkoutType = session.metadata?.checkout_type as string | undefined
        const referralCodeId = session.metadata?.referral_code_id as string | undefined
        const referrerUserId = session.metadata?.referrer_user_id as string | undefined
        const refereeUserId = session.metadata?.referee_user_id as string | undefined

        if (checkoutType === 'referral_acceptance' && referralCodeId && referrerUserId && refereeUserId) {
          console.log('Referral acceptance detected in checkout')

          // Idempotency check
          const { data: existingAcceptance } = await supabase
            .from('referral_acceptances')
            .select('status')
            .eq('referral_code_id', referralCodeId)
            .eq('referee_user_id', refereeUserId)
            .maybeSingle()

          if (existingAcceptance && existingAcceptance.status === 'completed') {
            console.log('Referral already processed, skipping')
          } else {
            try {
            // Upgrade referrer to lifetime
            const { data: referrerOldSub } = await supabase
              .from('subscriptions')
              .select('stripe_subscription_id, plan')
              .eq('user_id', referrerUserId)
              .maybeSingle()

            const referrerOldStripeSubId = referrerOldSub?.stripe_subscription_id

            // Get referrer's Stripe customer ID
            const { data: referrerMapping } = await supabase
              .from('user_stripe_mapping')
              .select('stripe_customer_id')
              .eq('user_id', referrerUserId)
              .maybeSingle()

            // Use helper function to create consistent lifetime payload
            // Cancel referrer's Stripe subscription FIRST (if any)
            if (referrerOldStripeSubId && referrerOldStripeSubId !== 'null' && referrerOldStripeSubId.startsWith('sub_')) {
              try {
                await stripe.subscriptions.cancel(referrerOldStripeSubId, { prorate: false })
              } catch (cancelError) {
                console.error(`Warning: Could not cancel referrer's old subscription:`, (cancelError as any)?.message)
              }
            }

            // Wait 5 seconds to let Stripe process cancellation/webhooks
            await new Promise((resolve) => setTimeout(resolve, 5000))

            // Then upsert referrer to lifetime
            const referrerLifetimeData = createLifetimeSubscriptionPayload(
              referrerUserId,
              referrerMapping?.stripe_customer_id,
              eventId
            )

            const { error: referrerUpgradeError } = await supabase
              .from('subscriptions')
              .upsert(referrerLifetimeData, {
                onConflict: 'user_id',
                ignoreDuplicates: false,
              })

            if (referrerUpgradeError) {
              console.error('Error upgrading referrer to lifetime:', referrerUpgradeError)
            }

            // Mark referral acceptance as completed
            await supabase
              .from('referral_acceptances')
              .upsert({
                referral_code_id: referralCodeId,
                referrer_user_id: referrerUserId,
                referee_user_id: refereeUserId,
                referral_code_text: (session.metadata?.referral_code as string) || '',
                status: 'completed',
                completed_at: new Date().toISOString(),
                stripe_checkout_session_id: session.id,
              }, { onConflict: 'referee_user_id,referral_code_id' })

            // Send email to referrer
            const { data: referrerData } = await supabase
              .from('users')
              .select('email, full_name')
              .eq('id', referrerUserId)
              .single()

            const { data: refereeData } = await supabase
              .from('users')
              .select('email, full_name')
              .eq('id', refereeUserId)
              .single()

            if (referrerData) {
              const template = referralAcceptedTemplate({
                referrerName: referrerData.full_name || 'there',
                refereeName: refereeData?.full_name || 'A friend',
              })
              await sendUserEmail(referrerData.email, referrerData.full_name || '', template)
            }
            } catch (referralError) {
              console.error('Error processing referral:', (referralError as any)?.message || referralError)
              // Don't throw - referee's lifetime is already granted
            }
          }
        }

        // CRITICAL FIX: Cancel the old Stripe subscription to prevent webhook conflicts
        // If user had an active trial/paid subscription, it must be canceled immediately
        if (oldStripeSubscriptionId && oldStripeSubscriptionId !== 'null' && oldStripeSubscriptionId.startsWith('sub_')) {
          console.log(`🔄 Canceling old subscription ${oldStripeSubscriptionId} for user ${userId} (upgraded to lifetime)`)
          
          try {
            // Cancel immediately (user already paid for lifetime)
            await stripe.subscriptions.cancel(oldStripeSubscriptionId, {
              prorate: false, // Don't prorate, they already paid for lifetime
            })
            console.log(`✅ Old subscription ${oldStripeSubscriptionId} canceled successfully`)
          } catch (cancelError) {
            // Log but don't throw - lifetime is already granted
            console.error(`⚠️  Warning: Could not cancel old subscription ${oldStripeSubscriptionId}:`, {
              error: cancelError.message,
              code: cancelError.code,
            })
            console.log('   User still has lifetime access. Admin should manually cancel subscription in Stripe.')
          }
        } else {
          console.log('ℹ️  No existing Stripe subscription to cancel (user may have been on free plan or first purchase)')
        }

        // Get user details for welcome email
        const { data: userData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (userData) {
          // Send Lifetime purchase confirmation email
          const name = userData.full_name || ''
          const emailTemplate = subscriptionCreatedTemplate({
            name,
            planName: 'Lifetime',
            dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
            isLifetime: true // No end date, permanent access
          })

          await sendUserEmail(userData.email, name, emailTemplate)
          console.log(`Lifetime confirmation email sent to ${userData.email}`)
        }
      } else {
        // CRITICAL ERROR: Payment mode used for non-lifetime plan
        console.error('CRITICAL: Payment mode checkout with non-lifetime plan!', {
          sessionId: session.id,
          userId,
          customerId,
          plan,
          metadata: session.metadata,
        })
        
        // Log to help debug why this happened
        console.error('This should never happen! Payment mode should only be used for lifetime plans.')
        console.error('User paid but subscription was not created. Manual intervention required!')
        
        // Still process as best we can - treat as lifetime to avoid user losing money
        console.log('FALLBACK: Treating as lifetime to prevent user from losing payment')
        
        // Send alert email or log to monitoring system here
        // For now, we'll just throw an error after logging
        throw new Error(`Invalid payment mode checkout: plan="${plan}" should be "lifetime"`)
      }
    }
    
  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', {
      sessionId: session.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for async payment failures
async function handleCheckoutSessionAsyncPaymentFailed(
  session: Stripe.Checkout.Session
) {
  try {
    console.log('Processing async payment failure for session:', session.id)
    
    const userId = session.metadata?.user_id || session.client_reference_id
    
    if (!userId) {
      console.error('No user ID in checkout session:', session.id)
      return
    }
    
    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()
    
    if (userData) {
      // Send async payment failure email
      const name = userData.full_name || ''
      const emailTemplate = paymentFailedTemplate({
        name,
        planName: session.metadata?.plan || 'Premium',
        dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
        updatePaymentUrl: `${DASHBOARD_URL}/checkout?plan=${session.metadata?.plan}`
      })
      
      await sendUserEmail(userData.email, name, emailTemplate)
      console.log(`Async payment failure email sent to ${userData.email}`)
    }
    
  } catch (error) {
    console.error('Error in handleCheckoutSessionAsyncPaymentFailed:', {
      sessionId: session.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for invoice finalized (send invoice copy)
async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  try {
    console.log('Processing finalized invoice:', invoice.id)
    
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id
    
    if (!customerId) {
      console.error('No customer ID in invoice:', invoice.id)
      return
    }
    
    const user = await getUserByCustomerId(customerId)
    
    if (!user) {
      console.error('No user found for customer:', customerId)
      return
    }
    
    // Get user data for personalized email
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('Could not fetch user data for invoice email')
      return
    }

    const name = userData.full_name || 'there'
    
    // Get plan name from subscription - use safe extraction
    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromPrice(invoice.lines.data[0]?.price)
      : null
    const planName = await getPlanNameFromProductId(productId)
    
    const emailTemplate = invoiceFinalizedTemplate({
      name,
      planName,
      amount: (invoice.amount_due / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
      invoiceUrl: invoice.hosted_invoice_url || '#',
      invoicePdfUrl: invoice.invoice_pdf || undefined,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toLocaleDateString() : undefined,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
    })

    await sendUserEmail(userData.email, name, emailTemplate)
    console.log(`Invoice finalized email sent to ${userData.email}`)
    
  } catch (error) {
    console.error('Error in handleInvoiceFinalized:', {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for upcoming invoice (renewal reminder)
async function handleInvoiceUpcoming(invoice: Stripe.Invoice) {
  try {
    console.log('Processing upcoming invoice:', invoice.id)
    
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id
    
    if (!customerId) {
      console.error('No customer ID in invoice:', invoice.id)
      return
    }
    
    const user = await getUserByCustomerId(customerId)
    
    if (!user) {
      console.error('No user found for customer:', customerId)
      return
    }
    
    // Calculate days until charge
    const chargeDate = new Date(invoice.next_payment_attempt * 1000)
    const now = new Date()
    const daysUntil = Math.ceil((chargeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // === DISCOUNT EXPIRATION DETECTION (2025 Stripe API) ===
    // Check if this invoice has active discounts but no payment method
    // Using correct 2025 property names: invoice.discounts (array), invoice.total_discount_amounts
    const hasActiveDiscount = (invoice.discounts && invoice.discounts.length > 0) || 
                             (invoice.total_discount_amounts && invoice.total_discount_amounts.length > 0)
    
    // Check if customer has payment method - need to check both invoice and customer
    // Per 2025 Stripe docs: invoice.default_payment_method can be null even if customer has one
    let hasPaymentMethod = !!invoice.default_payment_method
    
    if (!hasPaymentMethod) {
      // Double-check customer's default payment method (more reliable)
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        hasPaymentMethod = !!(customer.invoice_settings?.default_payment_method)
      } catch (err) {
        console.error('Error retrieving customer for payment method check:', err)
      }
    }
    
    // PROMOTIONAL DISCOUNT EXPIRING SCENARIO
    // If discount is active but no payment method, user will be charged and fail
    // Send proactive reminder emails at key intervals
    if (hasActiveDiscount && !hasPaymentMethod) {
      console.log(`🎫 Discount expiring scenario for ${user.email}: discount active but no payment method`)
      console.log(`   Days until charge: ${daysUntil}`)
      
      // Only send reminders at specific intervals: 30, 14, 7, 3 days before expiry
      const reminderDays = [30, 14, 7, 3]
      if (!reminderDays.includes(daysUntil)) {
        console.log(`   Not a reminder day (${daysUntil} days), skipping discount expiration email`)
        return
      }
      
      console.log(`📧 Sending ${daysUntil}-day discount expiration reminder to ${user.email}`)
      
      // Get plan name from invoice line items
      const productId = invoice.lines?.data?.length > 0
        ? getProductIdFromPrice(invoice.lines.data[0]?.price)
        : null
      const planName = await getPlanNameFromProductId(productId)
      
      // Send discount expiration reminder email
      const emailTemplate = discountExpiringTemplate({
        name: user.full_name || 'there',
        planName,
        daysUntil,
        expiryDate: chargeDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        dashboardUrl: 'https://moneko.io/dashboard/user-settings/membership',
      })
      
      await sendUserEmail(user.email, user.full_name || '', emailTemplate)
      console.log(`✅ Discount expiration reminder sent to ${user.email} (${daysUntil} days before expiry)`)
      
      return // Don't send regular renewal email
    }
    
    // === REGULAR RENEWAL REMINDER (no discount scenario) ===
    console.log(`Upcoming invoice for ${user.email}, charging in ${daysUntil} days`)
    console.log(`Amount: ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`)
    
    // Get user data for personalized email
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('Could not fetch user data for renewal reminder email')
      return
    }

    const name = userData.full_name || 'there'
    
    // Get plan name from subscription - use safe extraction
    const productId = invoice.lines?.data?.length > 0
      ? getProductIdFromPrice(invoice.lines.data[0]?.price)
      : null
    const planName = await getPlanNameFromProductId(productId)
    
    const emailTemplate = invoiceUpcomingTemplate({
      name,
      planName,
      amount: (invoice.amount_due / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
      chargeDate: chargeDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      daysUntil: daysUntil,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      updatePaymentUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership?tab=payment`,
    })

    await sendUserEmail(userData.email, name, emailTemplate)
    console.log(`Renewal reminder email sent to ${userData.email}`)
    
  } catch (error) {
    console.error('Error in handleInvoiceUpcoming:', {
      invoiceId: invoice.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for payment method attached (confirmation email)
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  try {
    console.log('Processing payment method attached:', paymentMethod.id)
    
    const customerId = typeof paymentMethod.customer === 'string'
      ? paymentMethod.customer
      : paymentMethod.customer?.id
    
    if (!customerId) {
      console.error('No customer ID in payment method:', paymentMethod.id)
      return
    }
    
    const user = await getUserByCustomerId(customerId)
    
    if (!user) {
      console.error('No user found for customer:', customerId)
      return
    }
    
    // Send payment method updated confirmation
    console.log(`Payment method ${paymentMethod.id} attached for ${user.email}`)
    if (paymentMethod.card) {
      console.log(`Card: ${paymentMethod.card.brand} ending in ${paymentMethod.card.last4}`)
    }
    
    // Get user data for personalized email
    const { data: userData } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.error('Could not fetch user data for payment method confirmation email')
      return
    }

    const name = userData.full_name || 'there'
    
    // Build payment method details
    let paymentMethodType = 'Payment method'
    let paymentMethodDetails = ''
    
    if (paymentMethod.card) {
      paymentMethodType = 'Card'
      paymentMethodDetails = `${paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1)} ending in ${paymentMethod.card.last4}`
    } else if (paymentMethod.type) {
      paymentMethodType = paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1)
    }
    
    const emailTemplate = paymentMethodUpdatedTemplate({
      name,
      paymentMethodType,
      paymentMethodDetails,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
    })

    await sendUserEmail(userData.email, name, emailTemplate)
    console.log(`Payment method confirmation email sent to ${userData.email}`)
    
  } catch (error) {
    console.error('Error in handlePaymentMethodAttached:', {
      paymentMethodId: paymentMethod.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for subscription pending update applied (subscription schedules)
async function handleSubscriptionPendingUpdateApplied(
  subscription: Stripe.Subscription,
  eventId: string
) {
  try {
    console.log('Processing pending update applied:', subscription.id)

    // Extract customer ID
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id

    if (!customerId) {
      console.error('No customer ID in subscription:', subscription.id)
      return
    }

    // Find user
    const user = await getUserByCustomerId(customerId)
    if (!user) {
      console.error('No user found with customer ID:', customerId)
      return
    }

    // Extract new plan from metadata
    const plan = (subscription.metadata?.plan || 'plus') as PlanType
    const billingInterval = (subscription.metadata?.billing_interval || 'monthly') as BillingInterval

    // Get previous plan for change type detection
    const { data: previousSub } = await supabase
      .from('subscriptions')
      .select('plan, billing_interval')
      .eq('user_id', user.id)
      .maybeSingle()

    const previousPlan = previousSub?.plan as PlanType | null
    const previousInterval = previousSub?.billing_interval as BillingInterval | null

    // Clear pending fields - the scheduled change has been applied
    await supabase
      .from('subscriptions')
      .update({
        plan,
        billing_interval: billingInterval,
        pending_plan: null,
        pending_interval: null,
        pending_effective_date: null,
        last_event_id: eventId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    console.log('Scheduled subscription change applied for user:', user.id)

    // Send email notification
    const itemPeriodEnd = subscription.items?.data?.[0]?.current_period_end
    
    // Determine the actual change type
    const changeType = previousPlan 
      ? getChangeType(previousPlan, plan, previousInterval || undefined, billingInterval)
      : 'renewal'
    
    const emailTemplate = subscriptionUpdatedTemplate({
      name: user.full_name || '',
      planName: plan.charAt(0).toUpperCase() + plan.slice(1),
      endDate: itemPeriodEnd && !isNaN(itemPeriodEnd)
        ? new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(new Date(itemPeriodEnd * 1000))
        : 'N/A',
      dashboardUrl: `${DASHBOARD_URL}/dashboard/user-settings/membership`,
      changeType,
    })

    await sendUserEmail(user.email, user.full_name || '', emailTemplate)
    console.log(`Scheduled change notification sent to ${user.email}`)

  } catch (error) {
    console.error('Error in handleSubscriptionPendingUpdateApplied:', {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for subscription pending update expired (scheduled change cancelled)
async function handleSubscriptionPendingUpdateExpired(
  subscription: Stripe.Subscription
) {
  try {
    console.log('Processing pending update expired:', subscription.id)

    // Extract customer ID
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id

    if (!customerId) {
      console.error('No customer ID in subscription:', subscription.id)
      return
    }

    // Find user
    const user = await getUserByCustomerId(customerId)
    if (!user) {
      console.error('No user found with customer ID:', customerId)
      return
    }

    // Clear pending fields - the scheduled change was cancelled or expired
    await supabase
      .from('subscriptions')
      .update({
        pending_plan: null,
        pending_interval: null,
        pending_effective_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    console.log('Scheduled subscription change expired for user:', user.id)

  } catch (error) {
    console.error('Error in handleSubscriptionPendingUpdateExpired:', {
      subscriptionId: subscription.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for setup_intent.succeeded (payment method successfully added)
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  try {
    console.log('Processing setup intent succeeded:', setupIntent.id)

    const customerId = typeof setupIntent.customer === 'string'
      ? setupIntent.customer
      : setupIntent.customer?.id

    if (!customerId) {
      console.error('No customer ID in setup intent:', setupIntent.id)
      return
    }

    const user = await getUserByCustomerId(customerId)

    if (!user) {
      console.error('No user found for customer:', customerId)
      return
    }

    // Get the payment method that was attached
    const paymentMethodId = typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id

    if (!paymentMethodId) {
      console.error('No payment method in setup intent:', setupIntent.id)
      return
    }

    // Retrieve payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    console.log(`Payment method ${paymentMethodId} successfully set up for ${user.email}`)

    // Check if this is the first payment method for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    // If this is the first payment method, set it as default automatically
    if (paymentMethods.data.length === 1) {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })

      // Also update subscription if exists
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (subscription?.stripe_subscription_id) {
        await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { default_payment_method: paymentMethodId }
        )
      }

      console.log(`Set ${paymentMethodId} as default payment method for customer ${customerId}`)
    }

    // Log successful setup in our database (optional)
    console.log(`Setup intent ${setupIntent.id} completed successfully for user ${user.id}`)

  } catch (error) {
    console.error('Error in handleSetupIntentSucceeded:', {
      setupIntentId: setupIntent.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Handler for setup_intent.setup_failed (payment method failed to be added)
async function handleSetupIntentFailed(setupIntent: Stripe.SetupIntent) {
  try {
    console.log('Processing setup intent failed:', setupIntent.id)

    const customerId = typeof setupIntent.customer === 'string'
      ? setupIntent.customer
      : setupIntent.customer?.id

    if (!customerId) {
      console.error('No customer ID in setup intent:', setupIntent.id)
      return
    }

    const user = await getUserByCustomerId(customerId)

    if (!user) {
      console.error('No user found for customer:', customerId)
      return
    }

    // Log the failure reason
    const lastSetupError = setupIntent.last_setup_error
    console.error(`Setup intent failed for ${user.email}:`, {
      code: lastSetupError?.code,
      message: lastSetupError?.message,
      type: lastSetupError?.type,
    })

    // Optionally send email notification to user about the failure
    // (Not implementing here to avoid spam, but could be useful)

  } catch (error) {
    console.error('Error in handleSetupIntentFailed:', {
      setupIntentId: setupIntent.id,
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}
