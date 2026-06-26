import { BillingInterval, PlanType } from "./subscription-constants.ts";

type DisplayPrice = {
  displayPriceUsd: number | null;
  originalPriceUsd: number | null;
};

const SUBSCRIPTION_DISPLAY_PRICES: Record<
  Exclude<PlanType, "free">,
  DisplayPrice | Record<BillingInterval, DisplayPrice>
> = {
  plus: {
    monthly: {
      displayPriceUsd: 4.99,
      originalPriceUsd: 7.99,
    },
    yearly: {
      displayPriceUsd: 34.99,
      originalPriceUsd: 59.99,
    },
  },
  premium: {
    monthly: {
      displayPriceUsd: 7.99,
      originalPriceUsd: 9.99,
    },
    yearly: {
      displayPriceUsd: 59.99,
      originalPriceUsd: 95.88,
    },
  },
  lifetime: {
    displayPriceUsd: 69.99,
    originalPriceUsd: null,
  },
};

export function getSubscriptionDisplayPrice(
  plan: string | null | undefined,
  billingInterval: string | null | undefined,
): DisplayPrice {
  if (plan === "lifetime") {
    return SUBSCRIPTION_DISPLAY_PRICES.lifetime as DisplayPrice;
  }

  if (
    (plan === "plus" || plan === "premium") &&
    (billingInterval === "monthly" || billingInterval === "yearly")
  ) {
    const prices = SUBSCRIPTION_DISPLAY_PRICES[plan] as Record<
      BillingInterval,
      DisplayPrice
    >;
    return prices[billingInterval];
  }

  return {
    displayPriceUsd: null,
    originalPriceUsd: null,
  };
}
