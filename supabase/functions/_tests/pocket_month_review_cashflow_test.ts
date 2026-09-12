/// <reference lib="deno.ns" />

import {
  deriveKnownCashFlow,
  financialCycleEndKey,
} from "../generate-pocket-month-review/review-analysis.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("comfortable known cash flow reports sustainable coverage", () => {
  const result = deriveKnownCashFlow({
    dataStatus: "complete",
    recordedIncomeCents: 300000,
    projectedRecurringIncomeCents: 0,
    actualExpenseCents: 140000,
    projectedRecurringExpenseCents: 60000,
    incomingCarryCents: 30000,
  });

  assert(
    result.income_coverage_status === "covered",
    "Income should comfortably cover known outflows",
  );
  assert(
    result.month_funding_status === "funded",
    "The month should be funded",
  );
  assert(result.income_margin_cents === 100000, "Income margin must be exact");
  assert(
    result.funding_margin_after_carry_cents === 130000,
    "Carry must remain a separate buffer",
  );
  assert(
    result.known_funding_cents === 330000,
    "Known funding must include income and carry without treating it as income coverage",
  );
  assert(
    result.known_commitments_covered === true,
    "Known commitments should be covered when the funding margin is non-negative",
  );
  assert(
    result.safe_to_spend_status === "unavailable",
    "Safe-to-spend must remain unavailable without essential-spend classification",
  );
});

Deno.test("upcoming recurring expenses can make known cash flow tight", () => {
  const result = deriveKnownCashFlow({
    dataStatus: "complete",
    recordedIncomeCents: 200000,
    projectedRecurringIncomeCents: 0,
    actualExpenseCents: 100000,
    projectedRecurringExpenseCents: 85000,
    incomingCarryCents: 0,
  });

  assert(
    result.income_coverage_status === "tight",
    "A margin at or below ten percent should be tight",
  );
  assert(
    result.known_outflow_cents === 185000,
    "Scheduled commitments must be included but remain separate",
  );
  assert(
    result.income_margin_cents === 15000,
    "Tight margin must be deterministic",
  );
});

Deno.test("carry can fund this month without hiding an income deficit", () => {
  const result = deriveKnownCashFlow({
    dataStatus: "complete",
    recordedIncomeCents: 200000,
    projectedRecurringIncomeCents: 0,
    actualExpenseCents: 170000,
    projectedRecurringExpenseCents: 60000,
    incomingCarryCents: 50000,
  });

  assert(
    result.income_coverage_status === "deficit",
    "Carry must not improve income coverage",
  );
  assert(
    result.month_funding_status === "funded",
    "Carry may still fully fund the month",
  );
  assert(
    result.income_margin_cents === -30000,
    "The sustainable income gap must remain visible",
  );
  assert(
    result.funding_margin_after_carry_cents === 20000,
    "The remaining carry buffer must be exact",
  );
});

Deno.test(
  "known outflows above income and carry report a funding shortfall",
  () => {
    const result = deriveKnownCashFlow({
      dataStatus: "complete",
      recordedIncomeCents: 180000,
      projectedRecurringIncomeCents: 20000,
      actualExpenseCents: 160000,
      projectedRecurringExpenseCents: 70000,
      incomingCarryCents: 10000,
    });

    assert(
      result.income_coverage_status === "deficit",
      "Known outflows exceed known income",
    );
    assert(
      result.month_funding_status === "shortfall",
      "Income plus carry still does not fund the month",
    );
    assert(
      result.funding_margin_after_carry_cents === -20000,
      "Funding shortfall must be exact",
    );
    assert(
      result.known_commitments_covered === false,
      "Known commitments cannot be called covered during a funding shortfall",
    );
  },
);

Deno.test("missing income evidence never becomes a false deficit", () => {
  const result = deriveKnownCashFlow({
    dataStatus: "complete",
    recordedIncomeCents: 0,
    projectedRecurringIncomeCents: 0,
    actualExpenseCents: 120000,
    projectedRecurringExpenseCents: 30000,
    incomingCarryCents: 40000,
  });

  assert(
    result.income_coverage_status === "unknown",
    "No income records means unknown coverage",
  );
  assert(
    result.month_funding_status === "unknown",
    "Carry alone cannot establish complete funding",
  );
  assert(
    result.known_commitments_covered === null,
    "Missing income evidence must leave commitment coverage unknown",
  );
});

Deno.test("cash-flow range respects day-31 financial cycles", () => {
  assert(
    financialCycleEndKey("2027-01-31") === "2027-02-27",
    "A January day-31 cycle must end before the clamped February start",
  );
  assert(
    financialCycleEndKey("2028-01-31") === "2028-02-28",
    "Leap-year cycle bounds must include February 28",
  );
});
