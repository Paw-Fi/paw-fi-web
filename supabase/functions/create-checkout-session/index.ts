/**
 * Create Stripe Checkout Session - Production Ready
 *
 * Creates a Stripe Checkout session for subscription payments
 * Implements:
 * - Customer creation/attachment
 * - Proper trial handling with required payment method
 * - Idempotency
 * - Input validation
 * - Price ID validation
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { getCorsHeaders } from "../shared/cors.ts";
import { validate as validateUuid } from "https://deno.land/std@0.177.0/uuid/mod.ts";
import {
  getPriceId,
  validatePriceId,
} from "../shared/stripe-subscription-prices.ts";
import { authenticateUser } from "../shared/auth.ts";
import { validateEnvironment } from "../shared/env-validation.ts";
import { generateIdempotencyKey } from "../shared/idempotency.ts";
import {
  createCheckoutSessionWithRetry,
  createCustomerWithRetry,
  retrieveCustomerWithRetry,
} from "../shared/stripe-retry.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { hasActiveHouseholdSubscriptionAccess } from "../shared/household-subscription-sharing.ts";
import {
  BillingInterval,
  isValidInterval,
  isValidPlan,
  PlanType,
} from "../shared/subscription-constants.ts";
import {
  DEFAULT_REGIONAL_PRICING_MARKET_ID,
  getRegionalStripePriceLookupKey,
  type RegionalPricingMarket,
} from "../shared/regional-pricing.generated.ts";
import {
  assertCheckoutLineItem,
  assertCheckoutSessionCurrency,
  buildRegionalPriceCacheKey,
  getRegionalCheckoutAmount,
  resolveRegionalCheckoutMarket,
} from "../shared/regional-checkout.ts";
import { buildCheckoutRedirectUrls } from "../shared/checkout-redirect.ts";
import {
  checkoutVerificationPersistenceErrorResponse,
  persistCheckoutSessionVerificationOrExpire,
} from "../shared/checkout-session-security.ts";

// Validate environment on startup
const env = validateEnvironment();

function reportCreateCheckoutSessionError(
  phase: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  void reportEdgeFunctionError({
    functionName: "create-checkout-session",
    error,
    context: {
      phase,
      ...context,
    },
  });
}

// Initialize Stripe with validated configuration
const stripe = new Stripe(env.stripeSecretKey, {
  // Use account's default API version for maximum compatibility
  httpClient: Stripe.createFetchHttpClient(),
});

const regionalPriceIdCache = new Map<string, string>();

async function assertSessionPricingOrExpire(
  session: Stripe.Checkout.Session,
  expected: { priceId: string; currency: string; amount: number },
): Promise<void> {
  try {
    assertCheckoutSessionCurrency(session.currency, expected.currency);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 2,
    });
    const lineItem = lineItems.data[0];
    assertCheckoutLineItem(
      {
        lineItemCount: lineItems.data.length,
        priceId: lineItem?.price?.id,
        currency: lineItem?.currency,
        amountSubtotal: lineItem?.amount_subtotal,
      },
      expected,
    );
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id);
    throw error;
  }
}

async function resolveRegionalPriceId(
  plan: PlanType,
  billingInterval: BillingInterval | undefined,
  market: RegionalPricingMarket,
): Promise<string> {
  const planTarget = plan === "lifetime"
    ? "lifetime"
    : billingInterval === "yearly"
    ? "plus_commitment_monthly"
    : "plus_monthly";
  const lookupKey = getRegionalStripePriceLookupKey(planTarget);
  const cacheKey = buildRegionalPriceCacheKey(lookupKey, market.currencyCode);
  const cached = regionalPriceIdCache.get(cacheKey);
  if (cached) return cached;

  const matches = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    expand: ["data.currency_options"],
    limit: 2,
  });
  if (matches.data.length > 1) {
    throw new Error(`Multiple Stripe Prices found for ${lookupKey}`);
  }
  const regionalPrice = matches.data[0];
  if (regionalPrice) {
    const currency = market.currencyCode.toLowerCase();
    const expectedAmount = plan === "lifetime"
      ? market.lifetime
      : billingInterval === "yearly"
      ? Math.round(market.yearly / 12)
      : market.monthly;
    const actualAmount = regionalPrice.currency === currency
      ? regionalPrice.unit_amount
      : regionalPrice.currency_options?.[currency]?.unit_amount;
    if (actualAmount !== expectedAmount) {
      throw new Error(`Stripe Price amount mismatch for ${lookupKey}`);
    }
    regionalPriceIdCache.set(cacheKey, regionalPrice.id);
    return regionalPrice.id;
  }

  // Keep the original USD checkout available until the first catalog sync.
  if (market.id === DEFAULT_REGIONAL_PRICING_MARKET_ID) {
    return plan === "lifetime"
      ? getPriceId(plan)
      : getPriceId(plan, billingInterval);
  }
  throw new Error(
    `Regional Stripe Price not found for ${market.id}. Run pricing:stripe:sync.`,
  );
}

// Initialize Supabase client
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function appendNonceToUrl(url: string, nonce: string): string {
  try {
    // IMPORTANT: We cannot use URL.searchParams because it URL-encodes the values,
    // which breaks Stripe's {CHECKOUT_SESSION_ID} placeholder replacement.
    // Stripe requires the placeholder to be unencoded.
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${nonce}`;
  } catch {
    return url;
  }
}

function safeParseUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function sanitizeRedirectUrl(
  value: string | null,
  allowedHosts: Set<string>,
): string | null {
  const parsed = safeParseUrl(value);
  if (!parsed) return null;

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!allowedHosts.has(parsed.hostname)) return null;

  // Return the original value to preserve Stripe placeholders like {CHECKOUT_SESSION_ID}
  // URL.toString() would URL-encode the curly braces, breaking Stripe's placeholder replacement
  return value;
}

serve(async (req: Request) => {
  // Get CORS headers - proper configuration using shared utility
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
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

    // Parse the request body (plan, billingInterval, successUrl, cancelUrl, promoCode)
    // NOTE: isTrial is determined by backend based on subscription history (security)
    // NOTE: billingInterval is optional for Lifetime (one-time payment)
    const {
      plan,
      billingInterval,
      successUrl,
      cancelUrl,
      promoCode,
      country,
      currency,
    } = await req.json();

    let regionalSelection;
    try {
      regionalSelection = resolveRegionalCheckoutMarket({ country, currency });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error
            ? error.message
            : "Invalid checkout market",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const requestedCountry = regionalSelection.country;
    const requestedCurrency = regionalSelection.currency;
    const regionalMarket = regionalSelection.market;
    const checkoutCurrency = requestedCurrency.toLowerCase();

    // Validate plan
    if (!plan || !isValidPlan(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Free plan doesn't need a checkout session
    if (plan === "free") {
      return new Response(
        JSON.stringify({ error: "Free plan does not require payment" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Lifetime is one-time payment, doesn't require billing interval
    // For other plans, validate billing interval
    if (plan !== "lifetime") {
      if (!billingInterval || !isValidInterval(billingInterval)) {
        return new Response(
          JSON.stringify({ error: "Invalid billing interval" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const expectedCheckoutAmount = getRegionalCheckoutAmount(
      plan,
      billingInterval,
      regionalMarket,
    );

    // Get the price ID based on plan and billing interval (with validation)
    let priceId: string;
    try {
      // Lifetime doesn't use billing interval
      priceId = await resolveRegionalPriceId(
        plan as PlanType,
        billingInterval as BillingInterval | undefined,
        regionalMarket,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error getting price ID:", message);
      reportCreateCheckoutSessionError("regional_price_resolution", error, {
        userId,
        plan,
        billingInterval,
        pricingCountry: requestedCountry,
        currency: requestedCurrency,
      });
      return new Response(
        JSON.stringify({
          error: "Checkout pricing is temporarily unavailable",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Double-check price ID is valid
    if (!validatePriceId(priceId)) {
      console.error("Invalid price ID format:", priceId);
      return new Response(
        JSON.stringify({ error: "Invalid price configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Creating checkout session:", {
      userId,
      plan,
      billingInterval,
      priceId,
      promoCode,
      requestedCountry,
      checkoutCurrency,
    });

    // SECURITY: Check if user is bound to a household subscription
    // Bound users cannot create their own subscriptions - they must unbind first
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select(
        "id, provider, bound_to_user_id, bound_to_household_id, plan, status, stripe_subscription_id",
      )
      .eq("user_id", userId)
      .maybeSingle();

    // CRITICAL: Prevent bound users from subscribing directly
    if (existingSub?.bound_to_user_id) {
      const boundToUserId = existingSub.bound_to_user_id;
      const { data: ownerSub, error: ownerSubError } = await supabase
        .from("subscriptions")
        .select("plan, status, bound_to_user_id, current_period_end, trial_end")
        .eq("user_id", boundToUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownerSubError) {
        console.error("Failed to verify household owner subscription:", {
          userId,
          boundToUserId,
          ownerSubError,
        });
        return new Response(
          JSON.stringify({ error: "Failed to verify household subscription" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const ownerHasActiveSubscription = hasActiveHouseholdSubscriptionAccess(
        ownerSub,
      );

      if (ownerHasActiveSubscription) {
        console.error("User is bound to active household subscription:", {
          userId,
          boundTo: boundToUserId,
          household: existingSub.bound_to_household_id,
        });
        return new Response(
          JSON.stringify({
            error:
              "You are currently sharing a household subscription. Please leave the household first to manage your own subscription.",
            code: "BOUND_TO_HOUSEHOLD",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("Allowing checkout for bound user:", {
        userId,
        boundTo: boundToUserId,
        household: existingSub.bound_to_household_id,
        ownerPlan: ownerSub?.plan ?? null,
        ownerStatus: ownerSub?.status ?? null,
      });
    }

    // Prevent creating a Stripe checkout when the active subscription is managed by IAP.
    // We cannot cancel App Store / Play Store subscriptions from Stripe, so this avoids double billing.
    if (
      existingSub &&
      (existingSub as any).provider &&
      (existingSub as any).provider !== "stripe" &&
      ["active", "trialing", "past_due", "paused"].includes(
        String((existingSub as any).status || ""),
      )
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Your subscription is managed through an in-app purchase. Please manage billing in the App Store / Play Store.",
          code: "SUBSCRIPTION_MANAGED_IN_APP",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // SECURITY: Check trial eligibility based on subscription history
    // A user is eligible for trial ONLY if no subscription row exists at all
    // If a row exists (even with stripe_subscription_id = NULL), it means they had a trial before
    // Simple and secure: Only new users (no row) get trials
    // Only new users (no subscription row) get the trial.
    const isEligibleForTrial = !existingSub;

    console.log("Trial eligibility check:", {
      hasExistingRow: !!existingSub,
      isEligible: isEligibleForTrial,
      isBound: !!existingSub?.bound_to_user_id,
    });

    // Get user details from auth.users (basic info)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create Stripe customer
    // Use user_stripe_mapping table to store customer ID
    const { data: mappingData } = await supabase
      .from("user_stripe_mapping")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let customerId = mappingData?.stripe_customer_id;

    if (!customerId) {
      console.log("Creating new Stripe customer for user:", userId);

      const customer = await createCustomerWithRetry(stripe, {
        email: userData.email,
        name: userData.full_name || undefined,
        metadata: {
          userId,
        },
      });

      customerId = customer.id;

      // Store customer ID in user_stripe_mapping table
      await supabase.from("user_stripe_mapping").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
        },
        {
          onConflict: "user_id",
        },
      );

      console.log("Created Stripe customer:", customerId);
    } else {
      // Verify customer exists in Stripe
      try {
        await retrieveCustomerWithRetry(stripe, customerId);
        console.log("Using existing Stripe customer:", customerId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          "Customer not found in Stripe, creating new one:",
          message,
        );

        const customer = await createCustomerWithRetry(stripe, {
          email: userData.email,
          name: userData.full_name || undefined,
          metadata: {
            userId,
          },
        });

        customerId = customer.id;

        await supabase.from("user_stripe_mapping").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
          },
          {
            onConflict: "user_id",
          },
        );
      }
    }

    try {
      const { successUrl: finalSuccessUrl, cancelUrl: finalCancelUrl } =
        buildCheckoutRedirectUrls({
          appUrl: env.appUrl,
          successUrl: typeof successUrl === "string" ? successUrl : null,
          cancelUrl: typeof cancelUrl === "string" ? cancelUrl : null,
          allowLocalhost: env.appUrl.includes("localhost") ||
            env.appUrl.includes("127.0.0.1"),
        });

      // For public verify-payment, we add a per-session nonce to the redirect URL.
      // We create the Stripe session first (to get session.id), then persist the nonce.
      const verificationNonce = generateNonce();
      const finalSuccessUrlWithNonce = appendNonceToUrl(
        finalSuccessUrl,
        verificationNonce,
      );
      const finalCancelUrlWithNonce = appendNonceToUrl(
        finalCancelUrl,
        verificationNonce,
      );

      // LIFETIME PLAN: Use payment mode (one-time) instead of subscription mode
      if (plan === "lifetime") {
        console.log("Creating LIFETIME checkout session (payment mode):", {
          userId,
          plan,
          priceId,
          promoCode,
        });

        // If promo code provided, look up the Stripe promotion code ID
        let promotionCodeId: string | null = null;
        if (promoCode) {
          try {
            // List promotion codes by the customer-facing code
            const promoCodes = await stripe.promotionCodes.list({
              code: promoCode,
              active: true,
              limit: 1,
            });

            if (promoCodes.data.length > 0) {
              promotionCodeId = promoCodes.data[0].id;
              console.log("Found promotion code:", {
                code: promoCode,
                id: promotionCodeId,
              });
            } else {
              console.error("Promotion code not found or inactive:", promoCode);
              return new Response(
                JSON.stringify({
                  error: "Invalid promotion code",
                  details:
                    `The promotion code '${promoCode}' is not valid or has expired.`,
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
          } catch (promoError) {
            console.error("Error looking up promotion code:", promoError);
            return new Response(
              JSON.stringify({
                error: "Invalid promotion code",
                details: `Could not validate promotion code '${promoCode}'.`,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }

        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
          customer: customerId, // CRITICAL: Always attach customer (email is already on customer)
          client_reference_id: userId, // CRITICAL: User ID for verification after checkout
          currency: checkoutCurrency,
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: "payment", // ONE-TIME payment, NOT subscription
          success_url: finalSuccessUrlWithNonce,
          cancel_url: finalCancelUrlWithNonce,
          // Lifetime discounts must be supplied explicitly; do not expose public promotion-code entry by default.
          ...(promotionCodeId
            ? { discounts: [{ promotion_code: promotionCodeId }] }
            : { allow_promotion_codes: false }),
          // CRITICAL: Enable invoice creation for one-time payments (Stripe official invoices)
          invoice_creation: {
            enabled: true,
          },
          // Payment metadata - persists on the payment intent
          payment_intent_data: {
            metadata: {
              user_id: userId,
              plan: plan,
              checkout_type: "lifetime",
              pricing_country: requestedCountry ?? "US",
              presentment_currency: requestedCurrency,
            },
            receipt_email: userData.email, // CRITICAL: Stripe sends receipt email
          },
          // Session metadata - for tracking checkout process only
          metadata: {
            user_id: userId,
            plan: plan,
            checkout_type: "lifetime",
            pricing_country: requestedCountry ?? "US",
            presentment_currency: requestedCurrency,
          },
        };

        // Try to create session, handle customer not found error
        let session;
        try {
          session = await createCheckoutSessionWithRetry(stripe, sessionConfig);
        } catch (sessionError: unknown) {
          const stripeErr = sessionError as any;
          // If customer doesn't exist, recreate it and try again
          if (
            stripeErr?.code === "resource_missing" &&
            stripeErr?.message?.includes("customer")
          ) {
            console.log(
              "Customer not found during checkout, recreating:",
              customerId,
            );

            const newCustomer = await createCustomerWithRetry(stripe, {
              email: userData.email,
              name: userData.full_name || undefined,
              metadata: {
                userId,
              },
            });

            customerId = newCustomer.id;

            await supabase.from("user_stripe_mapping").upsert(
              {
                user_id: userId,
                stripe_customer_id: customerId,
              },
              {
                onConflict: "user_id",
              },
            );

            // Update config with new customer ID
            sessionConfig.customer = customerId;

            // Retry with new customer
            session = await createCheckoutSessionWithRetry(
              stripe,
              sessionConfig,
            );
          } else {
            throw sessionError;
          }
        }

        await assertSessionPricingOrExpire(session, {
          priceId,
          currency: requestedCurrency,
          amount: expectedCheckoutAmount,
        });
        console.log("Lifetime checkout session created:", {
          id: session.id,
          customerId,
          pricingCountry: requestedCountry,
          expectedCurrency: requestedCurrency,
          expectedAmount: expectedCheckoutAmount,
          sessionCurrency: session.currency,
          amountSubtotal: session.amount_subtotal,
        });

        // Persist nonce keyed to the Stripe Checkout Session ID.
        const verificationPersisted =
          await persistCheckoutSessionVerificationOrExpire({
            sessionId: session.id,
            persist: () =>
              supabase.from("stripe_checkout_session_verifications").upsert(
                {
                  session_id: session.id,
                  user_id: userId,
                  nonce: verificationNonce,
                  plan,
                },
                {
                  onConflict: "session_id",
                },
              ),
            expire: (sessionId) => stripe.checkout.sessions.expire(sessionId),
            reportError: (phase, error) =>
              reportCreateCheckoutSessionError(phase, error, {
                sessionId: session.id,
                userId,
                plan,
                mode: "payment",
              }),
          });

        if (!verificationPersisted) {
          return checkoutVerificationPersistenceErrorResponse(corsHeaders);
        }

        return new Response(
          JSON.stringify({
            clientSecret: session.client_secret,
            checkoutUrl: session.url,
            sessionId: session.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // RECURRING PLANS (Plus, Premium): Use subscription mode
      console.log("Creating SUBSCRIPTION checkout session:", {
        userId,
        plan,
        billingInterval,
        priceId,
        promoCode,
      });

      // If promo code provided, look up the Stripe promotion code ID
      let subscriptionPromotionCodeId: string | null = null;
      if (promoCode) {
        try {
          // List promotion codes by the customer-facing code
          const promoCodes = await stripe.promotionCodes.list({
            code: promoCode,
            active: true,
            limit: 1,
          });

          if (promoCodes.data.length > 0) {
            subscriptionPromotionCodeId = promoCodes.data[0].id;
            console.log("Found promotion code for subscription:", {
              code: promoCode,
              id: subscriptionPromotionCodeId,
            });
          } else {
            console.error("Promotion code not found or inactive:", promoCode);
            return new Response(
              JSON.stringify({
                error: "Invalid promotion code",
                details:
                  `The promotion code '${promoCode}' is not valid or has expired.`,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        } catch (promoError) {
          console.error("Error looking up promotion code:", promoError);
          return new Response(
            JSON.stringify({
              error: "Invalid promotion code",
              details: `Could not validate promotion code '${promoCode}'.`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      // Build session config according to Stripe best practices
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId, // CRITICAL: Always attach customer
        client_reference_id: userId, // CRITICAL: User ID for verification after checkout
        currency: checkoutCurrency,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: finalSuccessUrlWithNonce,
        cancel_url: finalCancelUrlWithNonce,
        // Use discounts if promo code provided, otherwise allow promotion codes
        ...(subscriptionPromotionCodeId
          ? { discounts: [{ promotion_code: subscriptionPromotionCodeId }] }
          : { allow_promotion_codes: true }),
        // Subscription metadata - persists on the subscription object
        subscription_data: {
          metadata: {
            user_id: userId, // Use snake_case for Stripe metadata
            plan: plan,
            billing_interval: billingInterval,
            payment_interval: billingInterval === "yearly"
              ? "monthly"
              : billingInterval,
            commitment_months: billingInterval === "yearly" ? "12" : "0",
            pricing_country: requestedCountry ?? "US",
            presentment_currency: requestedCurrency,
          },
        },
        // Session metadata - for tracking checkout process only
        metadata: {
          user_id: userId,
          checkout_type: "subscription",
          commitment_months: billingInterval === "yearly" ? "12" : "0",
          pricing_country: requestedCountry ?? "US",
          presentment_currency: requestedCurrency,
        },
      };

      // Trial configuration - Determined by backend based on subscription history
      // Only eligible users (new users who never subscribed) get trials WITHOUT payment method
      if (isEligibleForTrial) {
        console.log(
          "User is eligible for trial - configuring trial period WITHOUT payment method required",
        );
        sessionConfig.payment_method_collection = "if_required"; // Don't require payment method for first-time trials
        sessionConfig.subscription_data!.payment_behavior = "allow_incomplete"; // Checkout Sessions require 'allow_incomplete' (not 'default_incomplete')
        // Configure what happens when trial ends without payment method
        sessionConfig.subscription_data!.trial_settings = {
          end_behavior: {
            missing_payment_method: "pause", // Pause subscription if no payment method when trial ends
          },
        };
        // For trials, only allow promo codes if explicitly provided
        // Remove allow_promotion_codes if promo code is provided, otherwise keep it false
        if (subscriptionPromotionCodeId) {
          // Promo code takes precedence over allow_promotion_codes
          delete (sessionConfig as any).allow_promotion_codes;
          (sessionConfig as any).discounts = [
            { promotion_code: subscriptionPromotionCodeId },
          ];
        } else {
          sessionConfig.allow_promotion_codes = false;
        }
        // Add reassurance copy only for trial checkout
        sessionConfig.custom_text = {
          submit: {
            message:
              "No credit card required. You will not be charged and access pauses automatically after the 30‑day trial.",
          },
        };
      } else {
        console.log(
          "User is NOT eligible for trial - require payment immediately",
        );
        sessionConfig.payment_method_collection = "always"; // Always require payment method
        sessionConfig.subscription_data!.payment_behavior = "allow_incomplete"; // CRITICAL: Checkout Sessions require 'allow_incomplete' for proper 3DS/failed payment handling
        // For non-trial users, promo code handling is already set in the spread operator above
      }

      // Create checkout session with retry
      // NOTE: Per Stripe docs, idempotency keys are NOT recommended for Checkout Sessions
      // because sessions expire after 24 hours and users should be able to create new ones
      let session;
      try {
        session = await createCheckoutSessionWithRetry(stripe, sessionConfig);
      } catch (sessionError: unknown) {
        const stripeErr = sessionError as any;
        // If customer doesn't exist, recreate it and try again
        if (
          stripeErr?.code === "resource_missing" &&
          stripeErr?.message?.includes("customer")
        ) {
          console.log(
            "Customer not found during checkout, recreating:",
            customerId,
          );

          const newCustomer = await createCustomerWithRetry(stripe, {
            email: userData.email,
            name: userData.full_name || undefined,
            metadata: {
              userId,
            },
          });

          customerId = newCustomer.id;

          await supabase.from("user_stripe_mapping").upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
            },
            {
              onConflict: "user_id",
            },
          );

          // Update config with new customer ID
          sessionConfig.customer = customerId;

          // Retry with new customer
          session = await createCheckoutSessionWithRetry(stripe, sessionConfig);
        } else {
          throw sessionError;
        }
      }

      await assertSessionPricingOrExpire(session, {
        priceId,
        currency: requestedCurrency,
        amount: expectedCheckoutAmount,
      });
      console.log("Checkout session created:", {
        id: session.id,
        customerId,
        pricingCountry: requestedCountry,
        expectedCurrency: requestedCurrency,
        expectedAmount: expectedCheckoutAmount,
        sessionCurrency: session.currency,
        amountSubtotal: session.amount_subtotal,
      });

      // Persist a nonce keyed to the Stripe Checkout Session ID.
      // This allows verify-payment to be called by logged-out users safely.
      const verificationPersisted =
        await persistCheckoutSessionVerificationOrExpire({
          sessionId: session.id,
          persist: () =>
            supabase.from("stripe_checkout_session_verifications").upsert(
              {
                session_id: session.id,
                user_id: userId,
                nonce: verificationNonce,
                plan,
              },
              {
                onConflict: "session_id",
              },
            ),
          expire: (sessionId) => stripe.checkout.sessions.expire(sessionId),
          reportError: (phase, error) =>
            reportCreateCheckoutSessionError(phase, error, {
              sessionId: session.id,
              userId,
              plan,
              mode: "subscription",
            }),
        });

      if (!verificationPersisted) {
        return checkoutVerificationPersistenceErrorResponse(corsHeaders);
      }

      // Return session details
      return new Response(
        JSON.stringify({
          clientSecret: session.client_secret,
          checkoutUrl: session.url,
          sessionId: session.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (stripeError: unknown) {
      const stripeErr = stripeError as any;
      console.error("Stripe session creation error:", {
        error: stripeErr?.message,
        type: stripeErr?.type,
        code: stripeErr?.code,
      });
      reportCreateCheckoutSessionError("stripe_session_creation", stripeError, {
        userId,
        plan,
        billingInterval,
        pricingCountry: requestedCountry,
        currency: requestedCurrency,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to create checkout session",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating checkout session:", {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
