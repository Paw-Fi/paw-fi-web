import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { corsHeaders } from '../shared/cors.ts'
import { validate as validateUuid } from 'https://deno.land/std@0.177.0/uuid/mod.ts'
import { SUBSCRIPTION_PRICES } from '../shared/stripe-subscription-prices.ts'

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
    const { plan, billingInterval, successUrl, cancelUrl, userId } = await req.json()
    
    // Validate userId is a valid UUID
    if (!userId || !validateUuid(userId)) {
      console.error('Invalid or missing user ID:', userId)
      return new Response(JSON.stringify({ error: 'Valid user ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate plan
    if (!SUBSCRIPTION_PRICES[plan] && plan !== 'free') {
      return new Response(JSON.stringify({ error: 'Invalid plan selected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Free plan doesn't need a checkout session
    if (plan === 'free') {
      return new Response(JSON.stringify({ error: 'Free plan does not require payment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the price ID based on plan and billing interval
    const priceId = SUBSCRIPTION_PRICES[plan][billingInterval]

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Invalid billing interval' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Creating checkout session with price ID:', priceId);
    console.log('Stripe API Key available:', !!Deno.env.get('STRIPE_SECRET_KEY'));
    
    try {
      // Create a checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl || `${req.headers.get('origin') || 'https://moneko.io'}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${req.headers.get('origin') || 'https://moneko.io'}/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}`,
        client_reference_id: userId, // Store user ID for reference (already validated as UUID)
        allow_promotion_codes: true, // Enable promotion code field in checkout
      });
      
      console.log('Stripe session created:', {
        id: session.id,
        hasClientSecret: !!session.client_secret,
        url: session.url
      });
      
      // Return the client secret and URL
      return new Response(JSON.stringify({ 
        clientSecret: session.client_secret,
        checkoutUrl: session.url // Adding checkout URL as fallback
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (stripeError) {
      console.error('Stripe session creation error:', stripeError);
      throw stripeError; // Re-throw to be caught by the outer catch block
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
