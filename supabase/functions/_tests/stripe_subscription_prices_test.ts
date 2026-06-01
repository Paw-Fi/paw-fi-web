/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  areAllPriceIdsConfigured,
  getPlanFromPriceId,
  getPriceId,
} from "../shared/stripe-subscription-prices.ts";

const ENV_KEYS = [
  "STRIPE_MONTHLY_PLUS_PLAN_ID",
  "STRIPE_YEARLY_PLUS_PLAN_ID",
  "STRIPE_PLUS_MONTHLY_PRICE_ID",
  "STRIPE_PLUS_YEARLY_PRICE_ID",
  "STRIPE_LIFETIME_PRICE_ID",
  "STRIPE_MONTHLY_PREMIUM_PLAN_ID",
  "STRIPE_YEARLY_PREMIUM_PLAN_ID",
  "PREMIUM_PLAN_ENABLED",
];

function withPriceEnv(
  values: Record<string, string | null>,
  run: () => void,
): void {
  const previous = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    previous.set(key, Deno.env.get(key));
    Deno.env.delete(key);
  }

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === null) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
    run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

Deno.test(
  "stripe prices: resolves premium monthly and yearly price ids",
  () => {
    withPriceEnv(
      {
        STRIPE_MONTHLY_PLUS_PLAN_ID: "price_plus_monthly",
        STRIPE_YEARLY_PLUS_PLAN_ID: "price_plus_yearly",
        STRIPE_LIFETIME_PRICE_ID: "price_lifetime",
        STRIPE_MONTHLY_PREMIUM_PLAN_ID: "price_premium_monthly",
        STRIPE_YEARLY_PREMIUM_PLAN_ID: "price_premium_yearly",
        PREMIUM_PLAN_ENABLED: "true",
      },
      () => {
        assertEquals(getPriceId("premium", "monthly"), "price_premium_monthly");
        assertEquals(getPriceId("premium", "yearly"), "price_premium_yearly");
        assertEquals(getPlanFromPriceId("price_premium_monthly"), {
          plan: "premium",
          interval: "monthly",
        });
        assertEquals(getPlanFromPriceId("price_premium_yearly"), {
          plan: "premium",
          interval: "yearly",
        });
      },
    );
  },
);

Deno.test("stripe prices: premium launch requires premium price ids", () => {
  withPriceEnv(
    {
      STRIPE_MONTHLY_PLUS_PLAN_ID: "price_plus_monthly",
      STRIPE_YEARLY_PLUS_PLAN_ID: "price_plus_yearly",
      STRIPE_LIFETIME_PRICE_ID: "price_lifetime",
      PREMIUM_PLAN_ENABLED: "true",
    },
    () => {
      assertEquals(areAllPriceIdsConfigured(), false);
      assertThrows(
        () => getPriceId("premium", "monthly"),
        Error,
        "Price ID not configured",
      );
    },
  );
});

Deno.test("stripe prices: premium price ids are rejected before launch", () => {
  withPriceEnv(
    {
      STRIPE_MONTHLY_PLUS_PLAN_ID: "price_plus_monthly",
      STRIPE_YEARLY_PLUS_PLAN_ID: "price_plus_yearly",
      STRIPE_LIFETIME_PRICE_ID: "price_lifetime",
      STRIPE_MONTHLY_PREMIUM_PLAN_ID: "price_premium_monthly",
      STRIPE_YEARLY_PREMIUM_PLAN_ID: "price_premium_yearly",
      PREMIUM_PLAN_ENABLED: "false",
    },
    () => {
      assertThrows(
        () => getPriceId("premium", "monthly"),
        Error,
        "Premium plan is not enabled",
      );
    },
  );
});

Deno.test(
  "stripe prices: premium price ids remain optional before launch",
  () => {
    withPriceEnv(
      {
        STRIPE_MONTHLY_PLUS_PLAN_ID: "price_plus_monthly",
        STRIPE_YEARLY_PLUS_PLAN_ID: "price_plus_yearly",
        STRIPE_LIFETIME_PRICE_ID: "price_lifetime",
        PREMIUM_PLAN_ENABLED: "false",
      },
      () => {
        assertEquals(areAllPriceIdsConfigured(), true);
      },
    );
  },
);
