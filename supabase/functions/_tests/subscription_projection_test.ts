/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildProjectedSubscription,
  pickPrimarySubscriptionSource,
  type SubscriptionProjectionSource,
} from "../shared/subscription-projection.ts";

function createSource(
  overrides: Partial<SubscriptionProjectionSource>,
): SubscriptionProjectionSource {
  return {
    provider: "stripe",
    sourceKey: "stripe:sub_123",
    userId: "user-123",
    plan: "plus",
    status: "active",
    billingInterval: "yearly",
    currentPeriodEnd: "2027-03-31T17:37:05.000Z",
    cancelAtPeriodEnd: false,
    trialStart: null,
    trialEnd: null,
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
    storeProductId: null,
    appStoreTransactionId: null,
    appStoreOriginalTransactionId: null,
    appStoreEnvironment: null,
    playPurchaseToken: null,
    playOrderId: null,
    playPackageName: null,
    currentPriceId: "price_yearly",
    originalPriceId: null,
    previousPlan: "plus",
    previousInterval: "monthly",
    lastEventId: "evt_123",
    createdAt: "2026-03-31T14:59:48.601298Z",
    updatedAt: "2026-03-31T15:05:00.000000Z",
    ...overrides,
  };
}

Deno.test(
  "subscription projection: active paid Stripe beats later App Store trial",
  () => {
    const stripeSource = createSource({});
    const appStoreTrial = createSource({
      provider: "app_store",
      sourceKey: "app_store:orig_123",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      previousPlan: null,
      previousInterval: null,
      status: "trialing",
      currentPeriodEnd: "2026-04-30T17:37:05.000Z",
      trialStart: "2026-03-31T17:37:05.000Z",
      trialEnd: "2026-04-30T17:37:05.000Z",
      storeProductId: "yearly",
      appStoreTransactionId: "330002868498129",
      appStoreOriginalTransactionId: "330002868498129",
      appStoreEnvironment: "Production",
      createdAt: "2026-03-31T17:37:05.000000Z",
      updatedAt: "2026-03-31T17:37:50.536255Z",
    });

    const primary = pickPrimarySubscriptionSource([
      stripeSource,
      appStoreTrial,
    ]);

    assertEquals(primary?.provider, "stripe");
    assertEquals(primary?.stripeSubscriptionId, "sub_123");
  },
);

Deno.test(
  "subscription projection: clears Stripe-only fields when App Store is primary",
  () => {
    const projection = buildProjectedSubscription(
      createSource({
        provider: "app_store",
        sourceKey: "app_store:orig_123",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPriceId: "price_should_not_leak",
        previousPlan: "plus",
        previousInterval: "yearly",
        status: "trialing",
        currentPeriodEnd: "2026-04-30T17:37:05.000Z",
        trialStart: "2026-03-31T17:37:05.000Z",
        trialEnd: "2026-04-30T17:37:05.000Z",
        storeProductId: "yearly",
        appStoreTransactionId: "330002868498129",
        appStoreOriginalTransactionId: "330002868498129",
        appStoreEnvironment: "Production",
      }),
    );

    assertEquals(projection.provider, "app_store");
    assertEquals(projection.current_price_id, null);
    assertEquals(projection.previous_plan, null);
    assertEquals(projection.previous_interval, null);
    assertEquals(projection.store_product_id, "yearly");
    assertEquals(
      projection.app_store_original_transaction_id,
      "330002868498129",
    );
  },
);

Deno.test(
  "subscription projection: falls back to later active App Store when Stripe is canceled",
  () => {
    const primary = pickPrimarySubscriptionSource([
      createSource({
        status: "canceled",
        currentPeriodEnd: "2026-03-31T17:37:05.000Z",
        updatedAt: "2026-03-31T16:00:00.000000Z",
      }),
      createSource({
        provider: "app_store",
        sourceKey: "app_store:orig_123",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPriceId: null,
        previousPlan: null,
        previousInterval: null,
        status: "active",
        currentPeriodEnd: "2026-05-31T17:37:05.000Z",
        storeProductId: "yearly",
        appStoreTransactionId: "330002868498129",
        appStoreOriginalTransactionId: "330002868498129",
        appStoreEnvironment: "Production",
        updatedAt: "2026-03-31T17:37:50.536255Z",
      }),
    ]);

    assertEquals(primary?.provider, "app_store");
    assertEquals(primary?.status, "active");
  },
);
