import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildCategoryPreferenceGuidance,
  inferAttachmentFallbackCurrency,
  inferPayerFromText,
  inferSplitAmountsFromText,
  normalizeCustomSplits,
  normalizeTransactionDateAndDescription,
  parseTransactionsJsonToItems,
  resolveHouseholdContext,
} from "../shared/analyze-core.ts";

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
