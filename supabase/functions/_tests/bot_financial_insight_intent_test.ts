/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildFinancialInsightArgs,
  inferFinancialInsightArgs,
  isFinancialInsightChartRequested,
  orderFinancialInsightAfterWrites,
  routeFinancialInsightToolCall,
  shouldUseFinancialInsight,
} from "../shared/bot/financial-insight-intent.ts";

Deno.test(
  "financial insight routing recognizes aggregate financial questions",
  () => {
    assertEquals(
      shouldUseFinancialInsight("How is my financial health?"),
      true,
    );
    assertEquals(
      shouldUseFinancialInsight("How much did I spend this month?"),
      true,
    );
    assertEquals(
      shouldUseFinancialInsight("Show my income vs spending for last month"),
      true,
    );
    assertEquals(shouldUseFinancialInsight("What is my net cashflow?"), true);
    assertEquals(shouldUseFinancialInsight("Am I over budget?"), true);
    assertEquals(shouldUseFinancialInsight("What's my net worth?"), false);
  },
);

Deno.test(
  "financial insight routing leaves transaction lists and writes alone",
  () => {
    assertEquals(
      shouldUseFinancialInsight("List my five latest expenses"),
      false,
    );
    assertEquals(shouldUseFinancialInsight("Add a $12 lunch expense"), false);
    assertEquals(shouldUseFinancialInsight("Are you online?"), false);
    assertEquals(
      shouldUseFinancialInsight("Give me general health tips"),
      false,
    );
  },
);

Deno.test(
  "financial insight routing leaves model tool calls protocol-safe",
  async () => {
    const routed = await routeFinancialInsightToolCall({
      userMessage: "How much did I spend this month?",
      functionCalls: [{ name: "list_expenses", args: { limit: 50 } }],
      chat: forcedInsightChat(),
    });

    assertEquals(routed.routed, false);
    assertEquals(routed.functionCalls, [
      { name: "list_expenses", args: { limit: 50 } },
    ]);
  },
);

Deno.test(
  "financial insight routing forces a real tool call when none exists",
  async () => {
    const routed = await routeFinancialInsightToolCall({
      userMessage: "How much did I spend this month?",
      functionCalls: [],
      chat: forcedInsightChat(),
    });

    assertEquals(routed.routed, true);
    assertEquals(routed.functionCalls, [
      { name: "financial_insight", args: { period: "this_month" } },
    ]);
  },
);

Deno.test("financial insight routing preserves other tool calls", async () => {
  const routed = await routeFinancialInsightToolCall({
    userMessage: "Add lunch and tell me my total spending this month",
    functionCalls: [
      { name: "add_transaction", args: { amount: 12, category: "dining" } },
    ],
    chat: forcedInsightChat(),
  });

  assertEquals(routed.routed, false);
  assertEquals(
    routed.functionCalls.map((call) => call.name),
    ["add_transaction"],
  );
});

function forcedInsightChat() {
  return {
    sendMessage: () =>
      Promise.resolve({
        response: Promise.resolve({
          functionCalls: () => [{ name: "financial_insight", args: {} }],
        }),
      }),
  };
}

Deno.test("financial insight period inference handles common scopes", () => {
  assertEquals(inferFinancialInsightArgs("spending this month"), {
    period: "this_month",
  });
  assertEquals(inferFinancialInsightArgs("income last month"), {
    period: "last_month",
  });
  assertEquals(inferFinancialInsightArgs("cashflow in the last 30 days"), {
    period: "last_30_days",
  });
  assertEquals(inferFinancialInsightArgs("financial health"), {
    period: "current_financial_period",
  });
  assertEquals(
    inferFinancialInsightArgs("check financial health for my primary wallet"),
    {
      wallet_name: "primary wallet",
      period: "current_financial_period",
    },
  );
  assertEquals(
    buildFinancialInsightArgs("spending last month", {
      currency: "USD",
      wallet_name: "Travel",
    }),
    { currency: "USD", wallet_name: "Travel", period: "last_month" },
  );
  assertEquals(inferFinancialInsightArgs("show all-time spending"), {
    period: "all_time",
  });
  assertEquals(isFinancialInsightChartRequested("chart my spending"), true);
  assertEquals(isFinancialInsightChartRequested("show my spending"), false);
});

Deno.test("financial insight reads run after writes in mixed requests", () => {
  const ordered = orderFinancialInsightAfterWrites({
    userMessage: "Add lunch and show total spending this month",
    functionCalls: [
      { name: "list_expenses", args: {} },
      { name: "add_transaction", args: { amount: 12 } },
    ],
  });

  assertEquals(
    ordered.map((call) => call.name),
    ["add_transaction", "list_expenses"],
  );
});
