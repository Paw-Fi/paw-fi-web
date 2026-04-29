/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  resolveStripeCurrentPeriodEnd,
  unixSecondsToIso,
} from "../shared/stripe-subscription-period.ts";

Deno.test("stripe period: uses subscription current_period_end first", () => {
  const may20 = unixSeconds(Date.UTC(2026, 4, 20, 0, 0, 0));
  const jun21 = unixSeconds(Date.UTC(2026, 5, 21, 0, 0, 0));
  const result = resolveStripeCurrentPeriodEnd({
    subscription: {
      current_period_end: may20,
      items: {
        data: [{ current_period_end: jun21 }],
      },
    },
    status: "active",
    plan: "plus",
  });

  assertEquals(result.currentPeriodEnd, "2026-05-20T00:00:00.000Z");
  assertEquals(result.source, "subscription.current_period_end");
});

Deno.test(
  "stripe period: falls back to subscription item period for flexible billing",
  () => {
    const may20 = unixSeconds(Date.UTC(2026, 4, 20, 0, 0, 0));
    const jun21 = unixSeconds(Date.UTC(2026, 5, 21, 0, 0, 0));
    const result = resolveStripeCurrentPeriodEnd({
      subscription: {
        current_period_end: null,
        items: {
          data: [{ current_period_end: may20 }, { current_period_end: jun21 }],
        },
      },
      status: "active",
      plan: "plus",
    });

    assertEquals(result.currentPeriodEnd, "2026-06-21T00:00:00.000Z");
    assertEquals(result.source, "subscription_item.current_period_end");
  },
);

Deno.test(
  "stripe period: falls back to trial_end for trialing subscriptions",
  () => {
    const may20 = unixSeconds(Date.UTC(2026, 4, 20, 0, 0, 0));
    const result = resolveStripeCurrentPeriodEnd({
      subscription: {
        current_period_end: null,
        trial_end: may20,
        items: { data: [] },
      },
      status: "trialing",
      plan: "plus",
    });

    assertEquals(result.currentPeriodEnd, "2026-05-20T00:00:00.000Z");
    assertEquals(result.source, "subscription.trial_end");
  },
);

Deno.test(
  "stripe period: falls back to invoice line period for renewal events",
  () => {
    const may20 = unixSeconds(Date.UTC(2026, 4, 20, 0, 0, 0));
    const jun21 = unixSeconds(Date.UTC(2026, 5, 21, 0, 0, 0));
    const result = resolveStripeCurrentPeriodEnd({
      subscription: {
        current_period_end: null,
        items: { data: [] },
      },
      invoice: {
        lines: {
          data: [
            { type: "subscription", period: { end: may20 } },
            { type: "subscription", period: { end: jun21 } },
          ],
        },
      },
      status: "active",
      plan: "plus",
    });

    assertEquals(result.currentPeriodEnd, "2026-06-21T00:00:00.000Z");
    assertEquals(result.source, "invoice_line.period.end");
  },
);

Deno.test(
  "stripe period: ignores non-subscription invoice line periods",
  () => {
    const subscriptionEnd = unixSeconds(Date.UTC(2026, 4, 20, 0, 0, 0));
    const manualLineEnd = unixSeconds(Date.UTC(2027, 4, 20, 0, 0, 0));
    const result = resolveStripeCurrentPeriodEnd({
      subscription: {
        current_period_end: null,
        items: { data: [] },
      },
      invoice: {
        lines: {
          data: [
            { type: "invoiceitem", period: { end: manualLineEnd } },
            { type: "subscription", period: { end: subscriptionEnd } },
          ],
        },
      },
      status: "active",
      plan: "plus",
    });

    assertEquals(result.currentPeriodEnd, "2026-05-20T00:00:00.000Z");
    assertEquals(result.source, "invoice_line.period.end");
  },
);

Deno.test(
  "stripe period: returns missing instead of trusting local state",
  () => {
    const result = resolveStripeCurrentPeriodEnd({
      subscription: {
        current_period_end: null,
        items: { data: [] },
      },
      status: "active",
      plan: "plus",
    });

    assertEquals(result.currentPeriodEnd, null);
    assertEquals(result.source, "missing");
  },
);

Deno.test("stripe period: lifetime subscriptions keep null period end", () => {
  const may20 = unixSeconds(Date.UTC(2026, 4, 20, 0, 0, 0));
  const result = resolveStripeCurrentPeriodEnd({
    subscription: {
      current_period_end: may20,
      items: {
        data: [{ current_period_end: may20 }],
      },
    },
    status: "active",
    plan: "lifetime",
  });

  assertEquals(result.currentPeriodEnd, null);
  assertEquals(result.source, "lifetime");
});

Deno.test("stripe period: invalid unix values resolve to null", () => {
  assertEquals(unixSecondsToIso(null), null);
  assertEquals(unixSecondsToIso(undefined), null);
  assertEquals(unixSecondsToIso(Number.NaN), null);
  assertEquals(unixSecondsToIso("not-a-number"), null);
});

function unixSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}
