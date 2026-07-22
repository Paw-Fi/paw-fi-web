import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decideSubscriptionEntitlementMutation,
} from "../shared/subscription-entitlement-policy.ts";

Deno.test("App Store cancellation cannot overwrite Stripe Lifetime", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "stripe",
      plan: "lifetime",
      status: "active",
      stripeSubscriptionId: null,
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "canceled",
      appStoreOriginalTransactionId: "apple-old",
    },
  );

  assertEquals(decision, {
    kind: "preserve",
    reason: "active_lifetime_has_priority",
  });
});

Deno.test("App Store cancellation cannot overwrite manually granted Lifetime", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "stripe",
      plan: "lifetime",
      status: "active",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "canceled",
      appStoreOriginalTransactionId: "apple-old",
    },
  );

  assertEquals(decision.kind, "preserve");
});

Deno.test("terminal event from an old provider cannot cancel current recurring provider", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "stripe",
      plan: "plus",
      status: "active",
      stripeSubscriptionId: "sub_current",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "canceled",
      appStoreOriginalTransactionId: "apple-old",
    },
  );

  assertEquals(decision, {
    kind: "preserve",
    reason: "terminal_event_from_non_current_provider",
  });
});

Deno.test("terminal event for old App Store purchase cannot cancel current App Store purchase", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-current",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "canceled",
      appStoreOriginalTransactionId: "apple-old",
    },
  );

  assertEquals(decision, {
    kind: "preserve",
    reason: "terminal_event_for_non_current_purchase",
  });
});

Deno.test("stale active event cannot replace the current same-provider purchase", () => {
  const appStoreDecision = decideSubscriptionEntitlementMutation(
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-current",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-old",
    },
  );
  const stripeDecision = decideSubscriptionEntitlementMutation(
    {
      provider: "stripe",
      plan: "plus",
      status: "active",
      stripeSubscriptionId: "sub_current",
    },
    {
      provider: "stripe",
      plan: "plus",
      status: "active",
      stripeSubscriptionId: "sub_old",
    },
  );

  assertEquals(appStoreDecision, {
    kind: "preserve",
    reason: "access_event_for_non_current_purchase",
  });
  assertEquals(stripeDecision, {
    kind: "preserve",
    reason: "access_event_for_non_current_purchase",
  });
});

Deno.test("authenticated verification may replace an old same-provider purchase", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-old",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-new",
      allowProviderSwitch: true,
    },
  );

  assertEquals(decision, { kind: "apply" });
});

Deno.test("current App Store purchase can cancel its own recurring entitlement", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-current",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "canceled",
      appStoreOriginalTransactionId: "apple-current",
    },
  );

  assertEquals(decision, { kind: "apply" });
});

Deno.test("stale access event from a different provider cannot replace current paid access", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "stripe",
      plan: "plus",
      status: "active",
      stripeSubscriptionId: "sub_current",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-old",
    },
  );

  assertEquals(decision, {
    kind: "preserve",
    reason: "access_event_from_non_current_provider",
  });
});

Deno.test("authenticated purchase verification can explicitly switch providers", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "stripe",
      plan: "plus",
      status: "active",
      stripeSubscriptionId: "sub_current",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-new",
      allowProviderSwitch: true,
    },
  );

  assertEquals(decision, { kind: "apply" });
});

Deno.test("access-granting provider event can establish entitlement", () => {
  const decision = decideSubscriptionEntitlementMutation(
    {
      provider: "stripe",
      plan: "free",
      status: "canceled",
    },
    {
      provider: "app_store",
      plan: "plus",
      status: "active",
      appStoreOriginalTransactionId: "apple-new",
    },
  );

  assertEquals(decision, { kind: "apply" });
});
