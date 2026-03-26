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
    const returnTrialThresholdMinutesRaw = Number(
      Deno.env.get("PAYWALL_RETURN_THRESHOLD_MINUTES") ?? "3",
    );
    const returnTrialThresholdMinutes =
      Number.isFinite(returnTrialThresholdMinutesRaw) &&
      returnTrialThresholdMinutesRaw > 0
        ? Math.floor(returnTrialThresholdMinutesRaw)
        : 3;

    const returnTrialDurationMinutesRaw = Number(
      Deno.env.get("PAYWALL_RETURN_TRIAL_DURATION_MINUTES") ??
        String(14 * 24 * 60),
    );
    const returnTrialDurationMinutes =
      Number.isFinite(returnTrialDurationMinutesRaw) &&
      returnTrialDurationMinutesRaw > 0
        ? Math.floor(returnTrialDurationMinutesRaw)
        : 14 * 24 * 60;

    if (!action) {
      return new Response(JSON.stringify({ error: "Action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_paywall_return_exit") {
      const now = new Date();
      console.log(
        `[PaywallReturnTrial] mark_exit user=${userId} at=${now.toISOString()}`,
      );
      const { data: markSubscription, error: markSubscriptionError } =
        await supabase
          .from("subscriptions")
          .select("status, plan, current_period_end, bound_to_user_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (markSubscriptionError) {
        console.error(
          "Error checking subscription before recording paywall exit:",
          markSubscriptionError,
        );
        return new Response(
          JSON.stringify({ error: "Failed to validate paywall exit" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const markPeriodEnd = markSubscription?.current_period_end
        ? new Date(markSubscription.current_period_end).getTime()
        : NaN;
      const hasActiveAccess = Boolean(
        markSubscription &&
          ((markSubscription.status === "active" &&
            markSubscription.plan === "lifetime") ||
            (markSubscription.status === "active" &&
              Boolean(markSubscription.bound_to_user_id) &&
              !Number.isNaN(markPeriodEnd) &&
              markPeriodEnd > now.getTime()) ||
            (markSubscription.status === "active" &&
              !Number.isNaN(markPeriodEnd) &&
              markPeriodEnd > now.getTime()) ||
            (markSubscription.status === "trialing" &&
              !Number.isNaN(markPeriodEnd) &&
              markPeriodEnd > now.getTime())),
      );

      if (hasActiveAccess) {
        return new Response(
          JSON.stringify({
            error: "User already has active subscription access",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { error: markExitError } = await supabase
        .from("users")
        .update({ paywall_return_trial_exit_at: now.toISOString() })
        .eq("id", userId);

      if (markExitError) {
        console.error(
          "Error recording paywall return exit timestamp:",
          markExitError,
        );
        return new Response(
          JSON.stringify({ error: "Failed to record paywall exit" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Paywall exit recorded" }),
        {
          status: 200,
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

      case "grant_paywall_return_trial": {
        const now = new Date();
        console.log(
          `[PaywallReturnTrial] grant_attempt user=${userId} now=${now.toISOString()} threshold_min=${returnTrialThresholdMinutes} duration_min=${returnTrialDurationMinutes}`,
        );
        const trialEndAt = new Date(
          now.getTime() + returnTrialDurationMinutes * 60 * 1000,
        );

        const isPeriodStillActive = (periodEnd: string | null | undefined) => {
          if (!periodEnd) return false;
          const endMs = new Date(periodEnd).getTime();
          if (Number.isNaN(endMs)) return false;
          return endMs > now.getTime();
        };

        const hasActiveAccess = Boolean(
          subscription &&
            ((subscription.status === "active" &&
              subscription.plan === "lifetime") ||
              ((subscription.status === "active" ||
                subscription.status === "trialing") &&
                isPeriodStillActive(subscription.current_period_end))),
        );

        if (hasActiveAccess) {
          return new Response(
            JSON.stringify({
              error: "User already has active subscription access",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { data: userEligibility, error: userEligibilityError } =
          await supabase
            .from("users")
            .select(
              "paywall_return_trial_granted_at, paywall_return_trial_exit_at",
            )
            .eq("id", userId)
            .maybeSingle();

        if (userEligibilityError) {
          console.error(
            "Error loading paywall return trial eligibility:",
            userEligibilityError,
          );
          return new Response(
            JSON.stringify({ error: "Failed to validate trial eligibility" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (!userEligibility?.paywall_return_trial_exit_at) {
          console.log(
            `[PaywallReturnTrial] grant_blocked_no_exit user=${userId}`,
          );
          return new Response(
            JSON.stringify({
              error: "No eligible paywall exit recorded for return trial",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (userEligibility.paywall_return_trial_granted_at) {
          console.log(
            `[PaywallReturnTrial] grant_blocked_already_granted user=${userId} granted_at=${userEligibility.paywall_return_trial_granted_at}`,
          );
          return new Response(
            JSON.stringify({
              error: "Return trial already granted previously",
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const exitAt = new Date(userEligibility.paywall_return_trial_exit_at);
        if (Number.isNaN(exitAt.getTime())) {
          return new Response(
            JSON.stringify({ error: "Invalid paywall exit timestamp" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const minEligibleReturnAt = new Date(
          now.getTime() - returnTrialThresholdMinutes * 60 * 1000,
        ).toISOString();

        if (exitAt.getTime() > new Date(minEligibleReturnAt).getTime()) {
          console.log(
            `[PaywallReturnTrial] grant_blocked_threshold user=${userId} exit_at=${userEligibility.paywall_return_trial_exit_at} min_eligible_at=${minEligibleReturnAt}`,
          );
          return new Response(
            JSON.stringify({
              error: "Return trial threshold not met",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const trialGrantedAt = now.toISOString();
        const rollbackGrantMarker = async () => {
          const { error: rollbackError } = await supabase
            .from("users")
            .update({ paywall_return_trial_granted_at: null })
            .eq("id", userId)
            .eq("paywall_return_trial_granted_at", trialGrantedAt);

          if (rollbackError) {
            console.error(
              "Failed to rollback paywall return trial marker:",
              rollbackError,
            );
          }
        };

        const { data: markerReservation, error: markerReservationError } =
          await supabase
            .from("users")
            .update({ paywall_return_trial_granted_at: trialGrantedAt })
            .eq("id", userId)
            .is("paywall_return_trial_granted_at", null)
            .lte("paywall_return_trial_exit_at", minEligibleReturnAt)
            .select("id")
            .maybeSingle();

        if (markerReservationError) {
          console.error(
            "Error reserving paywall return trial marker:",
            markerReservationError,
          );
          return new Response(
            JSON.stringify({ error: "Failed to validate trial eligibility" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (!markerReservation) {
          console.log(
            `[PaywallReturnTrial] grant_blocked_marker_reservation user=${userId}`,
          );
          return new Response(
            JSON.stringify({
              error: "Return trial already granted previously",
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const trialPlan = "plus";
        const trialBillingInterval = "yearly";

        if (subscription?.id) {
          const { data: updatedSubscriptionRow, error: updateError } =
            await supabase
              .from("subscriptions")
              .update({
                plan: trialPlan,
                status: "trialing",
                billing_interval: trialBillingInterval,
                current_period_end: trialEndAt.toISOString(),
                trial_start: now.toISOString(),
                trial_end: trialEndAt.toISOString(),
                cancel_at_period_end: false,
                provider: "stripe",
                store_product_id: null,
                stripe_subscription_id: null,
                stripe_customer_id: null,
                bound_to_user_id: null,
                bound_to_household_id: null,
                updated_at: now.toISOString(),
              })
              .eq("id", subscription.id)
              .or(
                `status.is.null,status.in.(canceled,inactive,past_due,unpaid,incomplete_expired),and(status.eq.active,current_period_end.lte.${now.toISOString()}),and(status.eq.active,current_period_end.is.null),and(status.eq.trialing,current_period_end.lte.${now.toISOString()}),and(status.eq.trialing,current_period_end.is.null)`,
              )
              .select("id")
              .maybeSingle();

          if (updateError) {
            console.error(
              "Error updating return trial subscription:",
              updateError,
            );
            const response = new Response(
              JSON.stringify({ error: "Failed to grant return trial" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
            await rollbackGrantMarker();
            return response;
          }

          if (!updatedSubscriptionRow) {
            const response = new Response(
              JSON.stringify({
                error: "Subscription state changed. Trial was not granted.",
              }),
              {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
            await rollbackGrantMarker();
            return response;
          }
        } else {
          const { error: insertError } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan: trialPlan,
              status: "trialing",
              billing_interval: trialBillingInterval,
              current_period_end: trialEndAt.toISOString(),
              trial_start: now.toISOString(),
              trial_end: trialEndAt.toISOString(),
              provider: "stripe",
              store_product_id: null,
              cancel_at_period_end: false,
              stripe_subscription_id: null,
              stripe_customer_id: null,
              bound_to_user_id: null,
              bound_to_household_id: null,
            });

          if (insertError) {
            console.error(
              "Error inserting return trial subscription:",
              insertError,
            );

            if ((insertError as { code?: string }).code === "23505") {
              const response = new Response(
                JSON.stringify({
                  error: "Subscription already exists. Trial was not granted.",
                }),
                {
                  status: 409,
                  headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                  },
                },
              );
              await rollbackGrantMarker();
              return response;
            }

            const response = new Response(
              JSON.stringify({ error: "Failed to grant return trial" }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
            await rollbackGrantMarker();
            return response;
          }
        }

        await supabase
          .from("users")
          .update({ paywall_return_trial_exit_at: null })
          .eq("id", userId);

        console.log(
          `[PaywallReturnTrial] grant_success user=${userId} trial_end=${trialEndAt.toISOString()}`,
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: "Return trial granted",
            trial_duration_minutes: returnTrialDurationMinutes,
            trial_end: trialEndAt.toISOString(),
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
