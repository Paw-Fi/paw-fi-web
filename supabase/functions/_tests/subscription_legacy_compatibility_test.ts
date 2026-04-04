/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildAppStoreSourceKey,
  buildLegacyAppStoreTransactionSourceKey,
  buildLegacyAppStoreUserSourceKey,
  recomputeProjectedSubscription,
  syncStripeEntitlementSourcesForUser,
  upsertAppStoreEntitlementSourceWithPromotion,
} from "../shared/subscription-entitlement-sources.ts";
import {
  sourceGrantsAccess,
  type SubscriptionProjectionSource,
} from "../shared/subscription-projection.ts";

type FakeState = {
  previousProjection: Record<string, unknown> | null;
  sourceRows: Record<string, unknown>[];
  stripeMapping: { stripe_customer_id: string | null } | null;
};

type UpdateRecord = {
  table: string;
  payload: Record<string, unknown>;
};

class FakeQuery {
  private operation: "select" | "update" | "upsert" | "delete" | null = null;
  private payload: Record<string, unknown> | null = null;
  private filters = new Map<string, unknown>();

  constructor(
    private readonly state: FakeState,
    private readonly updates: UpdateRecord[],
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

  upsert(
    payload: Record<string, unknown>,
  ): Promise<{ data: null; error: null }> {
    this.operation = "upsert";
    this.payload = payload;

    if (this.table === "subscription_entitlement_sources") {
      const row = payload;
      const index = this.state.sourceRows.findIndex((candidate) =>
        candidate.provider === row.provider &&
        candidate.source_key === row.source_key
      );

      if (index >= 0) {
        this.state.sourceRows[index] = {
          ...this.state.sourceRows[index],
          ...row,
        };
      } else {
        this.state.sourceRows.push({ ...row });
      }
    } else if (this.table === "subscriptions") {
      this.updates.push({
        table: this.table,
        payload: payload,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }

  delete(): FakeQuery {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown): FakeQuery {
    this.filters.set(column, value);
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

    if (this.table === "user_stripe_mapping" && this.operation === "select") {
      return Promise.resolve({
        data: this.state.stripeMapping,
        error: null,
      });
    }

    if (
      this.table === "subscription_entitlement_sources" &&
      this.operation === "select"
    ) {
      const rows = this.filterSourceRows();
      return Promise.resolve({
        data: rows[0] ?? null,
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
      return Promise.resolve({
        data: this.filterSourceRows(),
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

    if (
      this.table === "subscription_entitlement_sources" &&
      this.operation === "delete"
    ) {
      this.state.sourceRows = this.state.sourceRows.filter((row) => {
        for (const [column, value] of this.filters.entries()) {
          if (row[column] !== value) return true;
        }

        return false;
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

  private filterSourceRows(): Record<string, unknown>[] {
    return this.state.sourceRows.filter((row) => {
      for (const [column, value] of this.filters.entries()) {
        if (row[column] !== value) return false;
      }
      return true;
    });
  }
}

class FakeSupabase {
  readonly updates: UpdateRecord[] = [];

  constructor(readonly state: FakeState) {}

  from(table: string): FakeQuery {
    return new FakeQuery(this.state, this.updates, table);
  }
}

function createAppStoreSource(
  overrides: Partial<SubscriptionProjectionSource>,
): SubscriptionProjectionSource {
  return {
    provider: "app_store",
    sourceKey: buildLegacyAppStoreTransactionSourceKey("tx_default"),
    userId: "user-123",
    plan: "plus",
    status: "active",
    billingInterval: "yearly",
    currentPeriodEnd: "2027-04-30T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    trialStart: null,
    trialEnd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    storeProductId: "yearly",
    appStoreTransactionId: "tx_default",
    appStoreOriginalTransactionId: null,
    appStoreEnvironment: "Production",
    playPurchaseToken: null,
    playOrderId: null,
    playPackageName: null,
    currentPriceId: null,
    originalPriceId: null,
    previousPlan: null,
    previousInterval: null,
    lastEventId: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createStripeSubscription(
  overrides: Partial<{
    id: string;
    status: string;
    customer: string;
    current_period_end: number;
    cancel_at_period_end: boolean;
    created: number;
    priceId: string | null;
    interval: "year" | "month";
    metadata: Record<string, string>;
  }>,
) {
  const priceId = overrides.priceId === undefined ? null : overrides.priceId;
  const interval = overrides.interval ?? "year";

  return {
    id: "sub_default",
    status: "active",
    customer: "cus_123",
    current_period_end: Math.floor(
      Date.parse("2027-03-31T17:37:05.000Z") / 1000,
    ),
    cancel_at_period_end: false,
    created: Math.floor(Date.parse("2026-03-31T14:59:48.000Z") / 1000),
    items: {
      data: [
        {
          price: priceId
            ? {
              id: priceId,
              recurring: {
                interval,
              },
            }
            : {
              id: null,
              recurring: {
                interval,
              },
            },
        },
      ],
    },
    metadata: {
      plan: "plus",
      billing_interval: "yearly",
    },
    ...overrides,
  };
}

Deno.test(
  "legacy App Store recovery: transaction-key row is promoted to canonical original transaction key",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      stripeMapping: null,
      sourceRows: [
        {
          user_id: "user-123",
          provider: "app_store",
          source_key: buildLegacyAppStoreTransactionSourceKey("tx_123"),
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-04-30T00:00:00.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          store_product_id: "yearly",
          app_store_transaction_id: "tx_123",
          app_store_original_transaction_id: null,
          app_store_environment: "Production",
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: null,
          source_created_at: "2026-03-01T00:00:00.000Z",
          source_updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
    });

    await upsertAppStoreEntitlementSourceWithPromotion({
      supabase,
      source: createAppStoreSource({
        sourceKey: buildAppStoreSourceKey("orig_123"),
        appStoreTransactionId: "tx_123",
        appStoreOriginalTransactionId: "orig_123",
      }),
      transactionId: "tx_123",
      originalTransactionId: "orig_123",
    });

    assertEquals(supabase.state.sourceRows.length, 1);
    assertEquals(
      supabase.state.sourceRows[0]?.source_key,
      buildAppStoreSourceKey("orig_123"),
    );
    assertEquals(
      supabase.state.sourceRows[0]?.app_store_original_transaction_id,
      "orig_123",
    );
  },
);

Deno.test(
  "legacy App Store recovery: unresolved user-key row is promoted when trusted user mapping is available",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      stripeMapping: null,
      sourceRows: [
        {
          user_id: "user-123",
          provider: "app_store",
          source_key: buildLegacyAppStoreUserSourceKey("user-123"),
          plan: "plus",
          status: "trialing",
          billing_interval: "yearly",
          current_period_end: "2027-04-30T00:00:00.000Z",
          cancel_at_period_end: false,
          trial_start: "2026-04-01T00:00:00.000Z",
          trial_end: "2026-05-01T00:00:00.000Z",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          store_product_id: "yearly",
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: "Production",
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: null,
          source_created_at: "2026-04-01T00:00:00.000Z",
          source_updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
    });

    await upsertAppStoreEntitlementSourceWithPromotion({
      supabase,
      source: createAppStoreSource({
        sourceKey: buildLegacyAppStoreTransactionSourceKey("tx_456"),
        appStoreTransactionId: "tx_456",
      }),
      transactionId: "tx_456",
      originalTransactionId: null,
    });

    assertEquals(supabase.state.sourceRows.length, 1);
    assertEquals(
      supabase.state.sourceRows[0]?.source_key,
      buildLegacyAppStoreTransactionSourceKey("tx_456"),
    );
    assertEquals(
      supabase.state.sourceRows[0]?.app_store_transaction_id,
      "tx_456",
    );
  },
);

Deno.test(
  "legacy App Store recovery: unresolved user-key row keeps access during recompute",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: {
        id: "sub_existing",
        provider: "app_store",
        plan: "plus",
        status: "trialing",
        billing_interval: "yearly",
        current_period_end: "2027-04-30T00:00:00.000Z",
      },
      stripeMapping: null,
      sourceRows: [
        {
          user_id: "user-123",
          provider: "app_store",
          source_key: buildLegacyAppStoreUserSourceKey("user-123"),
          plan: "plus",
          status: "trialing",
          billing_interval: "yearly",
          current_period_end: "2027-04-30T00:00:00.000Z",
          cancel_at_period_end: false,
          trial_start: "2026-04-01T00:00:00.000Z",
          trial_end: "2026-05-01T00:00:00.000Z",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          store_product_id: "yearly",
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: "Production",
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: null,
          source_created_at: "2026-04-01T00:00:00.000Z",
          source_updated_at: "2026-04-02T00:00:00.000Z",
        },
      ],
    });

    const result = await recomputeProjectedSubscription({
      supabase,
      userId: "user-123",
    });

    assertExists(result.primary);
    assertEquals(
      result.primary?.sourceKey,
      buildLegacyAppStoreUserSourceKey("user-123"),
    );
    assertEquals(supabase.updates.length, 1);
    assertEquals(supabase.updates[0]?.table, "subscriptions");
    assertEquals(supabase.updates[0]?.payload.plan, "plus");
  },
);

Deno.test(
  "legacy Stripe recovery: legacy row with stored subscription id collapses into one canonical source after sync",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      stripeMapping: { stripe_customer_id: "cus_123" },
      sourceRows: [
        {
          user_id: "user-123",
          provider: "stripe",
          source_key: "stripe:legacy:user-123",
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-03-31T17:37:05.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_123",
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: "price_1SxpFgHaakOh5GyT9NjBfmBS",
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: "evt_legacy",
          source_created_at: "2026-03-31T14:59:48.000Z",
          source_updated_at: "2026-03-31T15:00:00.000Z",
        },
      ],
    });

    await syncStripeEntitlementSourcesForUser({
      supabase,
      stripe: {
        subscriptions: {
          list: () =>
            Promise.resolve({
              data: [createStripeSubscription({ id: "sub_123" })],
            }),
        },
      },
      userId: "user-123",
    });

    const stripeRows = supabase.state.sourceRows.filter((row) =>
      row.provider === "stripe"
    );
    assertEquals(stripeRows.length, 1);
    assertEquals(stripeRows[0]?.source_key, "stripe_subscription:sub_123");
  },
);

Deno.test(
  "legacy Stripe recovery: customer-mapped legacy recurring row adopts the only active Stripe subscription",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      stripeMapping: { stripe_customer_id: "cus_123" },
      sourceRows: [
        {
          user_id: "user-123",
          provider: "stripe",
          source_key: "stripe:legacy:user-123",
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-03-31T17:37:05.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: null,
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: "evt_legacy",
          source_created_at: "2026-03-31T14:59:48.000Z",
          source_updated_at: "2026-03-31T15:00:00.000Z",
        },
      ],
    });

    await syncStripeEntitlementSourcesForUser({
      supabase,
      stripe: {
        subscriptions: {
          list: () =>
            Promise.resolve({
              data: [createStripeSubscription({ id: "sub_adopted" })],
            }),
        },
      },
      userId: "user-123",
    });

    const stripeRows = supabase.state.sourceRows.filter((row) =>
      row.provider === "stripe"
    );
    assertEquals(stripeRows.length, 1);
    assertEquals(stripeRows[0]?.source_key, "stripe_subscription:sub_adopted");
  },
);

Deno.test(
  "legacy Stripe recovery: ambiguous multiple fetched subscriptions preserve the unmatched legacy row",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: null,
      stripeMapping: { stripe_customer_id: "cus_123" },
      sourceRows: [
        {
          user_id: "user-123",
          provider: "stripe",
          source_key: "stripe:legacy:user-123",
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-03-31T17:37:05.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: null,
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: "evt_legacy",
          source_created_at: "2026-03-31T14:59:48.000Z",
          source_updated_at: "2026-03-31T15:00:00.000Z",
        },
      ],
    });

    await syncStripeEntitlementSourcesForUser({
      supabase,
      stripe: {
        subscriptions: {
          list: () =>
            Promise.resolve({
              data: [
                createStripeSubscription({ id: "sub_a" }),
                createStripeSubscription({
                  id: "sub_b",
                  current_period_end: Math.floor(
                    Date.parse("2027-03-31T17:40:05.000Z") / 1000,
                  ),
                }),
              ],
            }),
        },
      },
      userId: "user-123",
    });

    const stripeRows = supabase.state.sourceRows.filter((row) =>
      row.provider === "stripe"
    );
    assertEquals(
      stripeRows.some((row) => row.source_key === "stripe:legacy:user-123"),
      true,
    );
    assertEquals(
      stripeRows.some((row) => row.source_key === "stripe_subscription:sub_a"),
      true,
    );
    assertEquals(
      stripeRows.some((row) => row.source_key === "stripe_subscription:sub_b"),
      true,
    );
  },
);

Deno.test(
  "migrated legacy users: Stripe renewal keeps access and collapses to canonical recurring source",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: {
        id: "sub_existing",
        provider: "stripe",
        plan: "plus",
        status: "active",
        billing_interval: "yearly",
        current_period_end: "2027-03-31T17:37:05.000Z",
        stripe_subscription_id: "sub_renewed",
        stripe_customer_id: "cus_123",
      },
      stripeMapping: { stripe_customer_id: "cus_123" },
      sourceRows: [
        {
          user_id: "user-123",
          provider: "stripe",
          source_key: "stripe:legacy:user-123",
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-03-31T17:37:05.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_renewed",
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: "evt_legacy",
          source_created_at: "2026-03-31T14:59:48.000Z",
          source_updated_at: "2026-03-31T15:00:00.000Z",
        },
      ],
    });

    await syncStripeEntitlementSourcesForUser({
      supabase,
      stripe: {
        subscriptions: {
          list: () =>
            Promise.resolve({
              data: [createStripeSubscription({ id: "sub_renewed" })],
            }),
        },
      },
      userId: "user-123",
    });

    const projection = await recomputeProjectedSubscription({
      supabase,
      userId: "user-123",
    });

    assertEquals(
      projection.primary?.sourceKey,
      "stripe_subscription:sub_renewed",
    );
    assertEquals(sourceGrantsAccess(projection.primary!), true);
  },
);

