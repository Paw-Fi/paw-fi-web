/// <reference lib="deno.ns" />

import {
  getRegionalPricingMarket,
  getRegionalStripePriceLookupKey,
  isSupportedRegionalCurrency,
  isSupportedRegionalPricingCountry,
  REGIONAL_PRICING_COUNTRY_CODES,
} from "../shared/regional-pricing.generated.ts";

function assertEquals<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("regional pricing catalog is safe for checkout", () => {
  assertEquals(REGIONAL_PRICING_COUNTRY_CODES.length, 175);
  assertEquals(getRegionalPricingMarket("IE").currencyCode, "EUR");
  assertEquals(getRegionalPricingMarket("US").currencyCode, "USD");
  assertEquals(getRegionalPricingMarket("invalid").currencyCode, "USD");
  assertEquals(getRegionalPricingMarket("GB").monthly, 399);
  assertEquals(getRegionalPricingMarket("GB").yearly, 2499);
  assertEquals(getRegionalPricingMarket("GB").lifetime, 8999);
  assertEquals(getRegionalPricingMarket("ME").monthly, 499);
  assertEquals(getRegionalPricingMarket("AF").monthly, 1099);
  assertEquals(isSupportedRegionalCurrency("gbp"), true);
  assertEquals(isSupportedRegionalCurrency("ABC"), false);
  assertEquals(isSupportedRegionalPricingCountry("ie"), true);
  assertEquals(isSupportedRegionalPricingCountry("XX"), false);
  assertEquals(
    getRegionalStripePriceLookupKey("plus_yearly", 4),
    "moneko_plus_yearly_v4",
  );
});
