import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  coerceCategoryToAllowed,
  getExpenseCategories,
  getIncomeCategories,
  normalizeCategoryForStorage,
  sanitizeCategoryName,
} from "../shared/category-colors.ts";
import {
  applyCategoryRemap,
  applyPreferencesToItems,
  mergeAllowedCategories,
} from "../shared/user-categories.ts";

function withSilencedConsoleWarn<T>(fn: () => T): T {
  const original = console.warn;
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.warn = original;
  }
}

Deno.test("category: sanitizeCategoryName accepts safe custom category", () => {
  assertEquals(sanitizeCategoryName("Coffee & Tea"), "coffee & tea");
});

Deno.test("category: sanitizeCategoryName rejects backticks", () => {
  assertEquals(sanitizeCategoryName("rent `oops`"), null);
});

Deno.test("category: sanitizeCategoryName rejects overly long names", () => {
  const longName = "a".repeat(49);
  assertEquals(sanitizeCategoryName(longName), null);
});

Deno.test(
  "category: normalizeCategoryForStorage preserves unknown custom",
  () => {
    assertEquals(
      withSilencedConsoleWarn(() => normalizeCategoryForStorage("My Custom")),
      "my custom",
    );
  },
);

Deno.test(
  "category: normalizeCategoryForStorage keeps income gift canonical",
  () => {
    assertEquals(normalizeCategoryForStorage("gift"), "gift");
  },
);

Deno.test(
  "category: coerceCategoryToAllowed returns other when not allowed",
  () => {
    const allowed = new Set(["groceries", "rent"]);
    assertEquals(
      withSilencedConsoleWarn(() =>
        coerceCategoryToAllowed("my custom", allowed)
      ),
      "other",
    );
  },
);

Deno.test(
  "category: coerceCategoryToAllowed preserves allowed custom containing built-in word",
  () => {
    const allowed = new Set(["restaurants", "cat insurance"]);
    assertEquals(
      coerceCategoryToAllowed("cat insurance", allowed),
      "cat insurance",
    );
  },
);

Deno.test(
  "user-categories: mergeAllowedCategories includes custom in correct sets",
  () => {
    const merged = mergeAllowedCategories({
      customCategories: [
        { name: "Side Hustle", transaction_type: "income" },
        { name: "Chores", transaction_type: "expense" },
        { name: "Allowance", transaction_type: "income" },
      ],
    });

    assert(merged.incomeCategories.includes("side hustle"));
    assert(!merged.expenseCategories.includes("side hustle"));

    assert(merged.expenseCategories.includes("chores"));
    assert(!merged.incomeCategories.includes("chores"));

    assert(merged.incomeCategories.includes("allowance"));
  },
);

Deno.test(
  "user-categories: applyPreferencesToItems uses preferred category when allowed",
  () => {
    const merged = mergeAllowedCategories({ customCategories: [] });

    const items = [
      {
        type: "expense" as const,
        description: "Starbucks latte",
        category: "other",
      },
    ];

    const preferences = [
      {
        transaction_type: "expense" as const,
        match_key: "starbucks latte",
        category_name: "coffee & tea",
        use_count: 3,
        last_used_at: null,
      },
    ];

    const out = applyPreferencesToItems({
      items,
      preferences,
      allowedExpenseCategories: merged.allowedExpenseSet,
      allowedIncomeCategories: merged.allowedIncomeSet,
    });

    assertEquals(out[0].category, "coffee & tea");
  },
);

Deno.test(
  "user-categories: applyPreferencesToItems does not apply if preferred not allowed",
  () => {
    const allowedExpenseSet = new Set(["rent", "groceries"]);
    const allowedIncomeSet = new Set(getIncomeCategories());

    const items = [
      {
        type: "expense" as const,
        description: "Starbucks latte",
        category: "other",
      },
    ];

    const preferences = [
      {
        transaction_type: "expense" as const,
        match_key: "starbucks latte",
        category_name: "coffee & tea",
        use_count: 1,
        last_used_at: null,
      },
    ];

    const out = applyPreferencesToItems({
      items,
      preferences,
      allowedExpenseCategories: allowedExpenseSet,
      allowedIncomeCategories: allowedIncomeSet,
    });

    assertEquals(out[0].category, "other");
  },
);

Deno.test(
  "user-categories: applyPreferencesToItems preserves custom categories containing built-in words",
  () => {
    const allowedExpenseSet = new Set(["restaurants", "pet insurance"]);
    const allowedIncomeSet = new Set(getIncomeCategories());

    const items = [
      {
        type: "expense" as const,
        description: "Sushi place",
        category: "restaurants",
      },
    ];

    const preferences = [
      {
        transaction_type: "expense" as const,
        match_key: "sushi place",
        category_name: "pet insurance",
        use_count: 2,
        last_used_at: null,
      },
    ];

    const out = applyPreferencesToItems({
      items,
      preferences,
      allowedExpenseCategories: allowedExpenseSet,
      allowedIncomeCategories: allowedIncomeSet,
    });

    assertEquals(out[0].category, "pet insurance");
  },
);

Deno.test(
  "user-categories: applyCategoryRemap preserves custom remap target",
  () => {
    const out = applyCategoryRemap({
      categoryName: "restaurants",
      transactionType: "expense",
      remaps: [
        {
          transaction_type: "expense",
          from_category_name: "restaurants",
          to_category_name: "pet insurance",
          use_count: 1,
          last_used_at: null,
        },
      ],
      allowedExpenseCategories: new Set(["restaurants", "pet insurance"]),
      allowedIncomeCategories: new Set(getIncomeCategories()),
    });

    assertEquals(out, "pet insurance");
  },
);

Deno.test(
  "user-categories: applyCategoryRemap keeps custom source when no remap row matches",
  () => {
    const out = applyCategoryRemap({
      categoryName: "cat insurance",
      transactionType: "expense",
      remaps: [
        {
          transaction_type: "expense",
          from_category_name: "restaurants",
          to_category_name: "cat insurance",
          use_count: 1,
          last_used_at: null,
        },
      ],
      allowedExpenseCategories: new Set(["cat insurance", "restaurants"]),
      allowedIncomeCategories: new Set(getIncomeCategories()),
    });

    assertEquals(out, "cat insurance");
  },
);

Deno.test("category lists: built-in lists remain non-empty", () => {
  assert(getExpenseCategories().length > 0);
  assert(getIncomeCategories().length > 0);
});

Deno.test(
  "user-categories: mergeAllowedCategories excludes hidden categories",
  () => {
    const merged = mergeAllowedCategories({
      customCategories: [{ name: "side hustle", transaction_type: "income" }],
      hiddenCategories: [
        { category_name: "groceries", transaction_type: "expense" },
        { category_name: "side hustle", transaction_type: "income" },
      ],
    });

    assert(!merged.expenseCategories.includes("groceries"));
    assert(!merged.incomeCategories.includes("side hustle"));

    // fallbacks still present
    assert(merged.expenseCategories.includes("other"));
  },
);
