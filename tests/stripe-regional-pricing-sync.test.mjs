import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildCatalogMarkets,
  buildMultiCurrencyPlanPricing,
  buildRegionalPriceLookupKey,
  createPriceParameters,
  resolvePriceTargets,
  validateRegionalStripePrice,
  validateTargetProduct,
  publishRegionalPrice,
  reconcileProductDefault,
  stripeUnitAmount,
} from "../scripts/sync-regional-pricing-to-stripe.mjs";
import { getRegionalStripePriceLookupKey } from "../src/data/regional-pricing.generated.ts";

const catalog = {
  catalogVersion: 7,
  defaultMarket: "usd",
  markets: {
    usd: {
      currencyCode: "USD",
      minorUnits: 2,
      monthly: 1099,
      yearly: 7999,
      lifetime: 14999,
      lifetimePromo: 10499,
    },
    eur: {
      currencyCode: "EUR",
      minorUnits: 2,
      monthly: 999,
      yearly: 7499,
      lifetime: 13999,
      lifetimePromo: 9799,
    },
  },
};

const monthlyTarget = {
  id: "plus_monthly",
  label: "Plus monthly",
  amountKey: "monthly",
  expectedType: "recurring",
  expectedInterval: "month",
};

test("workspace catalog can produce exactly three multi-currency Prices", async () => {
  const workspaceCatalog = JSON.parse(
    await readFile(new URL("../config/regional-pricing.json", import.meta.url)),
  );
  const catalogPricing = buildCatalogMarkets(workspaceCatalog);
  const targets = [
    monthlyTarget,
    {
      id: "plus_yearly",
      label: "Plus yearly paid upfront",
      amountKey: "yearly",
    },
    { id: "lifetime", label: "Lifetime", amountKey: "lifetimePromo" },
  ];
  const prices = targets.map((target) =>
    buildMultiCurrencyPlanPricing(catalogPricing, target),
  );

  assert.equal(prices.length, 3);
  assert.equal(Object.keys(prices[0].currencyAmounts).length, 43);
});

test("lifetime Price serializes the regenerated promotional IDR amount", async () => {
  const workspaceCatalog = JSON.parse(
    await readFile(new URL("../config/regional-pricing.json", import.meta.url)),
  );
  const lifetimeTarget = resolvePriceTargets({
    STRIPE_PLUS_MONTHLY_PRODUCT_ID: "prod_monthly",
    STRIPE_PLUS_YEARLY_PRODUCT_ID: "prod_yearly",
    STRIPE_LIFETIME_PRODUCT_ID: "prod_lifetime",
  }).find((target) => target.id === "lifetime");
  const pricing = buildMultiCurrencyPlanPricing(
    buildCatalogMarkets(workspaceCatalog),
    lifetimeTarget,
  );
  const parameters = createPriceParameters({
    target: lifetimeTarget,
    pricing,
    configuration: { productId: "prod_lifetime" },
    lookupKey: buildRegionalPriceLookupKey(
      workspaceCatalog.catalogVersion,
      lifetimeTarget.id,
    ),
  });

  assert.equal(parameters.lookup_key, "moneko_lifetime_v4");
  assert.equal(
    parameters.currency_options.idr.unit_amount,
    workspaceCatalog.markets.idr.lifetimePromo,
  );
  assert.ok(parameters.currency_options.idr.unit_amount > 100000000);
});

test("yearly pricing charges the annual catalog price upfront", () => {
  const pricing = buildMultiCurrencyPlanPricing(buildCatalogMarkets(catalog), {
    id: "plus_yearly",
    label: "Plus yearly paid upfront",
    amountKey: "yearly",
  });

  assert.deepEqual(pricing.currencyAmounts, { eur: 7499, usd: 7999 });
});

test("lifetime Stripe Price uses the advertised promotional amount", () => {
  const pricing = buildMultiCurrencyPlanPricing(buildCatalogMarkets(catalog), {
    id: "lifetime",
    label: "Lifetime",
    amountKey: "lifetimePromo",
  });

  assert.deepEqual(pricing.currencyAmounts, { eur: 9799, usd: 10499 });
});

test("catalog becomes one amount per currency for a plan", () => {
  const pricing = buildMultiCurrencyPlanPricing(
    buildCatalogMarkets(catalog),
    monthlyTarget,
  );
  assert.equal(pricing.defaultCurrency, "usd");
  assert.equal(pricing.defaultAmount, 1099);
  assert.deepEqual(pricing.currencyAmounts, { eur: 999, usd: 1099 });
});

test("same-currency regional amount conflicts are rejected", () => {
  const conflictingCatalog = structuredClone(catalog);
  conflictingCatalog.markets.usd_lower = {
    currencyCode: "USD",
    minorUnits: 2,
    monthly: 399,
    yearly: 2499,
    lifetime: 8999,
    lifetimePromo: 6299,
  };
  assert.throws(
    () =>
      buildMultiCurrencyPlanPricing(
        buildCatalogMarkets(conflictingCatalog),
        monthlyTarget,
      ),
    /USD: 399 \(usd_lower\) vs 1099 \(usd\)|USD: 1099 \(usd\) vs 399 \(usd_lower\)/,
  );
});

test("Stripe decimal amount strings permit integral decimals, never fractions", () => {
  assert.equal(stripeUnitAmount({ unit_amount_decimal: "499.000000" }), 499);
  assert.equal(stripeUnitAmount({ unit_amount_decimal: "499.5" }), null);
  assert.equal(stripeUnitAmount({ unit_amount_decimal: "0" }), null);
});

