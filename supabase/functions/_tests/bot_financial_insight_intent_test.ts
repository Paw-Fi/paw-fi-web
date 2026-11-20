/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildFinancialInsightArgs,
  isFinancialInsightChartRequested,
  orderFinancialInsightAfterWrites,
  shouldRouteListExpensesToFinancialInsight,
} from "../shared/bot/financial-insight-intent.ts";

// Routing depends only on fields the model fills in. The user's wording, and
// therefore the user's language, never enters these functions.
Deno.test("aggregate routing follows the model-declared result kind", () => {
  assertEquals(
    shouldRouteListExpensesToFinancialInsight({ result_kind: "totals" }),
    true,
  );
  assertEquals(
    shouldRouteListExpensesToFinancialInsight({ result_kind: "rows" }),
    false,
  );
  assertEquals(shouldRouteListExpensesToFinancialInsight({ limit: 5 }), false);
  assertEquals(shouldRouteListExpensesToFinancialInsight(null), false);
});

Deno.test("aggregate arguments are forwarded, never inferred from text", () => {
  assertEquals(
    buildFinancialInsightArgs({
      result_kind: "totals",
      limit: 50,
      period: "last_month",
      currency: "USD",
      wallet_name: "Travel",
      start_date: "2026-11-01",
      end_date: "2026-11-30",
    }),
    {
      period: "last_month",
      start_date: "2026-11-01",
      end_date: "2026-11-30",
      currency: "USD",
      wallet_name: "Travel",
    },
  );
  assertEquals(buildFinancialInsightArgs({ result_kind: "totals" }), {});
  assertEquals(buildFinancialInsightArgs(null), {});
});

Deno.test("a chart is attached only when the model asks for one", () => {
  assertEquals(isFinancialInsightChartRequested({ include_chart: true }), true);
  assertEquals(
    isFinancialInsightChartRequested({ include_chart: false }),
    false,
  );
  assertEquals(isFinancialInsightChartRequested({}), false);
  assertEquals(isFinancialInsightChartRequested(undefined), false);
});

Deno.test("aggregates run after writes requested in the same batch", () => {
  assertEquals(
    orderFinancialInsightAfterWrites([
      { name: "financial_insight", args: { period: "this_month" } },
      { name: "add_transaction", args: { amount: 12 } },
    ]).map((call) => call.name),
    ["add_transaction", "financial_insight"],
  );
  assertEquals(
    orderFinancialInsightAfterWrites([
      { name: "list_expenses", args: { result_kind: "totals" } },
      { name: "add_transaction", args: { amount: 12 } },
    ]).map((call) => call.name),
    ["add_transaction", "list_expenses"],
  );
});

Deno.test("row listings keep the model's order next to writes", () => {
  // A later call in the batch may select from the rows this listing returns.
  assertEquals(
    orderFinancialInsightAfterWrites([
      { name: "list_expenses", args: { result_kind: "rows" } },
      { name: "delete_transaction", args: { selection_index: 2 } },
    ]).map((call) => call.name),
    ["list_expenses", "delete_transaction"],
  );
  assertEquals(orderFinancialInsightAfterWrites(null), []);
});

Deno.test("no bot intent module matches words in the user's message", async () => {
  const source = await Deno.readTextFile(
    new URL("../shared/bot/financial-insight-intent.ts", import.meta.url),
  );
  assertEquals(source.includes("userMessage"), false);
  assertEquals(/\.test\(|\.match\(|new RegExp/.test(source), false);
});
