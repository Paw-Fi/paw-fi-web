import {
  getRegionalPricingMarket,
  isSupportedRegionalCurrency,
  isSupportedRegionalPricingCountry,
  type RegionalPricingMarket,
} from "./regional-pricing.generated.ts";

const DEFAULT_CHECKOUT_COUNTRY = "US";

export function buildRegionalPriceCacheKey(
  lookupKey: string,
  currency: string,
): string {
  return `${lookupKey}:${currency.trim().toLowerCase()}`;
}

export interface RegionalCheckoutSelection {
  country: string;
  currency: string;
  market: RegionalPricingMarket;
}

export function resolveRegionalCheckoutMarket({
  country,
  currency,
}: {
  country?: unknown;
  currency?: unknown;
}): RegionalCheckoutSelection {
  const normalizedCountry = typeof country === "string"
    ? country.trim().toUpperCase()
    : DEFAULT_CHECKOUT_COUNTRY;

  if (!isSupportedRegionalPricingCountry(normalizedCountry)) {
    throw new Error("Unsupported checkout country");
  }

  const market = getRegionalPricingMarket(normalizedCountry);
  const normalizedCurrency = typeof currency === "string"
    ? currency.trim().toUpperCase()
    : market.currencyCode;

  if (!isSupportedRegionalCurrency(normalizedCurrency)) {
    throw new Error("Unsupported checkout currency");
  }
  if (normalizedCurrency !== market.currencyCode) {
    throw new Error("Checkout currency does not match the selected country");
  }

  return {
    country: normalizedCountry,
    currency: normalizedCurrency,
    market,
  };
}

export function assertCheckoutSessionCurrency(
  actualCurrency: string | null | undefined,
  expectedCurrency: string,
): void {
  const actual = actualCurrency?.toUpperCase() ?? "NONE";
  const expected = expectedCurrency.toUpperCase();
  if (actual !== expected) {
    throw new Error(
      `Stripe Checkout currency mismatch: expected ${expected}, received ${actual}`,
    );
  }
}

export function assertCheckoutLineItem(
  actual: {
    lineItemCount: number;
    priceId: string | null | undefined;
    currency: string | null | undefined;
    amountSubtotal: number | null | undefined;
  },
  expected: { priceId: string; currency: string },
): void {
  if (actual.lineItemCount !== 1) {
    throw new Error(
      `Stripe Checkout line item mismatch: expected 1, received ${actual.lineItemCount}`,
    );
  }
  if (actual.priceId !== expected.priceId) {
    throw new Error("Stripe Checkout Price mismatch");
  }

  const actualCurrency = actual.currency?.toUpperCase() ?? "NONE";
  const expectedCurrency = expected.currency.toUpperCase();
  if (actualCurrency !== expectedCurrency) {
    throw new Error(
      `Stripe Checkout line item currency mismatch: expected ${expectedCurrency}, received ${actualCurrency}`,
    );
  }
}

export function getRegionalCheckoutAmount(
  plan: string,
  billingInterval: string | undefined,
  market: RegionalPricingMarket,
): number {
  if (plan === "lifetime") return market.lifetime;
  return billingInterval === "yearly" ? market.yearly : market.monthly;
}
