import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { format, resolveConfig } from "prettier";
import {
  regenerateCatalog,
  generatePricingRows,
  assertValidPricingRows,
} from "./regional-pricing-model.mjs";
import { fetchLatestPricingPolicy } from "./regional-pricing-fx.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const workspaceRoot = path.dirname(webRoot);
const catalogPath = path.join(webRoot, "config/regional-pricing.json");
const checkOnly = process.argv.includes("--check");
const dryRun = process.argv.includes("--dry-run");
if (checkOnly && dryRun)
  throw new Error("--check cannot be combined with --dry-run");
for (const argument of process.argv.slice(2)) {
  if (!["--check", "--dry-run"].includes(argument))
    throw new Error(`Unknown argument '${argument}'`);
}

const policyPath = path.join(webRoot, "config/regional-pricing-policy.json");
const savedPolicySource = await readFile(policyPath, "utf8");
const savedPolicy = JSON.parse(savedPolicySource);
const policy = checkOnly
  ? savedPolicy
  : await fetchLatestPricingPolicy(savedPolicy);
const policySource = checkOnly
  ? savedPolicySource
  : await format(JSON.stringify(policy), {
      ...(await resolveConfig(policyPath)),
      filepath: policyPath,
    });
if (!checkOnly)
  console.log(
    `Fetched latest EUR FX rates with curl: ${policy.fx.date}, ${Object.keys(policy.fx.rates).length} currencies (${policy.fx.source})`,
  );
const previousCatalogSource = await readFile(catalogPath, "utf8");
const previousCatalog = JSON.parse(previousCatalogSource);
const catalog = regenerateCatalog(previousCatalog, policy);
const catalogSource = await format(JSON.stringify(catalog), {
  ...(await resolveConfig(catalogPath)),
  filepath: catalogPath,
});
const sourceHash = createHash("sha256").update(catalogSource).digest("hex");
const policyHash = createHash("sha256").update(policySource).digest("hex");
const pricingRows = generatePricingRows(policy);
assertValidPricingRows(pricingRows, policy);
if (dryRun) {
  console.table(
    pricingRows.map((row) => ({
      plan: row.plan,
      currency: row.currency,
      eurReference: row.reference,
      rawFx: row.rawFx,
      majorPrice: row.majorAmount,
      stripeAmount: row.stripeAmount,
      eurEquivalent: row.eurEquivalent,
      differencePercent: row.differencePercent,
      status: row.override ? `${row.override} override` : "OK",
    })),
  );
  console.log(
    "Validated 129 plan/currency prices; no files or Stripe prices changed.",
  );
  process.exit(0);
}
if (checkOnly && JSON.stringify(previousCatalog) !== JSON.stringify(catalog)) {
  throw new Error(
    "Regional pricing catalog is stale; run node scripts/generate-regional-pricing.mjs",
  );
}

function fail(message) {
  throw new Error(`Invalid regional pricing catalog: ${message}`);
}

if (!Number.isInteger(catalog.catalogVersion) || catalog.catalogVersion < 1) {
  fail("catalogVersion must be a positive integer");
}
if (!catalog.markets || typeof catalog.markets !== "object") {
  fail("markets must be an object");
}
if (!catalog.markets[catalog.defaultMarket]) {
  fail(`defaultMarket '${catalog.defaultMarket}' does not exist`);
}

const countryToMarket = {};
for (const [marketId, market] of Object.entries(catalog.markets)) {
  if (!/^[a-z0-9_]+$/.test(marketId)) fail(`invalid market id '${marketId}'`);
  if (!/^[A-Z]{3}$/.test(market.currencyCode)) {
    fail(`${marketId}.currencyCode must be an ISO 4217 code`);
  }
  if (typeof market.locale !== "string" || market.locale.length < 2) {
    fail(`${marketId}.locale must be a locale string`);
  }
  if (
    !Number.isInteger(market.minorUnits) ||
    market.minorUnits < 0 ||
    market.minorUnits > 3
  ) {
    fail(`${marketId}.minorUnits must be an integer from 0 to 3`);
  }
  for (const key of [
    "monthly",
    "yearly",
    "lifetime",
    "compareAtMonthly",
    "compareAtYearly",
  ]) {
    if (!Number.isInteger(market[key]) || market[key] <= 0) {
      fail(`${marketId}.${key} must be a positive integer in minor units`);
    }
  }
  if (!Array.isArray(market.countries) || market.countries.length === 0) {
    fail(`${marketId}.countries must contain at least one country`);
  }
  for (const rawCode of market.countries) {
    const code = String(rawCode).toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) fail(`invalid ISO country code '${rawCode}'`);
    if (countryToMarket[code]) {
      fail(
        `country '${code}' is assigned to both '${countryToMarket[code]}' and '${marketId}'`,
      );
    }
    countryToMarket[code] = marketId;
  }
}