Deno.test(
  "migrated legacy users: Stripe cancel keeps canonical lineage without duplicate legacy rows",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: {
        id: "sub_existing",
        provider: "stripe",
        plan: "plus",
        status: "active",
        billing_interval: "yearly",
        current_period_end: "2027-03-31T17:37:05.000Z",
        stripe_subscription_id: "sub_canceled",
        stripe_customer_id: "cus_123",
      },
      stripeMapping: { stripe_customer_id: "cus_123" },
      sourceRows: [
        {
          user_id: "user-123",
          provider: "stripe",
          source_key: "stripe:legacy:user-123",
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-03-31T17:37:05.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_canceled",
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: "evt_legacy",
          source_created_at: "2026-03-31T14:59:48.000Z",
          source_updated_at: "2026-03-31T15:00:00.000Z",
        },
      ],
    });

    await syncStripeEntitlementSourcesForUser({
      supabase,
      stripe: {
        subscriptions: {
          list: () =>
            Promise.resolve({
              data: [
                createStripeSubscription({
                  id: "sub_canceled",
                  status: "canceled",
                  current_period_end: Math.floor(
                    Date.parse("2026-03-01T00:00:00.000Z") / 1000,
                  ),
                }),
              ],
            }),
        },
      },
      userId: "user-123",
    });

    const projection = await recomputeProjectedSubscription({
      supabase,
      userId: "user-123",
    });
    const stripeRows = supabase.state.sourceRows.filter((row) =>
      row.provider === "stripe"
    );

    assertEquals(stripeRows.length, 1);
    assertEquals(
      projection.primary?.sourceKey,
      "stripe_subscription:sub_canceled",
    );
    assertEquals(projection.primary?.status, "canceled");
  },
);

