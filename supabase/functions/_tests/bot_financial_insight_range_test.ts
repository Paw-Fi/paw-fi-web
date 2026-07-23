/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { resolveFinancialInsightDateRange } from "../shared/bot/financial-insight-tool.ts";

const resolveFinancialPeriod = (_date: string) =>
  Promise.resolve({
    monthStartStr: "2026-07-05",
    nextMonthStr: "2026-08-05",
  });

Deno.test(
  "financial insight this_month covers the full calendar month",
  async () => {
    assertEquals(
      await resolveFinancialInsightDateRange({
        args: { period: "this_month" },
        today: "2026-07-23",
        resolveFinancialPeriod,
      }),
      {
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        period: "this_month",
        includesFutureRecurring: true,
      },
    );
  },
);

Deno.test(
  "financial insight resolves complete previous calendar month",
  async () => {
    assertEquals(
      await resolveFinancialInsightDateRange({
        args: { period: "last_month" },
        today: "2026-07-23",
        resolveFinancialPeriod,
      }),
      {
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        period: "last_month",
        includesFutureRecurring: false,
      },
    );
  },
);

Deno.test(
  "financial insight defaults to the complete financial period",
  async () => {
    assertEquals(
      await resolveFinancialInsightDateRange({
        args: {},
        today: "2026-07-23",
        resolveFinancialPeriod,
      }),
      {
        startDate: "2026-07-05",
        endDate: "2026-08-04",
        period: "current_financial_period",
        includesFutureRecurring: true,
      },
    );
  },
);

Deno.test("financial insight honors validated explicit ranges", async () => {
  assertEquals(
    await resolveFinancialInsightDateRange({
      args: { start_date: "2026-02-10", end_date: "2026-02-20" },
      today: "2026-07-23",
      resolveFinancialPeriod,
    }),
    {
      startDate: "2026-02-10",
      endDate: "2026-02-20",
      period: "custom",
      includesFutureRecurring: false,
    },
  );
});

Deno.test("financial insight rejects reversed explicit ranges", async () => {
  assertEquals(
    await resolveFinancialInsightDateRange({
      args: { start_date: "2026-03-10", end_date: "2026-02-20" },
      today: "2026-07-23",
      resolveFinancialPeriod,
    }),
    { error: "end_date must be on or after start_date" },
  );
});

Deno.test("financial insight resolves Monday-based week scopes", async () => {
  assertEquals(
    await resolveFinancialInsightDateRange({
      args: { period: "last_week" },
      today: "2026-07-23",
      resolveFinancialPeriod,
    }),
    {
      startDate: "2026-07-13",
      endDate: "2026-07-19",
      period: "last_week",
      includesFutureRecurring: false,
    },
  );
});
