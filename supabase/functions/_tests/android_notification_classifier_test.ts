/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  type AndroidNotificationClassification,
  classificationHasNotificationEvidence,
  classifyAndroidNotification,
  normalizeAndroidNotificationClassification,
} from "../shared/android-notification-classifier.ts";

const fallbackDate = "2026-07-15";

function modelCall(name: string, args: Record<string, unknown>) {
  return { name, args };
}

function fakeGenAI(
  calls: Array<{ name: string; args: Record<string, unknown> }>,
  capturedModels: string[] = [],
) {
  let callIndex = 0;
  return {
    getGenerativeModel: ({ model }: { model: string }) => {
      capturedModels.push(model);
      return {
        generateContent: () =>
          Promise.resolve({
            response: {
              functionCalls: () => {
                const call = calls[callIndex++];
                return call ? [call] : [];
              },
            },
          }),
      };
    },
  };
}

function saveArgs(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    action: "save_transaction",
    eventStatus: "posted",
    transactionType: "expense",
    subtype: "purchase",
    amount: 12.99,
    amountEvidenceRaw: "12.99",
    currency: "USD",
    currencyEvidenceRaw: "USD",
    currencySource: "notification_explicit",
    merchant: "Cafe Bloom",
    merchantEvidenceRaw: "Cafe Bloom",
    completionEvidenceRaw: "was completed",
    transactionEvidenceRaw:
      "Card purchase USD 12.99 at Cafe Bloom was completed",
    date: fallbackDate,
    category: "coffee & tea",
    isRecurring: false,
    confidence: 0.99,
    reasonCode: "completed_payment",
    ...overrides,
  };
}

function classification(
  overrides: Partial<AndroidNotificationClassification> = {},
): AndroidNotificationClassification {
  return {
    action: "save_transaction",
    eventStatus: "posted",
    transactionType: "expense",
    subtype: "purchase",
    amount: 12.99,
    amountEvidenceRaw: "12.99",
    currency: "USD",
    currencyEvidenceRaw: "USD",
    currencySource: "notification_explicit",
    currencyAmbiguous: false,
    merchant: "Cafe Bloom",
    merchantEvidenceRaw: "Cafe Bloom",
    completionEvidenceRaw: "was completed",
    transactionEvidenceRaw:
      "Card purchase USD 12.99 at Cafe Bloom was completed",
    date: fallbackDate,
    isRecurring: false,
    confidence: 0.99,
    reasonCode: "completed_payment",
    ...overrides,
  };
}

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

Deno.test("Android notification classifier saves posted refunds as income", () => {
  const result = normalizeAndroidNotificationClassification(
    saveArgs({
      transactionType: "expense",
      subtype: "refund",
      amount: 12.99,
      currency: "USD",
      merchant: "Amazon",
      category: "refunds",
    }),
    fallbackDate,
  );

  assertEquals(result.action, "save_transaction");
  assertEquals(result.transactionType, "income");
  assertEquals(result.category, "refunds");
});

Deno.test("Android notification classifier cannot save pending events", () => {
  const result = normalizeAndroidNotificationClassification(
    saveArgs({ eventStatus: "pending" }),
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "not_posted");
});

Deno.test("Android notification classifier cannot save transfers", () => {
  const result = normalizeAndroidNotificationClassification(
    saveArgs({ subtype: "transfer" }),
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "transfer_requires_wallets");
});

Deno.test("Android notification classifier rejects unsupported currencies", () => {
  const result = normalizeAndroidNotificationClassification(
    saveArgs({
      amount: 20,
      amountEvidenceRaw: "20",
      currency: "QAR",
      currencyEvidenceRaw: "QAR",
    }),
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "unsupported_currency");
});

Deno.test("Android notification classifier rejects low-confidence mutations", () => {
  const result = normalizeAndroidNotificationClassification(
    saveArgs({ confidence: 0.7 }),
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "uncertain");
});

