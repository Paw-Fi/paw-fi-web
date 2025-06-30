import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { corsHeaders } from '../shared/cors.ts'

// Add Deno namespace declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

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
    const { userId, action } = await req.json()

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

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subscriptionError)
      return new Response(JSON.stringify({ error: 'Failed to fetch subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!subscription || !subscription.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No subscription or Stripe customer found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle different payment method actions
    switch (action) {
      case 'create_setup_intent': {
        // Create a SetupIntent for updating payment method
        const setupIntent = await stripe.setupIntents.create({
          customer: subscription.stripe_customer_id,
          payment_method_types: ['card'],
          usage: 'off_session',
        })

        return new Response(JSON.stringify({
          client_secret: setupIntent.client_secret,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'list_payment_methods': {
        // List all payment methods for the customer
        const paymentMethods = await stripe.paymentMethods.list({
          customer: subscription.stripe_customer_id,
          type: 'card',
        })

        const formattedPaymentMethods = paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
          is_default: pm.id === subscription.default_payment_method,
        }))

        return new Response(JSON.stringify({
          payment_methods: formattedPaymentMethods,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'update_default_payment_method': {
        const { paymentMethodId } = await req.json()

        if (!paymentMethodId) {
          return new Response(JSON.stringify({ error: 'Payment method ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Update the default payment method on the subscription
        await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { default_payment_method: paymentMethodId }
        )

        return new Response(JSON.stringify({
          success: true,
          message: 'Default payment method updated successfully',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'detach_payment_method': {
        const { paymentMethodId } = await req.json()

        if (!paymentMethodId) {
          return new Response(JSON.stringify({ error: 'Payment method ID is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Detach the payment method from the customer
        await stripe.paymentMethods.detach(paymentMethodId)

        return new Response(JSON.stringify({
          success: true,
          message: 'Payment method removed successfully',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'create_portal_session': {
        // Create a billing portal session for the customer
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: subscription.stripe_customer_id,
          return_url: `${req.headers.get('origin') || 'https://moneko.io'}/dashboard/membership`,
        })

        return new Response(JSON.stringify({
          url: portalSession.url,
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
    console.error('Error in manage-payment-method:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
