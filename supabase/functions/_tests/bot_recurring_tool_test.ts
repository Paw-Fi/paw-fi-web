/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { executeManageRecurringTool } from "../shared/bot/recurring-tool.ts";

Deno.test("recurring selection failures stay internal for the model", async () => {
  const result = await executeManageRecurringTool({
    supabase: {},
    internalFunctionKey: "internal-key",
    userId: "user-1",
    userCurrency: "EUR",
    userTimezone: "UTC",
    userMessageContent: "update the first one",
    args: { action: "update", selection_index: 1 },
    spaceMap: new Map(),
    lastListedTransactions: [],
    logPrefix: "test-bot",
  });

  assertEquals(result, {
    status: "context_refresh_required",
    user_response_required: false,
    next_tool: "financial_insight",
    next_tool_purpose: "reload_projected_recurring_transactions",
    retry_tool: "manage_recurring",
    preserve_original_tool_args: true,
  });
  assertEquals("error" in result, false);
});

Deno.test("shared recurring executor keeps Telegram and WhatsApp update payloads identical", async () => {
  let invokedBody: Record<string, unknown> | null = null;

  class ExpenseQuery {
    private columns = "";

    select(columns: string) {
      this.columns = columns;
      return this;
    }

    eq(_column: string, _value: unknown) {
      return this;
    }

    is(_column: string, _value: unknown) {
      return this;
    }

    maybeSingle() {
      if (this.columns.includes("recurrence_rule")) {
        return Promise.resolve({
          data: {
            id: "expense-1",
            amount_cents: 50000,
            currency: "EUR",
            date: "2026-07-01",
            household_id: null,
            account_id: "wallet-1",
            split_group_id: null,
            recurrence_rule: {
              frequency: "monthly",
              anchor_date: "2026-07-01",
              projection_enabled: false,
              reminder: { enabled: true, value: 1, unit: "days" },
            },
          },
          error: null,
        });
      }
      return Promise.resolve({
        data: {
          id: "expense-1",
          amount_cents: 50000,
          currency: "EUR",
          date: "2026-07-01",
          category: "food",
          raw_text: "Food",
          merchant: null,
          type: "expense",
          household_id: null,
        },
        error: null,
      });
    }
  }

  const supabase = {
    from: (_table: string) => new ExpenseQuery(),
    functions: {
      invoke: (_name: string, options: { body: Record<string, unknown> }) => {
        invokedBody = options.body;
        return Promise.resolve({
          data: { success: true, data: { id: "expense-1" } },
          error: null,
        });
      },
    },
  };

  const result = await executeManageRecurringTool({
    supabase,
    internalFunctionKey: "internal-key",
    userId: "user-1",
    userCurrency: "EUR",
    userTimezone: "Asia/Shanghai",
    userMessageContent: "update the first one",
    args: {
      action: "update",
      expense_id: "expense-1",
      amount: 1000,
      frequency: "monthly",
      anchor_date: "2026-07-07",
      space_scope: "personal",
    },
    spaceMap: new Map(),
    lastListedTransactions: [],
    logPrefix: "test-bot",
  });

  assertEquals(result.success, true);
  assertEquals(invokedBody, {
    userId: "user-1",
    expenseId: "expense-1",
    clientTimezone: "Asia/Shanghai",
    updates: {
      amount_cents: 100000,
      date: "2026-07-07",
      household_id: null,
      is_recurring: true,
      recurrence_rule: {
        frequency: "monthly",
        anchor_date: "2026-07-07",
        projection_enabled: false,
        reminder: { enabled: true, value: 1, unit: "days" },
      },
    },
  });
});
