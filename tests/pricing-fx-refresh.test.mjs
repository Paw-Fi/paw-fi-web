import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  fetchLatestPricingPolicy,
  LATEST_EUR_RATES_URL,
} from "../scripts/regional-pricing-fx.mjs";
import {
  generatePricingRows,
  validatePricingRows,
} from "../scripts/regional-pricing-model.mjs";

const policy = JSON.parse(
  await readFile(
    new URL("../config/regional-pricing-policy.json", import.meta.url),
  ),
);
const now = new Date(`${policy.fx.date}T12:00:00Z`);
const response = () => ({
  date: policy.fx.date,
  eur: Object.fromEntries(
    Object.entries(policy.fx.rates).map(([currency, rate]) => [
      currency.toLowerCase(),
      rate,
    ]),
  ),
});
const executor = (payload) => () =>
  Promise.resolve({ stdout: JSON.stringify(payload) });

test("generation fetches latest EUR rates with bounded curl and preserves all fixed prices", async () => {
  const payload = response();
  payload.eur.cop *= 1.01;
  let call;
  const refreshed = await fetchLatestPricingPolicy(policy, {
    now,
    runCurl: (...args) => {
      call = args;
      return Promise.resolve({ stdout: JSON.stringify(payload) });
    },
  });
  assert.equal(call[0], "curl");
  assert.ok(call[1].includes("--fail"));
  assert.ok(call[1].includes("--max-time"));
  assert.equal(call[1].at(-1), LATEST_EUR_RATES_URL);
  assert.ok(call[2].timeout > 0);
  assert.equal(refreshed.fx.rates.COP, payload.eur.cop);
  assert.equal(refreshed.fx.source, LATEST_EUR_RATES_URL);
  assert.deepEqual(refreshed.fixedPrices, policy.fixedPrices);
  assert.notEqual(refreshed, policy);
  assert.equal(policy.fx.rates.COP, response().eur.cop);
  assert.equal(Object.keys(refreshed.fx.rates).length, 43);
  assert.deepEqual(
    validatePricingRows(generatePricingRows(refreshed), refreshed),
    [],
  );
});

test("refresh refuses curl errors and malformed JSON without a stale-rate fallback", async () => {
  await assert.rejects(
    () =>
      fetchLatestPricingPolicy(policy, {
        now,
        runCurl: () => Promise.reject(new Error("HTTP 500")),
      }),
    /FX.*HTTP 500/,
  );
  await assert.rejects(
    () =>
      fetchLatestPricingPolicy(policy, {
        now,
        runCurl: () => Promise.resolve({ stdout: "not JSON" }),
      }),
    /FX/,
  );
});

test("refresh rejects missing, malformed and non-positive required rates", async () => {
  for (const rate of [undefined, "3732", 0, -1, null]) {
    const payload = response();
    payload.eur.cop = rate;
    await assert.rejects(
      () =>
        fetchLatestPricingPolicy(policy, { now, runCurl: executor(payload) }),
      /FX/,
    );
  }
  const payload = response();
  payload.eur.eur = 2;
  await assert.rejects(
    () => fetchLatestPricingPolicy(policy, { now, runCurl: executor(payload) }),
    /FX/,
  );
});

test("refresh rejects absent, impossible, stale and future snapshot dates", async () => {
  for (const date of [
    undefined,
    "invalid",
    "2026-02-30",
    "2000-01-01",
    "2099-01-01",
  ]) {
    await assert.rejects(
      () =>
        fetchLatestPricingPolicy(policy, {
          now,
          runCurl: executor({ ...response(), date }),
        }),
      /FX/,
    );
  }
  await assert.rejects(
    () =>
      fetchLatestPricingPolicy(policy, {
        now,
        runCurl: executor({ date: policy.fx.date }),
      }),
    /FX/,
  );
});
