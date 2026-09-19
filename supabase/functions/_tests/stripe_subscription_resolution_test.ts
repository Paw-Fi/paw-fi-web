/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  getRegionalStripePriceLookupKey,
  REGIONAL_PRICING_CATALOG_VERSION,
} from "../shared/regional-pricing.generated.ts";
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

Deno.test(
  "subscription resolution: current regional Plus lookup keys resolve unknown price IDs",
  () =>
    withEnv(() => {
      const monthly = resolveSubscriptionPlanFromPrice({
        items: {
          data: [
            {
              price: {
                id: "price_regional_monthly",
                lookup_key: getRegionalStripePriceLookupKey("plus_monthly"),
                recurring: { interval: "month" },
              },
            },
          ],
        },
      });
      const yearly = resolveSubscriptionPlanFromPrice({
        items: {
          data: [
            {
              price: {
                id: "price_regional_yearly",
                lookup_key: getRegionalStripePriceLookupKey("plus_yearly"),
                recurring: { interval: "year" },
              },
            },
          ],
        },
      });

      assertEquals(monthly, { plan: "plus", interval: "monthly" });
      assertEquals(yearly, { plan: "plus", interval: "yearly" });
    }),
);

Deno.test(
  "subscription resolution: historical regional Plus lookup keys remain valid",
  () =>
    withEnv(() => {
      const resolved = resolveSubscriptionPlanFromPrice({
        items: {
          data: [
            {
              price: {
                id: "price_historical",
                lookup_key: getRegionalStripePriceLookupKey(
                  "plus_yearly",
                  1,
                ),
                recurring: { interval: "year" },
              },
            },
          ],
        },
      });

      assertEquals(resolved, { plan: "plus", interval: "yearly" });
    }),
);

Deno.test(
  "subscription resolution: rejects future keys and conflicting intervals",
  () =>
    withEnv(() => {
      const future = resolveSubscriptionPlanFromPrice({
        items: {
          data: [
            {
              price: {
                id: "price_future",
                lookup_key: getRegionalStripePriceLookupKey(
                  "plus_monthly",
                  REGIONAL_PRICING_CATALOG_VERSION + 1,
                ),
                recurring: { interval: "month" },
              },
            },
          ],
        },
      });
      const conflicting = resolveSubscriptionPlanFromPrice({
        items: {
          data: [
            {
              price: {
                id: "price_conflicting",
                lookup_key: getRegionalStripePriceLookupKey("plus_yearly"),
                recurring: { interval: "month" },
              },
            },
          ],
        },
      });

      assertEquals(future, null);
      assertEquals(conflicting, null);
    }),
);

Deno.test(
  "subscription resolution: configured Price ID wins over an earlier lookup key",
  () =>
    withEnv(() => {
      const resolved = resolveSubscriptionPlanFromPrice({
        items: {
          data: [
            {
              price: {
                id: "price_regional_monthly",
                lookup_key: getRegionalStripePriceLookupKey("plus_monthly"),
                recurring: { interval: "month" },
              },
            },
            {
              price: {
                id: "price_plus_yearly",
                recurring: { interval: "year" },
              },
            },
          ],
        },
      });

      assertEquals(resolved, { plan: "plus", interval: "yearly" });
    }),
);