test("publisher uses deterministic idempotency and reconciles Product default", async () => {
  const calls = [];
  const configuration = { productId: "prod_plus", defaultPriceId: "price_old" };
  const item = {
    lookupKey: "moneko_plus_monthly_v4",
    previous: { id: "price_old" },
  };
  const parameters = {
    product: "prod_plus",
    currency: "usd",
    unit_amount: 1099,
    lookup_key: item.lookupKey,
  };
  const stripe = {
    prices: {
      create: (params, options) => {
        calls.push([params, options]);
        return Promise.resolve({ id: "price_new" });
      },
    },
    products: {
      retrieve: () => Promise.resolve({ default_price: "price_old" }),
      update: (...args) => {
        calls.push(args);
        return Promise.resolve();
      },
    },
  };
  await publishRegionalPrice(stripe, item, parameters, configuration);
  assert.match(calls[0][1].idempotencyKey, /^moneko-pricing-/);
  assert.deepEqual(calls[1], ["prod_plus", { default_price: "price_new" }]);
  const firstKey = calls[0][1].idempotencyKey;
  calls.length = 0;
  await publishRegionalPrice(stripe, item, parameters, configuration);
  assert.equal(calls[0][1].idempotencyKey, firstKey);
});

test("default reconciliation recovers interrupted creation and rejects unrelated pointers", async () => {
  let updates = 0;
  const configuration = { productId: "prod_plus" };
  const stripe = {
    products: {
      retrieve: () => Promise.resolve({ default_price: "price_old" }),
      update: () => {
        updates++;
        return Promise.resolve();
      },
    },
  };
  await reconcileProductDefault(
    stripe,
    { id: "price_new" },
    { id: "price_old" },
    configuration,
  );
  assert.equal(updates, 1);
  stripe.products.retrieve = () =>
    Promise.resolve({ default_price: "price_unrelated" });
  await assert.rejects(
    () =>
      reconcileProductDefault(
        stripe,
        { id: "price_new" },
        { id: "price_old" },
        configuration,
      ),
    /default.*changed|unrelated/i,
  );
  assert.equal(updates, 1);
});

test("CLI and generated runtime use one lookup key per plan", () => {
  const expected = "moneko_plus_monthly_v7";
  assert.equal(buildRegionalPriceLookupKey(7, "plus_monthly"), expected);
  assert.equal(getRegionalStripePriceLookupKey("plus_monthly", 7), expected);
});

test("existing multi-currency Price is validated against all currencies", () => {
  const pricing = buildMultiCurrencyPlanPricing(
    buildCatalogMarkets(catalog),
    monthlyTarget,
  );
  const price = {
    id: "price_regional",
    product: "prod_plus",
    active: true,
    livemode: false,
    billing_scheme: "per_unit",
    type: "recurring",
    recurring: { interval: "month" },
    currency: "usd",
    unit_amount: 1099,
    currency_options: { eur: { unit_amount: 999 } },
  };

  assert.deepEqual(
    validateRegionalStripePrice({
      target: monthlyTarget,
      pricing,
      price,
      expectedProductId: "prod_plus",
      expectedLivemode: false,
    }),
    [],
  );
  assert.match(
    validateRegionalStripePrice({
      target: monthlyTarget,
      pricing,
      price: {
        ...price,
        currency_options: { eur: { unit_amount: 1099 } },
      },
      expectedProductId: "prod_plus",
      expectedLivemode: false,
    }).join(" "),
    /EUR expected amount 999/,
  );
});

test("price target resolution prefers direct Product IDs", () => {
  const targets = resolvePriceTargets({
    STRIPE_PLUS_MONTHLY_PRODUCT_ID: "prod_monthly",
    STRIPE_PLUS_YEARLY_PRODUCT_ID: "prod_yearly",
    STRIPE_LIFETIME_PRODUCT_ID: "prod_lifetime",
  });
  assert.deepEqual(
    targets.map((target) => target.configuredProductId),
    ["prod_monthly", "prod_yearly", "prod_lifetime"],
  );
});

test("price target resolution retains existing Price-ID fallback", () => {
  const targets = resolvePriceTargets({
    STRIPE_PLUS_MONTHLY_PRICE_ID: "price_monthly",
    STRIPE_PLUS_YEARLY_PRICE_ID: "price_yearly",
    STRIPE_LIFETIME_PRICE_ID: "price_lifetime",
  });
  assert.deepEqual(
    targets.map((target) => target.templatePriceId),
    ["price_monthly", "price_yearly", "price_lifetime"],
  );
});

test("configured Product must be active and match the Stripe mode", () => {
  assert.deepEqual(
    validateTargetProduct(
      { id: "prod_plus", active: true, livemode: false },
      false,
    ),
    [],
  );
  assert.match(
    validateTargetProduct(
      { id: "prod_plus", active: false, livemode: true },
      false,
    ).join(" "),
    /mode mismatch.*inactive/i,
  );
});

test("one Price creation payload contains every currency", () => {
  const pricing = buildMultiCurrencyPlanPricing(
    buildCatalogMarkets(catalog),
    monthlyTarget,
  );
  const parameters = createPriceParameters({
    target: monthlyTarget,
    pricing,
    configuration: { productId: "prod_monthly" },
    lookupKey: "moneko_plus_monthly_v7",
  });

  assert.equal(parameters.product, "prod_monthly");
  assert.equal(parameters.currency, "usd");
  assert.equal(parameters.unit_amount, 1099);
  assert.deepEqual(parameters.currency_options, {
    eur: { unit_amount: 999 },
  });
  assert.deepEqual(parameters.recurring, { interval: "month" });
});
