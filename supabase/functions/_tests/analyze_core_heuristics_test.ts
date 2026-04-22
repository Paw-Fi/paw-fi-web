import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  inferPayerFromText,
  inferSplitAmountsFromText,
  normalizeCustomSplits,
  normalizeTransactionDateAndDescription,
  parseTransactionsJsonToItems,
  resolveHouseholdContext,
} from "../shared/analyze-core.ts";

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
