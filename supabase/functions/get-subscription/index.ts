import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow GET requests
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user from JWT token - NEVER trust userId from query/body
    const authResult = await authenticateUser(req, supabase);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId!;

    // First, directly check if there's a subscription in the subscriptions table
    const { data: directSubscription, error: directError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Then try the RPC function
    const { data: subscription, error: subscriptionError } = await supabase.rpc(
      "get_user_subscription",
      { p_user_id: userId },
    );

    if (subscriptionError) {
      console.error("Error getting subscription:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Failed to get subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If the RPC function returns no data but we found a subscription directly, use that instead
    // IMPORTANT: RPC functions return arrays, so we need to extract the first element
    let finalSubscription = Array.isArray(subscription)
      ? subscription[0]
      : subscription;

    if (!finalSubscription && directSubscription) {
      // Map the direct subscription to match the expected format
      finalSubscription = {
        id: directSubscription.id,
        provider: directSubscription.provider,
        plan: directSubscription.plan,
        status: directSubscription.status,
        billing_interval: directSubscription.billing_interval,
        current_period_end: directSubscription.current_period_end,
        next_payment_date: directSubscription.cancel_at_period_end
          ? null
          : directSubscription.current_period_end,
        cancel_at_period_end: directSubscription.cancel_at_period_end,
        stripe_subscription_id: directSubscription.stripe_subscription_id,
        stripe_customer_id: directSubscription.stripe_customer_id,
        bound_to_user_id: directSubscription.bound_to_user_id,
        bound_to_household_id: directSubscription.bound_to_household_id,
        store_product_id: directSubscription.store_product_id,
        app_store_in_app_ownership_type:
          directSubscription.app_store_in_app_ownership_type,
        created_at: directSubscription.created_at,
        updated_at: directSubscription.updated_at,
      };
    } else if (finalSubscription && directSubscription) {
      finalSubscription.provider ??= directSubscription.provider;
      finalSubscription.store_product_id ??=
        directSubscription.store_product_id;
      finalSubscription.app_store_in_app_ownership_type ??=
        directSubscription.app_store_in_app_ownership_type;
      finalSubscription.bound_to_user_id ??= directSubscription.bound_to_user_id;
      finalSubscription.bound_to_household_id ??=
        directSubscription.bound_to_household_id;
    }

    // If no subscription found, return free tier info
    if (!finalSubscription) {
      return new Response(
        JSON.stringify({
          subscription: null,
          plan: "free",
          status: "none",
          current_period_end: null,
          cancel_at_period_end: false,
          payment_method: null,
          invoices: [],
          next_payment_date: null,
          days_until_next_payment: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get subscription features
    const { data: features, error: featuresError } = await supabase.rpc(
      "get_subscription_plan_features",
      { p_plan: finalSubscription.plan },
    );

    if (featuresError) {
      console.error("Error getting features:", featuresError);
    }

    // Get additional details from Stripe if this is a Stripe subscription
    let paymentMethod: any = null;
    let invoices: any[] = [];

    const provider = (finalSubscription as any).provider || "stripe";
    const isBorrowedHouseholdSubscription =
      Boolean((finalSubscription as any).bound_to_user_id);
    const responseSubscription = isBorrowedHouseholdSubscription
      ? {
        ...finalSubscription,
        stripe_subscription_id: null,
        stripe_customer_id: null,
      }
      : finalSubscription;

    // Only direct Stripe subscriptions expose Stripe invoices/payment method.
    // Bound household members may have legacy rows with the owner's copied
    // customer ID, but they must not see the owner's billing artifacts.
    if (
      provider === "stripe" &&
      finalSubscription.stripe_customer_id &&
      !isBorrowedHouseholdSubscription
    ) {
      try {
        // Get all invoices for the customer (works for both Lifetime and recurring)
        // Lifetime: invoice_creation enabled in checkout creates official invoices
        // Recurring: invoices created automatically by subscription
        const invoiceList = await stripe.invoices.list({
          customer: finalSubscription.stripe_customer_id,
          limit: 20,
        });

        invoices = invoiceList.data.map((invoice: Stripe.Invoice) => ({
          id: invoice.id,
          amount_paid: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          status: invoice.status,
          created: new Date(invoice.created * 1000).toISOString(),
          hosted_invoice_url: invoice.hosted_invoice_url,
          pdf: invoice.invoice_pdf,
        }));

        // Optionally fetch subscription and payment method if subscription ID exists
        if (finalSubscription.stripe_subscription_id) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            finalSubscription.stripe_subscription_id,
            { expand: ["default_payment_method"] },
          );

          // Extract payment method details if available
          if (stripeSubscription.default_payment_method) {
            const pm = stripeSubscription.default_payment_method;
            paymentMethod = pm.card
              ? {
                id: pm.id,
                brand: pm.card.brand,
                last4: pm.card.last4,
                exp_month: pm.card.exp_month,
                exp_year: pm.card.exp_year,
              }
              : null;
          }
        }
      } catch (error) {
        console.error("Error fetching Stripe details:", error);
        // Continue with the data we have from the database
      }
    }

    // Calculate days until next payment
    // Lifetime plan: No next payment (one-time purchase)
    const now = new Date();
    let daysUntilNextPayment: number | null = null;

    if (finalSubscription.plan === "lifetime") {
      // Lifetime never has a next payment
      daysUntilNextPayment = null;
    } else if (
      finalSubscription.status === "active" &&
      !finalSubscription.cancel_at_period_end &&
      finalSubscription.current_period_end
    ) {
      // Recurring plans: Calculate days until period end
      daysUntilNextPayment = Math.ceil(
        (new Date(finalSubscription.current_period_end).getTime() -
          now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    // Return the subscription details
    return new Response(
      JSON.stringify({
        subscription: responseSubscription,
        features,
        payment_method: paymentMethod,
        invoices,
        days_until_next_payment: daysUntilNextPayment,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in get-subscription:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
