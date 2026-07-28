/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildWalletCaptureIdempotencyKey,
  getLocalYyyyMmDdInTimeZone,
  isWalletCaptureIdempotencyClaimStale,
  normalizeWalletCaptureRecurrenceRule,
  normalizeWalletCaptureSource,
  resolveWalletCaptureCurrency,
  resolveWalletCaptureDefaultAccount,
  resolveWalletCaptureScope,
  resolveWalletTransactionCurrency,
  resolveWalletTransactionDate,
  resolveWalletTransactionMerchant,
  resolveWalletTransactionPackageName,
  usesAiAccountCurrencyContext,
  usesAiUserPreferredCurrency,
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

Deno.test(
  "wallet capture merchant resolver keeps only genuine merchant fields",
  () => {
    assertEquals(
      resolveWalletTransactionMerchant({
        merchantName: "  District Factory  ",
        rawMerchant: "SQ *DISTRICT FACTORY",
        note: "A purchase of $36.95",
      }),
      "District Factory",
    );
    assertEquals(
      resolveWalletTransactionMerchant({
        rawMerchant: "  SQ *DISTRICT FACTORY  ",
        note: "A purchase of $36.95",
      }),
      "SQ *DISTRICT FACTORY",
    );
  },
);

Deno.test(
  "wallet capture merchant resolver never promotes fallback descriptors",
  () => {
    assertEquals(
      resolveWalletTransactionMerchant({
        note: "21:08:05utc - a purchase of $69.22",
        packageName: "com.bank.app",
      }),
      null,
    );
  },
);

Deno.test(
  "wallet capture currency uses preferred currency for Android bare dollar notifications",
  () => {
    assertEquals(
      resolveWalletCaptureCurrency({
        captureSource: "android_notification_listener",
        preferredCurrency: "CAD",
        tx: {
          currency: "USD",
          note: "RBC Visa purchase at Coffee Shop $12.50",
        },
      }),
      "CAD",
    );
  },
);

Deno.test(
  "wallet capture currency keeps explicit USD evidence in Android notifications",
  () => {
    assertEquals(
      resolveWalletCaptureCurrency({
        captureSource: "android_notification_listener",
        preferredCurrency: "CAD",
        tx: {
          currency: "USD",
          note: "Card debited USD 14.50 for your ride payment",
        },
      }),
      "USD",
    );
  },
);

Deno.test(
  "wallet capture ignores model text when verified ambiguous evidence is supplied",
  () => {
    assertEquals(
      resolveWalletCaptureCurrency({
        captureSource: "android_notification_listener",
        accountCurrency: "CAD",
        tx: {
          currency: "CAD",
          note: "Model guessed USD for this purchase",
          currencyEvidenceRaw: "$",
          currencyEvidenceType: "ambiguous_symbol",
          currencyAmbiguous: true,
        },
      }),
      "CAD",
    );
  },
);

Deno.test(
  "wallet capture preserves AI-verified explicit currency without locale parsing",
  () => {
    assertEquals(
      resolveWalletCaptureCurrency({
        captureSource: "android_notification_listener",
        accountCurrency: "AED",
        tx: {
          currency: "AED",
          currencyEvidenceRaw: "د.إ",
          currencyEvidenceType: "ai_notification_explicit",
        },
      }),
      "AED",
    );
  },
);

Deno.test("wallet capture preserves AI account-context currency", () => {
  assertEquals(
    resolveWalletCaptureCurrency({
      captureSource: "android_notification_listener",
      accountCurrency: "CAD",
      tx: {
        currency: "CAD",
        currencyEvidenceRaw: "$",
        currencyEvidenceType: "ai_account_context",
        currencyAmbiguous: true,
      },
    }),
    "CAD",
  );
  assertEquals(
    usesAiAccountCurrencyContext({
      currency: "CAD",
      currencyEvidenceType: "ai_account_context",
    }),
    true,
  );
  assertEquals(
    usesAiAccountCurrencyContext({
      currency: "CAD",
      currencyEvidenceType: "ai_notification_explicit",
    }),
    false,
  );
});

