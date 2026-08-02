/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { executeManageRecurringTool } from "../shared/bot/recurring-tool.ts";
import { buildManageRecurringTool } from "../shared/bot/tool-definitions.ts";

const recurringParams = (supabase: unknown, args: Record<string, unknown>) => ({
  supabase,
  internalFunctionKey: "internal-key",
  userId: "11111111-1111-4111-8111-111111111111",
  userCurrency: "EUR",
  userTimezone: "UTC",
  userMessageContent: "manage my recurring payment",
  args,
  spaceMap: new Map(),
  lastListedTransactions: [],
  logPrefix: "test-bot",
});

Deno.test(
  "manage_recurring exposes reads and occurrence lifecycle actions",
  () => {
    const tool = buildManageRecurringTool({
      includeScheduleFields: true,
    }) as any;
    const properties = tool.parameters.properties;
    assertEquals(properties.action.enum, [
      "add",
      "update",
      "delete",
      "list_series",
      "list_history",
      "confirm_occurrence",
      "update_occurrence",
      "unconfirm_occurrence",
      "skip_occurrence",
    ]);
    for (
      const field of [
        "recurring_id",
        "scheduled_occurrence_date",
        "paid_date",
        "before_scheduled_date",
        "limit",
        "update_future_amount",
        "account_id",
      ]
    ) {
      assert(field in properties, `manage_recurring exposes ${field}`);
    }
  },
);

Deno.test("shared recurring executor lists and remembers series", async () => {
  let invoked: { name: string; options: any } | null = null;
  let remembered: any[] = [];
  const supabase = {
    functions: {
      invoke: (name: string, options: any) => {
        invoked = { name, options };
        return Promise.resolve({
          data: {
            success: true,
            data: {
              items: [
                {
                  id: "22222222-2222-4222-8222-222222222222",
                  amount_cents: 120000,
                  currency: "EUR",
                  date: "2026-08-01",
                  category: "Rent",
                  raw_text: "Apartment rent",
                  type: "expense",
                  household_id: null,
                },
              ],
            },
          },
          error: null,
        });
      },
    },
  };

  const result = await executeManageRecurringTool({
    ...recurringParams(supabase, {
      action: "list_series",
      space_scope: "personal",
      currencies: ["eur", "USD"],
      limit: 25,
    }),
    rememberListedTransactions: (items) => {
      remembered = items;
      return Promise.resolve();
    },
  });

  assertEquals(result.success, true);
  assertEquals((invoked as any).name, "recurring-read");
  assertEquals((invoked as any).options.body, {
    operation: "listSeries",
    userId: "11111111-1111-4111-8111-111111111111",
    currencies: ["EUR", "USD"],
    limit: 25,
  });
  assert((invoked as any).options.headers);
  assertEquals(
    remembered.map((item) => item.id),
    ["22222222-2222-4222-8222-222222222222"],
  );
});

Deno.test(
  "shared recurring executor invokes payment lifecycle functions",
  async () => {
    const invokes: Array<{ name: string; body: Record<string, unknown> }> = [];
    const supabase = {
      functions: {
        invoke: (name: string, options: any) => {
          invokes.push({ name, body: options.body });
          return Promise.resolve({
            data: {
              success: true,
              data: name === "recurring-read"
                ? {
                  id: "22222222-2222-4222-8222-222222222222",
                  household_id: null,
                  account_id: "33333333-3333-4333-8333-333333333333",
                  amount_cents: 120000,
                  currency: "EUR",
                  recurrence_rule: { frequency: "monthly" },
                }
                : {},
            },
            error: null,
          });
        },
      },
    };
    const recurringId = "22222222-2222-4222-8222-222222222222";
    const scheduled = "2026-08-01";
    const calls = [
      {
        action: "list_history",
        recurring_id: recurringId,
        before_scheduled_date: scheduled,
      },
      {
        action: "confirm_occurrence",
        recurring_id: recurringId,
        scheduled_occurrence_date: scheduled,
        paid_date: "2026-07-31",
        amount: 1200,
      },
      {
        action: "update_occurrence",
        recurring_id: recurringId,
        scheduled_occurrence_date: scheduled,
        description: "Corrected note",
      },
      {
        action: "unconfirm_occurrence",
        recurring_id: recurringId,
        scheduled_occurrence_date: scheduled,
      },
      {
        action: "skip_occurrence",
        recurring_id: recurringId,
        scheduled_occurrence_date: scheduled,
      },
      { action: "delete", recurring_id: recurringId },
    ];
    for (const args of calls) {
      await executeManageRecurringTool(recurringParams(supabase, args));
    }

    assertEquals(
      invokes
        .map((entry) => entry.name)
        .filter((name) => name !== "recurring-read"),
      [
        "list-recurring-occurrences",
        "confirm-recurring-occurrence",
        "update-recurring-occurrence",
        "unconfirm-recurring-occurrence",
        "skip-recurring-occurrence",
        "delete-recurring-template",
      ],
    );
    const confirmation = invokes.find(
      (entry) => entry.name === "confirm-recurring-occurrence",
    );
    assertEquals(confirmation?.body, {
      userId: "11111111-1111-4111-8111-111111111111",
      recurringId,
      scheduledOccurrenceDate: scheduled,
      paidDate: "2026-07-31",
      amount: 1200,
      accountId: "33333333-3333-4333-8333-333333333333",
    });
  },
);

Deno.test(
  "recurring selection failures stay internal for the model",
  async () => {
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
  },
);

Deno.test(
  "recurring backend failures are marked after detailed reporting",
  async () => {
    const failures: any[] = [];
    const result = await executeManageRecurringTool({
      ...recurringParams(
        {
          functions: {
            invoke: () =>
              Promise.resolve({
                data: null,
                error: new Error("Edge Function returned 404"),
              }),
          },
        },
        {
          action: "delete",
          recurring_id: "22222222-2222-4222-8222-222222222222",
        },
      ),
      reportFailure: (failure) => {
        failures.push(failure);
        return Promise.resolve(true);
      },
    });

    assertEquals(result._backend_failure_reported, true);
    assertEquals(result.action, "delete");
    assertEquals(failures.length, 1);
    assertEquals(failures[0].targetFunction, "delete-recurring-template");
  },
);

Deno.test(
  "shared recurring executor keeps Telegram and WhatsApp update payloads identical",
  async () => {
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
        invoke: (name: string, options: { body: Record<string, unknown> }) => {
          if (name === "recurring-read") {
            return Promise.resolve({
              data: {
                success: true,
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
              },
              error: null,
            });
          }
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
  },
);
