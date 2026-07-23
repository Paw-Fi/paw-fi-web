/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { executeBotFinancialInsight } from "../shared/bot/financial-insight-tool.ts";

class FakeQuery implements PromiseLike<unknown> {
  static calls: Array<[string, string, string, unknown]> = [];
  private filters: Array<[string, string, unknown]> = [];

  constructor(private readonly table: string) {}

  select(_columns: string) {
    return this;
  }

  gte(column: string, value: unknown) {
    this.record("gte", column, value);
    return this;
  }

  lte(column: string, value: unknown) {
    this.record("lte", column, value);
    return this;
  }

  eq(column: string, value: unknown) {
    this.record("eq", column, value);
    return this;
  }

  is(column: string, value: unknown) {
    this.record("is", column, value);
    return this;
  }

  or(value: string) {
    this.record("or", "", value);
    return this;
  }

  in(column: string, value: unknown) {
    this.record("in", column, value);
    return this;
  }

  limit(_count: number) {
    return this;
  }

  maybeSingle() {
    return Promise.resolve({
      data: this.table === "household_members" ? { user_id: "user-1" } : null,
      error: null,
    });
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const isRecurring = this.filters.some(
      ([method, column, value]) =>
        method === "eq" && column === "is_recurring" && value === true,
    );
    const data = this.table === "expenses" && isRecurring
      ? [
        {
          id: "rent",
          date: "2026-01-10",
          amount_cents: 50000,
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
        },
      ]
      : [];
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
  }

  private record(method: string, column: string, value: unknown) {
    this.filters.push([method, column, value]);
    FakeQuery.calls.push([this.table, method, column, value]);
  }
}

Deno.test(
  "shared financial insight executor projects recurring rows",
  async () => {
    FakeQuery.calls = [];
    const result = await executeBotFinancialInsight({
      supabase: { from: (table: string) => new FakeQuery(table) },
      userId: "user-1",
      contactId: "contact-1",
      currency: "SGD",
      timezone: "UTC",
      args: {
        start_date: "2026-07-01",
        end_date: "2026-07-31",
        include_chart: true,
      },
      spaceMap: new Map(),
      logPrefix: "test",
    });
    const snapshot = result.snapshot as Record<string, unknown>;

    assertEquals(result.success, true);
    assertEquals(snapshot.totalExpense, 50000);
    assertEquals(snapshot.projected_recurring_count, 1);
    assertEquals(snapshot.includes_projected_recurring, true);
    assertEquals(result.chart_url, undefined);
  },
);

Deno.test(
  "shared financial insight honors currency and shared-space scope",
  async () => {
    FakeQuery.calls = [];
    const result = await executeBotFinancialInsight({
      supabase: { from: (table: string) => new FakeQuery(table) },
      userId: "user-1",
      contactId: "contact-1",
      currency: "SGD",
      timezone: "UTC",
      args: {
        start_date: "2026-07-01",
        end_date: "2026-07-31",
        currency: "USD",
        space_scope: "shared_space",
      },
      spaceMap: new Map([
        [
          "household-1",
          { id: "household-1", name: "Family", isPortfolio: false },
        ],
      ]),
      logPrefix: "test",
    });

    assertEquals(result.success, true);
    assertEquals(
      FakeQuery.calls.some(
        ([table, method, column, value]) =>
          table === "expenses" &&
          method === "eq" &&
          column === "currency" &&
          value === "USD",
      ),
      true,
    );
    assertEquals(
      FakeQuery.calls.some(
        ([table, method, column, value]) =>
          table === "expenses" &&
          method === "eq" &&
          column === "household_id" &&
          value === "household-1",
      ),
      true,
    );
  },
);
