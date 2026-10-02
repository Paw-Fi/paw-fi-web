#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import Stripe from "stripe";
import {
  assertCatalogMatchesPolicy,
  generatePricingRows,
  assertValidPricingRows,
  stripeCurrencyExponent,
  readStripeUnitAmount,
} from "./regional-pricing-model.mjs";
import {
  buildPricingAudit,
  printPricingAudit,
  summarizePricingAudit,
  pricingAuditCsv,
} from "./regional-pricing-audit.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const catalogPath = path.join(projectRoot, "config/regional-pricing.json");
const defaultEnvPath = path.join(projectRoot, ".env.production");

const PRICE_TARGETS = [
  {
    id: "plus_monthly",
    label: "Plus monthly",
    amountKey: "monthly",
    expectedType: "recurring",
    expectedInterval: "month",
    productEnvironmentNames: [
      "STRIPE_PLUS_MONTHLY_PRODUCT_ID",
      "STRIPE_MONTHLY_PLUS_PRODUCT_ID",
    ],
    templatePriceEnvironmentNames: [
      "STRIPE_MONTHLY_PLUS_PLAN_ID",
      "STRIPE_PLUS_MONTHLY_PRICE_ID",
    ],
  },
  {
    id: "plus_yearly",
    label: "Plus yearly paid upfront",
    amountKey: "yearly",
    expectedType: "recurring",
    expectedInterval: "year",
    productEnvironmentNames: ["STRIPE_PLUS_YEARLY_PRODUCT_ID"],
    templatePriceEnvironmentNames: [
      "STRIPE_YEARLY_PLUS_PLAN_ID",
      "STRIPE_PLUS_YEARLY_PRICE_ID",
    ],
  },
  {
    id: "lifetime",
    label: "Lifetime",
    amountKey: "lifetimePromo",
    expectedType: "one_time",
    expectedInterval: null,
    productEnvironmentNames: ["STRIPE_LIFETIME_PRODUCT_ID"],
    templatePriceEnvironmentNames: ["STRIPE_LIFETIME_PRICE_ID"],
  },
];

function fail(message) {
  throw new Error(message);
}

function positiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    fail(`${field} must be a positive integer in minor units`);
  }
  return value;
}

export function buildRegionalPriceLookupKey(catalogVersion, targetId) {
  if (!Number.isInteger(catalogVersion) || catalogVersion < 1) {
    fail("catalogVersion must be a positive integer");
  }
  if (!/^[a-z0-9_]+$/.test(targetId)) fail(`Invalid target ID '${targetId}'`);
  return `moneko_${targetId}_v${catalogVersion}`;
}

