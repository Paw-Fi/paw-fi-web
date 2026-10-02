import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SUPPORTED_CURRENCIES,
  PLAN_REFERENCES,
  toStripeMinorUnits,
  fromStripeMinorUnits,
  generatePricingRows,
  validatePricingRows,
} from "../scripts/regional-pricing-model.mjs";

const policy = JSON.parse(
  await readFile(
    new URL("../config/regional-pricing-policy.json", import.meta.url),
  ),
);

test("all 129 prices are deterministic, reconstructable and within tolerance or fixed", () => {
  const rows = generatePricingRows(policy);
  assert.equal(rows.length, 129);
  assert.deepEqual(rows, generatePricingRows(structuredClone(policy)));
  assert.deepEqual(validatePricingRows(rows, policy), []);
  for (const row of rows) {
    assert.equal(
      fromStripeMinorUnits(row.currency, row.stripeAmount),
      row.majorAmount,
    );
    assert.equal(
      toStripeMinorUnits(row.currency, row.majorAmount),
      row.stripeAmount,
    );
    assert.ok(
      row.override === "fixed" || Math.abs(row.differencePercent) <= 10,
    );
  }
});

test("every supported Stripe charge exponent matches the official currency rules", () => {
  const zeroDecimalCharges = new Set(["CLP", "JPY", "KRW", "VND"]);
  for (const currency of SUPPORTED_CURRENCIES) {
    assert.equal(
      toStripeMinorUnits(currency, 123),
      zeroDecimalCharges.has(currency) ? 123 : 12300,
      currency,
    );
  }
});

test("regional overrides require an explicit reason and bounded tolerance", () => {
  const regional = structuredClone(policy);
  regional.regionalOverrides.monthly = {
    MYR: {
      majorAmount: 29.9,
      tolerancePercent: 35,
      reason: "Explicit test regional pricing",
    },
  };
  assert.deepEqual(
    validatePricingRows(generatePricingRows(regional), regional),
    [],
  );
  delete regional.regionalOverrides.monthly.MYR.reason;
  assert.throws(() => generatePricingRows(regional), /regional override/);
});

test("EUR references and every fixed market remain exact", () => {
  const rows = generatePricingRows(policy);
  for (const [plan, reference] of Object.entries(PLAN_REFERENCES)) {
    assert.equal(
      rows.find((r) => r.plan === plan && r.currency === "EUR").majorAmount,
      reference,
    );
  }
  for (const [plan, values] of Object.entries(policy.fixedPrices)) {
    for (const [currency, amount] of Object.entries(values)) {
      assert.equal(
        rows.find((r) => r.plan === plan && r.currency === currency)
          .majorAmount,
        amount,
      );
    }
  }
});

for (const currency of [
  "EUR",
  "COP",
  "HUF",
  "IDR",
  "JPY",
  "KRW",
  "CLP",
  "VND",
]) {
  test(`${currency} uses Stripe charge units, not display or payout decimals`, () => {
    const zeroDecimal = ["JPY", "KRW", "CLP", "VND"].includes(currency);
    assert.equal(toStripeMinorUnits(currency, 123), zeroDecimal ? 123 : 12300);
    assert.equal(
      fromStripeMinorUnits(currency, zeroDecimal ? 123 : 12300),
      123,
    );
    if (zeroDecimal) assert.throws(() => toStripeMinorUnits(currency, 123.45));
    else assert.equal(toStripeMinorUnits(currency, 123.45), 12345);
  });
}

for (const factor of [0.001, 0.01, 0.1, 10, 100, 1000]) {
  test(`fails closed on ${factor}x major or API amount corruption`, () => {
    for (const field of ["majorAmount", "stripeAmount"]) {
      const rows = generatePricingRows(policy);
      rows.find((r) => r.currency === "COP" && r.plan === "monthly")[field] *=
        factor;
      assert.ok(validatePricingRows(rows, policy).length > 0);
    }
  });
}

test("rejects unsupported currencies and unrepresentable or invalid amounts", () => {
  assert.throws(() => toStripeMinorUnits("XXX", 10), /Unsupported|exponent/);
  assert.throws(
    () => fromStripeMinorUnits("XXX", 1000),
    /Unsupported|exponent/,
  );
  for (const amount of [0, -1, NaN, Infinity, 0.001, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => toStripeMinorUnits("EUR", amount));
  }
  for (const amount of [0, -1, NaN, Infinity, 0.001]) {
    assert.throws(() => fromStripeMinorUnits("EUR", amount));
  }
});

test("policy fails closed on bad references and unsupported override plans", () => {
  for (const change of [
    (p) => {
      p.pricingVersion = 0;
    },
    (p) => {
      p.tolerancePercent = 100;
    },
    (p) => {
      p.fx.base = "USD";
    },
    (p) => {
      p.fixedPrices.monthly.EUR = 5;
    },
    (p) => {
      p.fixedPrices.monthly.XXX = 10;
    },
    (p) => {
      p.fixedPrices.unknown = { EUR: 10 };
    },
    (p) => {
      p.regionalOverrides.unknown = { EUR: { majorAmount: 10 } };
    },
  ]) {
    const invalid = structuredClone(policy);
    change(invalid);
    assert.throws(() => generatePricingRows(invalid));
  }
});

test("rejects missing, malformed and non-positive FX rates", () => {
  for (const rate of [undefined, "3732", 0, -1, NaN, Infinity]) {
    const invalid = structuredClone(policy);
    invalid.fx.rates.COP = rate;
    assert.throws(() => generatePricingRows(invalid), /FX/);
  }
});

test("rejects duplicates, missing currencies, invalid metadata and incorrect fixed amounts", () => {
  const rows = generatePricingRows(policy);
  assert.ok(validatePricingRows([...rows, rows[0]], policy).length);
  assert.ok(validatePricingRows(rows.slice(1), policy).length);
  for (const value of [0, -1, NaN, Infinity]) {
    const invalid = structuredClone(rows);
    invalid[0].majorAmount = value;
    assert.ok(validatePricingRows(invalid, policy).length);
  }
  const invalid = structuredClone(rows);
  invalid.find(
    (r) => r.currency === "USD" && r.plan === "lifetime",
  ).majorAmount = 100;
  assert.ok(validatePricingRows(invalid, policy).length);
  assert.equal(SUPPORTED_CURRENCIES.length, 43);
});

test("derived audit fields cannot hide outside-tolerance prices", () => {
  const rows = generatePricingRows(policy);
  const row = rows.find((r) => r.currency === "MYR" && r.plan === "monthly");
  row.majorAmount *= 1.3;
  row.stripeAmount = toStripeMinorUnits(
    "MYR",
    Number(row.majorAmount.toFixed(2)),
  );
  row.differencePercent = 0;
  row.override = "fixed";
  assert.ok(validatePricingRows(rows, policy).length);
});
