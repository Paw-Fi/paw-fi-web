import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  recomputeProjectedSubscription,
  syncStripeEntitlementSourcesForUser,
} from "../shared/subscription-entitlement-sources.ts";

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

    try {
      await syncStripeEntitlementSourcesForUser({
        supabase,
        stripe,
        userId,
      });
      await recomputeProjectedSubscription({
        supabase,
        userId,
      });
    } catch (projectionError) {
      await reportEdgeFunctionError({
        functionName: "get-subscription",
        error: projectionError,
        context: { phase: "reconcile_subscription_projection", userId },
      });
      console.error(
        "Non-fatal subscription projection reconciliation failed:",
        projectionError,
      );
    }

    // First, directly check if there's a subscription in the subscriptions table
    const { data: directSubscription, error: directError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Prefer the compatibility projection row. The legacy RPC can be incomplete
    // for provider-specific fields and should only be a fallback.
    let finalSubscription = directSubscription
      ? {
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
        store_product_id: directSubscription.store_product_id,
        created_at: directSubscription.created_at,
        updated_at: directSubscription.updated_at,
      }
      : null;

    if (!finalSubscription) {
      const { data: subscription, error: subscriptionError } = await supabase
        .rpc(
          "get_user_subscription",
          { p_user_id: userId },
        );

      if (subscriptionError) {
        await reportEdgeFunctionError({
          functionName: "get-subscription",
          error: subscriptionError,
          context: { phase: "load_legacy_subscription_rpc", userId },
        });
        console.error("Error getting subscription:", subscriptionError);
        return new Response(
          JSON.stringify({ error: "Failed to get subscription" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // IMPORTANT: RPC functions return arrays, so we need to extract the first element
      finalSubscription = Array.isArray(subscription)
        ? subscription[0]
        : subscription;
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

    const provider = (finalSubscription as any).provider ?? null;
    let stripeCustomerIdForBilling = finalSubscription.stripe_customer_id ??
      null;

    if (!stripeCustomerIdForBilling && provider == null) {
      const { data: mapping, error: mappingError } = await supabase
        .from("user_stripe_mapping")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (mappingError) {
        await reportEdgeFunctionError({
          functionName: "get-subscription",
          error: mappingError,
          context: { phase: "load_stripe_customer_mapping", userId },
        });
        console.error(
          "Failed to load Stripe customer mapping for billing history:",
          mappingError,
        );
      } else {
        stripeCustomerIdForBilling =
          (mapping?.stripe_customer_id as string | null) ?? null;
      }
    }

    // Only Stripe subscriptions have Stripe invoices/payment method
    if (
      (provider === "stripe" || provider == null) && stripeCustomerIdForBilling
    ) {
      try {
        // Get all invoices for the customer (works for both Lifetime and recurring)
        // Lifetime: invoice_creation enabled in checkout creates official invoices
        // Recurring: invoices created automatically by subscription
        const invoiceList = await stripe.invoices.list({
          customer: stripeCustomerIdForBilling,
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
        subscription: finalSubscription,
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
