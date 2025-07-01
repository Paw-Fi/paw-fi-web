import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { corsHeaders } from '../shared/cors.ts'
import { SUBSCRIPTION_PRICES } from '../shared/stripe-subscription-prices.ts';

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

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

    // Parse the request body
    const { userId, action, plan, billingInterval } = await req.json()

    if (!userId || !action) {
      return new Response(JSON.stringify({ error: 'User ID and action are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the user's current subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subscriptionError && subscriptionError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching subscription:', subscriptionError)
      return new Response(JSON.stringify({ error: 'Failed to fetch subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle different subscription actions
    switch (action) {
      case 'change_plan': {
        if (!plan || !billingInterval) {
          return new Response(JSON.stringify({ error: 'Plan and billing interval are required for plan change' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // If no active subscription, create a checkout session for a new subscription
        if (!subscription || subscription.status !== 'active') {
          const origin = req.headers.get('origin') || 'https://moneko.io'
          const successUrl = `${origin}/payment-status?status=success&session_id={CHECKOUT_SESSION_ID}`
          const cancelUrl = `${origin}/payment-status?status=canceled`

          // Get the price ID based on plan and billing interval
          const priceId = SUBSCRIPTION_PRICES[plan][billingInterval]

          if (!priceId) {
            return new Response(JSON.stringify({ error: 'Invalid plan or billing interval' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          // Create a checkout session
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: userId,
            allow_promotion_codes: true,
            metadata: { plan },
          })

          return new Response(JSON.stringify({
            action: 'redirect',
            url: session.url,
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // For existing subscriptions, update the subscription in Stripe
        const priceId = SUBSCRIPTION_PRICES[plan][billingInterval]
        
        if (!priceId) {
          return new Response(JSON.stringify({ error: 'Invalid plan or billing interval' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Update the subscription in Stripe
        const updatedSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            items: [{
              id: (await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)).items.data[0].id,
              price: priceId,
            }],
            metadata: { plan },
            proration_behavior: 'create_prorations',
            cancel_at_period_end: false,
          }
        )

        // Update the subscription in the database
        await supabase
          .from('subscriptions')
          .update({
            plan,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)

        return new Response(JSON.stringify({
          success: true,
          message: `Subscription updated to ${plan} (${billingInterval})`,
          subscription: updatedSubscription,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'cancel': {
        if (!subscription || subscription.status !== 'active') {
          return new Response(JSON.stringify({ error: 'No active subscription to cancel' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Cancel the subscription at period end
        const canceledSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: true }
        )

        // Update the subscription in the database
        await supabase
          .from('subscriptions')
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)

        return new Response(JSON.stringify({
          success: true,
          message: 'Subscription will be canceled at the end of the billing period',
          subscription: canceledSubscription,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'cancel_immediately': {
        if (!subscription || subscription.status !== 'active') {
          return new Response(JSON.stringify({ error: 'No active subscription to cancel' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Cancel the subscription immediately
        const canceledSubscription = await stripe.subscriptions.cancel(
          subscription.stripe_subscription_id
        )

        // Update the subscription in the database
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)

        return new Response(JSON.stringify({
          success: true,
          message: 'Subscription canceled immediately',
          subscription: canceledSubscription,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'resume': {
        if (!subscription || subscription.status !== 'active' || !subscription.cancel_at_period_end) {
          return new Response(JSON.stringify({ error: 'No subscription to resume' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Resume the subscription by removing cancel_at_period_end
        const resumedSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: false }
        )

        // Update the subscription in the database
        await supabase
          .from('subscriptions')
          .update({
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id)

        return new Response(JSON.stringify({
          success: true,
          message: 'Subscription resumed successfully',
          subscription: resumedSubscription,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Error in update-subscription:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