Deno.test(
  "migrated legacy users: Stripe plan change adopts fetched plan and interval without repurchase",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: {
        id: "sub_existing",
        provider: "stripe",
        plan: "plus",
        status: "active",
        billing_interval: "yearly",
        current_period_end: "2027-03-31T17:37:05.000Z",
        stripe_subscription_id: null,
        stripe_customer_id: "cus_123",
      },
      stripeMapping: { stripe_customer_id: "cus_123" },
      sourceRows: [
        {
          user_id: "user-123",
          provider: "stripe",
          source_key: "stripe:legacy:user-123",
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-03-31T17:37:05.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: null,
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: "evt_legacy",
          source_created_at: "2026-03-31T14:59:48.000Z",
          source_updated_at: "2026-03-31T15:00:00.000Z",
        },
      ],
    });

    await syncStripeEntitlementSourcesForUser({
      supabase,
      stripe: {
        subscriptions: {
          list: () =>
            Promise.resolve({
              data: [
                createStripeSubscription({
                  id: "sub_plan_change",
                  interval: "month",
                  current_period_end: Math.floor(
                    Date.parse("2027-03-31T17:37:05.000Z") / 1000,
                  ),
                  metadata: {
                    plan: "premium",
                    billing_interval: "monthly",
                  },
                }),
              ],
            }),
        },
      },
      userId: "user-123",
    });

    const projection = await recomputeProjectedSubscription({
      supabase,
      userId: "user-123",
    });

    assertEquals(
      projection.primary?.sourceKey,
      "stripe_subscription:sub_plan_change",
    );
    assertEquals(projection.primary?.plan, "premium");
    assertEquals(projection.primary?.billingInterval, "monthly");
  },
);

