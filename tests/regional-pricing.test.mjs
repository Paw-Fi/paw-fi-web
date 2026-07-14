import assert from "node:assert/strict";
import test from "node:test";

import {
  getRegionalPricingMarket,
  getRegionalStripePriceLookupKey,
  isSupportedRegionalCurrency,
  isSupportedRegionalPricingCountry,
  REGIONAL_PRICING_COUNTRY_CODES,
} from "../src/data/regional-pricing.generated.ts";

test("regional catalog covers 175 unique countries", () => {
  assert.equal(REGIONAL_PRICING_COUNTRY_CODES.length, 175);
  assert.equal(new Set(REGIONAL_PRICING_COUNTRY_CODES).size, 175);
});

test("regional catalog resolves local and fallback markets", () => {
  assert.equal(getRegionalPricingMarket("IE").currencyCode, "EUR");
  assert.equal(getRegionalPricingMarket("IN").currencyCode, "INR");
  assert.equal(getRegionalPricingMarket("unknown").currencyCode, "USD");
});

test("GBP matches App Store exports and EUR/USD use canonical Stripe amounts", () => {
  const gbp = getRegionalPricingMarket("GB");
  assert.deepEqual(
    { monthly: gbp.monthly, yearly: gbp.yearly, lifetime: gbp.lifetime },
    { monthly: 399, yearly: 2499, lifetime: 8999 },
  );
  assert.equal(getRegionalPricingMarket("ME").monthly, 499);
  assert.equal(getRegionalPricingMarket("AF").monthly, 1099);
});

test("checkout currency validation is case insensitive", () => {
  assert.equal(isSupportedRegionalCurrency("eur"), true);
  assert.equal(isSupportedRegionalCurrency("ABC"), false);
});

test("checkout country validation is case insensitive", () => {
  assert.equal(isSupportedRegionalPricingCountry("ie"), true);
  assert.equal(isSupportedRegionalPricingCountry("XX"), false);
});

test("regional Stripe lookup keys are deterministic", () => {
  assert.equal(
    getRegionalStripePriceLookupKey("plus_monthly", 3),
    "moneko_plus_monthly_v3",
  );
});
