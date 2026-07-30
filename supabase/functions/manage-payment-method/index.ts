import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";

// Initialize Stripe with your secret key - using latest API version
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  let requestBody: any = null;

  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authResult = await authenticateUser(req, supabase);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId!;

    // Parse the request body ONCE
    requestBody = await req.json();
    const { action, paymentMethodId } = requestBody;
    const requestUserId = typeof requestBody?.userId === "string"
      ? requestBody.userId
      : null;

    if (requestUserId && requestUserId !== userId) {
      return new Response(JSON.stringify({ error: "User ID mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!action) {
      return new Response(JSON.stringify({ error: "Action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's current subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      console.error("Error fetching subscription:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "No subscription or Stripe customer found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (subscription.bound_to_user_id) {
      return new Response(
        JSON.stringify({
          error:
            "Household shared members cannot manage the owner's billing details.",
          code: "BOUND_TO_HOUSEHOLD",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!subscription.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No subscription or Stripe customer found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle different payment method actions
    switch (action) {
      case "create_setup_intent": {
        // Create a SetupIntent for collecting payment method
        // This is the Stripe-recommended way to collect payment methods for future use
        // Per Stripe best practices (API 2025-07-30): use automatic_payment_methods
        const setupIntent = await stripe.setupIntents.create({
          customer: subscription.stripe_customer_id,
          // Modern approach: automatic_payment_methods replaces deprecated payment_method_types
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never", // Prevent redirect-based methods for simpler UX
          },
          usage: "off_session", // Allows charging the payment method when customer is not present
          metadata: {
            user_id: userId,
            purpose: "payment_method_setup",
            created_at: new Date().toISOString(),
          },
          description: `Payment method setup for user ${userId}`,
        });

        return new Response(
          JSON.stringify({
            client_secret: setupIntent.client_secret,
            setup_intent_id: setupIntent.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "list_payment_methods": {
        // List all payment methods for the customer
        // Per Stripe best practices: filter by customer to avoid security issues
        const paymentMethods = await stripe.paymentMethods.list({
          customer: subscription.stripe_customer_id,
          type: "card",
          limit: 100, // Increased limit to handle users with many cards
        });

        // Get the default payment method from customer or subscription
        const customer = (await stripe.customers.retrieve(
          subscription.stripe_customer_id,
        )) as Stripe.Customer;
        const defaultPaymentMethodId =
          (customer.invoice_settings?.default_payment_method as string) ||
          (subscription.stripe_subscription_id
            ? ((
              await stripe.subscriptions.retrieve(
                subscription.stripe_subscription_id,
              )
            ).default_payment_method as string)
            : null);

        // Filter out invalid/expired payment methods and format
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // JS months are 0-indexed

        const formattedPaymentMethods = paymentMethods.data
          .filter((pm: Stripe.PaymentMethod) => {
            // Filter out expired cards
            if (!pm.card) return false;
            const expYear = pm.card.exp_year;
            const expMonth = pm.card.exp_month;

            // Card is expired if exp_year < current year, or same year but exp_month < current month
            const isExpired = expYear < currentYear ||
              (expYear === currentYear && expMonth < currentMonth);
            return !isExpired;
          })
          .map((pm: Stripe.PaymentMethod) => ({
            id: pm.id,
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
            is_default: pm.id === defaultPaymentMethodId,
          }));

        return new Response(
          JSON.stringify({
            payment_methods: formattedPaymentMethods,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "update_default_payment_method": {
        if (!paymentMethodId) {
          return new Response(
            JSON.stringify({ error: "Payment method ID is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // SECURITY: Verify payment method belongs to customer via listing (more secure than retrieve)
        // This prevents potential security issues with direct retrieve
        const customerPaymentMethods = await stripe.paymentMethods.list({
          customer: subscription.stripe_customer_id,
          type: "card",
        });

        const paymentMethodExists = customerPaymentMethods.data.some(
          (pm: Stripe.PaymentMethod) => pm.id === paymentMethodId,
        );

        if (!paymentMethodExists) {
          return new Response(
            JSON.stringify({
              error:
                "Payment method not found or does not belong to this customer",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Verify payment method is not expired
        const paymentMethod = customerPaymentMethods.data.find(
          (pm: Stripe.PaymentMethod) => pm.id === paymentMethodId,
        );
        if (paymentMethod?.card) {
          const now = new Date();
          const expYear = paymentMethod.card.exp_year;
          const expMonth = paymentMethod.card.exp_month;
          const isExpired = expYear < now.getFullYear() ||
            (expYear === now.getFullYear() && expMonth < now.getMonth() + 1);

          if (isExpired) {
            return new Response(
              JSON.stringify({
                error: "Cannot set an expired card as default payment method",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }

        // Update the default payment method on the customer (for future invoices)
        await stripe.customers.update(subscription.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // If there's an active subscription, also update it
        if (subscription.stripe_subscription_id) {
          await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { default_payment_method: paymentMethodId },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Default payment method updated successfully",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "detach_payment_method": {
        if (!paymentMethodId) {
          return new Response(
            JSON.stringify({ error: "Payment method ID is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // SECURITY: Verify payment method belongs to customer via listing
        const customerPaymentMethods = await stripe.paymentMethods.list({
          customer: subscription.stripe_customer_id,
          type: "card",
        });

        const paymentMethod = customerPaymentMethods.data.find(
          (pm: Stripe.PaymentMethod) => pm.id === paymentMethodId,
        );

        if (!paymentMethod) {
          return new Response(
            JSON.stringify({
              error:
                "Payment method not found or does not belong to this customer",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Check if this is the default payment method and there's an active subscription
        const customer = (await stripe.customers.retrieve(
          subscription.stripe_customer_id,
        )) as Stripe.Customer;
        const isDefault =
          (customer.invoice_settings?.default_payment_method as string) ===
            paymentMethodId;

        // CRITICAL: Cannot remove default payment method if subscription is active
        if (isDefault && subscription.stripe_subscription_id) {
          // Check subscription status to ensure it's actually active
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripe_subscription_id,
          );

          if (
            ["active", "trialing", "past_due"].includes(
              stripeSubscription.status,
            )
          ) {
            return new Response(
              JSON.stringify({
                error:
                  "Cannot remove default payment method while subscription is active. Please add another payment method first.",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }

        // Additional safety: Ensure customer has at least one other payment method if subscription is active
        if (subscription.stripe_subscription_id) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripe_subscription_id,
          );

          if (
            ["active", "trialing", "past_due"].includes(
              stripeSubscription.status,
            )
          ) {
            const remainingPaymentMethods = customerPaymentMethods.data.filter(
              (pm: Stripe.PaymentMethod) => pm.id !== paymentMethodId,
            );

            if (remainingPaymentMethods.length === 0) {
              return new Response(
                JSON.stringify({
                  error:
                    "Cannot remove your last payment method while subscription is active. Please add another payment method first.",
                }),
                {
                  status: 400,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                },
              );
            }
          }
        }

        // Detach the payment method from the customer
        await stripe.paymentMethods.detach(paymentMethodId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment method removed successfully",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "create_portal_session": {
        // Create a billing portal session for the customer
        // This allows customers to manage their subscription, payment methods, and billing history
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: subscription.stripe_customer_id,
          return_url: `${
            req.headers.get("origin") || "https://moneko.io"
          }/dashboard/user-settings/membership`,
        });

        return new Response(
          JSON.stringify({
            url: portalSession.url,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    const errorObject = typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : null;

    const errorMessage = typeof errorObject?.message === "string"
      ? errorObject.message
      : error instanceof Error
      ? error.message
      : "Internal server error";

    const statusCode = typeof errorObject?.statusCode === "number"
      ? errorObject.statusCode
      : 500;

    const errorType = typeof errorObject?.type === "string"
      ? errorObject.type
      : "unknown_error";

    const errorStack = typeof errorObject?.stack === "string"
      ? errorObject.stack
      : error instanceof Error
      ? error.stack
      : undefined;

    console.error("Error in manage-payment-method:", {
      error: errorMessage,
      stack: errorStack,
      action: requestBody?.action,
      userId: requestBody?.userId,
    });

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorType,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
