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

/**
 * Safely converts a Unix timestamp to ISO string
 * Returns null if timestamp is invalid or null
 */
function safeUnixToISO(unixTimestamp: number | null | undefined): string | null {
  if (!unixTimestamp) return null
  
  try {
    const date = new Date(unixTimestamp * 1000)
    if (isNaN(date.getTime())) {
      console.warn('Invalid Unix timestamp:', unixTimestamp)
      return null
    }
    return date.toISOString()
  } catch (error) {
    console.error('Error converting timestamp to ISO:', error)
    return null
  }
}

serve(async (req: Request) => {
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
      console.log('Lifetime payment session detected - fulfilling immediately')

      const plan = session.metadata?.plan || 'lifetime'

      // Idempotent DB upsert so mobile deep-link callback can unlock immediately.
      // Webhook may still run later; this makes the UX robust.
      try {
        const now = new Date()
        const subscriptionData = {
          user_id: userId,
          provider: 'stripe',
          stripe_subscription_id: null,
          stripe_customer_id: session.customer as string,
          store_product_id: null,
          plan,
          status: 'active',
          billing_interval: null,
          current_period_end: null, // Lifetime must have NULL period end
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        }

        await supabase
          .from('subscriptions')
          .upsert({
            ...subscriptionData,
            created_at: now.toISOString(),
          }, {
            onConflict: 'user_id',
          })

        console.log('Lifetime subscription upserted for user:', userId)
      } catch (dbError) {
        console.error('Failed to upsert lifetime subscription:', dbError)
        // Keep returning verified=true so client can proceed; webhook may still fix state.
      }

      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Lifetime payment successful',
          plan,
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

    // Extract subscription details with proper null handling
    const plan = subscription.metadata.plan || 'plus'
    const status = subscription.status
    
    // CRITICAL: For trialing subscriptions without payment method, use trial_end as current_period_end
    // This ensures every subscription has a proper end date (30 days default)
    let currentPeriodEnd = safeUnixToISO(subscription.current_period_end)
    const trialEnd = safeUnixToISO(subscription.trial_end)
    
    // If subscription is trialing without payment method, use trial_end as the period end
    if (!currentPeriodEnd && status === 'trialing' && trialEnd) {
      console.log('Trialing subscription without payment method - using trial_end as current_period_end')
      currentPeriodEnd = trialEnd
    } else if (!currentPeriodEnd && subscription.current_period_end) {
      console.warn('Failed to convert current_period_end:', subscription.current_period_end)
    } else if (!currentPeriodEnd) {
      console.warn('Subscription has no current_period_end or trial_end - this may cause issues')
    }
    
    const cancelAtPeriodEnd = subscription.cancel_at_period_end

    console.log('Subscription details:', {
      id: subscriptionId,
      plan,
      status,
      currentPeriodEnd,
      trialEnd,
      cancelAtPeriodEnd,
      hasPaymentMethod: !!subscription.default_payment_method,
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

        // Prepare subscription data with safe timestamp handling
        const now = new Date()
        
        // CRITICAL: Ensure we always have a valid end date
        if (!currentPeriodEnd) {
          console.error('No valid end date for subscription - this should not happen', {
            subscriptionId,
            status,
            hasTrialEnd: !!subscription.trial_end,
            hasPeriodEnd: !!subscription.current_period_end,
          })
        }
        
        const subscriptionData = {
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          plan,
          status,
          current_period_end: currentPeriodEnd, // Should always be set (from period_end or trial_end)
          cancel_at_period_end: cancelAtPeriodEnd,
          updated_at: now.toISOString()
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
              created_at: now.toISOString() // Use same timestamp for consistency
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

    // Return success response with subscription details
    return new Response(
      JSON.stringify({
        verified: true,
        subscription: {
          id: subscriptionId,
          plan,
          status,
          currentPeriodEnd: currentPeriodEnd || null, // Explicitly return null if not set
          cancelAtPeriodEnd,
          trialEnd,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error verifying payment:', error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
