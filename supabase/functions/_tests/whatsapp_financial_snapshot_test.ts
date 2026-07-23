/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildFinancialSnapshotTotals,
  type FinancialSnapshotRow,
  projectRecurringSnapshotRows,
} from "../shared/bot/financial-snapshot.ts";

function recurringRow(
  overrides: Partial<FinancialSnapshotRow> = {},
): FinancialSnapshotRow {
  return {
    id: "recurring-expense",
    date: "2026-01-10",
    amount_cents: 95000,
    currency: "SGD",
    category: "housing",
    raw_text: "Rent",
    account_id: "wallet-1",
    split_group_id: null,
    type: "expense",
    analytics_is_final: true,
    analytics_spending_multiplier: 1,
    analytics_counts_toward_income: false,
    recurrence_rule: {
      frequency: "monthly",
      anchor_date: "2026-01-10",
    },
    ...overrides,
  };
}

Deno.test(
  "financial snapshot projects recurring income and spending into the period",
  () => {
    const recurringRows = [
      recurringRow(),
      recurringRow({
        id: "recurring-income",
        date: "2026-01-01",
        amount_cents: 125000,
        category: "income",
        raw_text: "Salary",
        type: "income",
        analytics_spending_multiplier: 0,
        analytics_counts_toward_income: true,
        recurrence_rule: {
          frequency: "monthly",
          anchor_date: "2026-01-01",
        },
      }),
    ];

    const projected = projectRecurringSnapshotRows(
      recurringRows,
      [],
      "2026-07-01",
      "2026-07-23",
    );
    const totals = buildFinancialSnapshotTotals(projected);

    assertEquals(
      projected.map((row) => row.date),
      ["2026-07-10", "2026-07-01"],
    );
    assertEquals(
      projected.map((row) => row.parent_recurring_id),
      ["recurring-expense", "recurring-income"],
    );
    assertEquals(totals, {
      totalExpense: 95000,
      totalIncome: 125000,
      net: 30000,
      categories: [{ category: "housing", amount_cents: 95000 }],
    });
  },
);

Deno.test(
  "financial snapshot excludes future and explicitly skipped occurrences",
  () => {
    const projected = projectRecurringSnapshotRows(
      [
        recurringRow({
          id: "future-expense",
          date: "2026-01-28",
          recurrence_rule: {
            frequency: "monthly",
            anchor_date: "2026-01-28",
          },
        }),
        recurringRow({
          id: "excluded-expense",
          recurrence_rule: {
            frequency: "monthly",
            anchor_date: "2026-01-10",
            excluded_dates: ["2026-07-10"],
          },
        }),
        recurringRow({
          id: "disabled-expense",
          recurrence_rule: {
            frequency: "monthly",
            anchor_date: "2026-01-10",
            projection_enabled: false,
          },
        }),
      ],
      [],
      "2026-07-01",
      "2026-07-23",
    );

    assertEquals(projected, []);
  },
);

Deno.test(
  "financial snapshot does not double-count a materialized recurring occurrence",
  () => {
    const actualRow = recurringRow({
      id: "actual-expense",
      date: "2026-07-10",
      amount_cents: 97500,
      raw_text: "Edited rent",
      parent_recurring_id: "recurring-expense",
      recurrence_rule: null,
    });

    const projected = projectRecurringSnapshotRows(
      [recurringRow()],
      [actualRow],
      "2026-07-01",
      "2026-07-23",
    );
    const totals = buildFinancialSnapshotTotals([actualRow, ...projected]);

    assertEquals(projected, []);
    assertEquals(totals.totalExpense, 97500);
  },
);

Deno.test("financial snapshot supports a custom financial period start", () => {
  const projected = projectRecurringSnapshotRows(
    [
      recurringRow({
        date: "2026-01-28",
        recurrence_rule: {
          frequency: "monthly",
          anchor_date: "2026-01-28",
        },
      }),
    ],
    [],
    "2026-06-25",
    "2026-07-23",
  );

  assertEquals(
    projected.map((row) => row.date),
    ["2026-06-28"],
  );
});

Deno.test(
  "financial snapshot keeps opposite transaction types during deduplication",
  () => {
    const projected = projectRecurringSnapshotRows(
      [recurringRow()],
      [
        recurringRow({
          id: "actual-income",
          date: "2026-07-10",
          type: "income",
          analytics_spending_multiplier: 0,
          analytics_counts_toward_income: true,
          recurrence_rule: null,
        }),
      ],
      "2026-07-01",
      "2026-07-23",
    );

    assertEquals(projected.length, 1);
    assertEquals(projected[0].type, "expense");
  },
);

Deno.test("financial snapshot applies daily and biweekly frequencies", () => {
  const projected = projectRecurringSnapshotRows(
    [
      recurringRow({
        id: "daily-expense",
        amount_cents: 100,
        recurrence_rule: {
          frequency: "daily",
          anchor_date: "2026-07-01",
        },
      }),
      recurringRow({
        id: "biweekly-expense",
        amount_cents: 500,
        recurrence_rule: {
          frequency: "biweekly",
          anchor_date: "2026-07-01",
        },
      }),
    ],
    [],
    "2026-07-01",
    "2026-07-31",
  );
  const dailyCount =
    projected.filter((row) => row.id?.startsWith("recurring_daily-expense_"))
      .length;
  const biweeklyCount =
    projected.filter((row) => row.id?.startsWith("recurring_biweekly-expense_"))
      .length;

  assertEquals(dailyCount, 31);
  assertEquals(biweeklyCount, 3);
  assertEquals(buildFinancialSnapshotTotals(projected).totalExpense, 4600);
});
