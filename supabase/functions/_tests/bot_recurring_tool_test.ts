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
      "analyze_history",
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
        "analytics_type",
        "include_chart",
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
          if (name === "recurring-read") {
            return Promise.resolve({
              data: {
                success: true,
                data: {
                  id: "22222222-2222-4222-8222-222222222222",
                  household_id: null,
                  account_id: "33333333-3333-4333-8333-333333333333",
                  amount_cents: 120000,
                  currency: "EUR",
                  recurrence_rule: { frequency: "monthly" },
                },
              },
              error: null,
            });
          }
          if (name === "list-recurring-occurrences") {
            // Return pending occurrences for confirm_occurrence to succeed
            return Promise.resolve({
              data: {
                success: true,
                data: {
                  items: [
                    {
                      id: "pending:22222222:2026-08-01",
                      recurring_id: "22222222-2222-4222-8222-222222222222",
                      scheduled_occurrence_date: "2026-08-01",
                      status: "pending",
                      amount_cents: 120000,
                      currency: "EUR",
                    },
                  ],
                },
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: { success: true, data: {} },
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

Deno.test(
  "confirm_occurrence falls back to active recurring context when recurring_id missing",
  async () => {
    const invokes: Array<{ name: string; body: Record<string, unknown> }> = [];
    let savedActiveRecurring: any = null;

    const supabase = {
      functions: {
        invoke: (name: string, options: any) => {
          invokes.push({ name, body: options.body });
          if (name === "recurring-read") {
            return Promise.resolve({
              data: {
                success: true,
                data: {
                  id: "33333333-3333-4333-8333-333333333333",
                  household_id: null,
                  account_id: null,
                  amount_cents: 5000,
                  currency: "EUR",
                  category: "subscriptions",
                  raw_text: "test subscription",
                  recurrence_rule: { frequency: "monthly" },
                },
              },
              error: null,
            });
          }
          if (name === "list-recurring-occurrences") {
            return Promise.resolve({
              data: {
                success: true,
                data: {
                  items: [
                    {
                      id: "pending:33333333:2026-07-30",
                      recurring_id: "33333333-3333-4333-8333-333333333333",
                      scheduled_occurrence_date: "2026-07-30",
                      status: "pending",
                      amount_cents: 5000,
                      currency: "EUR",
                    },
                  ],
                },
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: { success: true, data: {} },
            error: null,
          });
        },
      },
    };

    // Simulate having an active recurring context in session state
    const sessionState = {
      moneko_state: {
        active_recurring: {
          recurring_id: "33333333-3333-4333-8333-333333333333",
          description: "test subscription",
          category: "subscriptions",
          amount: 50,
          currency: "EUR",
          saved_at: new Date().toISOString(),
        },
      },
    };

    // Call without recurring_id - should fall back to active context
    const result = await executeManageRecurringTool({
      supabase,
      internalFunctionKey: "internal-key",
      userId: "user-1",
      userCurrency: "EUR",
      userTimezone: "UTC",
      userMessageContent: "confirm them all",
      args: {
        action: "confirm_occurrence",
        scheduled_occurrence_date: "2026-07-30",
        paid_date: "2026-07-30",
        amount: 50,
      },
      spaceMap: new Map(),
      lastListedTransactions: [],
      sessionState,
      logPrefix: "test-bot",
      setActiveRecurring: async (context) => {
        savedActiveRecurring = context;
      },
    });

    assertEquals(result.success, true);
    // Verify it used the recurring_id from the active context
    const confirmInvoke = invokes.find(
      (i) => i.name === "confirm-recurring-occurrence",
    );
    assertEquals(
      confirmInvoke?.body?.recurringId,
      "33333333-3333-4333-8333-333333333333",
    );
  },
);


Deno.test(
  "list_series auto-sets active recurring context when single recurring has pending occurrences",
  async () => {
    let savedActiveRecurring: any = null;
    let remembered: any[] = [];

    const supabase = {
      functions: {
        invoke: (name: string, options: any) => {
          if (name === "recurring-read") {
            return Promise.resolve({
              data: {
                success: true,
                data: {
                  items: [
                    {
                      id: "11111111-1111-4111-8111-111111111111",
                      amount_cents: 10000,
                      currency: "EUR",
                      date: "2026-07-01",
                      category: "subscriptions",
                      raw_text: "Netflix",
                      type: "expense",
                      household_id: null,
                      actionable_count: 0, // No pending
                      next_occurrence_date: "2026-08-01",
                    },
                    {
                      id: "22222222-2222-4222-8222-222222222222",
                      amount_cents: 50000,
                      currency: "EUR",
                      date: "2026-06-15",
                      category: "utilities",
                      raw_text: "Test subscription with pending",
                      merchant: "Test Co",
                      type: "expense",
                      household_id: null,
                      actionable_count: 3, // Has 3 pending occurrences
                      next_occurrence_date: "2026-07-15",
                    },
                    {
                      id: "33333333-3333-4333-8333-333333333333",
                      amount_cents: 80000,
                      currency: "EUR",
                      date: "2026-07-05",
                      category: "rent",
                      raw_text: "Apartment rent",
                      type: "expense",
                      household_id: null,
                      actionable_count: 0, // No pending
                      next_occurrence_date: "2026-08-05",
                    },
                  ],
                },
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: { success: true, data: {} },
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
      userTimezone: "UTC",
      userMessageContent: "show my recurring",
      args: {
        action: "list_series",
        space_scope: "personal",
      },
      spaceMap: new Map(),
      lastListedTransactions: [],
      logPrefix: "test-bot",
      rememberListedTransactions: async (items) => {
        remembered = items;
      },
      setActiveRecurring: async (context) => {
        savedActiveRecurring = context;
      },
    });

    assertEquals(result.success, true);
    // Should remember all 3 items
    assertEquals(remembered.length, 3);

    // Should auto-set active context to the one with pending occurrences
    assertEquals(savedActiveRecurring !== null, true);
    assertEquals(
      savedActiveRecurring?.recurring_id,
      "22222222-2222-4222-8222-222222222222",
    );
    assertEquals(
      savedActiveRecurring?.description,
      "Test subscription with pending",
    );
    assertEquals(savedActiveRecurring?.amount, 500);
    assertEquals(savedActiveRecurring?.currency, "EUR");
  },
);

Deno.test(
  "list_series does NOT auto-set active context when multiple recurring have pending",
  async () => {
    let savedActiveRecurring: any = null;

    const supabase = {
      functions: {
        invoke: (name: string, options: any) => {
          if (name === "recurring-read") {
            return Promise.resolve({
              data: {
                success: true,
                data: {
                  items: [
                    {
                      id: "11111111-1111-4111-8111-111111111111",
                      amount_cents: 10000,
                      currency: "EUR",
                      date: "2026-07-01",
                      category: "subscriptions",
                      raw_text: "Netflix",
                      type: "expense",
                      household_id: null,
                      actionable_count: 2, // Has pending
                      next_occurrence_date: "2026-08-01",
                    },
                    {
                      id: "22222222-2222-4222-8222-222222222222",
                      amount_cents: 50000,
                      currency: "EUR",
                      date: "2026-06-15",
                      category: "utilities",
                      raw_text: "Electricity",
                      type: "expense",
                      household_id: null,
                      actionable_count: 3, // Also has pending
                      next_occurrence_date: "2026-07-15",
                    },
                  ],
                },
              },
              error: null,
            });
          }
          return Promise.resolve({
            data: { success: true, data: {} },
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
      userTimezone: "UTC",
      userMessageContent: "show my recurring",
      args: {
        action: "list_series",
        space_scope: "personal",
      },
      spaceMap: new Map(),
      lastListedTransactions: [],
      logPrefix: "test-bot",
      rememberListedTransactions: async () => {},
      setActiveRecurring: async (context) => {
        savedActiveRecurring = context;
      },
    });

    assertEquals(result.success, true);
    // Should NOT auto-set because multiple have pending
    assertEquals(savedActiveRecurring, null);
  },
);