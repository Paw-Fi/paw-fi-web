/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildWalletCaptureIdempotencyKey,
  normalizeWalletCaptureSource,
  resolveWalletCaptureScope,
  resolveWalletTransactionCurrency,
  resolveWalletTransactionDate,
  resolveWalletTransactionPackageName,
} from "../shared/wallet-capture.ts";

Deno.test("wallet capture source normalizes Android legacy alias", () => {
  assertEquals(
    normalizeWalletCaptureSource("android_notification"),
    "android_notification_listener",
  );
  assertEquals(
    normalizeWalletCaptureSource("ios_wallet_shortcut"),
    "ios_wallet_shortcut",
  );
});

Deno.test(
  "wallet capture field resolvers support Android and iOS shapes",
  () => {
    assertEquals(
      resolveWalletTransactionCurrency({ currencyCode: "USD" }),
      "USD",
    );
    assertEquals(
      resolveWalletTransactionDate({ transactionDate: "2026-03-11" }),
      "2026-03-11",
    );
    assertEquals(
      resolveWalletTransactionPackageName({ sourcePackage: "com.wallet" }),
      "com.wallet",
    );
  },
);

Deno.test("wallet capture idempotency key varies by merchant and scope", () => {
  const base = {
    captureSource: "ios_wallet_shortcut",
    userId: "user-1",
    amountCents: 1299,
    currency: "USD",
    date: "2026-03-11",
  };

  const coffee = buildWalletCaptureIdempotencyKey({
    ...base,
    explicitKey: null,
    householdId: null,
    isPortfolio: false,
    merchantName: "Starbucks",
  });
  const groceries = buildWalletCaptureIdempotencyKey({
    ...base,
    explicitKey: null,
    householdId: null,
    isPortfolio: false,
    merchantName: "Trader Joe's",
  });
  const portfolio = buildWalletCaptureIdempotencyKey({
    ...base,
    explicitKey: null,
    householdId: "household-1",
    isPortfolio: true,
    merchantName: "Starbucks",
  });

  assertEquals(coffee === groceries, false);
  assertEquals(coffee === portfolio, false);
});

Deno.test("wallet capture idempotency key preserves explicit key", () => {
  assertEquals(
    buildWalletCaptureIdempotencyKey({
      explicitKey: "provided-key",
      captureSource: "android_notification_listener",
      userId: "user-1",
      householdId: null,
      isPortfolio: false,
      merchantName: "Coffee",
      amountCents: 500,
      currency: "USD",
      date: "2026-03-11",
    }),
    "provided-key",
  );
});

Deno.test("wallet capture scope rejects unauthorized household access", () => {
  let errorMessage = "";
  try {
    resolveWalletCaptureScope({
      requestedHouseholdId: "household-1",
      isPortfolio: true,
      hasMembership: false,
      householdMemberCount: 0,
    });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  assertEquals(errorMessage, "UNAUTHORIZED_HOUSEHOLD_SCOPE");
});

Deno.test(
  "wallet capture scope preserves portfolio without split and household with split",
  () => {
    assertEquals(
      resolveWalletCaptureScope({
        requestedHouseholdId: "household-1",
        isPortfolio: true,
        hasMembership: true,
        householdMemberCount: 0,
      }),
      { householdId: "household-1", requiresHouseholdSplit: false },
    );

    assertEquals(
      resolveWalletCaptureScope({
        requestedHouseholdId: "household-1",
        isPortfolio: false,
        hasMembership: true,
        householdMemberCount: 2,
      }),
      { householdId: "household-1", requiresHouseholdSplit: true },
    );
  },
);
