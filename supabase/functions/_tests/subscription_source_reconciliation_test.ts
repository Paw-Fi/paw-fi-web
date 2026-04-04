/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  findAppStoreEntitlementSourceUser,
  recomputeProjectedSubscription,
} from "../shared/subscription-entitlement-sources.ts";

type FakeState = {
  previousProjection: Record<string, unknown> | null;
  sourceRows: Record<string, unknown>[];
};

class FakeQuery {
  private operation: "select" | "update" | null = null;
  private payload: Record<string, unknown> | null = null;
  private filters = new Map<string, unknown>();
  private orFilters: Array<{ column: string; value: string }> = [];

  constructor(
    private readonly state: FakeState,
    private readonly updates: Array<
      { table: string; payload: Record<string, unknown> }
    >,
    private readonly table: string,
  ) {}

  select(_columns: string): FakeQuery {
    this.operation = "select";
    return this;
  }

  update(payload: Record<string, unknown>): FakeQuery {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown): FakeQuery {
    this.filters.set(column, value);
    return this;
  }

  or(expression: string): FakeQuery {
    this.orFilters = expression
      .split(",")
      .map((part) => part.trim())
      .map((part) => {
        const match = part.match(/^([a-z0-9_]+)\.eq\.(.+)$/i);
        return match ? { column: match[1], value: match[2] } : null;
      })
      .filter((value): value is { column: string; value: string } =>
        value !== null
      );
    return this;
  }

  maybeSingle(): Promise<
    { data: Record<string, unknown> | null; error: null }
  > {
    if (this.table === "subscriptions" && this.operation === "select") {
      return Promise.resolve({
        data: this.state.previousProjection,
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((
        value: { data: Record<string, unknown>[] | null; error: null },
      ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    if (
      this.table === "subscription_entitlement_sources" &&
      this.operation === "select"
    ) {
      const rows = this.state.sourceRows.filter((row) => {
        for (const [column, value] of this.filters.entries()) {
          if (row[column] !== value) return false;
        }

        if (this.orFilters.length === 0) return true;

        return this.orFilters.some(({ column, value }) =>
          String(row[column] ?? "") === value
        );
      });

      return Promise.resolve({
        data: rows,
        error: null,
      }).then(onfulfilled, onrejected);
    }

    if (this.table === "subscriptions" && this.operation === "update") {
      this.updates.push({
        table: this.table,
        payload: this.payload ?? {},
      });
      return Promise.resolve({
        data: null,
        error: null,
      }).then(onfulfilled, onrejected);
    }

    return Promise.resolve({
      data: null,
      error: null,
    }).then(onfulfilled, onrejected);
  }
}

class FakeSupabase {
  readonly updates: Array<{ table: string; payload: Record<string, unknown> }> =
    [];

  constructor(private readonly state: FakeState) {}

  from(table: string): FakeQuery {
    return new FakeQuery(this.state, this.updates, table);
  }
}

Deno.test(
  "subscription reconciliation: clears stale projected access when no entitlement sources remain",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: {
        id: "sub_row_123",
        provider: "app_store",
        plan: "plus",
        status: "trialing",
        billing_interval: "yearly",
        current_period_end: "2027-04-30T00:00:00.000Z",
      },
      sourceRows: [],
    });

    const result = await recomputeProjectedSubscription({
      supabase,
      userId: "user-123",
    });

    assertEquals(result.primary, null);
    assertEquals(result.projected, null);
    assertEquals(supabase.updates.length, 1);
    assertObjectMatch(supabase.updates[0]?.payload ?? {}, {
      provider: null,
      plan: "free",
      status: "active",
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
  },
);

Deno.test(
  "subscription reconciliation: does not write a projection reset when no row exists yet",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      sourceRows: [],
    });

    const result = await recomputeProjectedSubscription({
      supabase,
      userId: "user-456",
    });

    assertEquals(result.primary, null);
    assertEquals(result.projected, null);
    assertEquals(supabase.updates.length, 0);
  },
);

Deno.test(
  "subscription reconciliation: App Store entitlement source lookup prefers canonical originalTransactionId matches",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      sourceRows: [
        {
          user_id: "legacy-user",
          provider: "app_store",
          source_key: "app_store_legacy_transaction:tx_123",
          app_store_original_transaction_id: null,
          app_store_transaction_id: "tx_123",
          source_updated_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-01T00:00:00.000Z",
        },
        {
          user_id: "canonical-user",
          provider: "app_store",
          source_key: "app_store:orig_123",
          app_store_original_transaction_id: "orig_123",
          app_store_transaction_id: "tx_123",
          source_updated_at: "2026-04-02T00:00:00.000Z",
          updated_at: "2026-04-02T00:00:00.000Z",
        },
      ],
    });

    const userId = await findAppStoreEntitlementSourceUser({
      supabase,
      originalTransactionId: "orig_123",
      transactionId: "tx_123",
    });

    assertEquals(userId, "canonical-user");
  },
);

Deno.test(
  "subscription reconciliation: App Store entitlement source lookup falls back to transactionId placeholder when canonical lineage is absent",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      sourceRows: [
        {
          user_id: "legacy-user",
          provider: "app_store",
          source_key: "app_store_legacy_transaction:tx_789",
          app_store_original_transaction_id: null,
          app_store_transaction_id: "tx_789",
          source_updated_at: "2026-04-03T00:00:00.000Z",
          updated_at: "2026-04-03T00:00:00.000Z",
        },
      ],
    });

    const userId = await findAppStoreEntitlementSourceUser({
      supabase,
      originalTransactionId: "orig_missing",
      transactionId: "tx_789",
    });

    assertEquals(userId, "legacy-user");
  },
);