Deno.test(
  "wallet capture preserves server-verified user preferred currency",
  () => {
    const tx = {
      currency: "SGD",
      currencyEvidenceRaw: "$",
      currencyEvidenceType: "ai_user_preference",
      currencyAmbiguous: true,
    };
    assertEquals(
      resolveWalletCaptureCurrency({
        captureSource: "android_notification_listener",
        preferredCurrency: "SGD",
        tx,
      }),
      "SGD",
    );
    assertEquals(usesAiUserPreferredCurrency(tx), true);
    assertEquals(usesAiAccountCurrencyContext(tx), false);
  },
);

Deno.test(
  "wallet capture currency keeps non-Android explicit payload behavior",
  () => {
    assertEquals(
      resolveWalletCaptureCurrency({
        captureSource: "ios_wallet_shortcut",
        preferredCurrency: "CAD",
        tx: { currency: "USD" },
      }),
      "USD",
    );
  },
);

Deno.test("wallet capture idempotency key varies by merchant and scope", () => {
  const base = {
    captureSource: "ios_wallet_shortcut",
    userId: "user-1",
    transactionType: "expense" as const,
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

Deno.test("wallet capture idempotency key varies by transaction type", () => {
  const base = {
    explicitKey: null,
    captureSource: "android_notification_listener",
    userId: "user-1",
    householdId: null,
    isPortfolio: false,
    merchantName: "Acme",
    amountCents: 5000,
    currency: "USD",
    date: "2026-03-11",
  };

  const expense = buildWalletCaptureIdempotencyKey({
    ...base,
    transactionType: "expense",
  });
  const income = buildWalletCaptureIdempotencyKey({
    ...base,
    transactionType: "income",
  });

  assertEquals(expense === income, false);
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

Deno.test(
  "wallet capture idempotency claim staleness handles fresh and stale claims",
  () => {
    const nowMs = new Date("2026-03-16T12:00:00.000Z").getTime();

    assertEquals(
      isWalletCaptureIdempotencyClaimStale(
        "2026-03-16T11:59:30.000Z",
        nowMs,
        120_000,
      ),
      false,
    );

    assertEquals(
      isWalletCaptureIdempotencyClaimStale(
        "2026-03-16T11:57:30.000Z",
        nowMs,
        120_000,
      ),
      true,
    );
  },
);

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

Deno.test("wallet capture local date supports UTC offset strings", () => {
  const baseDate = new Date("2026-04-15T18:30:00.000Z");

  assertEquals(getLocalYyyyMmDdInTimeZone("UTC+08:00", baseDate), "2026-04-16");
  assertEquals(getLocalYyyyMmDdInTimeZone("UTC-05:30", baseDate), "2026-04-15");
});

Deno.test("wallet capture normalizes explicit recurring schedules", () => {
  assertEquals(
    normalizeWalletCaptureRecurrenceRule(
      {
        isRecurring: true,
        recurrenceRule: {
          frequency: "MONTHLY",
          anchor_date: "2026-07-15",
          interval: 2,
        },
      },
      "2026-07-15",
    ),
    {
      frequency: "monthly",
      anchor_date: "2026-07-15",
      interval: 2,
    },
  );
});

Deno.test("wallet capture rejects incomplete recurring schedules", () => {
  assertEquals(
    normalizeWalletCaptureRecurrenceRule(
      {
        isRecurring: true,
        recurrenceRule: { frequency: "sometimes" },
      },
      "2026-07-15",
    ),
    null,
  );
});

Deno.test(
  "wallet capture resolves an existing same-currency default account",
  async () => {
    let receivedArgs: Record<string, unknown> | null = null;
    const supabase = {
      rpc: (name: string, args: Record<string, unknown>) => {
        assertEquals(name, "resolve_default_account");
        receivedArgs = args;
        return Promise.resolve({ data: "wallet-eur", error: null });
      },
    };

    const accountId = await resolveWalletCaptureDefaultAccount(supabase, {
      userId: "user-1",
      householdId: null,
      currency: "EUR",
    });

    assertEquals(accountId, "wallet-eur");
    assertEquals(receivedArgs, {
      p_user_id: "user-1",
      p_household_id: null,
      p_currency: "EUR",
    });
  },
);

Deno.test(
  "wallet capture remains unbound when no default account exists",
  async () => {
    const supabase = {
      rpc: () => Promise.resolve({ data: null, error: null }),
    };

    const accountId = await resolveWalletCaptureDefaultAccount(supabase, {
      userId: "user-1",
      householdId: null,
      currency: "EUR",
    });

    assertEquals(accountId, null);
  },
);
