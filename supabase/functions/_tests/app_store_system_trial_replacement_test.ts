/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideSubscriptionEntitlementMutation } from "../shared/subscription-entitlement-policy.ts";
import {
  isSystemGrantedTrial,
  type SystemGrantedTrialSubscription,
} from "../shared/system-granted-trial.ts";

const automaticTrial: SystemGrantedTrialSubscription = {
  provider: "stripe",
  plan: "plus",
  status: "trialing",
  stripe_subscription_id: null,
  stripe_customer_id: null,
  store_product_id: null,
  bound_to_user_id: null,
  bound_to_household_id: null,
};

function decideIncomingAppStoreNotification(params: {
  existing: SystemGrantedTrialSubscription;
  incomingStatus: string;
}) {
  return decideSubscriptionEntitlementMutation(
    {
      provider: params.existing.provider,
      plan: params.existing.plan,
      status: params.existing.status,
      stripeSubscriptionId: params.existing.stripe_subscription_id,
    },
    {
      provider: "app_store",
      plan: "plus",
      status: params.incomingStatus,
      appStoreOriginalTransactionId: "apple-transaction",
      allowProviderSwitch: isSystemGrantedTrial(params.existing),
    },
  );
}

Deno.test("active App Store notification replaces an automatic trial", () => {
  assertEquals(
    decideIncomingAppStoreNotification({
      existing: automaticTrial,
      incomingStatus: "active",
    }),
    { kind: "apply" },
  );
});

Deno.test("active App Store notification cannot replace a genuine Stripe trial", () => {
  assertEquals(
    decideIncomingAppStoreNotification({
      existing: {
        ...automaticTrial,
        stripe_subscription_id: "sub_real",
      },
      incomingStatus: "active",
    }),
    {
      kind: "preserve",
      reason: "access_event_from_non_current_provider",
    },
  );
});

Deno.test("terminal App Store notification cannot cancel an automatic Stripe trial", () => {
  assertEquals(
    decideIncomingAppStoreNotification({
      existing: automaticTrial,
      incomingStatus: "canceled",
    }),
    {
      kind: "preserve",
      reason: "terminal_event_from_non_current_provider",
    },
  );
});
