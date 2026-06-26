/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildPaymentVerificationResult,
  resolveRecurringPaymentEntitlement,
} from "../shared/verify-payment-entitlement.ts";

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
  "verify payment entitlement: lifetime persistence failure is not verified",
  () => {
    const result = buildPaymentVerificationResult({
      persistenceError: new Error("database down"),
      success: {
        verified: true,
        message: "Lifetime payment successful",
        subscription: {
          provider: "stripe",
          plan: "lifetime",
          status: "active",
          billing_interval: null,
          current_period_end: null,
          cancel_at_period_end: false,
          trial_end: null,
          stripe_subscription_id: null,
          stripe_customer_id: "cus_123",
        },
      },
    });

    assertEquals(result.verified, false);
    assertEquals(
      result.message,
      "Payment confirmed, entitlement pending. Please refresh in a moment.",
    );
  },
);

Deno.test(
  "verify payment entitlement: recurring persistence failure is not verified",
  () => {
    const result = buildPaymentVerificationResult({
      persistenceError: { message: "write failed" },
      success: {
        verified: true,
        subscription: {
          provider: "stripe",
          plan: "plus",
          status: "active",
          billing_interval: "monthly",
          current_period_end: "2027-01-01T00:00:00.000Z",
          cancel_at_period_end: false,
          trial_end: null,
          stripe_subscription_id: "sub_123",
          stripe_customer_id: "cus_123",
        },
      },
    });

    assertEquals(result.verified, false);
    assertEquals(
      result.message,
      "Payment confirmed, entitlement pending. Please refresh in a moment.",
    );
  },
);

Deno.test(
  "verify payment entitlement: recurring plan uses price ID over metadata",
  () =>
    withEnv(() => {
      const result = resolveRecurringPaymentEntitlement({
        metadata: {
          plan: "premium",
          billing_interval: "yearly",
        },
        items: {
          data: [
            {
              price: {
                id: "price_plus_monthly",
                recurring: { interval: "month" },
              },
            },
          ],
        },
      });

      assertEquals(result, {
        verified: true,
        plan: "plus",
        billingInterval: "monthly",
      });
    }),
);

Deno.test(
  "verify payment entitlement: recurring unknown price ID fails closed",
  () =>
    withEnv(() => {
      const result = resolveRecurringPaymentEntitlement({
        metadata: {
          plan: "plus",
          billing_interval: "monthly",
        },
        items: {
          data: [
            {
              price: {
                id: "price_unknown",
                recurring: { interval: "month" },
              },
            },
          ],
        },
      });

      assertEquals(result, {
        verified: false,
        message: "Subscription price could not be verified",
      });
    }),
);
