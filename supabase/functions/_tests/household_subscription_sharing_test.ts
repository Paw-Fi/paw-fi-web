/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  hasActiveHouseholdSubscriptionAccess,
  hasReachedHouseholdSubscriptionGrantLimit,
  HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT,
} from "../shared/household-subscription-sharing.ts";

Deno.test(
  "household subscription sharing allows up to five distinct granted users",
  () => {
    assertEquals(HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT, 5);
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(4), false);
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(5), true);
  },
);

Deno.test("household subscription access is period-aware", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();

  assertEquals(
    hasActiveHouseholdSubscriptionAccess({
      plan: "plus",
      status: "trialing",
      current_period_end: future,
    }),
    true,
  );
  assertEquals(
    hasActiveHouseholdSubscriptionAccess({
      plan: "plus",
      status: "trialing",
      current_period_end: past,
    }),
    false,
  );
  assertEquals(
    hasActiveHouseholdSubscriptionAccess({
      plan: "plus",
      status: "active",
      current_period_end: past,
    }),
    false,
  );
  assertEquals(
    hasActiveHouseholdSubscriptionAccess({
      plan: "lifetime",
      status: "active",
      current_period_end: null,
    }),
    true,
  );
  assertEquals(
    hasActiveHouseholdSubscriptionAccess({
      plan: "plus",
      status: "trialing",
      current_period_end: null,
      trial_end: future,
    }),
    true,
  );
});

Deno.test("household purchase guards use period-aware access checks", async () => {
  for (
    const functionName of [
      "create-checkout-session",
      "create-checkout-session-by-email",
      "verify-iap-purchase",
      "households-accept-invite",
    ]
  ) {
    const source = await Deno.readTextFile(
      new URL(`../${functionName}/index.ts`, import.meta.url),
    );
    assertStringIncludes(source, "hasActiveHouseholdSubscriptionAccess");
    assertStringIncludes(source, "current_period_end");
  }
});

Deno.test(
  "household subscription sharing allows already-bound users at the limit",
  () => {
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(5, true), false);
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(6, true), false);
  },
);
