/// <reference lib="deno.ns" />

import {
  buildPocketReviewCurrencyContext,
  formatPocketReviewMoneyTokens,
  roundPocketReviewPlan,
} from "../generate-pocket-month-review/review-currency.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test(
  "pocket review rounds small and large plan targets to useful whole units",
  () => {
    const result = roundPocketReviewPlan({
      amounts: [
        { envelopeId: "utilities", amountCents: 134499 },
        { envelopeId: "fun", amountCents: 1299 },
      ],
      maximumBudgetCents: 0,
    });

    assert(
      result.amounts.get("utilities") === 134000,
      "Large amounts use tens",
    );
    assert(result.amounts.get("fun") === 1300, "Small amounts use whole units");
    assert(result.totalCents === 135300, "Rounded amounts must form the total");
  },
);

Deno.test("pocket review keeps rounded targets within a budget cap", () => {
  const result = roundPocketReviewPlan({
    amounts: [
      { envelopeId: "a", amountCents: 10049 },
      { envelopeId: "b", amountCents: 10051 },
    ],
    maximumBudgetCents: 20000,
  });

  assert(result.totalCents <= 20000, "Rounded plan must not exceed its cap");
  assert(
    result.totalCents ===
      [...result.amounts.values()].reduce((sum, amount) => sum + amount, 0),
    "Rounded total must exactly equal its pocket amounts",
  );
  assert(
    [...result.amounts.values()].every((amount) => amount % 100 === 0),
    "Rounded targets must remain whole currency units",
  );
});

Deno.test(
  "over-budget targets are fitted proportionally instead of rejected",
  () => {
    const result = roundPocketReviewPlan({
      amounts: [
        { envelopeId: "home", amountCents: 60000 },
        { envelopeId: "food", amountCents: 30000 },
        { envelopeId: "travel", amountCents: 10000 },
      ],
      maximumBudgetCents: 50000,
    });
    assert(result.totalCents === 50000, "The saved budget remains the ceiling");
    assert(result.amounts.get("home") === 30000, "Keep relative priorities");
    assert(result.amounts.get("food") === 15000, "Keep relative priorities");
    assert(result.amounts.get("travel") === 5000, "Keep relative priorities");
    assert(
      formatPocketReviewMoneyTokens(
        "目標 {{pocket:food}}、合計 {{budget}}、先月 {{money:30000}}",
        "EUR",
        "zh",
        result,
      ) ===
        formatPocketReviewMoneyTokens(
          "目標 {{money:15000}}、合計 {{money:50000}}、先月 {{money:30000}}",
          "EUR",
          "zh",
        ),
      "Target references use final amounts without rewriting historical facts",
    );
  },
);

Deno.test(
  "a small positive budget never rounds every proposed allocation to zero",
  () => {
    for (const maximumBudgetCents of [1, 99, 100]) {
      const result = roundPocketReviewPlan({
        amounts: [
          { envelopeId: "a", amountCents: 10000 },
          { envelopeId: "b", amountCents: 10000 },
          { envelopeId: "c", amountCents: 10000 },
        ],
        maximumBudgetCents,
      });
      assert(
        result.totalCents > 0 && result.totalCents <= maximumBudgetCents,
        "Small budgets remain a valid capped plan",
      );
      assert(
        [...result.amounts.values()].every(Number.isSafeInteger),
        "All allocations remain integer cents",
      );
    }
  },
);

Deno.test("pocket review uses localized currency symbols in AI prose", () => {
  const euro = buildPocketReviewCurrencyContext("EUR", "de-DE");
  const japanese = buildPocketReviewCurrencyContext("JPY", "ja-JP");
  const text = formatPocketReviewMoneyTokens(
    "Set aside {{money:134500}} for utilities.",
    "EUR",
    "de-DE",
  );

  assert(
    euro.symbol === "€" && euro.example.includes("€"),
    "EUR uses its symbol",
  );
  assert(japanese.symbol === "¥", "JPY uses its symbol");
  assert(text != null && text.includes("€"), "Money tokens are localized");
  assert(
    formatPocketReviewMoneyTokens("{{money:not-cents}}", "USD", "en-US") ===
      null,
    "Malformed money tokens are rejected",
  );
  assert(
    formatPocketReviewMoneyTokens("Set aside $100.", "EUR", "de-DE") === null,
    "Raw currency symbols are rejected so the locale formatter remains authoritative",
  );
  assert(
    formatPocketReviewMoneyTokens("Set aside {{money:100", "USD", "en-US") ===
      null,
    "Incomplete money tokens are rejected",
  );
  assert(
    formatPocketReviewMoneyTokens("Set aside €١٠٠.", "EUR", "ar-SA") === null,
    "Raw currency symbols with localized digits are rejected",
  );
  assert(
    formatPocketReviewMoneyTokens(
      "{{money:9007199254740992}}",
      "USD",
      "en-US",
    ) === null,
    "Out-of-range money tokens are rejected",
  );
});