Deno.test("classifier never rounds an amount the storage model cannot represent", () => {
  const result = normalizeAndroidNotificationClassification(
    saveArgs({
      amount: 1.234,
      amountEvidenceRaw: "١٫٢٣٤",
      currency: "JOD",
      currencyEvidenceRaw: "د.أ",
    }),
    fallbackDate,
  );

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "unsupported_amount_precision");
});

Deno.test("Android notification classifier keeps explicit recurring cadence", () => {
  const result = normalizeAndroidNotificationClassification(
    saveArgs({
      subtype: "subscription",
      amount: 10.99,
      amountEvidenceRaw: "10.99",
      merchant: "Spotify",
      merchantEvidenceRaw: "Spotify",
      isRecurring: true,
      frequency: "monthly",
    }),
    fallbackDate,
  );

  assertEquals(result.action, "save_transaction");
  assertEquals(result.isRecurring, true);
  assertEquals(result.recurrenceRule, {
    frequency: "monthly",
    anchor_date: fallbackDate,
  });
});

Deno.test("evidence validation accepts French localized formatting", () => {
  assertEquals(
    classificationHasNotificationEvidence(
      {
        packageName: "com.bank.app",
        text: "Paiement effectué de 1.234,56 € chez Café Étoile",
      },
      classification({
        amount: 1234.56,
        amountEvidenceRaw: "1.234,56 €",
        currency: "EUR",
        currencyEvidenceRaw: "€",
        merchant: "Café Étoile",
        merchantEvidenceRaw: "Café Étoile",
        completionEvidenceRaw: "Paiement effectué",
        transactionEvidenceRaw:
          "Paiement effectué de 1.234,56 € chez Café Étoile",
      }),
    ),
    true,
  );
});

Deno.test("evidence validation accepts Arabic script and digits", () => {
  assertEquals(
    classificationHasNotificationEvidence(
      {
        packageName: "com.bank.app",
        text: "تمت عملية شراء بقيمة ١٢٥٫٥٠ د.إ لدى متجر النور",
      },
      classification({
        amount: 125.5,
        amountEvidenceRaw: "١٢٥٫٥٠",
        currency: "AED",
        currencyEvidenceRaw: "د.إ",
        merchant: "متجر النور",
        merchantEvidenceRaw: "متجر النور",
        completionEvidenceRaw: "تمت عملية شراء",
        transactionEvidenceRaw:
          "تمت عملية شراء بقيمة ١٢٥٫٥٠ د.إ لدى متجر النور",
      }),
    ),
    true,
  );
});

Deno.test("evidence validation accepts Japanese notification structure", () => {
  assertEquals(
    classificationHasNotificationEvidence(
      {
        packageName: "com.bank.app",
        title: "カードご利用のお知らせ",
        text: "コンビニで1,234円のお支払いが完了しました",
      },
      classification({
        amount: 1234,
        amountEvidenceRaw: "1,234円",
        currency: "JPY",
        currencyEvidenceRaw: "円",
        merchant: "コンビニ",
        merchantEvidenceRaw: "コンビニ",
        completionEvidenceRaw: "お支払いが完了しました",
        transactionEvidenceRaw: "コンビニで1,234円のお支払いが完了しました",
      }),
    ),
    true,
  );
});

Deno.test("evidence validation accepts messaging-style and custom extras", () => {
  assertEquals(
    classificationHasNotificationEvidence(
      {
        packageName: "com.bank.app",
        conversationTitle: "Alertas bancarias",
        messages: ["Compra completada"],
        additionalText: ["COP$ 45.000 en Mercado Central"],
      },
      classification({
        amount: 45000,
        amountEvidenceRaw: "COP$ 45.000",
        currency: "COP",
        currencyEvidenceRaw: "COP$",
        merchant: "Mercado Central",
        merchantEvidenceRaw: "Mercado Central",
        completionEvidenceRaw: "Compra completada",
        transactionEvidenceRaw: "COP$ 45.000 en Mercado Central",
      }),
    ),
    true,
  );
});

