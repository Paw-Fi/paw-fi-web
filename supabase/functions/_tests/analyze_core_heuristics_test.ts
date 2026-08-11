/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildCategoryPreferenceGuidance,
  extractExplicitTransactionTime,
  extractLabeledTransactionFallback,
  inferAttachmentFallbackCurrency,
  inferPayerFromText,
  inferSplitAmountsFromText,
  normalizeCustomSplits,
  normalizeTransactionDateAndDescription,
  parseTransactionsJsonToItems,
  resolveHouseholdContext,
  sanitizeTransactionSourceGrounding,
  shouldTryNextGeminiFallbackModel,
  validateTransactionSourceGrounding,
} from "../shared/analyze-core.ts";

Deno.test(
  "analyze-core: Gemini INVALID_ARGUMENT tries the next fallback model",
  () => {
    const invalidArgument = Object.assign(
      new Error("Request contains an invalid argument"),
      { status: 400 },
    );
    const unauthorized = Object.assign(new Error("Unauthorized"), {
      status: 401,
    });
    const wrappedInvalidArgument = new Error(
      "Request contains an invalid argument (400)",
    );

    assertEquals(shouldTryNextGeminiFallbackModel(invalidArgument), true);
    assertEquals(
      shouldTryNextGeminiFallbackModel(wrappedInvalidArgument),
      true,
    );
    assertEquals(shouldTryNextGeminiFallbackModel(unauthorized), false);
  },
);

Deno.test(
  "analyze-core: category guidance passes allowed user preferences without schema enums",
  () => {
    const guidance = buildCategoryPreferenceGuidance({
      expenseCategories: ["restaurants", "takeout & delivery", "other"],
      incomeCategories: ["salary", "refund"],
      preferences: [
        {
          transaction_type: "expense",
          match_key: "uber eats",
          category_name: "takeout & delivery",
          use_count: 8,
          last_used_at: "2026-04-01T00:00:00Z",
        },
        {
          transaction_type: "expense",
          match_key: "ignored",
          category_name: "not allowed",
          use_count: 99,
          last_used_at: "2026-04-02T00:00:00Z",
        },
      ],
      remaps: [
        {
          transaction_type: "expense",
          from_category_name: "dining",
          to_category_name: "restaurants",
          use_count: 3,
          last_used_at: "2026-04-01T00:00:00Z",
        },
      ],
    });

    const text = guidance.join("\n");
    assertStringIncludes(text, '"uber eats" -> takeout & delivery');
    assertStringIncludes(text, "dining -> restaurants");
    assertEquals(text.includes("not allowed"), false);
  },
);

Deno.test("analyze-core: payer + split pronoun heuristic", () => {
  const callerId = "11111111-1111-4111-8111-111111111111";
  const charlesId = "22222222-2222-4222-8222-222222222222";

  const ctx = resolveHouseholdContext(
    {
      householdMembers: [
        { userId: callerId, userName: "Alex" },
        { userId: charlesId, userName: "Charles" },
      ],
    },
    callerId,
  );
  if (!ctx) throw new Error("Expected household context");

  const text = "20 for dinner, paid by charles, and split 15 for him";
  const payerUserId = inferPayerFromText(text, ctx);
  assertEquals(payerUserId, charlesId);

  const inferred = inferSplitAmountsFromText(text, ctx, payerUserId);
  if (!inferred) throw new Error("Expected inferred custom splits");

  const normalized = normalizeCustomSplits(inferred, ctx, 20);
  if (!normalized) throw new Error("Expected normalized custom splits");

  const byUserId = Object.fromEntries(
    normalized.memberSplits.map((split) => [split.userId, split.amount]),
  );

  assertEquals(normalized.splitType, "amount");
  assertEquals(byUserId[charlesId], 15);
  assertEquals(byUserId[callerId], 5);
});

Deno.test("analyze-core: description date becomes transaction date", () => {
  const normalized = normalizeTransactionDateAndDescription(
    undefined,
    "burger on 12/3/26",
    "2026-03-18",
  );

  assertEquals(normalized.date, "2026-03-12");
  assertEquals(normalized.description, "burger");
});