export function buildCatalogMarkets(catalog) {
  if (
    !Number.isInteger(catalog?.catalogVersion) ||
    catalog.catalogVersion < 1
  ) {
    fail("Regional pricing catalog must have a positive catalogVersion");
  }
  if (!catalog.markets || typeof catalog.markets !== "object") {
    fail("Regional pricing catalog must define markets");
  }
  if (!catalog.markets[catalog.defaultMarket]) {
    fail(`Default market '${catalog.defaultMarket}' does not exist`);
  }

  const markets = Object.entries(catalog.markets)
    .map(([id, market]) => {
      if (!/^[a-z0-9_]+$/.test(id)) fail(`Invalid market ID '${id}'`);
      const currency = String(market.currencyCode ?? "")
        .trim()
        .toLowerCase();
      if (!/^[a-z]{3}$/.test(currency)) {
        fail(`${id}.currencyCode must be a three-letter currency code`);
      }
      if (
        market.minorUnits !== stripeCurrencyExponent(currency.toUpperCase())
      ) {
        fail(`${id}.minorUnits does not match Stripe's charge exponent`);
      }
      return {
        id,
        currency,
        amounts: {
          monthly: positiveInteger(market.monthly, `${id}.monthly`),
          yearly: positiveInteger(market.yearly, `${id}.yearly`),
          lifetime: positiveInteger(market.lifetime, `${id}.lifetime`),
          lifetimePromo: positiveInteger(
            market.lifetimePromo,
            `${id}.lifetimePromo`,
          ),
        },
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    catalogVersion: catalog.catalogVersion,
    defaultMarketId: catalog.defaultMarket,
    markets,
  };
}

export function buildMultiCurrencyPlanPricing(catalogPricing, target) {
  const amountsByCurrency = new Map();
  for (const market of catalogPricing.markets) {
    const sourceAmount = market.amounts[target.amountKey];
    const amount = target.amountDivisor
      ? Math.round(sourceAmount / target.amountDivisor)
      : sourceAmount;
    const currencyEntry = amountsByCurrency.get(market.currency) ?? new Map();
    const marketIds = currencyEntry.get(amount) ?? [];
    marketIds.push(market.id);
    currencyEntry.set(amount, marketIds);
    amountsByCurrency.set(market.currency, currencyEntry);
  }

  const conflicts = [];
  const currencyAmounts = {};
  for (const [currency, amounts] of [...amountsByCurrency.entries()].sort()) {
    if (amounts.size > 1) {
      const variants = [...amounts.entries()]
        .map(([amount, marketIds]) => `${amount} (${marketIds.join(", ")})`)
        .join(" vs ");
      conflicts.push(`${currency.toUpperCase()}: ${variants}`);
      continue;
    }
    currencyAmounts[currency] = amounts.keys().next().value;
  }

  if (conflicts.length > 0) {
    fail(
      `${target.label} has conflicting same-currency amounts. ` +
        "One Stripe multi-currency Price supports only one amount per currency:\n" +
        conflicts.join("\n"),
    );
  }

  const defaultMarket = catalogPricing.markets.find(
    (market) => market.id === catalogPricing.defaultMarketId,
  );
  return {
    defaultCurrency: defaultMarket.currency,
    defaultAmount: currencyAmounts[defaultMarket.currency],
    currencyAmounts,
  };
}

export function resolvePriceTargets(environment) {
  return PRICE_TARGETS.map((target) => {
    const productEnvironmentName = target.productEnvironmentNames.find((name) =>
      environment[name]?.trim(),
    );
    const configuredProductId = productEnvironmentName
      ? environment[productEnvironmentName].trim()
      : "";
    if (configuredProductId && !configuredProductId.startsWith("prod_")) {
      fail(
        `${target.label}: '${configuredProductId}' is not a Stripe Product ID`,
      );
    }

    const templatePriceEnvironmentName =
      target.templatePriceEnvironmentNames.find((name) =>
        environment[name]?.trim(),
      );
    const templatePriceId = templatePriceEnvironmentName
      ? environment[templatePriceEnvironmentName].trim()
      : "";
    if (!configuredProductId && !templatePriceId) {
      fail(
        `${target.label}: set one of ${target.productEnvironmentNames.join(
          ", ",
        )}` +
          ` (preferred), or ${target.templatePriceEnvironmentNames.join(", ")}`,
      );
    }
    if (!configuredProductId && !templatePriceId.startsWith("price_")) {
      fail(`${target.label}: '${templatePriceId}' is not a Stripe Price ID`);
    }
    return {
      ...target,
      configuredProductId,
      productEnvironmentName,
      templatePriceId,
      templatePriceEnvironmentName,
    };
  });
}

function productId(price) {
  return typeof price.product === "string" ? price.product : price.product?.id;
}

export function stripeUnitAmount(value) {
  return readStripeUnitAmount(value);
}

export function validateTemplatePrice(target, price, expectedLivemode) {
  const issues = [];
  if (price.livemode !== expectedLivemode) issues.push("API key mode mismatch");
  if (!price.active) issues.push("template Price is inactive");
  if (!productId(price)) issues.push("template Product ID is missing");
  if (price.billing_scheme !== "per_unit") {
    issues.push(`expected per_unit billing, received ${price.billing_scheme}`);
  }
  if (price.type !== target.expectedType) {
    issues.push(`expected ${target.expectedType}, received ${price.type}`);
  }
  if (
    price.transform_quantity ||
    price.custom_unit_amount ||
    price.tiers_mode
  ) {
    issues.push("unexpected transformed, custom or tiered pricing");
  }
  if (
    target.expectedInterval &&
    ((price.recurring?.interval_count ?? 1) !== 1 ||
      (price.recurring?.usage_type ?? "licensed") !== "licensed")
  ) {
    issues.push("expected a single licensed billing interval");
  }
  if (
    target.expectedInterval !== null &&
    price.recurring?.interval !== target.expectedInterval
  ) {
    issues.push(
      `expected ${target.expectedInterval} interval, received ${
        price.recurring?.interval ?? "none"
      }`,
    );
  }
  return issues;
}

export function validateTargetProduct(product, expectedLivemode) {
  const issues = [];
  if (product.livemode !== expectedLivemode) {
    issues.push("API key mode mismatch");
  }
  if (!product.active) issues.push("Product is inactive");
  if (!String(product.id ?? "").startsWith("prod_")) {
    issues.push("Product ID is missing");
  }
  return issues;
}

export function validateRegionalStripePrice({
  target,
  pricing,
  price,
  expectedProductId,
  expectedLivemode,
}) {
  const issues = validateTemplatePrice(target, price, expectedLivemode);
  if (productId(price) !== expectedProductId) {
    issues.push("Product does not match the configured Product ID");
  }
  if (String(price.currency).toLowerCase() !== pricing.defaultCurrency) {
    issues.push(
      `expected default currency ${pricing.defaultCurrency.toUpperCase()}, received ${String(
        price.currency,
      ).toUpperCase()}`,
    );
  }

  const actualCurrencies = new Set([
    String(price.currency).toLowerCase(),
    ...Object.keys(price.currency_options ?? {}).map((value) =>
      value.toLowerCase(),
    ),
  ]);
  const expectedCurrencies = Object.keys(pricing.currencyAmounts);
  for (const currency of expectedCurrencies) {
    const actualAmount =
      currency === pricing.defaultCurrency
        ? stripeUnitAmount(price)
        : stripeUnitAmount(price.currency_options?.[currency]);
    const expectedAmount = pricing.currencyAmounts[currency];
    if (actualAmount !== expectedAmount) {
      issues.push(
        `${currency.toUpperCase()} expected amount ${expectedAmount}, received ${actualAmount}`,
      );
    }
  }
  for (const currency of actualCurrencies) {
    if (!(currency in pricing.currencyAmounts)) {
      issues.push(`unexpected currency ${currency.toUpperCase()}`);
    }
  }
  return issues;
}

function parseArguments(argv) {
  const options = {
    apply: false,
    allowLive: false,
    envPath: defaultEnvPath,
    envPathWasExplicit: false,
    help: false,
    reportPath: null,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--report") {
      if (!argv[index + 1] || argv[index + 1].startsWith("--"))
        fail("--report requires a JSON path");
      options.reportPath = path.resolve(argv[++index]);
    } else if (argument === "--allow-live") options.allowLive = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--env-file") {
      const value = argv[index + 1];
      if (!value) fail("--env-file requires a path");
      options.envPath = path.resolve(process.cwd(), value);
      options.envPathWasExplicit = true;
      index += 1;
    } else {
      fail(`Unknown argument '${argument}'`);
    }
  }
  if (options.apply && options.dryRun)
    fail("--dry-run cannot be combined with --apply");
  return options;
}