Deno.test("account-context currency must match the server-loaded account", () => {
  const notification = {
    packageName: "com.bank.app",
    text: "Purchase of $4.86 at Coffee Shop was completed",
  };
  const candidate = classification({
    amount: 4.86,
    amountEvidenceRaw: "$4.86",
    currency: "CAD",
    currencyEvidenceRaw: "$",
    currencySource: "account_context",
    currencyAmbiguous: true,
    merchant: "Coffee Shop",
    merchantEvidenceRaw: "Coffee Shop",
    completionEvidenceRaw: "was completed",
    transactionEvidenceRaw: "Purchase of $4.86 at Coffee Shop was completed",
  });

  assertEquals(
    classificationHasNotificationEvidence(notification, candidate, "CAD"),
    true,
  );
  assertEquals(
    classificationHasNotificationEvidence(notification, candidate, "USD"),
    false,
  );
  assertEquals(
    classificationHasNotificationEvidence(notification, candidate, null),
    false,
  );
});

Deno.test("ambiguous symbols fall back to server-loaded user preference", () => {
  const notification = {
    packageName: "com.bank.app",
    text: "Purchase of $4.86 at Coffee Shop was completed",
  };
  const candidate = classification({
    amount: 4.86,
    amountEvidenceRaw: "$4.86",
    currency: "SGD",
    currencyEvidenceRaw: "$",
    currencySource: "user_preference",
    currencyAmbiguous: true,
    merchant: "Coffee Shop",
    merchantEvidenceRaw: "Coffee Shop",
    completionEvidenceRaw: "was completed",
    transactionEvidenceRaw: "Purchase of $4.86 at Coffee Shop was completed",
  });

  assertEquals(
    classificationHasNotificationEvidence(
      notification,
      candidate,
      null,
      "SGD",
    ),
    true,
  );
  assertEquals(
    classificationHasNotificationEvidence(
      notification,
      candidate,
      null,
      "USD",
    ),
    false,
  );
  assertEquals(
    classificationHasNotificationEvidence(
      notification,
      candidate,
      "CAD",
      "SGD",
    ),
    false,
  );
});

Deno.test("evidence validation rejects hallucinated fragments", () => {
  assertEquals(
    classificationHasNotificationEvidence(
      {
        packageName: "com.bank.app",
        text: "Card purchase USD 12.99 at Cafe Bloom was completed",
      },
      classification({ amount: 999, amountEvidenceRaw: "999" }),
    ),
    false,
  );
});

Deno.test("AI classification and independent verification save Arabic AED", async () => {
  const capturedModels: string[] = [];
  const result = await classifyAndroidNotification({
    genAI: fakeGenAI(
      [
        modelCall(
          "classify_notification",
          saveArgs({
            amount: 125.5,
            amountEvidenceRaw: "١٢٥٫٥٠",
            currency: "AED",
            currencyEvidenceRaw: "د.إ",
            merchant: "متجر النور",
            merchantEvidenceRaw: "متجر النور",
            completionEvidenceRaw: "تمت عملية شراء",
            transactionEvidenceRaw:
              "تمت عملية شراء بقيمة ١٢٥٫٥٠ د.إ لدى متجر النور",
          }),
        ),
        modelCall("verify_notification_classification", {
          approved: true,
          confidence: 0.99,
          reasonCode: "verified_completed_purchase",
        }),
      ],
      capturedModels,
    ),
    notification: {
      packageName: "com.bank.app",
      text: "تمت عملية شراء بقيمة ١٢٥٫٥٠ د.إ لدى متجر النور",
    },
    fallbackDate,
    accountCurrency: "AED",
    preferredLanguage: "ar",
    expenseCategories: ["shopping"],
    incomeCategories: ["other income"],
  });

  assertEquals(result.action, "save_transaction");
  assertEquals(result.currency, "AED");
  assertEquals(result.amount, 125.5);
  assertEquals(result.model, "gemini-3.1-flash-lite");
  assertEquals(result.verificationModel, "gemini-3-flash-preview");
  assertEquals(capturedModels, [
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
  ]);
});

