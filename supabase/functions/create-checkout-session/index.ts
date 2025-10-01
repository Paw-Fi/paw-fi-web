/**
 * Create Stripe Checkout Session - Production Ready
 * 
 * Creates a Stripe Checkout session for subscription payments
 * Implements:
 * - Customer creation/attachment
 * - Proper trial handling with required payment method
 * - Idempotency
 * - Input validation
 * - Price ID validation
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { getCorsHeaders } from '../shared/cors.ts'
import { validate as validateUuid } from 'https://deno.land/std@0.177.0/uuid/mod.ts'
import { getPriceId, validatePriceId } from '../shared/stripe-subscription-prices.ts'
import { authenticateUser } from '../shared/auth.ts'
import { validateEnvironment } from '../shared/env-validation.ts'
import { generateIdempotencyKey } from '../shared/idempotency.ts'
import { 
  createCheckoutSessionWithRetry, 
  createCustomerWithRetry,
  retrieveCustomerWithRetry 
} from '../shared/stripe-retry.ts'
import { 
  PlanType, 
  BillingInterval, 
  isValidPlan, 
  isValidInterval,
  TRIAL_PERIOD_DAYS 
} from '../shared/subscription-constants.ts'

// Validate environment on startup
const env = validateEnvironment()

// Initialize Stripe with validated configuration
const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase client
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)

serve(async (req) => {
  // Get CORS headers - proper configuration using shared utility
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);
  
  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authenticate user from JWT token - NEVER trust userId from request body
    const authResult = await authenticateUser(req, supabase)

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use authenticated userId - this is the ONLY safe userId
    const userId = authResult.userId!

    // Parse the request body (plan, billingInterval, successUrl, cancelUrl, isTrial only)
    const { plan, billingInterval, successUrl, cancelUrl, isTrial = false } = await req.json()

    // Validate plan
    if (!plan || !isValidPlan(plan)) {
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

    // Validate billing interval
    if (!billingInterval || !isValidInterval(billingInterval)) {
      return new Response(JSON.stringify({ error: 'Invalid billing interval' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the price ID based on plan and billing interval (with validation)
    let priceId: string
    try {
      priceId = getPriceId(plan as PlanType, billingInterval as BillingInterval)
    } catch (error) {
      console.error('Error getting price ID:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Double-check price ID is valid
    if (!validatePriceId(priceId)) {
      console.error('Invalid price ID format:', priceId)
      return new Response(JSON.stringify({ error: 'Invalid price configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Creating checkout session:', { userId, plan, billingInterval, priceId, isTrial })
    
    // Get user details from auth.users (basic info)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user:', userError)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get or create Stripe customer
    // Use user_stripe_mapping table to store customer ID
    const { data: mappingData } = await supabase
      .from('user_stripe_mapping')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()
    
    let customerId = mappingData?.stripe_customer_id

    if (!customerId) {
      console.log('Creating new Stripe customer for user:', userId)
      
      const customer = await createCustomerWithRetry(stripe, {
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

      console.log('Created Stripe customer:', customerId)
    } else {
      // Verify customer exists in Stripe
      try {
        await retrieveCustomerWithRetry(stripe, customerId)
        console.log('Using existing Stripe customer:', customerId)
      } catch (error) {
        console.error('Customer not found in Stripe, creating new one:', error)
        
        const customer = await createCustomerWithRetry(stripe, {
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
      }
    }
    
    try {
      // Determine URLs
      const origin = req.headers.get('origin') || env.appUrl
      const finalSuccessUrl = successUrl || `${origin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`
      const finalCancelUrl = cancelUrl || `${origin}/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}`
      
      // Build session config according to Stripe best practices
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId, // CRITICAL: Always attach customer
        client_reference_id: userId, // CRITICAL: User ID for verification after checkout
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        allow_promotion_codes: true,
        // Subscription metadata - persists on the subscription object
        subscription_data: {
          metadata: {
            user_id: userId, // Use snake_case for Stripe metadata
            plan: plan,
            billing_interval: billingInterval,
          },
        },
        // Session metadata - for tracking checkout process only
        metadata: {
          user_id: userId,
          checkout_type: 'subscription',
        },
      }
      
      // Trial configuration - Allow trials without credit card for testing
      // When payment_method_collection is 'if_required', no credit card is needed during trial
      if (isTrial) {
        sessionConfig.payment_method_collection = 'if_required' // Don't require payment method for trials
        sessionConfig.subscription_data!.payment_behavior = 'allow_incomplete' // Allow subscription to be created without payment
        sessionConfig.subscription_data!.trial_period_days = TRIAL_PERIOD_DAYS
      }
      
      // Create checkout session with retry
      // NOTE: Per Stripe docs, idempotency keys are NOT recommended for Checkout Sessions
      // because sessions expire after 24 hours and users should be able to create new ones
      const session = await createCheckoutSessionWithRetry(stripe, sessionConfig)
      
      console.log('Checkout session created:', {
        id: session.id,
        customerId,
        url: session.url,
      })
      
      // Return session details
      return new Response(JSON.stringify({ 
        clientSecret: session.client_secret,
        checkoutUrl: session.url,
        sessionId: session.id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (stripeError) {
      console.error('Stripe session creation error:', {
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
      })
      
      return new Response(JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: stripeError.message,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('Error creating checkout session:', {
      error: error.message,
      stack: error.stack,
    })
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
