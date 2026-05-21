/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  normalizeExchangeRatePayload,
  shouldRefreshCurrencyRates,
} from "../shared/currency-rates.ts";

Deno.test("currency-rates: normalizes public USD rate payload", () => {
  const snapshot = normalizeExchangeRatePayload({
    result: "success",
    base_code: "usd",
    time_last_update_utc: "Mon, 18 May 2026 00:00:01 +0000",
    rates: {
      usd: 1,
      eur: 0.8,
      jpy: "160.5",
      bad: "not-a-number",
    },
  });

  assertEquals(snapshot.baseCurrency, "USD");
  assertEquals(snapshot.rates.USD, 1);
  assertEquals(snapshot.rates.EUR, 0.8);
  assertEquals(snapshot.rates.JPY, 160.5);
  assertEquals(snapshot.rates.BAD, undefined);
});

Deno.test("currency-rates: refreshes when snapshot is older than ttl", () => {
  const now = new Date("2026-05-18T12:00:00Z");
  const stale = new Date("2026-05-17T23:59:59Z");
  const fresh = new Date("2026-05-18T00:01:00Z");

  assertEquals(
    shouldRefreshCurrencyRates({ fetchedAt: stale, now, ttlHours: 12 }),
    true,
  );
  assertEquals(
    shouldRefreshCurrencyRates({ fetchedAt: fresh, now, ttlHours: 12 }),
    false,
  );
});
