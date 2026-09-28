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
  "confirmed description beats a category-wide remap for that description only",
  () => {
    const ctx = makeContext({
      allowedExpenseSet: new Set(["groceries", "supplements", "other"]),
      remaps: [
        {
          transaction_type: "expense",
          from_category_name: "groceries",
          to_category_name: "supplements",
          use_count: 2,
          last_used_at: null,
        },
      ],
      confirmedPreferences: [
        {
          transaction_type: "expense",
          match_key: "milk and bread",
          category_name: "groceries",
          use_count: 1,
          last_used_at: null,
          is_user_confirmed: true,
        },
      ],
      preferences: [
        {
          transaction_type: "expense",
          match_key: "other grocery",
          category_name: "groceries",
          use_count: 5,
          last_used_at: null,
        },
      ],
    });
    assertEquals(
      resolveCategory({
        initialGuess: "groceries",
        description: "Milk and bread",
        transactionType: "expense",
        ctx,
      }),
      "groceries",
    );
    assertEquals(
      resolveCategory({
        initialGuess: "groceries",
        description: "Other grocery",
        transactionType: "expense",
        ctx,
      }),
      "supplements",
    );
    assertEquals(
      resolveCategory({
        initialGuess: "groceries",
        description: "different item",
        transactionType: "expense",
        ctx,
      }),
      "supplements",
    );
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

Deno.test(
  "opposite explicit remaps swap the original categories exactly once",
  () => {
    const ctx = makeContext({
      allowedExpenseSet: new Set(["groceries", "supplements", "other"]),
      remaps: [
        {
          transaction_type: "expense",
          from_category_name: "supplements",
          to_category_name: "groceries",
          use_count: 9,
          last_used_at: null,
        },
        {
          transaction_type: "expense",
          from_category_name: "groceries",
          to_category_name: "supplements",
          use_count: 1,
          last_used_at: null,
        },
      ],
      preferences: [
        {
          transaction_type: "expense",
          match_key: "bread",
          category_name: "supplements",
          use_count: 2,
          last_used_at: null,
        },
      ],
    });

    assertEquals(
      resolveCategory({
        initialGuess: "supplements",
        description: "bread",
        transactionType: "expense",
        ctx,
      }),
      "groceries",
    );
    assertEquals(
      resolveCategory({
        initialGuess: "groceries",
        description: "牛乳と卵",
        transactionType: "expense",
        ctx,
      }),
      "supplements",
    );
  },
);