function printHelp() {
  console.log(`Create or verify exactly three Stripe multi-currency Prices.

Usage:
  node scripts/sync-regional-pricing-to-stripe.mjs --dry-run [--report <path>] [--env-file <path>]
  node scripts/sync-regional-pricing-to-stripe.mjs --apply [--env-file <path>] [--allow-live]

Safety:
  - Plan mode performs Stripe reads only.
  - Sync mode creates at most three Prices: monthly, yearly, and lifetime.
  - Every Price contains one amount for each supported currency.
  - Same-currency market conflicts stop before any Stripe writes.
  - Product IDs are read from STRIPE_PLUS_MONTHLY_PRODUCT_ID,
    STRIPE_PLUS_YEARLY_PRODUCT_ID, and STRIPE_LIFETIME_PRODUCT_ID.
  - Existing Price IDs remain supported as a compatibility fallback.
  - Live-mode writes require --allow-live.`);
}

function resolveStripeMode(secretKey) {
  if (/^(sk|rk)_test_/.test(secretKey)) return "test";
  if (/^(sk|rk)_live_/.test(secretKey)) return "live";
  fail("STRIPE_SECRET_KEY must be a Stripe test or live secret/restricted key");
}

export function createPriceParameters({
  target,
  pricing,
  configuration,
  lookupKey,
}) {
  const currencyOptions = Object.fromEntries(
    Object.entries(pricing.currencyAmounts)
      .filter(([currency]) => currency !== pricing.defaultCurrency)
      .map(([currency, unitAmount]) => [currency, { unit_amount: unitAmount }]),
  );
  return {
    product: configuration.productId,
    currency: pricing.defaultCurrency,
    unit_amount: pricing.defaultAmount,
    currency_options: currencyOptions,
    lookup_key: lookupKey,
    nickname: `Moneko ${target.label} multi-currency`,
    ...(target.expectedInterval
      ? { recurring: { interval: target.expectedInterval } }
      : {}),
    ...(configuration.taxBehavior
      ? { tax_behavior: configuration.taxBehavior }
      : {}),
    metadata: { moneko_plan_target: target.id },
  };
}

