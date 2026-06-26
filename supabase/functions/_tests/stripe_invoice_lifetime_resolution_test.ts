/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  allowZeroAmountLifetimeGrants,
  isPositiveStripeAmount,
} from "../shared/lifetime-grant-policy.ts";
import {
  resolveInvoicePlanFromLinePrices,
  resolveSubscriptionPlanFromPrice,
} from "../shared/stripe-subscription-prices.ts";

const managedEnvKeys = [
  "STRIPE_MONTHLY_PLUS_PLAN_ID",
  "STRIPE_YEARLY_PLUS_PLAN_ID",
  "STRIPE_LIFETIME_PRICE_ID",
  "STRIPE_MONTHLY_PREMIUM_PLAN_ID",
  "STRIPE_YEARLY_PREMIUM_PLAN_ID",
  "ALLOW_ZERO_AMOUNT_LIFETIME_GRANTS",
];

function withEnv(fn: () => void): void {
  const previous = new Map(
    managedEnvKeys.map((key) => [key, Deno.env.get(key)]),
  );

  for (const key of managedEnvKeys) Deno.env.delete(key);

  try {
    Deno.env.set("STRIPE_MONTHLY_PLUS_PLAN_ID", "price_plus_monthly");
    Deno.env.set("STRIPE_YEARLY_PLUS_PLAN_ID", "price_plus_yearly");
    Deno.env.set("STRIPE_LIFETIME_PRICE_ID", "price_lifetime");
    Deno.env.set("STRIPE_MONTHLY_PREMIUM_PLAN_ID", "price_premium_monthly");
    Deno.env.set("STRIPE_YEARLY_PREMIUM_PLAN_ID", "price_premium_yearly");
    fn();
  } finally {
    for (const key of managedEnvKeys) {
      const value = previous.get(key);
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

Deno.test(
  "invoice plan resolution: metadata lifetime is ignored when line price is Plus",
  () =>
    withEnv(() => {
      const resolved = resolveInvoicePlanFromLinePrices({
        metadata: { plan: "lifetime" },
        lines: {
          data: [{ price: { id: "price_plus_monthly" } }],
        },
      });

      assertEquals(resolved, { plan: "plus", interval: "monthly" });
    }),
);

Deno.test(
  "invoice plan resolution: lifetime requires configured lifetime price id",
  () =>
    withEnv(() => {
      const resolved = resolveInvoicePlanFromLinePrices({
        metadata: { plan: "lifetime" },
        lines: {
          data: [{ price: { id: "price_lifetime" } }],
        },
      });

      assertEquals(resolved, { plan: "lifetime", interval: null });
    }),
);

Deno.test(
  "subscription price resolution: scans beyond the first item for configured price",
  () =>
    withEnv(() => {
      const resolved = resolveSubscriptionPlanFromPrice({
        items: {
          data: [
            { price: { id: "price_unknown" } },
            { price: { id: "price_premium_yearly" } },
          ],
        },
      });

      assertEquals(resolved, { plan: "premium", interval: "yearly" });
    }),
);

Deno.test("lifetime grants: zero-amount access is disabled by default", () =>
  withEnv(() => {
    assertEquals(allowZeroAmountLifetimeGrants(), false);
    assertEquals(isPositiveStripeAmount(0), false);
    assertEquals(isPositiveStripeAmount(1), true);
  }));

Deno.test("lifetime grants: zero-amount access requires explicit opt-in", () =>
  withEnv(() => {
    Deno.env.set("ALLOW_ZERO_AMOUNT_LIFETIME_GRANTS", "true");

    assertEquals(allowZeroAmountLifetimeGrants(), true);
  }));
