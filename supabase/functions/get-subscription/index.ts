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

serve(async (req) => {
  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the user ID from the query string
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Fetching subscription for user ID:', userId)
    
    // First, directly check if there's a subscription in the subscriptions table
    const { data: directSubscription, error: directError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    console.log('Direct subscription query result:', { 
      found: directSubscription ? true : false,
      error: directError,
      data: directSubscription
    })
    
    // Then try the RPC function
    const { data: subscription, error: subscriptionError } = await supabase.rpc(
      'get_user_subscription',
      { p_user_id: userId }
    )
    
    console.log('RPC function result:', { 
      found: subscription ? true : false,
      error: subscriptionError,
      data: subscription
    })

    if (subscriptionError) {
      console.error('Error getting subscription:', subscriptionError)
      return new Response(JSON.stringify({ error: 'Failed to get subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // If the RPC function returns no data but we found a subscription directly, use that instead
    let finalSubscription = subscription;
    if (!finalSubscription && directSubscription) {
      console.log('Using direct subscription data instead of RPC result')
      // Map the direct subscription to match the expected format
      finalSubscription = {
        id: directSubscription.id,
        plan: directSubscription.plan,
        status: directSubscription.status,
        current_period_end: directSubscription.current_period_end,
        next_payment_date: directSubscription.cancel_at_period_end ? null : directSubscription.current_period_end,
        cancel_at_period_end: directSubscription.cancel_at_period_end,
        stripe_subscription_id: directSubscription.stripe_subscription_id,
        stripe_customer_id: directSubscription.stripe_customer_id,
        created_at: directSubscription.created_at,
        updated_at: directSubscription.updated_at
      }
    }

    // If no subscription found, return free tier info
    if (!finalSubscription) {
      return new Response(JSON.stringify({
        subscription: null,
        plan: 'free',
        status: 'none',
        current_period_end: null,
        cancel_at_period_end: false,
        payment_method: null,
        invoices: [],
        next_payment_date: null,
        days_until_next_payment: null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get subscription features
    const { data: features, error: featuresError } = await supabase.rpc(
      'get_subscription_plan_features',
      { p_plan: finalSubscription.plan }
    )

    if (featuresError) {
      console.error('Error getting features:', featuresError)
    }

    // Get additional details from Stripe if subscription exists
    let paymentMethod: any = null
    let invoices: any[] = []

    if (finalSubscription.stripe_subscription_id && finalSubscription.stripe_customer_id) {
      try {
        // Get the Stripe subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(
          finalSubscription.stripe_subscription_id,
          { expand: ['default_payment_method'] }
        )

        // Extract payment method details if available
        if (stripeSubscription.default_payment_method) {
          const pm = stripeSubscription.default_payment_method
          paymentMethod = pm.card ? {
            id: pm.id,
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          } : null
        }
        
        // Get recent invoices
        const invoiceList = await stripe.invoices.list({
          customer: finalSubscription.stripe_customer_id,
          limit: 5,
        })

        invoices = invoiceList.data.map(invoice => ({
          id: invoice.id,
          amount_paid: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          status: invoice.status,
          created: new Date(invoice.created * 1000).toISOString(),
          hosted_invoice_url: invoice.hosted_invoice_url,
          pdf: invoice.invoice_pdf,
        }))
      } catch (error) {
        console.error('Error fetching Stripe details:', error)
        // Continue with the data we have from the database
      }
    }

    // Calculate days until next payment
    const now = new Date()
    const daysUntilNextPayment = finalSubscription.status === 'active' && !finalSubscription.cancel_at_period_end
      ? Math.ceil((new Date(finalSubscription.current_period_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Return the subscription details
    return new Response(JSON.stringify({
      subscription: finalSubscription,
      features,
      payment_method: paymentMethod,
      invoices,
      days_until_next_payment: daysUntilNextPayment,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in get-subscription:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
