/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  normalizeAiToolAmount,
  normalizeAiToolMoneyCents,
  normalizeAiToolPercentage,
  normalizeAiToolTransactionFields,
  normalizeAiToolTransactionType,
  normalizeRequiredAiToolString,
} from "../shared/bot/ai-tool-validation.ts";

Deno.test(
  "AI tool amount validation rejects values that cannot become positive cents",
  () => {
    const invalidValues = [
      undefined,
      null,
      0,
      "0",
      "",
      "   ",
      "abc",
      "$12",
      "1,2,3",
      true,
      {},
      0.001,
      0.004,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ];

    for (const value of invalidValues) {
      assertEquals(
        normalizeAiToolAmount(value),
        {
          ok: false,
          error: "Invalid amount. Ask the user for a value greater than 0.",
        },
        `expected invalid amount for ${String(value)}`,
      );
    }
  },
);

Deno.test(
  "AI tool transaction field validation rejects bad amount category and type before invokes",
  () => {
    assertEquals(
      normalizeAiToolTransactionFields({ amount: 12, category: "Food" }),
      { ok: true, amount: 12, category: "Food", type: "expense" },
    );
    assertEquals(
      normalizeAiToolTransactionFields({ amount: 0, category: "Food" }),
      {
        ok: false,
        error: "Invalid amount. Ask the user for a value greater than 0.",
      },
    );
    assertEquals(
      normalizeAiToolTransactionFields({ amount: 12, category: "" }),
      { ok: false, error: "category is required." },
    );
    assertEquals(
      normalizeAiToolTransactionFields({
        amount: 12,
        category: "Food",
        type: "transfer",
      }),
      { ok: false, error: "type must be expense or income." },
    );
  },
);

Deno.test(
  "AI tool percentage validation rejects malformed pocket percentages",
  () => {
    assertEquals(normalizeAiToolPercentage("12.5", "percentage"), {
      ok: true,
      percentage: 12.5,
    });
    assertEquals(normalizeAiToolPercentage("25%", "percentage"), {
      ok: true,
      percentage: 25,
    });
    assertEquals(normalizeAiToolPercentage("abc", "percentage"), {
      ok: false,
      error: "percentage must be a valid percentage.",
    });
    assertEquals(normalizeAiToolPercentage(-1, "percentage"), {
      ok: false,
      error: "percentage must be between 0 and 100.",
    });
  },
);

Deno.test(
  "AI tool amount validation accepts positive amounts and rounds to cents",
  () => {
    assertEquals(normalizeAiToolAmount(12.34), { ok: true, amount: 12.34 });
    assertEquals(normalizeAiToolAmount("25.50"), { ok: true, amount: 25.5 });
    assertEquals(normalizeAiToolAmount(0.005), { ok: true, amount: 0.01 });
    assertEquals(normalizeAiToolAmount("1,234.56"), {
      ok: true,
      amount: 1234.56,
    });
  },
);

Deno.test(
  "AI tool money cents validation supports optional balances without hiding malformed values",
  () => {
    assertEquals(normalizeAiToolMoneyCents(undefined, "opening_balance"), {
      ok: true,
      cents: undefined,
    });
    assertEquals(normalizeAiToolMoneyCents("-12.34", "opening_balance"), {
      ok: true,
      cents: -1234,
    });
    assertEquals(normalizeAiToolMoneyCents("abc", "opening_balance"), {
      ok: false,
      error: "opening_balance must be a valid money amount.",
    });
  },
);

Deno.test(
  "AI tool string and transaction type validation preserve existing defaults",
  () => {
    assertEquals(normalizeRequiredAiToolString(" Food ", "category"), {
      ok: true,
      value: "Food",
    });
    assertEquals(normalizeRequiredAiToolString("", "category"), {
      ok: false,
      error: "category is required.",
    });
    assertEquals(normalizeAiToolTransactionType(undefined), {
      ok: true,
      type: "expense",
    });
    assertEquals(normalizeAiToolTransactionType("Income"), {
      ok: true,
      type: "income",
    });
    assertEquals(normalizeAiToolTransactionType("transfer"), {
      ok: false,
      error: "type must be expense or income.",
    });
  },
);
