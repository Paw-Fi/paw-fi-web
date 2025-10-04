import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import Stripe from 'https://esm.sh/stripe@13.10.0'
import { corsHeaders } from '../shared/cors.ts'
import { validate as validateUuid } from 'https://deno.land/std@0.177.0/uuid/mod.ts'

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-07-30.basil',
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
    const { sessionId } = await req.json()

    // Validate session ID
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Verifying payment session:', sessionId)

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Check if the payment was successful
    if (session.payment_status !== 'paid') {
      console.log('Payment not successful:', session.payment_status)
      return new Response(
        JSON.stringify({
          verified: false,
          message: `Payment status is ${session.payment_status}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get the user ID from the session
    const userId = session.client_reference_id
    
    // Validate that userId is a valid UUID
    if (!userId || !validateUuid(userId)) {
      console.error('Invalid or missing user ID:', userId)
      return new Response(
        JSON.stringify({
          verified: false,
          message: 'Invalid or missing user ID',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Handle Lifetime (mode='payment') vs Recurring (mode='subscription') sessions
    const subscriptionId = session.subscription as string

    // Lifetime plan: one-time payment (mode='payment'), no subscription ID
    if (session.mode === 'payment') {
      console.log('Lifetime payment session detected - webhook will handle fulfillment')
      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Lifetime payment successful - access granted via webhook',
          plan: session.metadata?.plan || 'lifetime',
          mode: 'payment',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Recurring plans: require subscription ID
    if (!subscriptionId) {
      console.error('No subscription ID found in session')
      return new Response(
        JSON.stringify({
          verified: false,
          message: 'No subscription found',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Extract subscription details
    const plan = subscription.metadata.plan || 'plus'
    const status = subscription.status
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
    const cancelAtPeriodEnd = subscription.cancel_at_period_end

    console.log('Subscription details:', {
      id: subscriptionId,
      plan,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    })

    // Update the user's subscription in the database
    // userId is already validated as a valid UUID
    try {
        // First check if a subscription record already exists for this user
        const { data: existingSubscription, error: findError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        console.log('Existing subscription check:', { existingSubscription, findError })

        let subscriptionUpdateError = null

        if (findError) {
          console.error('Error checking for existing subscription:', findError)
        }

        // Prepare subscription data
        const subscriptionData = {
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          plan,
          status,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          updated_at: new Date().toISOString()
        }

        // If subscription exists, update it
        if (existingSubscription?.id) {
          const { error } = await supabase
            .from('subscriptions')
            .update(subscriptionData)
            .eq('user_id', userId)

          subscriptionUpdateError = error
          console.log('Subscription update result:', { error })
        } else {
          // Otherwise insert a new record
          const { error } = await supabase
            .from('subscriptions')
            .insert({
              ...subscriptionData,
              created_at: new Date().toISOString()
            })

          subscriptionUpdateError = error
          console.log('Subscription insert result:', { error })
        }

        if (subscriptionUpdateError) {
          console.error('Error updating/inserting subscription:', subscriptionUpdateError)
        } else {
          console.log('Subscription successfully updated/inserted for user:', userId)
          
          // Double-check that the subscription was saved correctly
          const { data: checkData, error: checkError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single()
            
          console.log('Subscription verification check:', { 
            saved: checkData ? true : false, 
            error: checkError,
            data: checkData 
          })
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Continue with verification even if database operations fail
      }

    // Return success response
    return new Response(
      JSON.stringify({
        verified: true,
        subscription: {
          id: subscriptionId,
          plan,
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error verifying payment:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
