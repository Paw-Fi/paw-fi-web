/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  type CategoryContext,
  resolveCategory,
} from "../shared/category-resolution.ts";

function makeContext(
  overrides: Partial<CategoryContext> = {},
): CategoryContext {
  return {
    allowedExpenseSet: new Set(["groceries", "coffee & tea", "other"]),
    allowedIncomeSet: new Set(["salary", "other"]),
    preferences: [],
    remaps: [],
    ...overrides,
  };
}

Deno.test("category resolution prefers explicit remap over preference", () => {
  const result = resolveCategory({
    initialGuess: "other",
    description: "Starbucks latte",
    transactionType: "expense",
    ctx: makeContext({
      preferences: [
        {
          transaction_type: "expense",
          match_key: "starbucks latte",
          category_name: "coffee & tea",
          use_count: 4,
          last_used_at: null,
        },
      ],
      remaps: [
        {
          transaction_type: "expense",
          from_category_name: "other",
          to_category_name: "groceries",
          use_count: 2,
          last_used_at: null,
        },
      ],
    }),
  });

  assertEquals(result, "groceries");
});

Deno.test(
  "category resolution applies preference when remap does not lock",
  () => {
    const result = resolveCategory({
      initialGuess: "other",
      description: "Starbucks latte",
      transactionType: "expense",
      ctx: makeContext({
        preferences: [
          {
            transaction_type: "expense",
            match_key: "starbucks latte",
            category_name: "coffee & tea",
            use_count: 4,
            last_used_at: null,
          },
        ],
      }),
    });

    assertEquals(result, "coffee & tea");
  },
);

Deno.test(
  "Android classifier hints pass through the final category remap",
  () => {
    const result = resolveCategory({
      initialGuess: "dining",
      description: "Cafe Bloom lunch",
      transactionType: "expense",
      ctx: makeContext({
        allowedExpenseSet: new Set(["restaurants", "other"]),
        remaps: [
          {
            transaction_type: "expense",
            from_category_name: "dining",
            to_category_name: "restaurants",
            use_count: 1,
            last_used_at: null,
          },
        ],
      }),
    });

    assertEquals(result, "restaurants");
  },
);
