/**
 * Stripe Subscription Price Configuration - Production Ready
 *
 * Maps plan types and billing intervals to Stripe Price IDs
 * Uses environment variables for proper configuration management
 *
 * IMPORTANT: Ensure all environment variables are set:
 * - STRIPE_MONTHLY_PLUS_PLAN_ID (or STRIPE_PLUS_MONTHLY_PRICE_ID)
 * - STRIPE_YEARLY_PLUS_PLAN_ID (or STRIPE_PLUS_YEARLY_PRICE_ID)
 * - STRIPE_LIFETIME_PRICE_ID (one-time payment, no recurring)
 * - STRIPE_MONTHLY_PREMIUM_PLAN_ID
 * - STRIPE_YEARLY_PREMIUM_PLAN_ID
 */

import { BillingInterval, PlanType } from "./subscription-constants.ts";

interface PriceConfig {
  monthly: string;
  yearly: string;
}

interface SubscriptionPrices {
  free: null;
  plus: PriceConfig;
  lifetime: string; // One-time payment price ID
  premium: PriceConfig;
}

function arePremiumPriceIdsConfigured(prices: SubscriptionPrices): boolean {
  return Boolean(prices.premium.monthly && prices.premium.yearly);
}

type StripeSubscriptionPriceSource = {
  metadata?: Record<string, string | null | undefined> | null;
  items?: {
    data?: Array<
      {
        price?: {
          id?: string | null;
          lookup_key?: string | null;
        } | null;
      } | null
    >;
  } | null;
};

type StripeInvoicePriceSource = {
  metadata?: Record<string, string | null | undefined> | null;
  lines?: {
    data?: Array<
      {
        price?: {
          id?: string | null;
          lookup_key?: string | null;
        } | null;
        pricing?: {
          price_details?: {
            price?: string | null;
          } | null;
        } | null;
      } | null
    >;
  } | null;
};

/**
 * Get subscription prices from environment variables
 * This ensures type safety and validation
 */
export function getSubscriptionPrices(): SubscriptionPrices {
  return {
    free: null,
    plus: {
      monthly: Deno.env.get("STRIPE_MONTHLY_PLUS_PLAN_ID") ||
        Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID") ||
        "",
      yearly: Deno.env.get("STRIPE_YEARLY_PLUS_PLAN_ID") ||
        Deno.env.get("STRIPE_PLUS_YEARLY_PRICE_ID") ||
        "",
    },
    lifetime: Deno.env.get("STRIPE_LIFETIME_PRICE_ID") || "", // One-time payment
    premium: {
      monthly: Deno.env.get("STRIPE_MONTHLY_PREMIUM_PLAN_ID") || "",
      yearly: Deno.env.get("STRIPE_YEARLY_PREMIUM_PLAN_ID") || "",
    },
  };
}

/**
 * Legacy export for backward compatibility
 * Prefer using getPriceId() for better type safety
 */
export const SUBSCRIPTION_PRICES = getSubscriptionPrices();

/**
 * Get price ID for a specific plan and billing interval
 * Validates inputs and returns the appropriate price ID
 *
 * NOTE: Lifetime plan is a one-time payment and doesn't use billing intervals
 *
 * @throws Error if plan or interval is invalid, or price ID is not configured
 */
