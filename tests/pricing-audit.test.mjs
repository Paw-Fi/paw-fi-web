import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildPricingAudit,
  summarizePricingAudit,
  pricingAuditCsv,
} from "../scripts/regional-pricing-audit.mjs";
import {
  generatePricingRows,
  regenerateCatalog,
} from "../scripts/regional-pricing-model.mjs";
import {
  main,
  resolvePriceTargets,
  buildCatalogMarkets,
  buildMultiCurrencyPlanPricing,
} from "../scripts/sync-regional-pricing-to-stripe.mjs";

const policy = JSON.parse(
  await readFile(
    new URL("../config/regional-pricing-policy.json", import.meta.url),
  ),
);
const catalog = JSON.parse(
  await readFile(new URL("../config/regional-pricing.json", import.meta.url)),
);
const rows = generatePricingRows(policy);

test("full audit reconstructs actual Stripe units and identifies missing/scale errors", () => {
  const inspected = [
    {
      target: { id: "plus_monthly" },
      previous: {
        id: "price_old",
        currency: "usd",
        unit_amount: 1099,
        currency_options: {
          cop: { unit_amount: 19900 },
          huf: { unit_amount_decimal: "1790.000" },
          idr: { unit_amount: 69000 },
        },
      },
    },
  ];
  const audit = buildPricingAudit(rows, inspected, policy);
  assert.equal(audit.length, 129);
  for (const [currency, amount] of [
    ["COP", 199],
    ["HUF", 17.9],
    ["IDR", 690],
  ]) {
    const row = audit.find(
      (r) => r.plan === "monthly" && r.currency === currency,
    );
    assert.equal(row.existingDisplayed, amount);
    assert.equal(row.existingStatus, "Decimal/minor-unit bug");
    assert.equal(row.reconstructedDisplayed, row.majorAmount);
  }
  assert.equal(
    audit.find((r) => r.plan === "yearly").existingStatus,
    "Missing",
  );
  assert.equal(summarizePricingAudit(audit).validationFailures, 0);
  assert.equal(summarizePricingAudit(audit).fixedOverrides, 9);
});

test("audit distinguishes invalid integral API amounts from missing currency options", () => {
  const audit = buildPricingAudit(
    rows,
    [
      {
        target: { id: "plus_monthly" },
        previous: {
          id: "price_old",
          currency: "usd",
          currency_options: { cop: { unit_amount_decimal: "123.5" } },
        },
      },
    ],
    policy,
  );
  assert.equal(
    audit.find((r) => r.currency === "COP" && r.plan === "monthly")
      .existingStatus,
    "Invalid",
  );
  assert.equal(
    audit.find((r) => r.currency === "HUF" && r.plan === "monthly")
      .existingStatus,
    "Missing",
  );
});

function fixture() {
  const environment = {
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_PLUS_MONTHLY_PRODUCT_ID: "prod_monthly",
    STRIPE_PLUS_YEARLY_PRODUCT_ID: "prod_yearly",
    STRIPE_LIFETIME_PRODUCT_ID: "prod_lifetime",
  };
  const targets = resolvePriceTargets(environment);
  const prices = new Map();
  const products = new Map();
  const writes = [];
  for (const target of targets) {
    const pricing = buildMultiCurrencyPlanPricing(
      buildCatalogMarkets(catalog),
      target,
    );
    const old = {
      id: `price_${target.id}_v3`,
      product: target.configuredProductId,
      active: true,
      livemode: false,
      billing_scheme: "per_unit",
      type: target.expectedType,
      recurring: target.expectedInterval
        ? { interval: target.expectedInterval }
        : null,
      currency: pricing.defaultCurrency,
      unit_amount: pricing.defaultAmount,
      currency_options: Object.fromEntries(
        Object.entries(pricing.currencyAmounts).map(([c, amount]) => [
          c,
          { unit_amount: amount },
        ]),
      ),
      lookup_key: `moneko_${target.id}_v3`,
    };
    old.currency_options.cop.unit_amount =
      target.id === "plus_monthly"
        ? 19900
        : target.id === "plus_yearly"
          ? 119900
          : 279900;
    prices.set(old.id, old);
    const defaultPrice = {
      ...old,
      id: `price_${target.id}_v1`,
      lookup_key: `moneko_${target.id}_v1`,
    };
    prices.set(defaultPrice.id, defaultPrice);
    products.set(target.configuredProductId, {
      id: target.configuredProductId,
      active: true,
      livemode: false,
      default_price: defaultPrice.id,
    });
  }
  const stripeClient = {
    products: {
      retrieve: (id) => Promise.resolve(products.get(id)),
      update: (id, params) => {
        writes.push(["product", id]);
        products.set(id, { ...products.get(id), ...params });
        return Promise.resolve();
      },
    },
    prices: {
      list: (params) =>
        Promise.resolve({
          data: [...prices.values()].filter((p) =>
            params.lookup_keys.includes(p.lookup_key),
          ),
        }),
      retrieve: (id) => Promise.resolve(prices.get(id)),
      create: (params) => {
        writes.push(["price", params.lookup_key]);
        const target = targets.find((t) => params.lookup_key.includes(t.id));
        const price = {
          ...params,
          id: `price_${target.id}_v4`,
          active: true,
          livemode: false,
          billing_scheme: "per_unit",
          type: target.expectedType,
        };
        prices.set(price.id, price);
        return Promise.resolve(price);
      },
    },
  };
  return {
    environment,
    stripeClient,
    writes,
    catalogSource: JSON.stringify(catalog),
    policy,
    prices,
    products,
  };
}

