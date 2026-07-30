/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  getPlanFromPriceId,
  getPriceId,
} from "../shared/stripe-subscription-prices.ts";

const managedEnvKeys = [
  "STRIPE_MONTHLY_PLUS_PLAN_ID",
  "STRIPE_YEARLY_PLUS_PLAN_ID",
  "STRIPE_LIFETIME_PRICE_ID",
  "STRIPE_MONTHLY_PREMIUM_PLAN_ID",
  "STRIPE_YEARLY_PREMIUM_PLAN_ID",
];

function withEnv(fn: () => void | Promise<void>): Promise<void> | void {
  const previous = new Map(
    managedEnvKeys.map((key) => [key, Deno.env.get(key)]),
  );

  for (const key of managedEnvKeys) {
    Deno.env.delete(key);
  }

  const restore = () => {
    for (const key of managedEnvKeys) {
      const value = previous.get(key);
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  };

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(restore);
    }
    restore();
  } catch (error) {
    restore();
    throw error;
  }
}

Deno.test("stripe prices: yearly selections use the paid-upfront yearly price", () =>
  withEnv(() => {
    Deno.env.set("STRIPE_YEARLY_PLUS_PLAN_ID", "price_plus_yearly");

    assertEquals(getPriceId("plus", "yearly"), "price_plus_yearly");
    assertEquals(getPlanFromPriceId("price_plus_yearly"), {
      plan: "plus",
      interval: "yearly",
    });
  }));

Deno.test(
  "stripe prices: premium launch requires monthly and yearly price IDs",
  () =>
    withEnv(() => {
      Deno.env.set("STRIPE_MONTHLY_PREMIUM_PLAN_ID", "price_premium_monthly");

      assertThrows(
        () => getPriceId("premium", "monthly"),
        Error,
        "Premium price IDs are not fully configured",
      );
    }),
);

Deno.test("stripe prices: premium returns prices when configured", () =>
  withEnv(() => {
    Deno.env.set("STRIPE_MONTHLY_PREMIUM_PLAN_ID", "price_premium_monthly");
    Deno.env.set("STRIPE_YEARLY_PREMIUM_PLAN_ID", "price_premium_yearly");

    assertEquals(getPriceId("premium", "monthly"), "price_premium_monthly");
    assertEquals(getPriceId("premium", "yearly"), "price_premium_yearly");
    assertEquals(getPlanFromPriceId("price_premium_monthly"), {
      plan: "premium",
      interval: "monthly",
    });
  }));
