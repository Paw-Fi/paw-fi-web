/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { resolveSubscriptionPlanFromPrice } from "../shared/stripe-subscription-prices.ts";

const managedEnvKeys = [
  "STRIPE_MONTHLY_PLUS_PLAN_ID",
  "STRIPE_YEARLY_PLUS_PLAN_ID",
  "STRIPE_LIFETIME_PRICE_ID",
  "STRIPE_MONTHLY_PREMIUM_PLAN_ID",
  "STRIPE_YEARLY_PREMIUM_PLAN_ID",
];

function withEnv(fn: () => void): void {
  const previous = new Map(
    managedEnvKeys.map((key) => [key, Deno.env.get(key)]),
  );

  for (const key of managedEnvKeys) {
    Deno.env.delete(key);
  }

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
  "subscription resolution: price id wins over conflicting metadata",
  () =>
    withEnv(() => {
      const resolved = resolveSubscriptionPlanFromPrice({
        metadata: {
          plan: "plus",
          billing_interval: "monthly",
        },
        items: {
          data: [
            {
              price: { id: "price_premium_yearly" },
            },
          ],
        },
      });

      assertEquals(resolved, { plan: "premium", interval: "yearly" });
    }),
);

Deno.test(
  "subscription resolution: returns null when price id is unknown",
  () =>
    withEnv(() => {
      const resolved = resolveSubscriptionPlanFromPrice({
        metadata: {
          plan: "premium",
          billing_interval: "yearly",
        },
        items: {
          data: [
            {
              price: { id: "price_unknown" },
            },
          ],
        },
      });

      assertEquals(resolved, null);
    }),
);