Deno.test(
  "migrated legacy users: App Store trial-to-paid canonicalization keeps access",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: {
        id: "sub_existing",
        provider: "app_store",
        plan: "plus",
        status: "trialing",
        billing_interval: "yearly",
        current_period_end: "2026-05-01T00:00:00.000Z",
      },
      stripeMapping: null,
      sourceRows: [
        {
          user_id: "user-123",
          provider: "app_store",
          source_key: buildLegacyAppStoreTransactionSourceKey("tx_trial_paid"),
          plan: "plus",
          status: "trialing",
          billing_interval: "yearly",
          current_period_end: "2026-05-01T00:00:00.000Z",
          cancel_at_period_end: false,
          trial_start: "2026-04-01T00:00:00.000Z",
          trial_end: "2026-05-01T00:00:00.000Z",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          store_product_id: "yearly",
          app_store_transaction_id: "tx_trial_paid",
          app_store_original_transaction_id: null,
          app_store_environment: "Production",
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: null,
          source_created_at: "2026-04-01T00:00:00.000Z",
          source_updated_at: "2026-04-01T00:00:00.000Z",
        },
      ],
    });

    await upsertAppStoreEntitlementSourceWithPromotion({
      supabase,
      source: createAppStoreSource({
        sourceKey: buildAppStoreSourceKey("orig_trial_paid"),
        status: "active",
        appStoreTransactionId: "tx_trial_paid",
        appStoreOriginalTransactionId: "orig_trial_paid",
        trialStart: null,
        trialEnd: null,
        currentPeriodEnd: "2027-04-30T00:00:00.000Z",
      }),
      transactionId: "tx_trial_paid",
      originalTransactionId: "orig_trial_paid",
    });

    const projection = await recomputeProjectedSubscription({
      supabase,
      userId: "user-123",
    });

    assertEquals(projection.primary?.sourceKey, "app_store:orig_trial_paid");
    assertEquals(projection.primary?.status, "active");
    assertEquals(sourceGrantsAccess(projection.primary!), true);
  },
);

