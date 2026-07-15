/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  findAndroidRecurringCaptureMatch,
  savedExpenseMatchesRecurringReplacement,
} from "../shared/android-recurring-capture.ts";

const existing = {
  id: "recurring-1",
  date: "2026-06-15",
  amount_cents: 1099,
  currency: "USD",
  type: "expense",
  merchant: "Spotify Premium",
  raw_text: "Spotify subscription",
  account_id: "wallet-1",
  recurrence_rule: {
    frequency: "monthly",
    anchor_date: "2026-06-15",
  },
};

Deno.test("recurring notification finds an existing schedule", () => {
  const result = findAndroidRecurringCaptureMatch([existing], {
    merchant: "Spotify",
    amountCents: 1099,
    currency: "USD",
    transactionType: "expense",
    accountId: "wallet-1",
    frequency: "monthly",
    date: "2026-07-15",
  });

  assertEquals(result?.kind, "existing");
  assertEquals(result?.schedule.id, "recurring-1");
});

Deno.test("changed recurring amount replaces the existing schedule", () => {
  const result = findAndroidRecurringCaptureMatch([existing], {
    merchant: "Spotify",
    amountCents: 1299,
    currency: "USD",
    transactionType: "expense",
    accountId: "wallet-1",
    frequency: "monthly",
    date: "2026-07-15",
  });

  assertEquals(result?.kind, "replacement");
  assertEquals(result?.schedule.id, "recurring-1");
});

Deno.test("recurring matching tolerates normal monthly billing drift", () => {
  const result = findAndroidRecurringCaptureMatch([existing], {
    merchant: "Spotify Premium",
    amountCents: 1099,
    currency: "USD",
    transactionType: "expense",
    accountId: "wallet-1",
    frequency: "monthly",
    date: "2026-07-17",
  });

  assertEquals(result?.kind, "existing");
});

Deno.test("recurring matching keeps different wallets separate", () => {
  const result = findAndroidRecurringCaptureMatch([existing], {
    merchant: "Spotify",
    amountCents: 1099,
    currency: "USD",
    transactionType: "expense",
    accountId: "wallet-2",
    frequency: "monthly",
    date: "2026-07-15",
  });

  assertEquals(result, null);
});

Deno.test("recurring matching treats a missing wallet as unknown", () => {
  const scheduleWithoutWallet = { ...existing, account_id: null };

  const result = findAndroidRecurringCaptureMatch([scheduleWithoutWallet], {
    merchant: "Spotify",
    amountCents: 1099,
    currency: "USD",
    transactionType: "expense",
    accountId: "wallet-1",
    frequency: "monthly",
    date: "2026-07-15",
  });

  assertEquals(result?.kind, "existing");
  assertEquals(result?.schedule.id, "recurring-1");
});

Deno.test(
  "recurring matching still rejects two different known wallets",
  () => {
    const result = findAndroidRecurringCaptureMatch([existing], {
      merchant: "Spotify",
      amountCents: 1099,
      currency: "USD",
      transactionType: "expense",
      accountId: "wallet-2",
      frequency: "monthly",
      date: "2026-07-15",
    });

    assertEquals(result, null);
  },
);

Deno.test(
  "recurring replacement closes only for the expected saved row",
  () => {
    assertEquals(
      savedExpenseMatchesRecurringReplacement(
        {
          id: "recurring-2",
          amount_cents: 1299,
          currency: "USD",
          type: "expense",
          account_id: "wallet-1",
          is_recurring: true,
          recurrence_rule: {
            frequency: "monthly",
            anchor_date: "2026-07-15",
          },
        },
        {
          replacedScheduleId: "recurring-1",
          amountCents: 1299,
          currency: "USD",
          transactionType: "expense",
          accountId: "wallet-1",
          frequency: "monthly",
        },
      ),
      true,
    );
  },
);

Deno.test("non-recurring duplicate cannot close an existing schedule", () => {
  assertEquals(
    savedExpenseMatchesRecurringReplacement(
      {
        id: "expense-2",
        amount_cents: 1299,
        currency: "USD",
        type: "expense",
        account_id: "wallet-1",
        is_recurring: false,
        recurrence_rule: null,
      },
      {
        replacedScheduleId: "recurring-1",
        amountCents: 1299,
        currency: "USD",
        transactionType: "expense",
        accountId: "wallet-1",
        frequency: "monthly",
      },
    ),
    false,
  );
});
