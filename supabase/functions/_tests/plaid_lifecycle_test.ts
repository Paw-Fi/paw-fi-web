import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  canRequestPlaidManualRefresh,
  computePlaidBillingWindow,
  derivePlaidLinkProducts,
  isPlaidSubscriptionPastGrace,
  shouldKeepPlaidItemBeyondSecondMonth,
  shouldRemovePlaidItemForNonPayingInactivity,
} from "../shared/plaid-lifecycle.ts";

Deno.test(
  "plaid lifecycle computes billing windows for month-end items",
  () => {
    const window = computePlaidBillingWindow("2026-01-30T15:45:00.000Z");

    assertEquals(window.firstBillingMonthStart, "2026-01-01T00:00:00.000Z");
    assertEquals(window.secondBillingMonthStart, "2026-02-01T00:00:00.000Z");
    assertEquals(window.thirdBillingMonthStart, "2026-03-01T00:00:00.000Z");
    assertEquals(window.scheduledRemovalAt, "2026-02-27T00:00:00.000Z");
  },
);

Deno.test(
  "plaid lifecycle only initializes the supported Transactions product",
  () => {
    assertEquals(
      derivePlaidLinkProducts(["transactions", "recurring_transactions"], {
        isConvertedPaidUser: false,
      }),
      ["transactions"],
    );

    assertEquals(
      derivePlaidLinkProducts(["transactions", "recurring_transactions"], {
        isConvertedPaidUser: true,
        enableRecurringTransactionsProduct: true,
      }),
      ["transactions"],
    );
  },
);

Deno.test("plaid lifecycle blocks manual refresh for trial users", () => {
  const result = canRequestPlaidManualRefresh({
    isConvertedPaidUser: false,
    isTrialingUser: true,
    itemStatus: "active",
    itemHealthState: "healthy",
    syncInProgress: false,
    lastSuccessfulSyncAt: "2026-04-09T00:00:00.000Z",
    nextManualRefreshEligibleAt: null,
    now: new Date("2026-04-10T12:00:00.000Z"),
  });

  assertEquals(result.allowed, false);
  assertEquals(result.reason, "trial_blocked");
});

Deno.test("plaid lifecycle enforces 24 hour manual refresh lock", () => {
  const result = canRequestPlaidManualRefresh({
    isConvertedPaidUser: true,
    isTrialingUser: false,
    itemStatus: "active",
    itemHealthState: "healthy",
    syncInProgress: false,
    lastSuccessfulSyncAt: "2026-04-09T00:00:00.000Z",
    nextManualRefreshEligibleAt: "2026-04-10T18:00:00.000Z",
    now: new Date("2026-04-10T12:00:00.000Z"),
  });

  assertEquals(result.allowed, false);
  assertEquals(result.reason, "cooldown_active");
});

Deno.test(
  "plaid lifecycle keeps active paid items only with explicit keep policy",
  () => {
    assertEquals(
      shouldKeepPlaidItemBeyondSecondMonth({
        subscriptionStatus: "active",
        subscriptionPlan: "plus",
        itemHealthState: "healthy",
        billingKeepReason: "active_paid_use",
        lastFinancialFeatureUsedAt: "2026-04-01T10:00:00.000Z",
        now: new Date("2026-04-10T12:00:00.000Z"),
      }),
      true,
    );

    assertEquals(
      shouldKeepPlaidItemBeyondSecondMonth({
        subscriptionStatus: "trialing",
        subscriptionPlan: "plus",
        itemHealthState: "healthy",
        billingKeepReason: "active_paid_use",
        lastFinancialFeatureUsedAt: "2026-04-01T10:00:00.000Z",
        now: new Date("2026-04-10T12:00:00.000Z"),
      }),
      false,
    );
  },
);

Deno.test(
  "plaid lifecycle honors paid subscription grace before inactivity removal",
  () => {
    const now = new Date("2026-05-19T12:00:00.000Z");

    assertEquals(
      isPlaidSubscriptionPastGrace({
        subscriptionStatus: "canceled",
        currentPeriodEnd: "2026-05-20T00:00:00.000Z",
        graceDays: 7,
        now,
      }),
      false,
    );

    assertEquals(
      shouldRemovePlaidItemForNonPayingInactivity({
        subscriptionStatus: "canceled",
        currentPeriodEnd: "2026-05-20T00:00:00.000Z",
        lastFinancialFeatureUsedAt: null,
        inactivityDays: 7,
        now,
      }),
      false,
    );

    assertEquals(
      isPlaidSubscriptionPastGrace({
        subscriptionStatus: "canceled",
        currentPeriodEnd: "2026-05-01T00:00:00.000Z",
        graceDays: 7,
        now,
      }),
      true,
    );
  },
);

Deno.test(
  "plaid lifecycle removes non-paying inactive items after inactivity",
  () => {
    const now = new Date("2026-05-19T12:00:00.000Z");

    assertEquals(
      shouldRemovePlaidItemForNonPayingInactivity({
        subscriptionStatus: "trialing",
        currentPeriodEnd: null,
        lastFinancialFeatureUsedAt: "2026-05-01T00:00:00.000Z",
        inactivityDays: 7,
        now,
      }),
      true,
    );

    assertEquals(
      shouldRemovePlaidItemForNonPayingInactivity({
        subscriptionStatus: "trialing",
        currentPeriodEnd: null,
        lastFinancialFeatureUsedAt: "2026-05-18T00:00:00.000Z",
        inactivityDays: 7,
        now,
      }),
      false,
    );
  },
);
