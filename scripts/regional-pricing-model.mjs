// Charge/Price exponents from https://docs.stripe.com/currencies (not payout rules).
// COP, HUF, IDR and TWD are TWO-decimal charge currencies.
export const STRIPE_CHARGE_EXPONENTS = Object.freeze({
  AED: 2,
  AUD: 2,
  BRL: 2,
  CAD: 2,
  CHF: 2,
  CLP: 0,
  CNY: 2,
  COP: 2,
  CZK: 2,
  DKK: 2,
  EGP: 2,
  EUR: 2,
  GBP: 2,
  HKD: 2,
  HUF: 2,
  IDR: 2,
  ILS: 2,
  INR: 2,
  JPY: 0,
  KRW: 0,
  KZT: 2,
  MXN: 2,
  MYR: 2,
  NGN: 2,
  NOK: 2,
  NZD: 2,
  PEN: 2,
  PHP: 2,
  PKR: 2,
  PLN: 2,
  QAR: 2,
  RON: 2,
  RUB: 2,
  SAR: 2,
  SEK: 2,
  SGD: 2,
  THB: 2,
  TRY: 2,
  TWD: 2,
  TZS: 2,
  USD: 2,
  VND: 0,
  ZAR: 2,
});
export const SUPPORTED_CURRENCIES = Object.freeze(
  Object.keys(STRIPE_CHARGE_EXPONENTS).sort(),
);
export const PLAN_REFERENCES = Object.freeze({
  monthly: 4.99,
  yearly: 29.99,
  lifetime: 69.99,
});
const REQUIRED_FIXED = Object.freeze({
  monthly: { EUR: 4.99, USD: 10.99, CAD: 14.99 },
  yearly: { EUR: 29.99, USD: 79.99, CAD: 99.99 },
  lifetime: { EUR: 69.99, USD: 99.99, CAD: 139.99 },
});

export function stripeCurrencyExponent(currency) {
  if (!Object.hasOwn(STRIPE_CHARGE_EXPONENTS, currency)) {
    throw new Error(
      `Unsupported currency / unknown Stripe charge exponent: ${currency}`,
    );
  }
  return STRIPE_CHARGE_EXPONENTS[currency];
}

function positiveFinite(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
  return value;
}

export function toStripeMinorUnits(currency, majorAmount) {
  const exponent = stripeCurrencyExponent(currency);
  positiveFinite(majorAmount, `${currency} major amount`);
  const scaled = majorAmount * 10 ** exponent;
  const minor = Math.round(scaled);
  if (
    !Number.isSafeInteger(minor) ||
    minor <= 0 ||
    Math.abs(scaled - minor) > 1e-7 ||
    minor / 10 ** exponent !== majorAmount
  ) {
    throw new Error(
      `${currency} amount is unrepresentable or round-trip mismatch: ${majorAmount}`,
    );
  }
  return minor;
}

export function fromStripeMinorUnits(currency, minorAmount) {
  const exponent = stripeCurrencyExponent(currency);
  if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) {
    throw new Error(
      `${currency} Stripe amount must be a positive safe integer`,
    );
  }
  const majorAmount = minorAmount / 10 ** exponent;
  if (toStripeMinorUnits(currency, majorAmount) !== minorAmount) {
    throw new Error(`${currency} Stripe amount has a round-trip mismatch`);
  }
  return majorAmount;
}

export function readStripeUnitAmount(value) {
  if (!value) return null;
  const decimal = value.unit_amount_decimal;
  if (
    decimal !== undefined &&
    decimal !== null &&
    !/^\d+(?:\.0+)?$/.test(decimal)
  )
    return null;
  const amount = value.unit_amount ?? Number(decimal);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  if (decimal !== undefined && decimal !== null && Number(decimal) !== amount)
    return null;
  return amount;
}

