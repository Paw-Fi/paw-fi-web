import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCheckoutLineItem,
  assertCheckoutSessionCurrency,
  buildRegionalPriceCacheKey,
  getRegionalCheckoutAmount,
  resolveRegionalCheckoutMarket,
} from "../supabase/functions/shared/regional-checkout.ts";

test("checkout market normalizes a matching country and currency", () => {
  const selection = resolveRegionalCheckoutMarket({
    country: "ie",
    currency: "eur",
  });

  assert.equal(selection.country, "IE");
  assert.equal(selection.currency, "EUR");
  assert.equal(selection.market.currencyCode, "EUR");
});

test("checkout market defaults to the catalog default", () => {
  const selection = resolveRegionalCheckoutMarket({});

  assert.equal(selection.country, "US");
  assert.equal(selection.currency, "USD");
});

test("checkout market rejects unsupported countries", () => {
  assert.throws(
    () => resolveRegionalCheckoutMarket({ country: "XX" }),
    /Unsupported checkout country/,
  );
});

test("checkout market rejects a currency from another market", () => {
  assert.throws(
    () =>
      resolveRegionalCheckoutMarket({
        country: "IE",
        currency: "USD",
      }),
    /does not match the selected country/,
  );
});

test("checkout market rejects currency-only market changes", () => {
  assert.throws(
    () => resolveRegionalCheckoutMarket({ currency: "EUR" }),
    /does not match the selected country/,
  );
});

test("Stripe Checkout must return the requested session currency", () => {
  assert.doesNotThrow(() => assertCheckoutSessionCurrency("eur", "EUR"));
  assert.throws(
    () => assertCheckoutSessionCurrency("usd", "EUR"),
    /expected EUR, received USD/,
  );
});

test("checkout amount uses the selected market and billing interval", () => {
  const { market } = resolveRegionalCheckoutMarket({
    country: "IE",
    currency: "EUR",
  });

  assert.equal(getRegionalCheckoutAmount("plus", "monthly", market), 499);
  assert.equal(getRegionalCheckoutAmount("plus", "yearly", market), 250);
  assert.equal(getRegionalCheckoutAmount("lifetime", undefined, market), 9999);
});

test("regional Price cache validates each currency independently", () => {
  assert.equal(
    buildRegionalPriceCacheKey("moneko_plus_monthly_v1", "EUR"),
    "moneko_plus_monthly_v1:eur",
  );
  assert.notEqual(
    buildRegionalPriceCacheKey("moneko_plus_monthly_v1", "EUR"),
    buildRegionalPriceCacheKey("moneko_plus_monthly_v1", "USD"),
  );
});

test("Stripe Checkout line item must match the regional quote", () => {
  assert.doesNotThrow(() =>
    assertCheckoutLineItem(
      {
        lineItemCount: 1,
        priceId: "price_monthly",
        currency: "eur",
        amountSubtotal: 499,
      },
      {
        priceId: "price_monthly",
        currency: "EUR",
        amount: 499,
      },
    ),
  );
  assert.throws(
    () =>
      assertCheckoutLineItem(
        {
          lineItemCount: 1,
          priceId: "price_monthly",
          currency: "eur",
          amountSubtotal: 399,
        },
        {
          priceId: "price_monthly",
          currency: "EUR",
          amount: 499,
        },
      ),
    /amount mismatch: expected 499, received 399/,
  );
});
