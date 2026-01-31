import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { corsHeaders } from "../shared/cors.ts";
import { SUBSCRIPTION_PRICES } from "../shared/stripe-subscription-prices.ts";
import { authenticateUser } from "../shared/auth.ts";

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
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

    // Authenticate user from JWT token - NEVER trust userId from request body
    const authResult = await authenticateUser(req, supabase);

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use authenticated userId - this is the ONLY safe userId
    const userId = authResult.userId!;

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = typeof body.action === "string" ? body.action : null;
    const plan = typeof body.plan === "string" ? body.plan : null;
    const billingInterval =
      typeof body.billingInterval === "string" ? body.billingInterval : null;
    const prorationDate =
      typeof body.prorationDate === "number" ? body.prorationDate : null;

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
      // PGRST116 is "no rows returned"
      console.error("Error fetching subscription:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle different subscription actions
    switch (action) {
      case "change_plan": {
        if (!plan || !billingInterval) {
          return new Response(
            JSON.stringify({
              error: "Plan and billing interval are required for plan change",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Get current plan for comparison
        const currentPlan = subscription?.plan || "free";

        // IMPORTANT: Lifetime users cannot change plans (one-time purchase)
        if (currentPlan === "lifetime") {
          return new Response(
            JSON.stringify({
              error:
                "Lifetime subscriptions cannot be changed. You already have permanent access.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Cannot "upgrade" to Lifetime via plan change - must use checkout
        if (plan === "lifetime") {
          const origin = req.headers.get("origin") || "https://moneko.io";
          const checkoutUrl = `${origin}/checkout?plan=lifetime`;

          return new Response(
            JSON.stringify({
              action: "redirect_to_checkout",
              url: checkoutUrl,
              message:
                "Lifetime is a one-time purchase. Please complete checkout to upgrade.",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Plan hierarchy for determining upgrade vs downgrade (without lifetime)
        const PLAN_HIERARCHY: Record<string, number> = {
          free: 0,
          plus: 1,
          premium: 2,
        };
        const isUpgrade =
          (PLAN_HIERARCHY[plan] ?? 0) > (PLAN_HIERARCHY[currentPlan] ?? 0);

        // Special case: Downgrading to free plan (cancel subscription)
        if (plan === "free") {
          if (
            !subscription ||
            subscription.status !== "active" ||
            currentPlan === "free"
          ) {
            return new Response(
              JSON.stringify({
                error:
                  "You are already on the free plan or have no active subscription",
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }

          // Cancel the subscription at period end
          const canceledSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: true },
          );

          // Update the subscription in the database
          await supabase
            .from("subscriptions")
            .update({
              cancel_at_period_end: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          return new Response(
            JSON.stringify({
              success: true,
              message:
                "Subscription will be canceled at the end of the billing period",
              subscription: canceledSubscription,
              isDowngrade: true,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // If no active subscription, user should go through pricing/checkout flow
        // This ensures proper trial eligibility checking and payment collection
        if (
          !subscription ||
          subscription.status !== "active" ||
          currentPlan === "free"
        ) {
          const origin = req.headers.get("origin") || "https://moneko.io";
          const checkoutUrl = `${origin}/checkout?plan=${plan}&billing=${billingInterval}`;

          return new Response(
            JSON.stringify({
              action: "redirect_to_checkout",
              url: checkoutUrl,
              message: "Please complete checkout to subscribe to this plan",
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // For existing subscriptions, update the subscription in Stripe
        const priceId = (SUBSCRIPTION_PRICES as any)?.[plan]?.[billingInterval];

        if (!priceId) {
          return new Response(
            JSON.stringify({ error: "Invalid plan or billing interval" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Retrieve the current subscription from Stripe (single API call)
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id,
        );

        if (!stripeSubscription || !stripeSubscription.items.data[0]) {
          return new Response(
            JSON.stringify({
              error: "Could not retrieve subscription details from Stripe",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const subscriptionItemId = stripeSubscription.items.data[0].id;

        // UPGRADES: Apply immediately with proration
        if (isUpgrade) {
          const updateParams: any = {
            items: [
              {
                id: subscriptionItemId,
                price: priceId,
              },
            ],
            metadata: {
              plan,
              billing_interval: billingInterval,
            },
            proration_behavior: "always_invoice", // Immediate charge with proration
            payment_behavior: "error_if_incomplete",
            cancel_at_period_end: false,
          };

          if (prorationDate) {
            updateParams.proration_date = prorationDate;
          }

          const updatedSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            updateParams,
          );

          await supabase
            .from("subscriptions")
            .update({
              plan,
              billing_interval: billingInterval,
              cancel_at_period_end: false,
              pending_plan: null,
              pending_interval: null,
              pending_effective_date: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: `Subscription upgraded to ${plan} (${billingInterval})`,
              subscription: updatedSubscription,
              isUpgrade: true,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // DOWNGRADES: Schedule for end of period using Subscription Schedules
        try {
          // Create subscription schedule from existing subscription
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscription.stripe_subscription_id,
          });

          // Update schedule with two phases:
          // Phase 1: Current plan until period end
          // Phase 2: New plan starting at period end
          await stripe.subscriptionSchedules.update(schedule.id, {
            end_behavior: "release", // Release subscription back to normal billing
            phases: [
              {
                items: [
                  {
                    price: stripeSubscription.items.data[0].price.id,
                    quantity: 1,
                  },
                ],
                start_date: stripeSubscription.current_period_start,
                end_date: stripeSubscription.current_period_end,
              },
              {
                items: [
                  {
                    price: priceId,
                    quantity: 1,
                  },
                ],
                iterations: 1, // Just one billing cycle in new phase
                metadata: {
                  plan,
                  billing_interval: billingInterval,
                },
              },
            ],
          });

          // Track pending change in database
          await supabase
            .from("subscriptions")
            .update({
              pending_plan: plan,
              pending_interval: billingInterval,
              pending_effective_date: new Date(
                stripeSubscription.current_period_end * 1000,
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: `Subscription will downgrade to ${plan} (${billingInterval}) at end of current period`,
              subscription: stripeSubscription,
              isUpgrade: false,
              pendingChange: {
                plan,
                billingInterval,
                effectiveDate: new Date(
                  stripeSubscription.current_period_end * 1000,
                ).toISOString(),
              },
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        } catch (scheduleError: any) {
          console.error("Error creating subscription schedule:", scheduleError);
          throw new Error(
            `Failed to schedule downgrade: ${scheduleError?.message ?? "unknown"}`,
          );
        }
      }

      case "cancel": {
        if (
          !subscription ||
          (subscription.status !== "active" &&
            subscription.status !== "trialing")
        ) {
          return new Response(
            JSON.stringify({ error: "No active subscription to cancel" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // IMPORTANT: Lifetime subscriptions cannot be canceled (one-time purchase, never expires)
        if (subscription.plan === "lifetime") {
          return new Response(
            JSON.stringify({
              error:
                "Lifetime subscriptions are permanent and cannot be canceled.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Cancel the subscription at period end
        const canceledSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: true },
        );

        // Update the subscription in the database
        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        return new Response(
          JSON.stringify({
            success: true,
            message:
              "Subscription will be canceled at the end of the billing period",
            subscription: canceledSubscription,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "cancel_immediately": {
        if (
          !subscription ||
          (subscription.status !== "active" &&
            subscription.status !== "trialing")
        ) {
          return new Response(
            JSON.stringify({ error: "No active subscription to cancel" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // IMPORTANT: Lifetime subscriptions cannot be canceled (one-time purchase, never expires)
        if (subscription.plan === "lifetime") {
          return new Response(
            JSON.stringify({
              error:
                "Lifetime subscriptions are permanent and cannot be canceled.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Cancel the subscription immediately
        const canceledSubscription = await stripe.subscriptions.cancel(
          subscription.stripe_subscription_id,
        );

        // Update the subscription in the database
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription canceled immediately",
            subscription: canceledSubscription,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "resume": {
        if (
          !subscription ||
          subscription.status !== "active" ||
          !subscription.cancel_at_period_end
        ) {
          return new Response(
            JSON.stringify({ error: "No subscription to resume" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Resume the subscription by removing cancel_at_period_end
        const resumedSubscription = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: false },
        );

        // Update the subscription in the database
        await supabase
          .from("subscriptions")
          .update({
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription resumed successfully",
            subscription: resumedSubscription,
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
  } catch (error) {
    console.error("Error in update-subscription:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