export function validatePricingPolicy(policy) {
  if (
    !Number.isSafeInteger(policy?.pricingVersion) ||
    policy.pricingVersion < 1
  ) {
    throw new Error("pricingVersion must be a positive integer");
  }
  if (policy.tolerancePercent !== 10)
    throw new Error(
      "Default tolerance must be 10%; use explicit regional overrides",
    );
  if (
    policy.fx?.base !== "EUR" ||
    policy.fx?.rates?.EUR !== 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(policy.fx?.date ?? "") ||
    !policy.fx?.source?.startsWith("https://")
  )
    throw new Error("Invalid EUR FX snapshot provenance");
  for (const currency of SUPPORTED_CURRENCIES)
    positiveFinite(policy.fx.rates[currency], `${currency} FX rate`);
  for (const [plan, prices] of Object.entries(REQUIRED_FIXED)) {
    for (const [currency, amount] of Object.entries(prices)) {
      if (policy.fixedPrices?.[plan]?.[currency] !== amount)
        throw new Error(
          `Incorrect fixed price ${plan} ${currency}: expected ${amount}`,
        );
    }
  }
  for (const [plan, prices] of Object.entries(policy.fixedPrices ?? {})) {
    if (!Object.hasOwn(PLAN_REFERENCES, plan))
      throw new Error(`Unsupported plan ${plan}`);
    for (const [currency, amount] of Object.entries(prices))
      toStripeMinorUnits(currency, amount);
  }
  for (const [plan, overrides] of Object.entries(
    policy.regionalOverrides ?? {},
  )) {
    if (!Object.hasOwn(PLAN_REFERENCES, plan))
      throw new Error(`Unsupported plan ${plan}`);
    for (const [currency, override] of Object.entries(overrides)) {
      toStripeMinorUnits(currency, override.majorAmount);
      if (
        policy.fixedPrices[plan]?.[currency] !== undefined ||
        !override.reason?.trim() ||
        !Number.isFinite(override.tolerancePercent) ||
        override.tolerancePercent < 10 ||
        override.tolerancePercent >= 90
      ) {
        throw new Error(`Invalid regional override ${plan} ${currency}`);
      }
    }
  }
}

export function roundLocalPrice(currency, rawMajor) {
  const exponent = stripeCurrencyExponent(currency);
  positiveFinite(rawMajor, `${currency} raw FX price`);
  // Round in MAJOR units. Scaled denomination steps keep deviations small.
  if (rawMajor >= 100) {
    const step = 10 ** Math.max(0, Math.floor(Math.log10(rawMajor)) - 1);
    return Math.round(rawMajor / step) * step;
  }
  if (exponent === 0 || currency === "CHF") return Math.round(rawMajor);
  const ending = ["BRL", "MYR", "ILS", "PEN"].includes(currency) ? 0.9 : 0.99;
  return Number((Math.round(rawMajor - ending) + ending).toFixed(exponent));
}

export function generatePricingRows(policy) {
  validatePricingPolicy(policy);
  return Object.entries(PLAN_REFERENCES).flatMap(([plan, reference]) =>
    SUPPORTED_CURRENCIES.map((currency) => {
      const fxRate = policy.fx.rates[currency];
      const rawFx = reference * fxRate;
      const fixed = policy.fixedPrices[plan]?.[currency];
      const regional = policy.regionalOverrides?.[plan]?.[currency];
      const majorAmount =
        fixed ?? regional?.majorAmount ?? roundLocalPrice(currency, rawFx);
      return {
        plan,
        currency,
        reference,
        fxRate,
        rawFx,
        majorAmount,
        stripeAmount: toStripeMinorUnits(currency, majorAmount),
        eurEquivalent: majorAmount / fxRate,
        differencePercent: (majorAmount / rawFx - 1) * 100,
        override: fixed !== undefined ? "fixed" : regional ? "regional" : null,
      };
    }),
  );
}