const countryCodes = Object.keys(countryToMarket).sort();
if (countryCodes.length !== 175) {
  fail(`expected exactly 175 countries, found ${countryCodes.length}`);
}

const currencies = [
  ...new Set(
    Object.values(catalog.markets).map((market) => market.currencyCode),
  ),
].sort();
const serializedMarkets = Object.fromEntries(
  Object.entries(catalog.markets).map(([marketId, market]) => [
    marketId,
    {
      id: marketId,
      currencyCode: market.currencyCode,
      locale: market.locale,
      minorUnits: market.minorUnits,
      monthly: market.monthly,
      yearly: market.yearly,
      lifetime: market.lifetime,
      lifetimePromo: market.lifetimePromo,
      compareAtMonthly: market.compareAtMonthly,
      compareAtYearly: market.compareAtYearly,
    },
  ]),
);

const tsOutput = `// GENERATED FILE. Edit config/regional-pricing.json and run npm run pricing:generate.\n// Source SHA-256: ${sourceHash}\n\nexport interface RegionalPricingMarket {\n  readonly id: string;\n  readonly currencyCode: string;\n  readonly locale: string;\n  readonly minorUnits: number;\n  readonly monthly: number;\n  readonly yearly: number;\n  readonly lifetime: number;\n  readonly compareAtMonthly: number;\n  readonly compareAtYearly: number;\n}\n\nexport const REGIONAL_PRICING_CATALOG_VERSION = ${catalog.catalogVersion};\nexport const DEFAULT_REGIONAL_PRICING_MARKET_ID = ${JSON.stringify(catalog.defaultMarket)};\nexport const REGIONAL_PRICING_MARKETS = ${JSON.stringify(serializedMarkets, null, 2)} as const satisfies Record<string, RegionalPricingMarket>;\nexport const REGIONAL_PRICING_COUNTRY_TO_MARKET = ${JSON.stringify(countryToMarket, null, 2)} as const satisfies Record<string, keyof typeof REGIONAL_PRICING_MARKETS>;\nexport const REGIONAL_PRICING_COUNTRY_CODES = ${JSON.stringify(countryCodes, null, 2)} as const;\nexport const REGIONAL_PRICING_CURRENCIES = ${JSON.stringify(currencies, null, 2)} as const;\n\nexport function isSupportedRegionalPricingCountry(countryCode: unknown): countryCode is keyof typeof REGIONAL_PRICING_COUNTRY_TO_MARKET {\n  return typeof countryCode === \"string\" && countryCode.trim().toUpperCase() in REGIONAL_PRICING_COUNTRY_TO_MARKET;\n}\n\nexport function getRegionalPricingMarket(countryCode?: string | null): RegionalPricingMarket {\n  const normalizedCountry = countryCode?.trim().toUpperCase() ?? \"\";\n  const marketId = REGIONAL_PRICING_COUNTRY_TO_MARKET[normalizedCountry as keyof typeof REGIONAL_PRICING_COUNTRY_TO_MARKET] ?? DEFAULT_REGIONAL_PRICING_MARKET_ID;\n  return REGIONAL_PRICING_MARKETS[marketId];\n}\n\nexport function getRegionalStripePriceLookupKey(planTarget: string, catalogVersion: number = REGIONAL_PRICING_CATALOG_VERSION): string {\n  return \`moneko_\${planTarget}_v\${catalogVersion}\`;\n}\n\nexport function isSupportedRegionalCurrency(currencyCode: unknown): currencyCode is (typeof REGIONAL_PRICING_CURRENCIES)[number] {\n  return typeof currencyCode === \"string\" && (REGIONAL_PRICING_CURRENCIES as readonly string[]).includes(currencyCode.trim().toUpperCase());\n}\n`;

function dartString(value) {
  return `'${String(value).replaceAll("'", "\\'")}'`;
}

const dartMarkets = Object.entries(serializedMarkets)
  .map(
    ([marketId, market]) =>
      `  ${dartString(marketId)}: RegionalPricingMarket(\n    id: ${dartString(market.id)},\n    currencyCode: ${dartString(market.currencyCode)},\n    locale: ${dartString(market.locale)},\n    minorUnits: ${market.minorUnits},\n    monthly: ${market.monthly},\n    yearly: ${market.yearly},\n    lifetime: ${market.lifetime},\n    lifetimePromo: ${market.lifetimePromo},\n    compareAtMonthly: ${market.compareAtMonthly},\n    compareAtYearly: ${market.compareAtYearly},\n  ),`,
  )
  .join("\n");
const dartCountries = Object.entries(countryToMarket)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([country, marketId]) =>
      `  ${dartString(country)}: ${dartString(marketId)},`,
  )
  .join("\n");

