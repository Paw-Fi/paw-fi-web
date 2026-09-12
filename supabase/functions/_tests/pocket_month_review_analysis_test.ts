/// <reference lib="deno.ns" />

import {
  buildCategorySpending,
  derivePocketHistoryAnalysis,
  matchingHistoricalPocket,
} from "../generate-pocket-month-review/review-analysis.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test(
  "healthy finances preserve stable, evidence-backed pocket history",
  () => {
    const analysis = derivePocketHistoryAnalysis([
      {
        actual_spend_cents: 42000,
        available_cents: 50000,
        actual_transaction_count: 8,
        largest_actual_transaction_cents: 7000,
      },
      {
        actual_spend_cents: 44000,
        available_cents: 50000,
        actual_transaction_count: 9,
        largest_actual_transaction_cents: 6500,
      },
      {
        actual_spend_cents: 43000,
        available_cents: 50000,
        actual_transaction_count: 8,
        largest_actual_transaction_cents: 6800,
      },
    ]);

    assert(
      analysis.observed_cycle_count === 3,
      "All funded cycles are evidence",
    );
    assert(
      analysis.average_actual_spend_cents === 43000,
      "Average spend must be deterministic",
    );
    assert(
      analysis.over_budget_cycle_count === 0,
      "Stable under-budget history must not look overspent",
    );
    assert(
      analysis.within_budget_cycle_count === 3,
      "All three cycles were within budget",
    );
    assert(
      analysis.latest_budget_utilization_bps === 8400,
      "Latest utilization must be exact",
    );
  },
);

Deno.test(
  "frequent overspending is distinguished from one over-budget cycle",
  () => {
    const analysis = derivePocketHistoryAnalysis([
      {
        actual_spend_cents: 20800,
        available_cents: 16000,
        actual_transaction_count: 11,
        largest_actual_transaction_cents: 2400,
      },
      {
        actual_spend_cents: 19500,
        available_cents: 16000,
        actual_transaction_count: 10,
        largest_actual_transaction_cents: 2300,
      },
      {
        actual_spend_cents: 20100,
        available_cents: 16000,
        actual_transaction_count: 12,
        largest_actual_transaction_cents: 2200,
      },
    ]);

    assert(
      analysis.over_budget_cycle_count === 3,
      "Repeated overspending must be counted across cycles",
    );
    assert(
      analysis.latest_budget_variance_cents === 4800,
      "Latest variance must use actual minus available",
    );
    assert(
      analysis.latest_largest_transaction_share_bps === 1154,
      "Concentration must use supplied amounts",
    );
  },
);

Deno.test(
  "category evidence exposes a possible one-off without leaking transaction text",
  () => {
    const categorySpending = buildCategorySpending({
      actual_expenses: [
        {
          date: "2026-08-03",
          category: "Home",
          amount_cents: 90000,
          raw_text: "Private merchant and description",
        },
        {
          date: "2026-08-12",
          category: "Home",
          amount_cents: 10000,
        },
      ],
      projected_recurring_expenses: [
        { date: "2026-09-15", category: "Home", amount_cents: 5000 },
      ],
    });
    const home = categorySpending[0];

    assert(home.actual_spend_cents === 100000, "Actual spend must be summed");
    assert(
      home.actual_transaction_count === 2,
      "Transaction frequency must be retained",
    );
    assert(home.actual_active_day_count === 2, "Active days must be retained");
    assert(
      home.average_actual_transaction_cents === 50000,
      "Average transaction must be derived",
    );
    assert(
      home.largest_actual_transaction_cents === 90000,
      "Largest transaction must be derived",
    );
    assert(
      home.largest_actual_transaction_share_bps === 9000,
      "Largest-share concentration must be exact",
    );
    assert(
      home.projected_recurring_count === 1,
      "Upcoming recurring count must remain separate",
    );
    assert(
      !JSON.stringify(home).includes("Private merchant"),
      "Descriptions must not leave preprocessing",
    );
  },
);

Deno.test("thin history is represented as limited evidence", () => {
  const analysis = derivePocketHistoryAnalysis([
    {
      actual_spend_cents: 12000,
      available_cents: 15000,
      actual_transaction_count: 3,
      largest_actual_transaction_cents: 6000,
    },
  ]);

  assert(
    analysis.observed_cycle_count === 1,
    "One cycle must remain one cycle",
  );
  assert(
    analysis.actual_spend_range_cents === 0,
    "One observation has no range",
  );
  assert(
    analysis.over_budget_cycle_count === 0,
    "Thin history must not invent overspending",
  );
});

Deno.test("copied pockets retain history through their rollover group", () => {
  const historical = matchingHistoricalPocket(
    { id: "current-id", rollover_group_id: "stable-group" },
    [
      {
        id: "previous-id",
        rollover_group_id: "stable-group",
        available_cents: 25000,
      },
    ],
  );

  assert(
    historical?.available_cents === 25000,
    "A copied pocket must keep its prior budget evidence despite a new ID",
  );
});
