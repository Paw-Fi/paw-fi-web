/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildSubscriptionRequiredMessage,
  hasCapturePlusEntitlement,
  hasPlusEntitlement,
  isSubscriptionRequired,
  PRICING_URL,
} from "../shared/plus-entitlement.ts";

const future = "2027-01-01T00:00:00.000Z";
const past = "2025-01-01T00:00:00.000Z";

Deno.test("plus entitlement denies missing and free subscriptions", () => {
  assertEquals(hasPlusEntitlement(null), false);
  assertEquals(
    hasPlusEntitlement({
      plan: "free",
      status: "active",
      currentPeriodEnd: future,
    }),
    false,
  );
});

Deno.test(
  "plus entitlement allows valid trialing, active, past_due, and lifetime access",
  () => {
    assertEquals(
      hasPlusEntitlement({
        plan: "plus",
        status: "trialing",
        currentPeriodEnd: future,
      }),
      true,
    );
    assertEquals(
      hasPlusEntitlement({
        plan: "premium",
        status: "active",
        currentPeriodEnd: future,
      }),
      true,
    );
    assertEquals(
      hasPlusEntitlement({
        plan: "plus",
        status: "past_due",
        currentPeriodEnd: future,
      }),
      true,
    );
    assertEquals(
      hasPlusEntitlement({
        plan: "lifetime",
        status: "active",
        currentPeriodEnd: null,
      }),
      true,
    );
  },
);

Deno.test(
  "plus entitlement denies expired or inactive paid subscriptions",
  () => {
    assertEquals(
      hasPlusEntitlement({
        plan: "plus",
        status: "trialing",
        currentPeriodEnd: past,
      }),
      false,
    );
    assertEquals(
      hasPlusEntitlement({
        plan: "plus",
        status: "active",
        currentPeriodEnd: past,
      }),
      false,
    );
    assertEquals(
      hasPlusEntitlement({
        plan: "plus",
        status: "canceled",
        currentPeriodEnd: future,
      }),
      false,
    );
  },
);

Deno.test(
  "capture entitlement allows current trials and active App Store or Stripe subscriptions",
  () => {
    assertEquals(
      hasCapturePlusEntitlement({
        plan: "plus",
        status: "trialing",
        currentPeriodEnd: future,
      }),
      true,
    );
    assertEquals(
      hasCapturePlusEntitlement({
        plan: "plus",
        status: "active",
        currentPeriodEnd: future,
      }),
      true,
    );
    assertEquals(
      hasCapturePlusEntitlement({
        plan: "lifetime",
        status: "active",
        currentPeriodEnd: null,
      }),
      true,
    );
  },
);

Deno.test(
  "capture entitlement denies free, expired, past-due, and canceled access",
  () => {
    for (const subscription of [
      { plan: "free", status: "active", currentPeriodEnd: future },
      { plan: "plus", status: "trialing", currentPeriodEnd: past },
      { plan: "plus", status: "active", currentPeriodEnd: past },
      { plan: "plus", status: "past_due", currentPeriodEnd: future },
      { plan: "plus", status: "canceled", currentPeriodEnd: future },
    ]) {
      assertEquals(hasCapturePlusEntitlement(subscription), false);
    }
  },
);

Deno.test("subscription required message always links pricing", () => {
  assertEquals(PRICING_URL, "https://www.moneko.io/pricing");
  assertEquals(isSubscriptionRequired(null), true);
  assertEquals(
    buildSubscriptionRequiredMessage("Telegram capture"),
    "Moneko Plus is required to use Telegram capture. Subscribe to continue: https://www.moneko.io/pricing",
  );
});