Deno.test(
  "migrated legacy users: mixed-provider switch prefers canonical App Store access without losing Stripe lineage",
  async () => {
    const supabase = new FakeSupabase({
      previousProjection: {
        id: "sub_existing",
        provider: "stripe",
        plan: "plus",
        status: "active",
        billing_interval: "yearly",
        current_period_end: "2027-03-31T17:37:05.000Z",
        stripe_subscription_id: "sub_switch",
        stripe_customer_id: "cus_123",
      },
      stripeMapping: { stripe_customer_id: "cus_123" },
      sourceRows: [
        {
          user_id: "user-123",
          provider: "stripe",
          source_key: "stripe:legacy:user-123",
          plan: "plus",
          status: "active",
          billing_interval: "yearly",
          current_period_end: "2027-03-31T17:37:05.000Z",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_switch",
          store_product_id: null,
          app_store_transaction_id: null,
          app_store_original_transaction_id: null,
          app_store_environment: null,
          play_purchase_token: null,
          play_order_id: null,
          play_package_name: null,
          current_price_id: null,
          original_price_id: null,
          previous_plan: null,
          previous_interval: null,
          last_event_id: "evt_legacy",
          source_created_at: "2026-03-31T14:59:48.000Z",
          source_updated_at: "2026-03-31T15:00:00.000Z",
        },
      ],
    });

    await syncStripeEntitlementSourcesForUser({
      supabase,
      stripe: {
        subscriptions: {
          list: () =>
            Promise.resolve({
              data: [createStripeSubscription({ id: "sub_switch" })],
            }),
        },
      },
      userId: "user-123",
    });

    await upsertAppStoreEntitlementSourceWithPromotion({
      supabase,
      source: createAppStoreSource({
        sourceKey: buildAppStoreSourceKey("orig_switch"),
        appStoreTransactionId: "tx_switch",
        appStoreOriginalTransactionId: "orig_switch",
        currentPeriodEnd: "2027-05-30T00:00:00.000Z",
      }),
      transactionId: "tx_switch",
      originalTransactionId: "orig_switch",
    });

    const projection = await recomputeProjectedSubscription({
      supabase,
      userId: "user-123",
    });
    const stripeRows = supabase.state.sourceRows.filter((row) =>
      row.provider === "stripe"
    );

    assertEquals(projection.primary?.provider, "app_store");
    assertEquals(projection.primary?.sourceKey, "app_store:orig_switch");
    assertEquals(stripeRows.length, 1);
    assertEquals(stripeRows[0]?.source_key, "stripe_subscription:sub_switch");
  },
);
