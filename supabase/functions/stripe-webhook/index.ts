import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { corsHeaders } from '../shared/cors.ts'
import { sendUserEmail } from '../shared/email-service.ts'
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
  invoicePaymentSucceededTemplate
} from '../shared/email-templates.ts'
import { validateEnvironment } from '../shared/env-validation.ts'
import { isWebhookEventProcessed, markWebhookEventProcessed } from '../shared/idempotency.ts'
import { getChangeType, PlanType, BillingInterval } from '../shared/subscription-constants.ts'
import { getPlanFromPriceId } from '../shared/stripe-subscription-prices.ts'

// Validate environment on startup - FAIL FAST if misconfigured
// Webhook function REQUIRES webhook secret
const env = validateEnvironment({ requireWebhookSecret: true })

// Initialize Stripe with validated configuration
const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2023-10-16',
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
        dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
    const isNew = subscription.status === 'active' && 
                 subscription.created === subscription.start_date
    
    const name = user.full_name || ''
    
    if (isNew) {
      // Send welcome email for new subscriptions
      const emailTemplate = subscriptionCreatedTemplate({
        name,
        planName,
        endDate,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`
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
        dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
        dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
          dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
  try {
    console.log('Processing successful payment for invoice:', invoice.id)
    
    // Only process subscription invoices
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
        invoiceUrl: invoice.hosted_invoice_url || `${DASHBOARD_URL}/dashboard/membership`,
        invoicePdfUrl: invoice.invoice_pdf || undefined,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
      })
      
      await sendUserEmail(user.email, user.full_name || '', emailTemplate)
      console.log(`Invoice receipt email sent to ${user.email} with PDF link`)
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
        const emailTemplate = paymentFailedTemplate({
          name,
          planName,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
          updatePaymentUrl: `${DASHBOARD_URL}/dashboard/membership?tab=payment`
        })
        
        await sendUserEmail(userData.email, name, emailTemplate)
        console.log(`Payment failure email sent to ${userData.email}`)
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
      authenticationUrl: invoice.hosted_invoice_url || `${DASHBOARD_URL}/dashboard/membership?tab=payment`,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
      dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`
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
    
    // Get user ID from session metadata
    const userId = session.metadata?.user_id || session.client_reference_id
    
    if (!userId) {
      console.error('No user ID in checkout session:', session.id)
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
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
      .is('stripe_customer_id', null)
    
    // For subscriptions, the customer.subscription.created event will handle the subscription
    // For one-time payments, handle fulfillment here
    if (session.mode === 'subscription') {
      console.log('Subscription checkout completed, subscription will be created via webhook')
    } else {
      console.log('One-time payment completed:', session.id)
      // Handle one-time payment fulfillment if needed
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
        dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
      dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
      dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
      updatePaymentUrl: `${DASHBOARD_URL}/dashboard/membership?tab=payment`,
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
      dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
      dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
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
