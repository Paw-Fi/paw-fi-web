/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  AutoRenewStatus,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  Status,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";

import { resolveAppStoreSubscriptionLifecycle } from "../shared/app-store-subscription-state.ts";

Deno.test(
  "app store subscription state: accepts expired transaction as canceled instead of invalid",
  () => {
    const result = resolveAppStoreSubscriptionLifecycle({
      transaction: createTransaction({
        expiresDate: Date.UTC(2026, 2, 18, 0, 30, 21),
      }),
      nowMs: Date.UTC(2026, 3, 1, 20, 33, 53),
    });

    assertEquals(result.status, "canceled");
    assertEquals(result.currentPeriodEnd, "2026-03-18T00:30:21.000Z");
  },
);

Deno.test(
  "app store subscription state: uses renewal date for active subscription status",
  () => {
    const result = resolveAppStoreSubscriptionLifecycle({
      transaction: createTransaction({
        expiresDate: Date.UTC(2026, 2, 18, 0, 30, 21),
        offerDiscountType: "FREE_TRIAL",
        offerIdentifier: "launch_trial",
        offerType: 1,
      }),
      statusTransaction: createTransaction({
        expiresDate: Date.UTC(2026, 3, 18, 0, 30, 21),
        offerDiscountType: "FREE_TRIAL",
        offerIdentifier: "launch_trial",
        offerType: 1,
      }),
      renewalInfo: createRenewalInfo({
        renewalDate: Date.UTC(2026, 3, 18, 0, 30, 21),
      }),
      subscriptionStatus: Status.ACTIVE,
      nowMs: Date.UTC(2026, 2, 20, 0, 0, 0),
    });

    assertEquals(result.status, "trialing");
    assertEquals(result.currentPeriodEnd, "2026-04-18T00:30:21.000Z");
  },
);

Deno.test(
  "app store subscription state: stale trial transaction does not keep renewed subscription in trialing",
  () => {
    const result = resolveAppStoreSubscriptionLifecycle({
      transaction: createTransaction({
        expiresDate: Date.UTC(2026, 2, 18, 0, 30, 21),
        offerDiscountType: "FREE_TRIAL",
        offerIdentifier: "launch_trial",
        offerType: 1,
      }),
      statusTransaction: createTransaction({
        expiresDate: Date.UTC(2026, 3, 18, 0, 30, 21),
      }),
      renewalInfo: createRenewalInfo({
        renewalDate: Date.UTC(2026, 3, 18, 0, 30, 21),
      }),
      subscriptionStatus: Status.ACTIVE,
      nowMs: Date.UTC(2026, 2, 20, 0, 0, 0),
    });

    assertEquals(result.status, "active");
    assertEquals(result.currentPeriodEnd, "2026-04-18T00:30:21.000Z");
  },
);

Deno.test(
  "app store subscription state: maps billing grace period to past_due and grace expiry",
  () => {
    const result = resolveAppStoreSubscriptionLifecycle({
      transaction: createTransaction({
        expiresDate: Date.UTC(2026, 2, 18, 0, 30, 21),
      }),
      renewalInfo: createRenewalInfo({
        gracePeriodExpiresDate: Date.UTC(2026, 2, 23, 0, 30, 21),
        renewalDate: Date.UTC(2026, 2, 18, 0, 30, 21),
      }),
      subscriptionStatus: Status.BILLING_GRACE_PERIOD,
      nowMs: Date.UTC(2026, 2, 20, 0, 0, 0),
    });

    assertEquals(result.status, "past_due");
    assertEquals(result.currentPeriodEnd, "2026-03-23T00:30:21.000Z");
  },
);

Deno.test(
  "app store subscription state: records disabled renewal without ending current access",
  () => {
    const result = resolveAppStoreSubscriptionLifecycle({
      transaction: createTransaction({
        expiresDate: Date.UTC(2026, 3, 18, 0, 30, 21),
      }),
      renewalInfo: createRenewalInfo({
        autoRenewStatus: AutoRenewStatus.OFF,
        renewalDate: Date.UTC(2026, 3, 18, 0, 30, 21),
      }),
      subscriptionStatus: Status.ACTIVE,
      nowMs: Date.UTC(2026, 2, 20, 0, 0, 0),
    });

    assertEquals(result.status, "active");
    assertEquals(result.cancelAtPeriodEnd, true);
  },
);

Deno.test(
  "app store subscription state: records enabled renewal",
  () => {
    const result = resolveAppStoreSubscriptionLifecycle({
      transaction: createTransaction({
        expiresDate: Date.UTC(2026, 3, 18, 0, 30, 21),
      }),
      renewalInfo: createRenewalInfo({
        autoRenewStatus: AutoRenewStatus.ON,
        renewalDate: Date.UTC(2026, 3, 18, 0, 30, 21),
      }),
      subscriptionStatus: Status.ACTIVE,
      nowMs: Date.UTC(2026, 2, 20, 0, 0, 0),
    });

    assertEquals(result.status, "active");
    assertEquals(result.cancelAtPeriodEnd, false);
  },
);

Deno.test(
  "app store subscription state: maps billing retry to canceled with latest known period end",
  () => {
    const result = resolveAppStoreSubscriptionLifecycle({
      transaction: createTransaction({
        expiresDate: Date.UTC(2026, 2, 18, 0, 30, 21),
      }),
      renewalInfo: createRenewalInfo({
        renewalDate: Date.UTC(2026, 2, 18, 0, 30, 21),
      }),
      subscriptionStatus: Status.BILLING_RETRY,
      nowMs: Date.UTC(2026, 2, 20, 0, 0, 0),
    });

    assertEquals(result.status, "canceled");
    assertEquals(result.currentPeriodEnd, "2026-03-18T00:30:21.000Z");
  },
);

function createTransaction(
  overrides: Partial<JWSTransactionDecodedPayload>,
): JWSTransactionDecodedPayload {
  return {
    bundleId: "com.moneko.mobile",
    environment: "Production",
    originalTransactionId: "orig-123",
    productId: "yearly",
    purchaseDate: Date.UTC(2026, 1, 18, 2, 30, 21),
    transactionId: "tx-123",
    ...overrides,
  } as JWSTransactionDecodedPayload;
}

function createRenewalInfo(
  overrides: Partial<JWSRenewalInfoDecodedPayload>,
): JWSRenewalInfoDecodedPayload {
  return {
    environment: "Production",
    originalTransactionId: "orig-123",
    productId: "yearly",
    signedDate: Date.UTC(2026, 2, 20, 0, 0, 0),
    ...overrides,
  } as JWSRenewalInfoDecodedPayload;
}