Deno.test("analyze-core: raw date is normalized before storage", () => {
  const normalized = normalizeTransactionDateAndDescription(
    "12/3/26",
    "burger",
    "2026-03-18",
  );

  assertEquals(normalized.date, "2026-03-12");
  assertEquals(normalized.description, "burger");
});

Deno.test("analyze-core: unmarked numeric text does not override date", () => {
  const normalized = normalizeTransactionDateAndDescription(
    undefined,
    "burger ref 12/3/26",
    "2026-03-18",
  );

  assertEquals(normalized.date, "2026-03-18");
  assertEquals(normalized.description, "burger ref 12/3/26");
});

Deno.test("analyze-core: invalid raw date falls back to caller date", () => {
  const normalized = normalizeTransactionDateAndDescription(
    "tomorrow-ish",
    "burger",
    "2026-03-18",
  );

  assertEquals(normalized.date, "2026-03-18");
  assertEquals(normalized.description, "burger");
});

Deno.test("analyze-core: transaction JSON fallback preserves merchant", () => {
  const [item] = parseTransactionsJsonToItems(
    JSON.stringify({
      transactions: [
        {
          date: "2026-04-22",
          description: "Latte",
          merchant: "Blue Bottle Coffee",
          amount: 4.8,
          currency: "USD",
          type: "expense",
        },
      ],
    }),
    "USD",
    "2026-04-22",
  );

  assertEquals(item.merchant, "Blue Bottle Coffee");
});

Deno.test(
  "analyze-core: extracts only explicitly labeled transaction time",
  () => {
    assertEquals(
      extractExplicitTransactionTime(
        "Date & Time: 26 Jul 14:05 (SGT)\nForwarded at: 18:00",
      ),
      "14:05:00",
    );
    assertEquals(
      extractExplicitTransactionTime("Forwarded at: 18:00\nAmount: SGD 2.20"),
      undefined,
    );
  },
);

Deno.test(
  "analyze-core: rejects hallucinated values and recovers a grounded labeled transaction",
  () => {
    const sourceText =
      "Dear Customer,\n\nDate & Time: 26 Jul 16:35 (SGT)\nAmount: SGD2.20\nFrom: My Account A/C ending 1204\nTo: SUNRIC SHOPPING PTE. LTD. (UEN ending WSUN)";

    assertEquals(
      validateTransactionSourceGrounding({
        sourceText,
        item: {
          type: "expense",
          amount: 12.5,
          currency: "EUR",
          date: "2026-07-27",
          description: "Lunch at Tesco",
        },
      }),
      {
        grounded: false,
        reasons: [
          "AMOUNT_NOT_FOUND_IN_SOURCE",
          "CURRENCY_CONTRADICTS_SOURCE",
          "DESCRIPTION_NOT_GROUNDED_IN_SOURCE",
        ],
      },
    );
    assertEquals(
      validateTransactionSourceGrounding({
        sourceText,
        item: {
          type: "expense",
          amount: 2.2,
          currency: "SGD",
          date: "2025-07-26",
          transactionTime: "16:35:00",
          description: "SUNRIC SHOPPING PTE. LTD.",
        },
      }),
      { grounded: true, reasons: [] },
    );
    assertEquals(
      validateTransactionSourceGrounding({
        sourceText: "USD 10.00 fee and EUR 20.00 purchase",
        item: {
          type: "expense",
          amount: 10,
          currency: "EUR",
          description: "purchase",
        },
      }),
      {
        grounded: false,
        reasons: ["AMOUNT_NOT_FOUND_IN_SOURCE"],
      },
    );
    assertEquals(
      validateTransactionSourceGrounding({
        sourceText: "Please review all 10 purchased items. Total: $25.00",
        item: {
          type: "expense",
          amount: 25,
          currency: "USD",
          description: "purchased items",
        },
      }),
      { grounded: true, reasons: [] },
    );
    assertEquals(
      extractLabeledTransactionFallback({
        sourceText,
        receivedDate: "2025-07-26T09:00:00.000Z",
      }),
      {
        type: "expense",
        amount: 2.2,
        currency: "SGD",
        date: "2025-07-26",
        description: "SUNRIC SHOPPING PTE. LTD.",
        merchant: "SUNRIC SHOPPING PTE. LTD.",
        transactionTime: "16:35:00",
      },
    );
  },
);

