/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { getSubscriptionChangePolicy } from "../shared/subscription-change-policy.ts";

Deno.test("subscription change policy: plan upgrades are immediate", () => {
  const policy = getSubscriptionChangePolicy({
    currentPlan: "plus",
    newPlan: "premium",
    currentInterval: "monthly",
    newInterval: "monthly",
  });

  assertEquals(policy.billingBehavior, "immediate");
  assertEquals(policy.isUpgrade, true);
  assertEquals(policy.isDowngrade, false);
});

Deno.test(
  "subscription change policy: plan downgrades apply at period end",
  () => {
    const policy = getSubscriptionChangePolicy({
      currentPlan: "premium",
      newPlan: "plus",
      currentInterval: "yearly",
      newInterval: "yearly",
    });

    assertEquals(policy.billingBehavior, "end_of_period");
    assertEquals(policy.isUpgrade, false);
    assertEquals(policy.isDowngrade, true);
  },
);

Deno.test(
  "subscription change policy: same-plan interval changes are immediate",
  () => {
    const policy = getSubscriptionChangePolicy({
      currentPlan: "plus",
      newPlan: "plus",
      currentInterval: "monthly",
      newInterval: "yearly",
    });

    assertEquals(policy.billingBehavior, "immediate");
    assertEquals(policy.isSamePlan, true);
    assertEquals(policy.isIntervalChange, true);
  },
);

Deno.test(
  "subscription change policy: exact same recurring plan is no change",
  () => {
    const policy = getSubscriptionChangePolicy({
      currentPlan: "plus",
      newPlan: "plus",
      currentInterval: "monthly",
      newInterval: "monthly",
    });

    assertEquals(policy.billingBehavior, "no_change");
    assertEquals(policy.isSamePlan, true);
    assertEquals(policy.isIntervalChange, false);
  },
);
