/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { normalizeAiToolAmount } from "../shared/bot/ai-tool-validation.ts";

Deno.test(
  "telegram tool amount normalization rejects missing, zero, and invalid amounts",
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
  "telegram tool amount normalization accepts positive numbers and numeric strings",
  () => {
    assertEquals(normalizeAiToolAmount(12.34), {
      ok: true,
      amount: 12.34,
    });
    assertEquals(normalizeAiToolAmount("25.50"), {
      ok: true,
      amount: 25.5,
    });
    assertEquals(normalizeAiToolAmount(0.01), {
      ok: true,
      amount: 0.01,
    });
    assertEquals(normalizeAiToolAmount(0.005), {
      ok: true,
      amount: 0.01,
    });
    assertEquals(normalizeAiToolAmount("1,234.56"), {
      ok: true,
      amount: 1234.56,
    });
  },
);
