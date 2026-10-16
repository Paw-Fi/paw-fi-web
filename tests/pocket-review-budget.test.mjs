import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPocketReviewMoneyTokens,
  roundPocketReviewPlan,
} from "../supabase/functions/generate-pocket-month-review/review-currency.ts";
import { validatePocketProposals } from "../supabase/functions/generate-pocket-month-review/review-proposals.ts";
import { mergeAllowedCategories } from "../supabase/functions/shared/user-categories.ts";

const proposals = [
  {
    envelope_id: "draft-1",
    pocket_name: "Maison",
    categories: ["rent"],
    suggested_amount_cents: 60000,
  },
  {
    envelope_id: "draft-2",
    pocket_name: "食料品",
    categories: ["groceries"],
    suggested_amount_cents: 30000,
  },
  {
    envelope_id: "draft-3",
    pocket_name: "تنقل",
    categories: ["public transport"],
    suggested_amount_cents: 10000,
  },
];
const amounts = (rows) =>
  rows.map((row) => ({
    envelopeId: row.envelope_id,
    amountCents: row.suggested_amount_cents,
  }));

test("saved budgets are split exactly, including over-budget and under-budget AI output", () => {
  const catalog = mergeAllowedCategories({
    customCategories: [],
  }).expenseCategories;
  for (const budget of [1, 99, 100, 10001, 50000, 200000, 98765432100]) {
    const valid = validatePocketProposals(
      proposals,
      [],
      catalog,
      100001,
      budget,
    );
    assert.ok(valid, "AI total arithmetic cannot reject a fixed-budget plan");
    const result = roundPocketReviewPlan({
      amounts: amounts(valid),
      maximumBudgetCents: budget,
    });
    assert.equal(result.totalCents, budget);
    assert.equal(
      [...result.amounts.values()].reduce((sum, value) => sum + value, 0),
      budget,
    );
    assert.ok(
      [...result.amounts.values()].every(
        (value) => Number.isSafeInteger(value) && value >= 0,
      ),
    );
  }
  const result = roundPocketReviewPlan({
    amounts: amounts(proposals),
    maximumBudgetCents: 50000,
  });
  assert.deepEqual(Object.fromEntries(result.amounts), {
    "draft-1": 30000,
    "draft-2": 15000,
    "draft-3": 5000,
  });
});

test("without a saved budget the recommendation is not forced to a fixed template", () => {
  const result = roundPocketReviewPlan({
    amounts: amounts(proposals),
    maximumBudgetCents: 0,
  });
  assert.equal(result.totalCents, 100000);
  assert.equal(result.amounts.get("draft-1"), 60000);
  assert.equal(result.amounts.get("draft-2"), 30000);
  assert.equal(result.amounts.get("draft-3"), 10000);
});

test("category links use the real catalog, including existing custom categories but excluding hidden categories", () => {
  const { expenseCategories } = mergeAllowedCategories({
    customCategories: [{ name: "家族の食事", transaction_type: "expense" }],
    hiddenCategories: [{ category_name: "rent", transaction_type: "expense" }],
  });
  const row = {
    envelope_id: "draft-1",
    pocket_name: "食事",
    categories: ["家族の食事"],
    suggested_amount_cents: 10000,
  };
  assert.ok(validatePocketProposals([row], [], expenseCategories, 10000, 0));
  assert.equal(
    validatePocketProposals(
      [{ ...row, categories: ["rent"] }],
      [],
      expenseCategories,
      10000,
      0,
    ),
    null,
  );
  assert.equal(
    validatePocketProposals(
      [{ ...row, categories: ["invented-category"] }],
      [],
      expenseCategories,
      10000,
      0,
    ),
    null,
  );
  assert.equal(
    validatePocketProposals(
      [{ ...row, categories: ["salary"] }],
      [],
      expenseCategories,
      10000,
      0,
    ),
    null,
  );
});

test("target prose resolves final native amounts across currencies and languages without changing historical facts", () => {
  const result = roundPocketReviewPlan({
    amounts: amounts(proposals),
    maximumBudgetCents: 50000,
  });
  for (const [currency, locale] of [
    ["EUR", "zh"],
    ["JPY", "ja-JP"],
    ["INR", "hi-IN"],
    ["BRL", "pt-BR"],
    ["KWD", "ar-KW"],
    ["VND", "vi-VN"],
    ["USD", "ur"],
  ]) {
    const reference = formatPocketReviewMoneyTokens(
      "{{pocket:draft-2}} / {{budget}} / {{money:30000}}",
      currency,
      locale,
      result,
    );
    const explicit = formatPocketReviewMoneyTokens(
      "{{money:15000}} / {{money:50000}} / {{money:30000}}",
      currency,
      locale,
    );
    assert.equal(reference, explicit);
    assert.ok(!reference.includes("{{"));
  }
  assert.equal(
    formatPocketReviewMoneyTokens("{{pocket:unknown}}", "EUR", "zh", result),
    null,
  );
  assert.ok(
    formatPocketReviewMoneyTokens("{{budget}}", "VND", "vi-VN", {
      totalCents: 999999999999,
      amounts: new Map(),
    }),
    "Large native-currency amounts are bounded by integer precision, not a USD-sized ceiling",
  );
  assert.equal(
    formatPocketReviewMoneyTokens("{{budget}}", "EUR", "en-US", {
      totalCents: 10001,
      amounts: new Map(),
    }),
    "€100.01",
    "Preserve fractional saved budgets using currency-aware formatting",
  );
});

test("fixed-budget allocations retain exact totals for varied amounts and pocket counts", () => {
  for (const count of [1, 3, 8, 30]) {
    for (const budget of [
      1, 7, 99, 100, 101, 99999, 123456700, 100000000000, 999999999999,
    ]) {
      const rows = Array.from({ length: count }, (_, index) => ({
        envelopeId: `p-${index}`,
        amountCents: (index + 1) ** 3 * 13,
      }));
      const result = roundPocketReviewPlan({
        amounts: rows,
        maximumBudgetCents: budget,
      });
      assert.equal(result.totalCents, budget);
      assert.equal(
        [...result.amounts.values()].reduce((sum, amount) => sum + amount, 0),
        budget,
      );
      assert.ok(
        [...result.amounts.values()].every(
          (amount) => Number.isSafeInteger(amount) && amount >= 0,
        ),
      );
    }
  }
});

test("empty AI allocations never become a fabricated equal-split plan", () => {
  const catalog = mergeAllowedCategories({
    customCategories: [],
  }).expenseCategories;
  assert.equal(
    validatePocketProposals(
      proposals.map((row) => ({
        ...row,
        suggested_amount_cents: 0,
      })),
      [],
      catalog,
      0,
      50000,
    ),
    null,
  );
});