Deno.test("AI uses preferred currency for an ambiguous symbol without a wallet", async () => {
  const text = "Purchase of $4.86 at Coffee Shop was completed";
  const result = await classifyAndroidNotification({
    genAI: fakeGenAI([
      modelCall(
        "classify_notification",
        saveArgs({
          amount: 4.86,
          amountEvidenceRaw: "$4.86",
          currency: "SGD",
          currencyEvidenceRaw: "$",
          currencySource: "user_preference",
          merchant: "Coffee Shop",
          merchantEvidenceRaw: "Coffee Shop",
          completionEvidenceRaw: "was completed",
          transactionEvidenceRaw: text,
        }),
      ),
      modelCall("verify_notification_classification", {
        approved: true,
        confidence: 0.99,
        reasonCode: "verified_with_user_preference",
      }),
    ]),
    notification: {
      packageName: "com.bank.app",
      text,
    },
    fallbackDate,
    accountCurrency: null,
    preferredCurrency: "SGD",
    preferredLanguage: "en",
    expenseCategories: ["coffee & tea"],
    incomeCategories: ["other income"],
  });

  assertEquals(result.action, "save_transaction");
  assertEquals(result.currency, "SGD");
  assertEquals(result.currencySource, "user_preference");
  assertEquals(result.currencyAmbiguous, true);
});

Deno.test("promotion is ignored only after independent agreement", async () => {
  const capturedModels: string[] = [];
  const result = await classifyAndroidNotification({
    genAI: fakeGenAI(
      [
        modelCall("classify_notification", {
          action: "ignore",
          eventStatus: "informational",
          subtype: "promotion",
          isRecurring: false,
          confidence: 0.99,
          reasonCode: "promotion",
        }),
        modelCall("verify_notification_classification", {
          approved: true,
          confidence: 0.99,
          reasonCode: "verified_promotion",
        }),
      ],
      capturedModels,
    ),
    notification: {
      packageName: "com.bank.app",
      text: "¡Oferta! Obtén 20% de descuento en tu próxima compra",
    },
    fallbackDate,
    preferredLanguage: "es",
    expenseCategories: ["shopping"],
    incomeCategories: ["other income"],
  });

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "promotion");
  assertEquals(result.model, "gemini-3.1-flash-lite");
  assertEquals(result.verificationModel, "gemini-3-flash-preview");
  assertEquals(capturedModels, [
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
  ]);
});

Deno.test("verifier blocks a promotional message misclassified as a purchase", async () => {
  const promotionalText = "عرض خاص: خصم 20 د.إ عند الشراء من متجر النور";
  const result = await classifyAndroidNotification({
    genAI: fakeGenAI([
      modelCall(
        "classify_notification",
        saveArgs({
          amount: 20,
          amountEvidenceRaw: "20 د.إ",
          currency: "AED",
          currencyEvidenceRaw: "د.إ",
          merchant: "متجر النور",
          merchantEvidenceRaw: "متجر النور",
          completionEvidenceRaw: promotionalText,
          transactionEvidenceRaw: promotionalText,
        }),
      ),
      modelCall("verify_notification_classification", {
        approved: false,
        confidence: 0.99,
        reasonCode: "promotion",
      }),
      modelCall("classify_notification", {
        action: "ignore",
        eventStatus: "informational",
        subtype: "promotion",
        isRecurring: false,
        confidence: 0.99,
        reasonCode: "promotion",
      }),
      modelCall("verify_notification_classification", {
        approved: true,
        confidence: 0.99,
        reasonCode: "verified_promotion",
      }),
    ]),
    notification: {
      packageName: "com.bank.app",
      text: promotionalText,
    },
    fallbackDate,
    preferredLanguage: "ar",
    expenseCategories: ["shopping"],
    incomeCategories: ["other income"],
  });

  assertEquals(result.action, "ignore");
  assertEquals(result.reasonCode, "promotion");
});