export function getPriceId(plan: PlanType, interval?: BillingInterval): string {
  if (plan === "free") {
    throw new Error("Free plan does not have a price ID");
  }

  const prices = getSubscriptionPrices();

  // Lifetime is a one-time payment - doesn't use intervals
  if (plan === "lifetime") {
    const priceId = prices.lifetime;

    if (!priceId) {
      throw new Error(
        `Price ID not configured for Lifetime plan. ` +
          `Please set the environment variable STRIPE_LIFETIME_PRICE_ID`,
      );
    }

    // Validate price ID format
    if (!priceId.startsWith("price_")) {
      throw new Error(
        `Invalid price ID format: ${priceId}. ` +
          `Stripe price IDs should start with 'price_'`,
      );
    }

    return priceId;
  }

  // For recurring plans (plus, premium), interval is required
  if (!interval) {
    throw new Error(`Billing interval is required for plan "${plan}"`);
  }

  if (plan === "premium") {
    if (!arePremiumPriceIdsConfigured(prices)) {
      throw new Error(
        "Premium price IDs are not fully configured. " +
          "Please set STRIPE_MONTHLY_PREMIUM_PLAN_ID and STRIPE_YEARLY_PREMIUM_PLAN_ID",
      );
    }
  }

  const recurringPrices = plan === "plus"
    ? prices.plus
    : plan === "premium"
    ? prices.premium
    : null;

  const priceId = recurringPrices?.[interval] || "";

  if (!priceId) {
    throw new Error(
      `Price ID not configured for plan "${plan}" with interval "${interval}". ` +
        `Please set the environment variable STRIPE_${interval.toUpperCase()}_${plan.toUpperCase()}_PLAN_ID`,
    );
  }

  // Validate price ID format
  if (!priceId.startsWith("price_")) {
    throw new Error(
      `Invalid price ID format: ${priceId}. ` +
        `Stripe price IDs should start with 'price_'`,
    );
  }

  return priceId;
}

/**
 * Validate that a price ID exists and is properly configured
 */
export function validatePriceId(priceId: string): boolean {
  if (!priceId || priceId.trim() === "") {
    return false;
  }

  if (!priceId.startsWith("price_")) {
    return false;
  }

  return true;
}

/**
 * Get all configured price IDs
 * Useful for validation and testing
 */
export function getAllPriceIds(): string[] {
  const prices = getSubscriptionPrices();
  const ids: string[] = [
    prices.plus.monthly,
    prices.plus.yearly,
    prices.lifetime,
  ].filter((id) => typeof id === "string" && id.trim() !== "");

  if (prices.premium?.monthly && prices.premium.monthly.trim() !== "") {
    ids.push(prices.premium.monthly);
  }
  if (prices.premium?.yearly && prices.premium.yearly.trim() !== "") {
    ids.push(prices.premium.yearly);
  }

  return ids;
}

/**
 * Check if all required price IDs are configured
 */
export function areAllPriceIdsConfigured(): boolean {
  const prices = getSubscriptionPrices();
  return Boolean(
    prices.plus.monthly &&
      prices.plus.yearly &&
      prices.premium.monthly &&
      prices.premium.yearly &&
      prices.lifetime,
  );
}

/**
 * Get plan and interval from a price ID
 * Returns null if price ID is not found
 * NOTE: Lifetime plan returns null for interval since it's one-time
 */
export function getPlanFromPriceId(
  priceId: string | null | undefined,
): { plan: PlanType; interval: BillingInterval | null } | null {
  if (!priceId) return null;

  const prices = getSubscriptionPrices();

  // Check if it's the Lifetime plan (one-time payment)
  if (prices.lifetime === priceId) {
    return {
      plan: "lifetime",
      interval: null, // Lifetime doesn't have a billing interval
    };
  }

  // Check recurring plans
  for (const [plan, intervals] of Object.entries(prices)) {
    if (plan === "free" || plan === "lifetime") continue;

    for (const [interval, id] of Object.entries(intervals as PriceConfig)) {
      if (id === priceId) {
        return {
          plan: plan as PlanType,
          interval: interval as BillingInterval,
        };
      }
    }
  }

  return null;
}

export function resolveSubscriptionPlanFromPrice(
  subscription: StripeSubscriptionPriceSource,
): { plan: PlanType; interval: BillingInterval | null } | null {
  for (const item of subscription.items?.data ?? []) {
    const planInfo = getPlanFromPriceId(item?.price?.id);
    if (planInfo) return planInfo;
  }

  return null;
}

export function resolveInvoicePlanFromLinePrices(
  invoice: StripeInvoicePriceSource,
): { plan: PlanType; interval: BillingInterval | null } | null {
  for (const line of invoice.lines?.data ?? []) {
    const priceId = line?.price?.id || line?.pricing?.price_details?.price;
    const planInfo = getPlanFromPriceId(priceId);
    if (planInfo) return planInfo;
  }

  return null;
}
