/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  classificationHasNotificationEvidence,
  classifyAndroidNotification,
  normalizeAndroidNotificationClassification,
  resolveAndroidNotificationClassificationCurrency,
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
  "Android notification classifier resolves a bare dollar from account currency",
  () => {
    assertEquals(
      resolveAndroidNotificationClassificationCurrency({
        rawCurrency: "$",
        notification: {
          packageName: "com.td.myspend",
          text: "Purchase of $4.86 at Coffee Shop",
        },
        accountCurrency: "CAD",
      }),
      {
        currency: "CAD",
        currencyEvidenceRaw: "$",
        currencyAmbiguous: true,
      },
    );
  },
);

Deno.test(
  "Android notification classifier fails closed on a bare dollar without an account",
  () => {
    assertEquals(
      resolveAndroidNotificationClassificationCurrency({
        rawCurrency: "USD",
        notification: {
          packageName: "com.td.myspend",
          text: "Purchase of $4.86 at Coffee Shop",
        },
      }),
      {
        currencyAmbiguous: true,
        ignoreReason: "ambiguous_currency_without_context",
      },
    );
  },
);

Deno.test(
  "Android notification classifier resolves a localized Canadian dollar symbol",
  () => {
    assertEquals(
      resolveAndroidNotificationClassificationCurrency({
        rawCurrency: "C$",
        notification: {
          packageName: "com.td.myspend",
          text: "Purchase of C$4.86 at Coffee Shop",
        },
      }),
      {
        currency: "CAD",
        currencyEvidenceRaw: "CAD",
        currencyAmbiguous: false,
      },
    );
  },
);

Deno.test(
  "Android notification classifier preserves explicit currency over context",
  () => {
    assertEquals(
      resolveAndroidNotificationClassificationCurrency({
        rawCurrency: "USD",
        notification: {
          packageName: "com.bank.app",
          text: "Purchase of USD 4.86 at Coffee Shop",
        },
        accountCurrency: "CAD",
      }),
      {
        currency: "USD",
        currencyEvidenceRaw: "USD",
        currencyAmbiguous: false,
      },
    );
  },
);

Deno.test(
  "Android notification classifier does not rewrite unsupported ISO codes",
  () => {
    const resolution = resolveAndroidNotificationClassificationCurrency({
      rawCurrency: "QAR",
      notification: {
        packageName: "com.bank.app",
        text: "Purchase of QAR 20.00 at Coffee Shop",
      },
      accountCurrency: "CAD",
    });
    const result = normalizeAndroidNotificationClassification(
      {
        action: "save_transaction",
        eventStatus: "posted",
        transactionType: "expense",
        subtype: "purchase",
        amount: 20,
        currency: resolution.currency,
        currencyEvidenceRaw: "QAR",
        merchant: "Coffee Shop",
        isRecurring: false,
        confidence: 0.99,
        reasonCode: "completed_payment",
      },
      fallbackDate,
    );

    assertEquals(resolution, { currency: "QAR", currencyAmbiguous: false });
    assertEquals(result.action, "ignore");
    assertEquals(result.reasonCode, "unsupported_currency");
  },
);

Deno.test(
  "Android notification classifier saves a CAD purchase from a bare dollar",
  async () => {
    const result = await classifyAndroidNotification({
      genAI: {
        getGenerativeModel: () => ({
          generateContent: () =>
            Promise.resolve({
              response: {
                functionCalls: () => [
                  {
                    name: "classify_notification",
                    args: {
                      action: "save_transaction",
                      eventStatus: "posted",
                      transactionType: "expense",
                      subtype: "purchase",
                      amount: 4.86,
                      currency: "USD",
                      currencyEvidenceRaw: "USD",
                      merchant: "Coffee Shop",
                      description: "Model guessed USD for this purchase",
                      date: fallbackDate,
                      category: "coffee & tea",
                      isRecurring: false,
                      confidence: 1,
                      reasonCode: "completed_payment",
                    },
                  },
                ],
              },
            }),
        }),
      },
      notification: {
        packageName: "com.td.myspend",
        sourceAppLabel: "TD MySpend",
        text: "Purchase of $4.86 at Coffee Shop",
      },
      fallbackDate,
      accountCurrency: "CAD",
      expenseCategories: ["coffee & tea"],
      incomeCategories: ["other income"],
    });

    assertEquals(result.action, "save_transaction");
    assertEquals(result.currency, "CAD");
    assertEquals(result.currencyEvidenceRaw, "$");
    assertEquals(result.currencyAmbiguous, true);
    assertEquals(result.amount, 4.86);
  },
);

Deno.test(
  "Android notification classifier ignores conflicting strong currency evidence",
  async () => {
    const result = await classifyAndroidNotification({
      genAI: {
        getGenerativeModel: () => ({
          generateContent: () =>
            Promise.resolve({
              response: {
                functionCalls: () => [
                  {
                    name: "classify_notification",
                    args: {
                      action: "save_transaction",
                      eventStatus: "posted",
                      transactionType: "expense",
                      subtype: "purchase",
                      amount: 4.86,
                      currency: "CAD",
                      merchant: "Coffee Shop",
                      date: fallbackDate,
                      category: "coffee & tea",
                      isRecurring: false,
                      confidence: 1,
                      reasonCode: "completed_payment",
                    },
                  },
                ],
              },
            }),
        }),
      },
      notification: {
        packageName: "com.bank.app",
        text: "Statement currency USD; purchase CAD 4.86 at Coffee Shop",
      },
      fallbackDate,
      accountCurrency: "CAD",
      expenseCategories: ["coffee & tea"],
      incomeCategories: ["other income"],
    });

    assertEquals(result.action, "ignore");
    assertEquals(result.reasonCode, "conflicting_currency_evidence");
  },
);

Deno.test(
  "classifier accepts contextual ambiguous currency without model evidence text",
  () => {
    assertEquals(
      classificationHasNotificationEvidence(
        {
          packageName: "com.td.myspend",
          text: "Purchase of $4.86 at Coffee Shop",
        },
        {
          action: "save_transaction",
          eventStatus: "posted",
          transactionType: "expense",
          subtype: "purchase",
          amount: 4.86,
          currency: "CAD",
          currencyAmbiguous: true,
          merchant: "Coffee Shop",
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