Deno.test("ignore disagreement escalates to a stronger classifier", async () => {
  const text = "支払い完了: コンビニで1,234円";
  const result = await classifyAndroidNotification({
    genAI: fakeGenAI([
      modelCall("classify_notification", {
        action: "ignore",
        eventStatus: "unknown",
        subtype: "other",
        isRecurring: false,
        confidence: 0.92,
        reasonCode: "uncertain",
      }),
      modelCall("verify_notification_classification", {
        approved: false,
        confidence: 0.99,
        reasonCode: "completed_purchase_present",
      }),
      modelCall(
        "classify_notification",
        saveArgs({
          amount: 1234,
          amountEvidenceRaw: "1,234円",
          currency: "JPY",
          currencyEvidenceRaw: "円",
          merchant: "コンビニ",
          merchantEvidenceRaw: "コンビニ",
          completionEvidenceRaw: "支払い完了",
          transactionEvidenceRaw: text,
        }),
      ),
      modelCall("verify_notification_classification", {
        approved: true,
        confidence: 0.99,
        reasonCode: "verified_completed_purchase",
      }),
    ]),
    notification: {
      packageName: "com.bank.app",
      text,
    },
    fallbackDate,
    accountCurrency: "JPY",
    preferredLanguage: "ja",
    expenseCategories: ["shopping"],
    incomeCategories: ["other income"],
  });

  assertEquals(result.action, "save_transaction");
  assertEquals(result.currency, "JPY");
  assertEquals(result.model, "gemini-3-flash-preview");
  assertEquals(result.verificationModel, "gemini-2.5-pro");
});

Deno.test("unresolved model disagreement is retryable, not cached as ignore", async () => {
  const ignored = {
    action: "ignore",
    eventStatus: "unknown",
    subtype: "other",
    isRecurring: false,
    confidence: 0.95,
    reasonCode: "uncertain",
  };
  await assertRejects(
    () =>
      classifyAndroidNotification({
        genAI: fakeGenAI([
          modelCall("classify_notification", ignored),
          modelCall("verify_notification_classification", {
            approved: false,
            confidence: 0.99,
            reasonCode: "completed_transaction_present",
          }),
          modelCall("classify_notification", ignored),
          modelCall("verify_notification_classification", {
            approved: false,
            confidence: 0.99,
            reasonCode: "completed_transaction_present",
          }),
          modelCall("classify_notification", ignored),
        ]),
        notification: {
          packageName: "com.bank.app",
          text: "Global-format notification requiring another attempt",
        },
        fallbackDate,
        accountCurrency: "USD",
        expenseCategories: ["shopping"],
        incomeCategories: ["other income"],
      }),
    Error,
    "NOTIFICATION_VERIFICATION_FAILED",
  );
});

Deno.test("AI may select transaction currency despite unrelated balance currency", () => {
  const text =
    "USD account balance: 200.00. Purchase completed: CAD 4.86 at Coffee Shop.";
  assertEquals(
    classificationHasNotificationEvidence(
      { packageName: "com.bank.app", text },
      classification({
        amount: 4.86,
        amountEvidenceRaw: "CAD 4.86",
        currency: "CAD",
        currencyEvidenceRaw: "CAD",
        merchant: "Coffee Shop",
        merchantEvidenceRaw: "Coffee Shop",
        completionEvidenceRaw: "Purchase completed",
        transactionEvidenceRaw: "Purchase completed: CAD 4.86 at Coffee Shop.",
      }),
    ),
    true,
  );
});