const dartOutput = `// GENERATED FILE. Edit ../moneko-web/config/regional-pricing.json and run\n// npm run pricing:generate from moneko-web.\n// Source SHA-256: ${sourceHash}\n\nclass RegionalPricingMarket {\n  const RegionalPricingMarket({\n    required this.id,\n    required this.currencyCode,\n    required this.locale,\n    required this.minorUnits,\n    required this.monthly,\n    required this.yearly,\n    required this.lifetime,\n    required this.compareAtMonthly,\n    required this.compareAtYearly,\n  });\n\n  final String id;\n  final String currencyCode;\n  final String locale;\n  final int minorUnits;\n  final int monthly;\n  final int yearly;\n  final int lifetime;\n  final int compareAtMonthly;\n  final int compareAtYearly;\n}\n\nconst int regionalPricingCatalogVersion = ${catalog.catalogVersion};\nconst String defaultRegionalPricingMarketId = ${dartString(catalog.defaultMarket)};\nconst Map<String, RegionalPricingMarket> regionalPricingMarkets = {\n${dartMarkets}\n};\nconst Map<String, String> regionalPricingCountryToMarket = {\n${dartCountries}\n};\nconst List<String> regionalPricingCountryCodes = [\n${countryCodes.map((code) => `  ${dartString(code)},`).join("\n")}\n];\nconst List<String> regionalPricingCurrencies = [\n${currencies.map((currency) => `  ${dartString(currency)},`).join("\n")}\n];\n\nRegionalPricingMarket regionalPricingForCountry(String? countryCode) {\n  final normalized = countryCode?.trim().toUpperCase() ?? '';\n  final marketId = regionalPricingCountryToMarket[normalized] ?? defaultRegionalPricingMarketId;\n  return regionalPricingMarkets[marketId]!;\n}\n`;

const outputs = [
  {
    outputPath: path.join(webRoot, "src/data/regional-pricing.generated.ts"),
    content:
      tsOutput
        .replace(
          "Edit config/regional-pricing.json and run npm run pricing:generate.",
          "Edit config/regional-pricing-policy.json for amounts; run node scripts/generate-regional-pricing.mjs.",
        )
        .replace(
          "  readonly lifetime: number;",
          "  readonly lifetime: number;\n  readonly lifetimePromo: number;",
        ) + `\n// Pricing policy SHA-256: ${policyHash}\n`,
    exactCheck: false,
  },
  {
    outputPath: path.join(
      webRoot,
      "supabase/functions/shared/regional-pricing.generated.ts",
    ),
    content:
      tsOutput
        .replace(
          "Edit config/regional-pricing.json and run npm run pricing:generate.",
          "Edit config/regional-pricing-policy.json for amounts; run node scripts/generate-regional-pricing.mjs.",
        )
        .replace(
          "  readonly lifetime: number;",
          "  readonly lifetime: number;\n  readonly lifetimePromo: number;",
        ) + `\n// Pricing policy SHA-256: ${policyHash}\n`,
    exactCheck: false,
  },
  {
    outputPath: path.join(
      workspaceRoot,
      "moneko-mobile/lib/features/subscription/data/regional_pricing.generated.dart",
    ),
    content:
      dartOutput
        .replace(
          "    required this.lifetime,",
          "    required this.lifetime,\n    required this.lifetimePromo,",
        )
        .replace(
          "  final int lifetime;",
          "  final int lifetime;\n  final int lifetimePromo;",
        ) + `\n// Pricing policy SHA-256: ${policyHash}\n`,
    exactCheck: false,
  },
];

const formattedOutputs = await Promise.all(
  outputs.map(async (output) => {
    if (output.outputPath.endsWith(".dart")) {
      const result = spawnSync(
        "dart",
        ["format", "--output=show", "--summary=none"],
        { input: output.content, encoding: "utf8" },
      );
      if (result.error || result.status !== 0)
        throw new Error(
          `Dart formatter failed: ${result.error?.message ?? result.stderr}`,
        );
      return { ...output, content: result.stdout };
    }
    return {
      ...output,
      content: await format(output.content, {
        ...(await resolveConfig(output.outputPath)),
        filepath: output.outputPath,
      }),
    };
  }),
);
// Complete all validation before writing any output.
if (!checkOnly) {
  await writeFile(policyPath, policySource);
  await writeFile(catalogPath, catalogSource);
}
let stale = false;
for (const { outputPath, content } of formattedOutputs) {
  if (checkOnly) {
    const existing = await readFile(outputPath, "utf8").catch(() => "");
    const isCurrent = existing === content;
    if (!isCurrent) {
      stale = true;
      console.error(`Stale generated pricing file: ${outputPath}`);
    }
  } else {
    await writeFile(outputPath, content);
    console.log(`Generated ${outputPath}`);
  }
}

if (stale) process.exitCode = 1;
console.log(
  `Regional pricing catalog: ${countryCodes.length} countries, ${currencies.length} currencies, ${Object.keys(catalog.markets).length} markets.`,
);
