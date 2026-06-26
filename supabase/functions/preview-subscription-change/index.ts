import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { corsHeaders } from "../shared/cors.ts";
import { getPriceId } from "../shared/stripe-subscription-prices.ts";
import type {
  BillingInterval,
  PlanType,
} from "../shared/subscription-constants.ts";
import { authenticateUser } from "../shared/auth.ts";
import { buildCheckoutPageUrl } from "../shared/checkout-redirect.ts";
import { getSubscriptionChangePolicy } from "../shared/subscription-change-policy.ts";

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Plan hierarchy for determining upgrade vs downgrade
const PLAN_HIERARCHY = {
  free: 0,
  plus: 1,
  premium: 2,
};

function resolveRecurringPriceId(plan: string, interval: string): string {
  return getPriceId(plan as PlanType, interval as BillingInterval);
}

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
    const newPlan = typeof body.newPlan === "string" ? body.newPlan : null;
    const newBillingIntervalRaw = typeof body.newBillingInterval === "string"
      ? body.newBillingInterval
      : null;
    const newBillingInterval =
      newBillingIntervalRaw === "monthly" || newBillingIntervalRaw === "yearly"
        ? newBillingIntervalRaw
        : null;

    if (!newPlan) {
      return new Response(JSON.stringify({ error: "Plan is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(newPlan in PLAN_HIERARCHY) && newPlan !== "lifetime") {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lifetime doesn't require billing interval (one-time payment)
    if (newPlan !== "lifetime" && !newBillingIntervalRaw) {
      return new Response(
        JSON.stringify({
          error: "Billing interval is required for recurring plans",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (newPlan !== "lifetime" && !newBillingInterval) {
      return new Response(
        JSON.stringify({
          error: "Invalid billing interval",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the user's current subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      console.error("Error fetching subscription:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get current plan
    const currentPlan = subscription?.plan || "free";

    if (subscription?.bound_to_user_id) {
      return new Response(
        JSON.stringify({
          error:
            "Household shared members cannot manage the owner's subscription.",
          code: "BOUND_TO_HOUSEHOLD",
          action: "no_change",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // IMPORTANT: Lifetime users cannot preview plan changes (one-time purchase, permanent)
    if (currentPlan === "lifetime") {
      return new Response(
        JSON.stringify({
          error:
            "Lifetime subscriptions cannot be changed. You already have permanent access.",
          action: "no_change",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cannot preview "upgrade" to Lifetime - must use checkout
    if (newPlan === "lifetime") {
      const checkoutUrl = buildCheckoutPageUrl(
        Deno.env.get("APP_URL") || "https://moneko.io",
        { plan: "lifetime" },
      );

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

    // At this point, newPlan is not lifetime, so billing interval must be valid.
    const billingInterval = newBillingInterval;
    if (!billingInterval) {
      return new Response(
        JSON.stringify({
          error: "Billing interval is required for recurring plans",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const changePolicy = getSubscriptionChangePolicy({
      currentPlan: currentPlan as PlanType,
      newPlan: newPlan as PlanType,
      currentInterval: subscription?.billing_interval as BillingInterval | null,
      newInterval: billingInterval as BillingInterval,
    });
    const { isUpgrade, isDowngrade, isSamePlan } = changePolicy;

    // Special case: Downgrading to free plan (cancellation)
    if (newPlan === "free") {
      if (
        !subscription ||
        subscription.status !== "active" ||
        currentPlan === "free"
      ) {
        return new Response(
          JSON.stringify({
            error: "You are already on the free plan",
            action: "no_change",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Downgrading to free means canceling the subscription
      const periodEnd = new Date(
        (subscription as any).current_period_end || Date.now(),
      ).toLocaleDateString();
      return new Response(
        JSON.stringify({
          action: "cancel_subscription",
          isUpgrade: false,
          isDowngrade: true,
          currentPlan,
          newPlan: "free",
          newBillingInterval: "monthly",
          billingBehavior: "end_of_period",
          immediateCharge: 0,
          futureRecurringAmount: 0,
          totalProration: 0,
          currency: "usd",
          currentPeriodEnd: (subscription as any).current_period_end,
          message:
            `Your subscription will be canceled and you'll return to the free plan on ${periodEnd}. You'll continue to have access to your current plan until then.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If user is on free plan or no active subscription, they need to create a new subscription
    if (
      !subscription ||
      subscription.status !== "active" ||
      currentPlan === "free"
    ) {
      // For new subscriptions, return basic pricing info without preview
      let priceId: string;
      try {
        priceId = resolveRecurringPriceId(newPlan, billingInterval);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: error instanceof Error
              ? error.message
              : "Invalid plan or billing interval",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get price details from Stripe
      const price = await stripe.prices.retrieve(priceId);

      return new Response(
        JSON.stringify({
          action: "new_subscription",
          isUpgrade: true,
          isDowngrade: false,
          currentPlan,
          newPlan,
          newBillingInterval: billingInterval,
          immediateCharge: price.unit_amount || 0,
          currency: price.currency,
          message: `You'll be charged ${
            ((price.unit_amount || 0) / 100).toFixed(2)
          } ${price.currency.toUpperCase()} ${
            newBillingInterval === "monthly" ? "per month" : "per year"
          }`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // For existing subscriptions, get the new price ID
    let newPriceId: string;
    try {
      newPriceId = resolveRecurringPriceId(newPlan, billingInterval);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "Invalid plan or billing interval",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Retrieve the current subscription from Stripe
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

    // Set proration date to now for consistent calculations
    const prorationDate = Math.floor(Date.now() / 1000);

    // Preview the upcoming invoice with the subscription change
    try {
      const upcomingInvoice = await stripe.invoices.upcoming({
        customer: stripeSubscription.customer as string,
        subscription: subscription.stripe_subscription_id,
        subscription_items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        subscription_proration_date: prorationDate,
      });

      // Calculate proration amounts
      const prorationLineItems = upcomingInvoice.lines.data.filter(
        (line: any) => line.proration,
      );
      const totalProration = prorationLineItems.reduce(
        (sum: number, line: any) => sum + line.amount,
        0,
      );

      // Get the new recurring amount
      const recurringLineItems = upcomingInvoice.lines.data.filter(
        (line: any) => !line.proration,
      );
      const newRecurringAmount = recurringLineItems.reduce(
        (sum: number, line: any) => sum + line.amount,
        0,
      );

      // Determine billing behavior
      let billingBehavior = changePolicy.billingBehavior;
      let message = "";

      if (isUpgrade) {
        // Upgrades: immediate charge with proration
        message = totalProration > 0
          ? `You'll be charged ${
            (upcomingInvoice.amount_due / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} immediately (including prorated ${
            (totalProration / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} credit for unused time). Your subscription will renew at ${
            (newRecurringAmount / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} ${
            newBillingInterval === "monthly" ? "per month" : "per year"
          }.`
          : `You'll be charged ${
            (upcomingInvoice.amount_due / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} immediately. Your subscription will renew at ${
            (newRecurringAmount / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} ${
            newBillingInterval === "monthly" ? "per month" : "per year"
          }.`;
      } else if (isDowngrade) {
        // Downgrades: apply at period end
        billingBehavior = "end_of_period";
        const periodEnd = new Date(
          stripeSubscription.current_period_end * 1000,
        ).toLocaleDateString();
        message = totalProration < 0
          ? `Your plan will change to ${newPlan} on ${periodEnd}. You'll receive a credit of ${
            Math.abs(totalProration / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} applied to your next invoice. New rate: ${
            (newRecurringAmount / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} ${
            newBillingInterval === "monthly" ? "per month" : "per year"
          }.`
          : `Your plan will change to ${newPlan} on ${periodEnd}. New rate: ${
            (newRecurringAmount / 100).toFixed(2)
          } ${upcomingInvoice.currency.toUpperCase()} ${
            newBillingInterval === "monthly" ? "per month" : "per year"
          }.`;
      } else if (isSamePlan) {
        // Same plan, different billing interval
        const currentInterval = stripeSubscription.items.data[0].price.recurring
          ?.interval;
        if (currentInterval !== newBillingInterval) {
          // Billing interval change: immediate charge
          message =
            `Switching to ${newBillingInterval} billing. You'll be charged ${
              (upcomingInvoice.amount_due / 100).toFixed(2)
            } ${upcomingInvoice.currency.toUpperCase()} immediately (including prorated credit for unused time). New rate: ${
              (newRecurringAmount / 100).toFixed(2)
            } ${upcomingInvoice.currency.toUpperCase()} ${
              newBillingInterval === "monthly" ? "per month" : "per year"
            }.`;
        } else {
          message =
            "No changes needed - you are already on this plan and billing interval.";
        }
      }

      return new Response(
        JSON.stringify({
          action: "update_subscription",
          isUpgrade,
          isDowngrade,
          isSamePlan,
          currentPlan,
          newPlan,
          newBillingInterval,
          billingBehavior,
          immediateCharge: billingBehavior === "immediate"
            ? upcomingInvoice.amount_due
            : 0,
          futureRecurringAmount: newRecurringAmount,
          totalProration,
          currency: upcomingInvoice.currency,
          currentPeriodEnd: stripeSubscription.current_period_end,
          message,
          preview: {
            amountDue: upcomingInvoice.amount_due,
            subtotal: upcomingInvoice.subtotal,
            total: upcomingInvoice.total,
            lineItems: upcomingInvoice.lines.data.map((line: any) => ({
              description: line.description,
              amount: line.amount,
              proration: line.proration,
              period: line.period,
            })),
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error: any) {
      console.error("Error previewing invoice:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to preview subscription change",
          details: error?.message ?? "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: any) {
    console.error("Error in preview-subscription-change:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error?.message ?? "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