Deno.test(
  "analyze-core: strips an ungrounded optional time without dropping a grounded receipt",
  () => {
    const sourceText =
      "Grab receipt\nTotal PaidS$8.10\nYour Trip2.14 km • 7 mins\nMall Entrance, The Riverwalk10:59AM\nMadisson House Padel11:06AM";
    const item = {
      type: "expense",
      amount: 8.1,
      category: "taxi & ride apps",
      currency: "SGD",
      merchant: "Grab",
      date: "2026-08-01",
      transactionTime: "10:59:00",
    };

    assertEquals(validateTransactionSourceGrounding({ sourceText, item }), {
      grounded: false,
      reasons: ["TIME_NOT_FOUND_IN_SOURCE"],
    });
    assertEquals(sanitizeTransactionSourceGrounding({ sourceText, item }), {
      grounded: true,
      reasons: [],
      item: {
        type: "expense",
        amount: 8.1,
        category: "taxi & ride apps",
        currency: "SGD",
        merchant: "Grab",
        date: "2026-08-01",
      },
      removedFields: [
        {
          field: "transactionTime",
          reason: "TIME_NOT_FOUND_IN_SOURCE",
        },
      ],
    });
  },
);

Deno.test(
  "analyze-core: optional field sanitization does not admit a fabricated amount",
  () => {
    assertEquals(
      sanitizeTransactionSourceGrounding({
        sourceText: "Grab receipt\nTotal PaidS$8.10\nRiverwalk10:59AM",
        item: {
          type: "expense",
          amount: 81,
          currency: "SGD",
          merchant: "Grab",
          transactionTime: "10:59:00",
        },
      }),
      {
        grounded: false,
        reasons: ["AMOUNT_NOT_FOUND_IN_SOURCE"],
        item: {
          type: "expense",
          amount: 81,
          currency: "SGD",
          merchant: "Grab",
        },
        removedFields: [
          {
            field: "transactionTime",
            reason: "TIME_NOT_FOUND_IN_SOURCE",
          },
        ],
      },
    );
  },
);

Deno.test(
  "analyze-core: attachment fallback currency prefers unambiguous document evidence",
  () => {
    const inferred = inferAttachmentFallbackCurrency({
      callerCurrency: "USD",
      rawText: "Statement currency: eur\nTotal amount 45.90",
      parsedItems: [{ currency: "" }, { currency: undefined }],
    });

    assertEquals(inferred, "EUR");
  },
);

Deno.test(
  "analyze-core: attachment fallback currency keeps caller currency when evidence is mixed",
  () => {
    const inferred = inferAttachmentFallbackCurrency({
      callerCurrency: "USD",
      rawText: "Totals shown in EUR and USD",
      parsedItems: [{ currency: "EUR" }, { currency: "USD" }],
    });

    assertEquals(inferred, "USD");
  },
);

Deno.test(
  "analyze-core: attachment fallback can override caller-defaulted item currency using raw text evidence",
  () => {
    const inferred = inferAttachmentFallbackCurrency({
      callerCurrency: "USD",
      rawText: "Account currency EUR\nStatement total €157.65",
      parsedItems: [{ currency: "USD" }, { currency: "USD" }],
    });

    assertEquals(inferred, "EUR");
  },
);

Deno.test(
  "analyze-core: attachment fallback ignores AI-guessed USD for bare dollar text",
  () => {
    const inferred = inferAttachmentFallbackCurrency({
      callerCurrency: "CAD",
      rawText: "Subtotal $10.00\nTax $2.50\nTotal $12.50",
      parsedItems: [{ currency: "USD" }],
    });

    assertEquals(inferred, "CAD");
  },
);
