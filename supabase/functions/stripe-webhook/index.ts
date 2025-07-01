import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { corsHeaders } from '../shared/cors.ts'

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Webhook endpoint secret for verifying events
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
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
      return new Response(JSON.stringify({ error: 'No signature provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the raw request body
    const body = await req.text()
    let event

    // Verify webhook signature
    try {
      event = endpointSecret
        ? stripe.webhooks.constructEvent(body, signature, endpointSecret)
        : JSON.parse(body) // Fallback for development without webhook secret
      
      console.log(`Webhook received: ${event.type}`)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle specific webhook events
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object)
          break
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object)
          break
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object)
          break
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error(`Error handling webhook: ${error.message}`)
      return new Response(JSON.stringify({ error: `Webhook handler error: ${error.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`)
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Handler for subscription created or updated events
async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('Processing subscription update:', subscription.id)
    
    // Extract customer ID
    const customerId = subscription.customer
    
    // Find user with this Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    
    if (userError) {
      console.error('Error finding user:', userError)
      return
    }
    
    // If no user found with this customer ID, try to find by subscription ID
    let userId = userData?.id
    if (!userId) {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
      
      if (subError) {
        console.error('Error finding subscription:', subError)
        return
      }
      
      userId = subData?.user_id
    }
    
    if (!userId) {
      console.error('No user found for subscription:', subscription.id)
      return
    }
    
    // Extract subscription details
    const plan = subscription.metadata.plan || 'plus'
    const status = subscription.status
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
    const cancelAtPeriodEnd = subscription.cancel_at_period_end
    
    console.log('Updating subscription for user:', userId, {
      plan,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    })
    
    // Update or insert subscription data
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          plan,
          status,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    
    if (subscriptionError) {
      console.error('Error updating subscription in database:', subscriptionError)
    } else {
      console.log('Subscription updated successfully for user:', userId)
    }
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
  }
}

// Handler for subscription deleted events
async function handleSubscriptionDeleted(subscription) {
  try {
    console.log('Processing subscription deletion:', subscription.id)
    
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
    
    console.log('Updating subscription status to canceled for user:', userId)
    
    // Update subscription status to canceled
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('Error updating subscription status:', updateError)
    } else {
      console.log('Subscription marked as canceled for user:', userId)
    }
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error)
  }
}

// Handler for successful invoice payments
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    console.log('Processing successful payment for invoice:', invoice.id)
    
    // Only process subscription invoices
    if (invoice.subscription) {
      const subscriptionId = invoice.subscription
      
      // Get the subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      // Update subscription in our database
      await handleSubscriptionUpdated(subscription)
    }
  } catch (error) {
    console.error('Error in handleInvoicePaymentSucceeded:', error)
  }
}

// Handler for failed invoice payments
async function handleInvoicePaymentFailed(invoice) {
  try {
    console.log('Processing failed payment for invoice:', invoice.id)
    
    // Only process subscription invoices
    if (invoice.subscription) {
      const subscriptionId = invoice.subscription
      const customerId = invoice.customer
      
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
      } else {
        console.log('Subscription marked as past_due for user:', userId)
        
        // TODO: Send email notification to user about failed payment
      }
    }
  } catch (error) {
    console.error('Error in handleInvoicePaymentFailed:', error)
  }
}