async function findPriceByLookupKey(stripe, lookupKey) {
  const result = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 2,
  });
  if (result.data.length > 1) {
    fail(`Multiple Stripe Prices use lookup key '${lookupKey}'`);
  }
  if (result.data.length === 0) return null;
  return stripe.prices.retrieve(result.data[0].id, {
    expand: ["currency_options"],
  });
}

export async function reconcileProductDefault(
  stripe,
  price,
  previous,
  configuration,
) {
  const product = await stripe.products.retrieve(configuration.productId);
  const currentId =
    typeof product.default_price === "string"
      ? product.default_price
      : product.default_price?.id;
  if (currentId === price.id) return;
  if (
    currentId &&
    currentId !== previous?.id &&
    currentId !== configuration.defaultPriceId
  ) {
    fail(
      `${configuration.productId} default Price changed or is unrelated; refusing to overwrite it`,
    );
  }
  await stripe.products.update(configuration.productId, {
    default_price: price.id,
  });
}

export async function publishRegionalPrice(
  stripe,
  item,
  parameters,
  configuration,
) {
  const digest = createHash("sha256")
    .update(JSON.stringify(parameters))
    .digest("hex");
  const price = await stripe.prices.create(parameters, {
    idempotencyKey: `moneko-pricing-${digest}`,
  });
  await reconcileProductDefault(stripe, price, item.previous, configuration);
  return price;
}

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArguments(argv);
  if (options.help) {
    printHelp();
    return;
  }

  if (!dependencies.environment && existsSync(options.envPath)) {
    dotenv.config({ path: options.envPath, quiet: true });
  } else if (!dependencies.environment && options.envPathWasExplicit) {
    fail(`Environment file not found: ${options.envPath}`);
  }

  const environment = dependencies.environment ?? process.env;
  const secretKey = environment.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) fail("STRIPE_SECRET_KEY is required");
  const stripeMode = resolveStripeMode(secretKey);
  if (options.apply && stripeMode === "live" && !options.allowLive) {
    fail("Live Stripe writes require the additional --allow-live flag");
  }

  const catalogSource =
    dependencies.catalogSource ?? (await readFile(catalogPath, "utf8"));
  const catalog = JSON.parse(catalogSource);
  const policy =
    dependencies.policy ??
    JSON.parse(
      await readFile(
        path.join(projectRoot, "config/regional-pricing-policy.json"),
        "utf8",
      ),
    );
  const pricingRows = generatePricingRows(policy);
  assertValidPricingRows(pricingRows, policy);
  assertCatalogMatchesPolicy(catalog, policy);
  const catalogPricing = buildCatalogMarkets(catalog);
  const catalogHash = createHash("sha256").update(catalogSource).digest("hex");
  const targets = resolvePriceTargets(environment);
  const desiredPrices = targets.map((target) => ({
    target,
    pricing: buildMultiCurrencyPlanPricing(catalogPricing, target),
    lookupKey: buildRegionalPriceLookupKey(
      catalogPricing.catalogVersion,
      target.id,
    ),
  }));

  const stripe = dependencies.stripeClient ?? new Stripe(secretKey);
  const expectedLivemode = stripeMode === "live";
  const targetConfigurations = new Map();
  for (const target of targets) {
    let resolvedProductId = target.configuredProductId;
    let taxBehavior;
    if (!resolvedProductId) {
      const template = await stripe.prices.retrieve(target.templatePriceId);
      const templateIssues = validateTemplatePrice(
        target,
        template,
        expectedLivemode,
      );
      if (templateIssues.length > 0) {
        fail(
          `${target.label} fallback Price is invalid: ${templateIssues.join(
            "; ",
          )}`,
        );
      }
      resolvedProductId = productId(template);
      taxBehavior = ["inclusive", "exclusive"].includes(template.tax_behavior)
        ? template.tax_behavior
        : undefined;
    }

    const product = await stripe.products.retrieve(resolvedProductId);
    const productIssues = validateTargetProduct(product, expectedLivemode);
    if (productIssues.length > 0) {
      fail(`${target.label} Product is invalid: ${productIssues.join("; ")}`);
    }
    const defaultPriceId =
      typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id;
    if (defaultPriceId) {
      const defaultPrice = await stripe.prices.retrieve(defaultPriceId, {
        expand: ["currency_options"],
      });
      const issues = validateTemplatePrice(
        target,
        defaultPrice,
        expectedLivemode,
      );
      if (
        productId(defaultPrice) !== resolvedProductId ||
        (defaultPrice.metadata?.moneko_plan_target &&
          defaultPrice.metadata.moneko_plan_target !== target.id)
      ) {
        issues.push("default Price belongs to a different Product or plan");
      }
      if (issues.length)
        fail(
          `${target.label} Product default is invalid: ${issues.join("; ")}`,
        );
      taxBehavior ??= ["inclusive", "exclusive"].includes(
        defaultPrice.tax_behavior,
      )
        ? defaultPrice.tax_behavior
        : undefined;
    }
    targetConfigurations.set(target.id, {
      productId: resolvedProductId,
      taxBehavior,
      defaultPriceId,
    });
  }

  const currencyCount = Object.keys(
    desiredPrices[0].pricing.currencyAmounts,
  ).length;
  console.log(
    `${options.apply ? "SYNC" : "PLAN"} Stripe regional pricing: ` +
      `3 multi-currency Prices x ${currencyCount} currencies, ${stripeMode} mode`,
  );

  const inspected = await Promise.all(
    desiredPrices.map(async (desired) => {
      const existing = await findPriceByLookupKey(stripe, desired.lookupKey);
      let previous = null;
      // Inspect the most recent published catalog, not invented UI values.
      for (
        let version = catalogPricing.catalogVersion - 1;
        !previous && version >= 1;
        version--
      ) {
        previous = await findPriceByLookupKey(
          stripe,
          buildRegionalPriceLookupKey(version, desired.target.id),
        );
      }
      const configuration = targetConfigurations.get(desired.target.id);
      if (!previous && configuration.defaultPriceId) {
        previous = await stripe.prices.retrieve(configuration.defaultPriceId, {
          expand: ["currency_options"],
        });
      }
      if (!previous && desired.target.templatePriceId) {
        previous = await stripe.prices.retrieve(
          desired.target.templatePriceId,
          { expand: ["currency_options"] },
        );
      }
      const current = existing ?? previous;
      const issues = existing
        ? validateRegionalStripePrice({
            target: desired.target,
            pricing: desired.pricing,
            price: existing,
            expectedProductId: targetConfigurations.get(desired.target.id)
              .productId,
            expectedLivemode,
          })
        : [];
      return { ...desired, existing, previous, current, issues };
    }),
  );

  const audit = buildPricingAudit(
    pricingRows,
    inspected.map((item) => ({ ...item, previous: item.current })),
    policy,
  );
  const summary = summarizePricingAudit(audit);
  printPricingAudit(audit, summary);
  if (options.reportPath) {
    await writeFile(
      options.reportPath,
      `${JSON.stringify(
        {
          catalogVersion: catalogPricing.catalogVersion,
          fx: { source: policy.fx.source, date: policy.fx.date },
          summary,
          rows: audit,
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(`${options.reportPath}.csv`, pricingAuditCsv(audit));
    await writeFile(
      `${options.reportPath}.changes.csv`,
      pricingAuditCsv(audit, true),
    );
  }
  assertValidPricingRows(pricingRows, policy);
  if (summary.validationFailures)
    fail("Audit validation failed; no Stripe writes allowed");

  const mismatches = inspected.filter((item) => item.issues.length > 0);
  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      console.error(`${mismatch.lookupKey}: ${mismatch.issues.join("; ")}`);
    }
    fail(
      "Existing lookup keys do not match the catalog. Increment catalogVersion before changing immutable prices.",
    );
  }

  const missing = inspected.filter((item) => !item.existing);
  const existingCount = inspected.length - missing.length;
  console.log(`Existing matching Prices: ${existingCount}`);
  console.log(`Missing Prices to create: ${missing.length}`);

  if (!options.apply) {
    console.log("No Stripe writes were made.");
    if (stripeMode === "test") {
      console.log(
        "Run node scripts/sync-regional-pricing-to-stripe.mjs --apply to create test Prices.",
      );
    } else {
      console.log(
        "Run node scripts/sync-regional-pricing-to-stripe.mjs --apply --allow-live to create live Prices.",
      );
    }
    return;
  }

  for (const item of missing) {
    const parameters = createPriceParameters({
      target: item.target,
      pricing: item.pricing,
      configuration: targetConfigurations.get(item.target.id),
      lookupKey: item.lookupKey,
    });
    parameters.metadata.moneko_pricing_catalog_version = String(
      catalogPricing.catalogVersion,
    );
    parameters.metadata.moneko_pricing_catalog_sha256 = catalogHash;
    parameters.metadata.moneko_currency_count = String(currencyCount);
    parameters.metadata.moneko_pricing_policy_version = String(
      policy.pricingVersion,
    );
    parameters.metadata.moneko_fx_date = policy.fx.date;
    parameters.metadata.moneko_fx_source = policy.fx.source;
    parameters.metadata.moneko_price_amount_units = "stripe_charge_minor_units";
    await publishRegionalPrice(
      stripe,
      item,
      parameters,
      targetConfigurations.get(item.target.id),
    );
    console.log(`Created ${item.lookupKey}`);
  }
  // Recover a previous interrupted run that created a Price before updating its Product.
  for (const item of inspected.filter((item) => item.existing)) {
    await reconcileProductDefault(
      stripe,
      item.existing,
      item.previous,
      targetConfigurations.get(item.target.id),
    );
  }

  console.log(
    `Stripe synchronization complete: ${missing.length} Prices created, ${existingCount} already current.`,
  );
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(`\nStripe pricing sync failed: ${error.message}`);
    process.exitCode = 1;
  });
}
