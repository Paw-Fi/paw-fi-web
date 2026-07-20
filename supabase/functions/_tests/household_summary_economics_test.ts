import {
  householdIncomeEffectCents,
  householdSpendingEffectCents,
} from "../shared/household-summary-economics.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

Deno.test("household summary uses finalized signed Plaid economics", () => {
  const cases = [
    {
      name: "consumer spend",
      final: true,
      multiplier: 1,
      income: false,
      spend: 1000,
      incomeEffect: 0,
    },
    {
      name: "refund",
      final: true,
      multiplier: -1,
      income: false,
      spend: -1000,
      incomeEffect: 0,
    },
    {
      name: "income",
      final: true,
      multiplier: 0,
      income: true,
      spend: 0,
      incomeEffect: 1000,
    },
    {
      name: "pending",
      final: false,
      multiplier: 0,
      income: false,
      spend: 0,
      incomeEffect: 0,
    },
    {
      name: "transfer",
      final: true,
      multiplier: 0,
      income: false,
      spend: 0,
      incomeEffect: 0,
    },
    {
      name: "debt",
      final: true,
      multiplier: 0,
      income: false,
      spend: 0,
      incomeEffect: 0,
    },
    {
      name: "fee",
      final: true,
      multiplier: 0,
      income: false,
      spend: 0,
      incomeEffect: 0,
    },
    {
      name: "cash",
      final: true,
      multiplier: 0,
      income: false,
      spend: 0,
      incomeEffect: 0,
    },
    {
      name: "loan",
      final: true,
      multiplier: 0,
      income: false,
      spend: 0,
      incomeEffect: 0,
    },
    {
      name: "unknown",
      final: true,
      multiplier: 0,
      income: false,
      spend: 0,
      incomeEffect: 0,
    },
  ];

  for (const testCase of cases) {
    const transaction = {
      amount_cents: -1000,
      analytics_is_final: testCase.final,
      analytics_spending_multiplier: testCase.multiplier,
      analytics_counts_toward_income: testCase.income,
    };
    assertEquals(
      householdSpendingEffectCents(transaction),
      testCase.spend,
      `${testCase.name} spending`,
    );
    assertEquals(
      householdIncomeEffectCents(transaction),
      testCase.incomeEffect,
      `${testCase.name} income`,
    );
  }
});
