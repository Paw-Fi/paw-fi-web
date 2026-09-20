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

Deno.test("trial household-sharing emails explain automatic paid-plan sharing", async () => {
  const source = await Deno.readTextFile(
    new URL("../households-accept-invite/index.ts", import.meta.url),
  );

  assertStringIncludes(source, "isOwnerTrialing");
  assertStringIncludes(
    source,
    "When you upgrade to Moneko Plus, they'll automatically share your upgraded plan.",
  );
});

Deno.test(
  "verified Stripe upgrades cascade to already-bound household members",
  async () => {
    const [source, lifecycleSource] = await Promise.all([
      Deno.readTextFile(
        new URL("../verify-payment/index.ts", import.meta.url),
      ),
      Deno.readTextFile(
        new URL(
          "../shared/household-subscription-lifecycle.ts",
          import.meta.url,
        ),
      ),
    ]);

    assertStringIncludes(lifecycleSource, '"cascade_subscription_upgrade"');
    assertStringIncludes(
      source,
      'phase: "cascade_verified_household_entitlement"',
    );
    assertStringIncludes(
      source,
      "await cascadeHouseholdSubscriptionUpgrade({",
    );
    assertEquals(
      source.match(/await cascadeHouseholdSubscriptionUpgrade\(\{/g)?.length,
      3,
    );
  },
);

Deno.test(
  "Stripe Lifetime webhook fulfillment cascades to household members",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../stripe-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "reconcileHouseholdSubscriptionLifecycle");
    assertEquals(
      source.match(/await reconcileHouseholdSubscriptionLifecycle\(\{/g)
        ?.length,
      2,
    );
    assertStringIncludes(source, "ownerUserId: userId");
    assertStringIncludes(source, "ownerUserId: lifetimeUserId");
  },
);

Deno.test(
  "verified App Store and Play upgrades cascade to household members",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../verify-iap-purchase/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "reconcileHouseholdSubscriptionLifecycle");
    assertStringIncludes(source, "ownerUserId: userId");
    assertEquals(
      source.match(/await reconcileHouseholdSubscriptionLifecycle\(\{/g)
        ?.length,
      4,
    );
  },
);

Deno.test(
  "direct Stripe plan changes and cancellations reconcile household access",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../update-subscription/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "reconcileHouseholdSubscriptionLifecycle");
    assertEquals(
      source.match(/await reconcileHouseholdSubscriptionLifecycle\(\{/g)
        ?.length,
      2,
    );
  },
);

Deno.test(
  "household subscription sharing allows already-bound users at the limit",
  () => {
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(5, true), false);
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(6, true), false);
  },
);
