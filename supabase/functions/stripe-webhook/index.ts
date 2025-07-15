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
  trialEndingTemplate
} from '../shared/email-templates.ts'

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

// Dashboard URL for links in emails
const DASHBOARD_URL = 'https://moneko.io'

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
        case 'customer.subscription.trial_will_end':
          await handleSubscriptionTrialEnding(event.data.object)
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
// Helper function to get user by Stripe customer ID
async function getUserByCustomerId(customerId) {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('stripe_customer_id', customerId)
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

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('Processing subscription update:', subscription.id)
    
    // Extract customer ID
    const customerId = subscription.customer
    
    // Find user with this Stripe customer ID
    const user = await getUserByCustomerId(customerId)
    
    if (!user) {
      console.error('No user found with customer ID:', customerId)
      return
    }
    
    let userId = user.id
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
      
      // Prepare email data
      let planId = null;
      if (subscription.items?.data?.length > 0) {
        planId = subscription.items.data[0].price.product;
      }
      
      const planName = await getPlanNameFromProductId(planId);
      const endDate = new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(new Date(subscription.current_period_end * 1000));
      
      // Determine if this is a new subscription or an update
      const isNew = subscription.status === 'active' && 
                   subscription.created === subscription.start_date;
      
      const name = user.full_name || '';
      
      if (isNew) {
        // Send welcome email for new subscriptions
        const emailTemplate = subscriptionCreatedTemplate({
          name,
          planName,
          endDate,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`
        });
        
        await sendUserEmail(user.email, name, emailTemplate);
        console.log(`Welcome email sent to ${user.email}`);
      } else {
        // Send update email for existing subscriptions
        // Try to determine if this was an upgrade or downgrade
        // Logic to determine upgrade/downgrade could be added here
        
        const emailTemplate = subscriptionUpdatedTemplate({
          name,
          planName,
          endDate,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
          changeType: 'renewal'
        });
        
        await sendUserEmail(user.email, name, emailTemplate);
        console.log(`Subscription update email sent to ${user.email}`);
      }
    }
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
  }
}

// Handler for subscription deleted events
async function handleSubscriptionDeleted(subscription) {
  try {
    console.log('Processing subscription deletion:', subscription.id)
    
    // Get customer ID
    const customerId = subscription.customer;
    
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
      
      // Send cancellation email if we have user info
      if (user) {
        let planId = null;
        if (subscription.items?.data?.length > 0) {
          planId = subscription.items.data[0].price.product;
        }
        
        const planName = await getPlanNameFromProductId(planId);
        const name = user.full_name || '';
        
        // Check if immediate cancellation or end of period
        const endDate = subscription.canceled_at === subscription.current_period_end
          ? null // Immediate cancellation
          : new Intl.DateTimeFormat('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }).format(new Date(subscription.current_period_end * 1000));
        
        const emailTemplate = subscriptionCanceledTemplate({
          name,
          planName,
          endDate,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
          immediateCancel: !endDate
        });
        
        await sendUserEmail(user.email, name, emailTemplate);
        console.log(`Subscription cancellation email sent to ${user.email}`);
      }
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
      
      // Send payment failure email
      if (userId) {
        // Get user details
        const { data: userData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', userId)
          .single();
          
        if (userData) {
          // Get plan details
          let planName = 'Premium';
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            if (subscription.items?.data?.length > 0) {
              const productId = subscription.items.data[0].price.product;
              planName = await getPlanNameFromProductId(productId);
            }
          }
          
          const name = userData.first_name || '';
          const emailTemplate = paymentFailedTemplate({
            name,
            planName,
            dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`,
            updatePaymentUrl: `${DASHBOARD_URL}/dashboard/membership?tab=payment`
          });
          
          await sendUserEmail(userData.email, name, emailTemplate);
          console.log(`Payment failure email sent to ${userData.email}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in handleInvoicePaymentFailed:', error)
  }
}

// Handler for trial ending notification
async function handleSubscriptionTrialEnding(subscription) {
  try {
    console.log('Processing trial ending for subscription:', subscription.id);
    
    const customerId = subscription.customer;
    const user = await getUserByCustomerId(customerId);
    
    if (!user) return;
    
    // Get plan details
    let planId = null;
    if (subscription.items?.data?.length > 0) {
      planId = subscription.items.data[0].price.product;
    }
    
    const planName = await getPlanNameFromProductId(planId);
    const trialEndDate = new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(new Date(subscription.trial_end * 1000));
    
    // Send trial ending email
    const name = user.full_name || '';
    const emailTemplate = trialEndingTemplate({
      name,
      planName,
      trialEndDate,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/membership`
    });
    
    await sendUserEmail(user.email, name, emailTemplate);
    console.log(`Trial ending email sent to ${user.email}`);
    
  } catch (error) {
    console.error('Error in handleSubscriptionTrialEnding:', error);
  }
}
