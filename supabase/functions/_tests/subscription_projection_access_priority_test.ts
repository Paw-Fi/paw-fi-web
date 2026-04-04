/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  getCancelableStripeSubscriptionIdAfterProjection,
  pickPrimarySubscriptionSource,
  sourceGrantsAccess,
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
    previousPlan: null,
    previousInterval: null,
    lastEventId: "evt_123",
    createdAt: "2026-03-31T14:59:48.601298Z",
    updatedAt: "2026-03-31T15:05:00.000000Z",
    ...overrides,
  };
}

Deno.test(
  "projection priority: valid App Store active beats expired Stripe active",
  () => {
    const expiredStripe = createSource({
      currentPeriodEnd: "2025-01-01T00:00:00.000Z",
    });
    const activeAppStore = createSource({
      provider: "app_store",
      sourceKey: "app_store:orig_123",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      status: "active",
      currentPeriodEnd: "2027-05-31T00:00:00.000Z",
      storeProductId: "yearly",
      appStoreTransactionId: "tx_123",
      appStoreOriginalTransactionId: "orig_123",
      appStoreEnvironment: "Production",
    });

    const primary = pickPrimarySubscriptionSource([
      expiredStripe,
      activeAppStore,
    ]);

    assertEquals(sourceGrantsAccess(expiredStripe), false);
    assertEquals(sourceGrantsAccess(activeAppStore), true);
    assertEquals(primary?.provider, "app_store");
  },
);

Deno.test(
  "projection priority: valid trial beats expired active source",
  () => {
    const expiredStripe = createSource({
      currentPeriodEnd: "2025-01-01T00:00:00.000Z",
      updatedAt: "2026-03-31T18:00:00.000000Z",
    });
    const validTrial = createSource({
      provider: "app_store",
      sourceKey: "app_store:orig_trial",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      status: "trialing",
      currentPeriodEnd: "2027-04-30T00:00:00.000Z",
      trialStart: "2027-03-31T00:00:00.000Z",
      trialEnd: "2027-04-30T00:00:00.000Z",
      storeProductId: "yearly",
      appStoreTransactionId: "tx_trial",
      appStoreOriginalTransactionId: "orig_trial",
      appStoreEnvironment: "Production",
    });

    const primary = pickPrimarySubscriptionSource([expiredStripe, validTrial]);

    assertEquals(primary?.provider, "app_store");
    assertEquals(primary?.status, "trialing");
  },
);

Deno.test(
  "projection priority: lifetime beats other valid recurring subscriptions",
  () => {
    const recurringStripe = createSource({
      plan: "premium",
      currentPeriodEnd: "2027-06-30T00:00:00.000Z",
    });
    const lifetime = createSource({
      provider: "stripe",
      sourceKey: "stripe:lifetime_123",
      plan: "lifetime",
      billingInterval: null,
      currentPeriodEnd: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
    });

    const primary = pickPrimarySubscriptionSource([recurringStripe, lifetime]);

    assertEquals(primary?.plan, "lifetime");
  },
);

Deno.test(
  "projection priority: canceled Stripe does not beat valid Play Store access",
  () => {
    const canceledStripe = createSource({
      status: "canceled",
      currentPeriodEnd: "2026-03-01T00:00:00.000Z",
    });
    const activePlay = createSource({
      provider: "play_store",
      sourceKey: "play_store:token_123",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      status: "active",
      currentPeriodEnd: "2027-08-01T00:00:00.000Z",
      storeProductId: "yearly",
      playPurchaseToken: "token_123",
      playOrderId: "order_123",
      playPackageName: "com.moneko.app",
    });

    const primary = pickPrimarySubscriptionSource([canceledStripe, activePlay]);

    assertEquals(primary?.provider, "play_store");
  },
);

Deno.test(
  "projection priority: paused and past_due outrank terminal statuses but not valid access",
  () => {
    const pausedStripe = createSource({
      status: "paused",
      currentPeriodEnd: "2026-05-01T00:00:00.000Z",
    });
    const canceledAppStore = createSource({
      provider: "app_store",
      sourceKey: "app_store:orig_terminal",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      status: "canceled",
      currentPeriodEnd: "2026-05-01T00:00:00.000Z",
      storeProductId: "yearly",
      appStoreTransactionId: "tx_terminal",
      appStoreOriginalTransactionId: "orig_terminal",
      appStoreEnvironment: "Production",
    });

    const primary = pickPrimarySubscriptionSource([
      pausedStripe,
      canceledAppStore,
    ]);

    assertEquals(primary?.status, "paused");
  },
);

Deno.test(
  "cross-provider cancellation: projected App Store primary can cancel prior Stripe recurring",
  () => {
    const primary = createSource({
      provider: "app_store",
      sourceKey: "app_store:orig_123",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      storeProductId: "yearly",
      appStoreTransactionId: "tx_123",
      appStoreOriginalTransactionId: "orig_123",
      appStoreEnvironment: "Production",
    });

    const cancelableStripeId = getCancelableStripeSubscriptionIdAfterProjection(
      {
        previous: {
          provider: "stripe",
          plan: "plus",
          stripe_subscription_id: "sub_123",
        },
        primary,
        nextProvider: "app_store",
        nextSourceKey: "app_store:orig_123",
      },
    );

    assertEquals(cancelableStripeId, "sub_123");
  },
);

Deno.test(
  "cross-provider cancellation: projected Play primary follows the same cancellation rule",
  () => {
    const primary = createSource({
      provider: "play_store",
      sourceKey: "play_store:token_123",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      storeProductId: "yearly",
      playPurchaseToken: "token_123",
      playOrderId: "order_123",
      playPackageName: "com.moneko.app",
    });

    const cancelableStripeId = getCancelableStripeSubscriptionIdAfterProjection(
      {
        previous: {
          provider: "stripe",
          plan: "plus",
          stripe_subscription_id: "sub_456",
        },
        primary,
        nextProvider: "play_store",
        nextSourceKey: "play_store:token_123",
      },
    );

    assertEquals(cancelableStripeId, "sub_456");
  },
);

Deno.test(
  "cross-provider cancellation: does not cancel Stripe when the new IAP source does not currently grant access",
  () => {
    const expiredTrial = createSource({
      provider: "app_store",
      sourceKey: "app_store:orig_expired",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPriceId: null,
      status: "trialing",
      currentPeriodEnd: "2025-01-01T00:00:00.000Z",
      trialStart: "2024-12-01T00:00:00.000Z",
      trialEnd: "2025-01-01T00:00:00.000Z",
      storeProductId: "yearly",
      appStoreTransactionId: "tx_expired",
      appStoreOriginalTransactionId: "orig_expired",
      appStoreEnvironment: "Production",
    });

    const cancelableStripeId = getCancelableStripeSubscriptionIdAfterProjection(
      {
        previous: {
          provider: "stripe",
          plan: "plus",
          stripe_subscription_id: "sub_789",
        },
        primary: expiredTrial,
        nextProvider: "app_store",
        nextSourceKey: "app_store:orig_expired",
      },
    );

    assertEquals(cancelableStripeId, null);
  },
);