export function validatePricingRows(rows, policy) {
  validatePricingPolicy(policy);
  const issues = [];
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.plan}:${row.currency}`;
    if (seen.has(key)) issues.push(`Duplicate currency ${key}`);
    seen.add(key);
    try {
      const reference = PLAN_REFERENCES[row.plan];
      if (!reference) throw new Error(`Unsupported plan ${row.plan}`);
      const minor = toStripeMinorUnits(row.currency, row.majorAmount);
      if (
        minor !== row.stripeAmount ||
        fromStripeMinorUnits(row.currency, row.stripeAmount) !== row.majorAmount
      ) {
        throw new Error("Decimal/minor-unit bug: reconstruction mismatch");
      }
      const raw = reference * policy.fx.rates[row.currency];
      const ratio = row.majorAmount / raw;
      if (ratio <= 0.11 || ratio >= 9)
        throw new Error("Suspicious order-of-magnitude price (10x/100x/1000x)");
      const fixed = policy.fixedPrices[row.plan]?.[row.currency];
      const regional = policy.regionalOverrides?.[row.plan]?.[row.currency];
      const expectedOverride =
        fixed !== undefined ? "fixed" : regional ? "regional" : null;
      if (
        row.reference !== reference ||
        row.fxRate !== policy.fx.rates[row.currency] ||
        row.rawFx !== raw ||
        row.eurEquivalent !== row.majorAmount / policy.fx.rates[row.currency] ||
        row.differencePercent !== (ratio - 1) * 100 ||
        row.override !== expectedOverride
      ) {
        throw new Error("Invalid or inconsistent audit fields");
      }
      if (fixed !== undefined && row.majorAmount !== fixed)
        throw new Error(`Incorrect fixed price: expected ${fixed}`);
      if (regional && row.majorAmount !== regional.majorAmount)
        throw new Error("Incorrect regional override");
      if (
        fixed === undefined &&
        Math.abs((ratio - 1) * 100) >
          (regional?.tolerancePercent ?? policy.tolerancePercent)
      ) {
        throw new Error("Outside tolerance");
      }
    } catch (error) {
      issues.push(`${key}: ${error.message}`);
    }
  }
  for (const plan of Object.keys(PLAN_REFERENCES)) {
    for (const currency of SUPPORTED_CURRENCIES) {
      if (!seen.has(`${plan}:${currency}`))
        issues.push(`Missing ${plan}:${currency}`);
    }
  }
  return issues;
}

export function assertValidPricingRows(rows, policy) {
  const issues = validatePricingRows(rows, policy);
  if (issues.length)
    throw new Error(
      `Pricing validation failures (${issues.length}):\n${issues.join("\n")}`,
    );
}

export function regenerateCatalog(catalog, policy) {
  const rows = generatePricingRows(policy);
  assertValidPricingRows(rows, policy);
  const currencies = new Set();
  const markets = Object.fromEntries(
    Object.entries(catalog.markets).map(([id, market]) => {
      const currency = market.currencyCode;
      currencies.add(currency);
      const prices = Object.fromEntries(
        rows
          .filter((r) => r.currency === currency)
          .map((r) => [r.plan, r.stripeAmount]),
      );
      const exponent = stripeCurrencyExponent(currency);
      const originalMajor =
        currency === "USD"
          ? 149.99
          : currency === "CAD"
            ? 199.99
            : currency === "EUR"
              ? 99.99
              : Number(
                  (
                    fromStripeMinorUnits(currency, prices.lifetime) / 0.7
                  ).toFixed(exponent),
                );
      return [
        id,
        {
          ...market,
          minorUnits: exponent,
          monthly: prices.monthly,
          yearly: prices.yearly,
          lifetime: toStripeMinorUnits(currency, originalMajor),
          lifetimePromo: prices.lifetime,
          compareAtMonthly: Math.round(prices.monthly * 1.6),
          compareAtYearly: Math.round(prices.yearly * 1.6),
        },
      ];
    }),
  );
  for (const currency of SUPPORTED_CURRENCIES) {
    if (!currencies.has(currency))
      throw new Error(`Missing expected catalog currency ${currency}`);
  }
  return { ...catalog, markets };
}

export function assertCatalogMatchesPolicy(catalog, policy) {
  const expected = regenerateCatalog(catalog, policy);
  for (const [id, market] of Object.entries(catalog.markets)) {
    for (const key of [
      "minorUnits",
      "monthly",
      "yearly",
      "lifetime",
      "lifetimePromo",
    ]) {
      if (market[key] !== expected.markets[id][key])
        throw new Error(
          `Catalog ${id}.${key} differs from validated generation; run generate-regional-pricing.mjs`,
        );
    }
  }
}
