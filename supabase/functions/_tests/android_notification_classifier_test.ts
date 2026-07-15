/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  classificationHasNotificationEvidence,
  normalizeAndroidNotificationClassification,
} from "../shared/android-notification-classifier.ts";

const fallbackDate = "2026-07-15";

Deno.test("Android notification classifier rejects promotions", () => {
  const result = normalizeAndroidNotificationClassification(
    {
      action: "ignore",
      eventStatus: "informational",
      subtype: "promotion",
      isRecurring: false,
      confidence: 0.99,
      reasonCode: "promotion",
    },
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "promotion");
});

Deno.test(
  "Android notification classifier saves posted refunds as income",
  () => {
    const result = normalizeAndroidNotificationClassification(
      {
        action: "save_transaction",
        eventStatus: "posted",
        transactionType: "income",
        subtype: "refund",
        amount: 12.99,
        currency: "USD",
        merchant: "Amazon",
        date: "2026-07-14",
        category: "refunds",
        isRecurring: false,
        confidence: 0.97,
        reasonCode: "completed_refund",
      },
      fallbackDate,
    );

    assertEquals(result.action, "save_transaction");
    assertEquals(result.transactionType, "income");
    assertEquals(result.category, "refunds");
  },
);

Deno.test(
  "Android notification classifier corrects refund direction before saving",
  () => {
    const result = normalizeAndroidNotificationClassification(
      {
        action: "save_transaction",
        eventStatus: "posted",
        transactionType: "expense",
        subtype: "refund",
        amount: 12.99,
        currency: "USD",
        merchant: "Amazon",
        date: "2026-07-14",
        category: "shopping",
        isRecurring: false,
        confidence: 0.97,
        reasonCode: "completed_refund",
      },
      fallbackDate,
    );

    assertEquals(result.action, "save_transaction");
    assertEquals(result.transactionType, "income");
  },
);

Deno.test("Android notification classifier cannot save pending events", () => {
  const result = normalizeAndroidNotificationClassification(
    {
      action: "save_transaction",
      eventStatus: "pending",
      transactionType: "expense",
      subtype: "purchase",
      amount: 50,
      currency: "USD",
      merchant: "Hotel",
      isRecurring: false,
      confidence: 0.99,
      reasonCode: "completed_payment",
    },
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "not_posted");
});

Deno.test("Android notification classifier cannot save transfers", () => {
  const result = normalizeAndroidNotificationClassification(
    {
      action: "save_transaction",
      eventStatus: "posted",
      transactionType: "expense",
      subtype: "transfer",
      amount: 100,
      currency: "EUR",
      merchant: "Savings account",
      isRecurring: false,
      confidence: 0.99,
      reasonCode: "completed_payment",
    },
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "transfer_requires_wallets");
});

Deno.test(
  "Android notification classifier rejects unsupported currencies",
  () => {
    const result = normalizeAndroidNotificationClassification(
      {
        action: "save_transaction",
        eventStatus: "posted",
        transactionType: "expense",
        subtype: "purchase",
        amount: 20,
        currency: "QAR",
        currencyEvidenceRaw: "QAR",
        merchant: "Store",
        isRecurring: false,
        confidence: 0.99,
        reasonCode: "completed_payment",
      },
      fallbackDate,
    );

    assertEquals(result.action, "ignore");
    assertEquals(result.reasonCode, "unsupported_currency");
  },
);

Deno.test(
  "Android notification classifier rejects low confidence mutations",
  () => {
    const result = normalizeAndroidNotificationClassification(
      {
        action: "save_transaction",
        eventStatus: "posted",
        transactionType: "expense",
        subtype: "purchase",
        amount: 20,
        currency: "USD",
        merchant: "Store",
        isRecurring: false,
        confidence: 0.7,
        reasonCode: "completed_payment",
      },
      fallbackDate,
    );

    assertEquals(result.action, "ignore");
    assertEquals(result.reasonCode, "uncertain");
  },
);

Deno.test(
  "Android notification classifier keeps explicit recurring cadence",
  () => {
    const result = normalizeAndroidNotificationClassification(
      {
        action: "save_transaction",
        eventStatus: "posted",
        transactionType: "expense",
        subtype: "subscription",
        amount: 10.99,
        currency: "USD",
        merchant: "Spotify",
        date: "2026-07-15",
        category: "subscriptions",
        isRecurring: true,
        frequency: "monthly",
        confidence: 0.98,
        reasonCode: "completed_recurring_payment",
      },
      fallbackDate,
    );

    assertEquals(result.action, "save_transaction");
    assertEquals(result.isRecurring, true);
    assertEquals(result.recurrenceRule, {
      frequency: "monthly",
      anchor_date: "2026-07-15",
    });
  },
);

Deno.test(
  "classifier rejects an amount hallucinated outside the notification",
  () => {
    assertEquals(
      classificationHasNotificationEvidence(
        {
          packageName: "com.bank.app",
          text: "Card purchase USD 12.99 at Cafe Bloom was completed",
        },
        {
          action: "save_transaction",
          eventStatus: "posted",
          transactionType: "expense",
          subtype: "purchase",
          amount: 999,
          currency: "USD",
          currencyEvidenceRaw: "USD",
          currencyAmbiguous: false,
          merchant: "Cafe Bloom",
          date: fallbackDate,
          isRecurring: false,
          confidence: 0.99,
          reasonCode: "completed_payment",
        },
      ),
      false,
    );
  },
);

Deno.test(
  "classifier verifies localized amount and exact currency evidence",
  () => {
    assertEquals(
      classificationHasNotificationEvidence(
        {
          packageName: "com.bank.app",
          text: "Paiement effectué de 1.234,56€ chez Cafe Bloom",
        },
        {
          action: "save_transaction",
          eventStatus: "posted",
          transactionType: "expense",
          subtype: "purchase",
          amount: 1234.56,
          currency: "EUR",
          currencyEvidenceRaw: "€",
          currencyAmbiguous: false,
          merchant: "Cafe Bloom",
          date: fallbackDate,
          isRecurring: false,
          confidence: 0.99,
          reasonCode: "completed_payment",
        },
      ),
      true,
    );
  },
);