test("audit exports all 129 comparisons and every changed price with a cause", () => {
  const audit = buildPricingAudit(rows, [], policy);
  const csv = pricingAuditCsv(audit);
  assert.equal(csv.trim().split("\n").length, 130);
  assert.ok(csv.includes('"Stripe API amount"'));
  assert.ok(csv.includes('"Reconstructed displayed price"'));
  const changes = pricingAuditCsv(audit, true);
  assert.equal(changes.trim().split("\n").length, 130);
  assert.ok(changes.includes('"Root cause"'));
  assert.ok(
    changes.includes('"monthly","COP","Missing/Invalid","19000","Missing"'),
  );
});

test("CLI validates help, unsupported arguments and Product contracts before writes", async () => {
  const dependencies = fixture();
  await quietRun(["--help"], dependencies);
  await assert.rejects(
    () => quietRun(["--unknown"], dependencies),
    /Unknown argument/,
  );
  await assert.rejects(() => quietRun(["--report"], dependencies), /requires/);
  await assert.rejects(
    () => quietRun(["--env-file"], dependencies),
    /requires/,
  );
  dependencies.products.get("prod_yearly").active = false;
  await assert.rejects(() => quietRun(["--apply"], dependencies), /inactive/);
  assert.deepEqual(dependencies.writes, []);
});

async function quietRun(args, dependencies) {
  const log = console.log;
  const table = console.table;
  const error = console.error;
  console.log = console.table = console.error = () => {};
  try {
    return await main(args, dependencies);
  } finally {
    console.log = log;
    console.table = table;
    console.error = error;
  }
}

test("dry run reads v3 with v1 defaults and performs zero Stripe writes", async () => {
  const dependencies = fixture();
  await quietRun(["--dry-run"], dependencies);
  assert.deepEqual(dependencies.writes, []);
});

test("apply creates only three Prices; rerun is idempotent and preserves old lookup keys", async () => {
  const dependencies = fixture();
  await quietRun(["--apply"], dependencies);
  assert.equal(dependencies.writes.filter((w) => w[0] === "price").length, 3);
  assert.equal(dependencies.writes.filter((w) => w[0] === "product").length, 3);
  dependencies.writes.length = 0;
  await quietRun(["--apply"], dependencies);
  assert.deepEqual(dependencies.writes, []);
  assert.ok(
    [...dependencies.prices.values()].some(
      (p) => p.lookup_key === "moneko_lifetime_v3",
    ),
  );
});

test("invalid catalog or policy refuses all writes before any plan is published", async () => {
  for (const change of [
    (p) => {
      p.fx.rates.COP = 0;
    },
    (p) => {
      p.fixedPrices.lifetime.USD = 99;
    },
  ]) {
    const dependencies = fixture();
    dependencies.policy = structuredClone(policy);
    change(dependencies.policy);
    await assert.rejects(() => quietRun(["--apply"], dependencies));
    assert.deepEqual(dependencies.writes, []);
  }
  const dependencies = fixture();
  const invalid = regenerateCatalog(catalog, policy);
  invalid.markets.cop.monthly /= 100;
  dependencies.catalogSource = JSON.stringify(invalid);
  await assert.rejects(() => quietRun(["--apply"], dependencies));
  assert.deepEqual(dependencies.writes, []);
});

test("immutable current-version mismatch refuses all writes", async () => {
  const dependencies = fixture();
  const previous = dependencies.prices.get("price_lifetime_v3");
  dependencies.prices.set("price_wrong_v4", {
    ...previous,
    id: "price_wrong_v4",
    lookup_key: "moneko_lifetime_v4",
  });
  await assert.rejects(
    () => quietRun(["--apply"], dependencies),
    /Increment catalogVersion/,
  );
  assert.deepEqual(dependencies.writes, []);
});

test("dry-run/apply conflict and live writes without confirmation fail closed", async () => {
  const dependencies = fixture();
  await assert.rejects(() => quietRun(["--dry-run", "--apply"], dependencies));
  dependencies.environment.STRIPE_SECRET_KEY = "sk_live_fixture";
  await assert.rejects(() => quietRun(["--apply"], dependencies), /allow-live/);
  assert.deepEqual(dependencies.writes, []);
});
