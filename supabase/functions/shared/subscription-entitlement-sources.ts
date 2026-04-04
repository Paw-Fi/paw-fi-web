import {
  buildProjectedSubscription,
  pickPrimarySubscriptionSource,
  type ProjectedSubscriptionPayload,
  sourceGrantsAccess,
  type SubscriptionProjectionSource,
} from "./subscription-projection.ts";
import { getPlanFromPriceId } from "./stripe-subscription-prices.ts";
import type {
  BillingInterval,
  PlanType,
  SubscriptionStatus,
} from "./subscription-constants.ts";

const SOURCE_TABLE = "subscription_entitlement_sources";
const LEGACY_STRIPE_MATCH_TOLERANCE_MS = 5 * 60 * 1000;

type SourceRow = {
  user_id: string;
  provider: SubscriptionProjectionSource["provider"];
  source_key: string;
  plan: PlanType;
  status: SubscriptionStatus;
  billing_interval: BillingInterval | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_start: string | null;
  trial_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  store_product_id: string | null;
  app_store_transaction_id: string | null;
  app_store_original_transaction_id: string | null;
  app_store_environment: string | null;
  play_purchase_token: string | null;
  play_order_id: string | null;
  play_package_name: string | null;
  current_price_id: string | null;
  original_price_id: string | null;
  previous_plan: PlanType | null;
  previous_interval: BillingInterval | null;
  last_event_id: string | null;
  source_created_at: string | null;
  source_updated_at: string | null;
};

type AppStoreSourceUserLookupRow = {
  user_id: string | null;
  source_key: string;
  app_store_original_transaction_id: string | null;
  app_store_transaction_id: string | null;
  source_updated_at: string | null;
  updated_at: string | null;
};

type ProjectionSnapshot = {
  id?: string;
  provider?: string | null;
  plan?: string | null;
  status?: string | null;
  billing_interval?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  bound_to_user_id?: string | null;
  bound_to_household_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
};

type StripeSubscriptionLike = {
  id: string;
  status: string;
  metadata?: Record<string, string>;
  customer?: string | { id: string } | null;
  created?: number;
  current_period_end?: number | null;
  cancel_at_period_end: boolean;
  trial_start?: number | null;
  trial_end?: number | null;
  items: {
    data: Array<{
      price?: {
        id?: string | null;
        recurring?: {
          interval?: string | null;
        } | null;
      } | null;
    }>;
  };
};

type StripeClientLike = {
  subscriptions: {
    list(params: {
      customer: string;
      status: "all";
      limit: number;
    }): Promise<{ data: StripeSubscriptionLike[] }>;
  };
};

export function buildStripeSubscriptionSourceKey(
  subscriptionId: string,
): string {
  return `stripe_subscription:${subscriptionId}`;
}

export function buildStripeLifetimeSourceKey(params: {
  userId: string;
  customerId?: string | null;
}): string {
  return `stripe_lifetime:${params.customerId || params.userId}`;
}

export function buildAppStoreSourceKey(originalTransactionId: string): string {
  return `app_store:${originalTransactionId}`;
}

export function buildLegacyAppStoreTransactionSourceKey(
  transactionId: string,
): string {
  return `app_store_legacy_transaction:${transactionId}`;
}

// Rows keyed only by user id are preserved for migrated users whose Apple
// lineage is not yet recoverable from server identifiers. They should keep
// access until a trusted verify/notification flow can promote them.
export function buildLegacyAppStoreUserSourceKey(userId: string): string {
  return `app_store_legacy_user:${userId}`;
}

export function buildPlayStoreSourceKey(purchaseToken: string): string {
  return `play_store:${purchaseToken}`;
}

export function buildStripeSyntheticSourceKey(params: {
  kind: string;
  userId: string;
}): string {
  return `stripe_synthetic:${params.kind}:${params.userId}`;
}

export async function upsertSubscriptionEntitlementSource(params: {
  supabase: any;
  source: SubscriptionProjectionSource;
}): Promise<void> {
  const payload = toSourceRow(params.source);
  const { error } = await params.supabase
    .from(SOURCE_TABLE)
    .upsert(payload, { onConflict: "provider,source_key" });

  if (error) {
    throw new Error(
      `Failed to upsert subscription entitlement source: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }
}

export async function getUserSubscriptionEntitlementSources(params: {
  supabase: any;
  userId: string;
}): Promise<SubscriptionProjectionSource[]> {
  const { data, error } = await params.supabase
    .from(SOURCE_TABLE)
    .select("*")
    .eq("user_id", params.userId);

  if (error) {
    throw new Error(
      `Failed to load subscription entitlement sources: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }

  return Array.isArray(data) ? data.map(fromSourceRow) : [];
}

export async function findAppStoreEntitlementSourceUser(params: {
  supabase: any;
  originalTransactionId: string;
  transactionId: string | null;
}): Promise<string | null> {
  const orFilters = [
    `app_store_original_transaction_id.eq.${params.originalTransactionId}`,
  ];
  if (params.transactionId) {
    orFilters.push(`app_store_transaction_id.eq.${params.transactionId}`);
  }

  const { data, error } = await params.supabase
    .from(SOURCE_TABLE)
    .select(
      "user_id, source_key, app_store_original_transaction_id, app_store_transaction_id, source_updated_at, updated_at",
    )
    .eq("provider", "app_store")
    .or(orFilters.join(","));

  if (error) {
    throw new Error(
      `Failed to load App Store entitlement source mapping: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }

  const keyedRows = await loadAppStoreSourceLookupRowsByKeys({
    supabase: params.supabase,
    sourceKeys: [
      buildAppStoreSourceKey(params.originalTransactionId),
      params.transactionId
        ? buildLegacyAppStoreTransactionSourceKey(params.transactionId)
        : null,
    ],
  });

  const dedupedRows = dedupeSourceLookupRows([
    ...(Array.isArray(data) ? (data as AppStoreSourceUserLookupRow[]) : []),
    ...keyedRows,
  ]);

  const rows = dedupedRows;

  const ranked = rows
    .filter((row) => typeof row.user_id === "string" && row.user_id.length > 0)
    .sort((left, right) => {
      const matchRankDelta = getAppStoreUserLookupRank(right, params) -
        getAppStoreUserLookupRank(left, params);
      if (matchRankDelta !== 0) return matchRankDelta;

      const sourceUpdatedDelta = parseIsoToMs(right.source_updated_at) -
        parseIsoToMs(left.source_updated_at);
      if (sourceUpdatedDelta !== 0) return sourceUpdatedDelta;

      return parseIsoToMs(right.updated_at) - parseIsoToMs(left.updated_at);
    });

  return ranked[0]?.user_id ?? null;
}

export async function reconcileLegacyAppStoreTransactionSource(params: {
  supabase: any;
  transactionId: string | null;
}): Promise<void> {
  if (!params.transactionId) return;

  const { error } = await params.supabase
    .from(SOURCE_TABLE)
    .delete()
    .eq("provider", "app_store")
    .eq(
      "source_key",
      buildLegacyAppStoreTransactionSourceKey(params.transactionId),
    );

  if (error) {
    throw new Error(
      `Failed to reconcile legacy App Store entitlement source: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }
}

export async function upsertAppStoreEntitlementSourceWithPromotion(params: {
  supabase: any;
  source: SubscriptionProjectionSource;
  transactionId: string | null;
  originalTransactionId: string | null;
}): Promise<void> {
  const existingSources = await getUserProviderSubscriptionEntitlementSources({
    supabase: params.supabase,
    userId: params.source.userId,
    provider: "app_store",
  });

  const candidateKeys = new Set<string>([
    params.source.sourceKey,
    buildLegacyAppStoreUserSourceKey(params.source.userId),
    buildDeprecatedLegacyProviderUserSourceKey(
      "app_store",
      params.source.userId,
    ),
  ]);

  if (params.transactionId) {
    candidateKeys.add(
      buildLegacyAppStoreTransactionSourceKey(params.transactionId),
    );
  }

  if (params.originalTransactionId) {
    candidateKeys.add(buildAppStoreSourceKey(params.originalTransactionId));
  }

  const candidateSources = existingSources.filter((source) =>
    candidateKeys.has(source.sourceKey)
  );

  const mergedSource = mergeSourceWithFallbacks(
    params.source,
    candidateSources,
  );

  await upsertSubscriptionEntitlementSource({
    supabase: params.supabase,
    source: mergedSource,
  });

  await deleteSubscriptionEntitlementSourcesByKeys({
    supabase: params.supabase,
    provider: "app_store",
    userId: params.source.userId,
    sourceKeys: candidateSources
      .map((source) => source.sourceKey)
      .filter((sourceKey) => sourceKey !== mergedSource.sourceKey),
  });
}

export async function projectSubscriptionToFree(params: {
  supabase: any;
  userId: string;
  status?: SubscriptionStatus;
  endedAt?: string | null;
  lastEventId?: string | null;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const endedAt = params.endedAt ?? nowIso;
  const { error } = await params.supabase
    .from("subscriptions")
    .update({
      provider: null,
      plan: "free",
      status: params.status ?? "active",
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      trial_start: null,
      trial_end: null,
      stripe_customer_id: null,
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
      pending_plan: null,
      pending_interval: null,
      pending_effective_date: null,
      last_event_id: params.lastEventId ?? null,
      bound_to_user_id: null,
      bound_to_household_id: null,
      canceled_at: params.status === "canceled" ? endedAt : null,
      ended_at: endedAt,
      updated_at: nowIso,
    })
    .eq("user_id", params.userId);

  if (error) {
    throw new Error(
      `Failed to project subscription to free: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }
}

export async function recomputeProjectedSubscription(params: {
  supabase: any;
  userId: string;
}): Promise<{
  previous: ProjectionSnapshot | null;
  primary: SubscriptionProjectionSource | null;
  projected: ProjectedSubscriptionPayload | null;
}> {
  const { data: previous, error: previousError } = await params.supabase
    .from("subscriptions")
    .select(
      "id, provider, plan, status, billing_interval, current_period_end, cancel_at_period_end, bound_to_user_id, bound_to_household_id, stripe_subscription_id, stripe_customer_id",
    )
    .eq("user_id", params.userId)
    .maybeSingle();

  if (previousError) {
    throw new Error(
      `Failed to load current subscription projection: ${
        previousError.message ?? previousError.code ?? String(previousError)
      }`,
    );
  }

  const sources = await getUserSubscriptionEntitlementSources({
    supabase: params.supabase,
    userId: params.userId,
  });

  const primary = pickPrimarySubscriptionSource(sources);
  if (!primary) {
    if (previous?.id) {
      await projectSubscriptionToFree({
        supabase: params.supabase,
        userId: params.userId,
        status: "active",
        lastEventId: null,
      });
    }

    return {
      previous: (previous as ProjectionSnapshot | null) ?? null,
      primary: null,
      projected: null,
    };
  }

  const projected = buildProjectedSubscription(primary);
  const hasTerminalAccessLoss = primary.status === "canceled" ||
    primary.status === "unpaid" ||
    primary.status === "incomplete_expired";
  const { error: projectionError } = await params.supabase
    .from("subscriptions")
    .upsert(
      {
        ...projected,
        bound_to_user_id: null,
        bound_to_household_id: null,
        ended_at: hasTerminalAccessLoss
          ? projected.current_period_end ?? new Date().toISOString()
          : null,
      },
      { onConflict: "user_id" },
    );

  if (projectionError) {
    throw new Error(
      `Failed to recompute subscription projection: ${
        projectionError.message ?? projectionError.code ??
          String(projectionError)
      }`,
    );
  }

  return {
    previous: (previous as ProjectionSnapshot | null) ?? null,
    primary,
    projected,
  };
}

export async function syncStripeEntitlementSourcesForUser(params: {
  supabase: any;
  stripe: StripeClientLike | null;
  userId: string;
}): Promise<number> {
  if (!params.stripe) return 0;

  const { data: mapping, error: mappingError } = await params.supabase
    .from("user_stripe_mapping")
    .select("stripe_customer_id")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (mappingError) {
    throw new Error(
      `Failed to load Stripe customer mapping: ${
        mappingError.message ?? mappingError.code ?? String(mappingError)
      }`,
    );
  }

  const stripeCustomerId = (mapping?.stripe_customer_id as string | null) ??
    null;
  if (!stripeCustomerId) return 0;

  const existingSources = await getUserProviderSubscriptionEntitlementSources({
    supabase: params.supabase,
    userId: params.userId,
    provider: "stripe",
  });

  await reconcileLegacyStripeLifetimeSource({
    supabase: params.supabase,
    userId: params.userId,
    stripeCustomerId,
    existingSources,
  });

  const subscriptions = await params.stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
  });

  const fetchedSources = subscriptions.data.map((subscription) =>
    mapStripeSubscriptionToSource({
      userId: params.userId,
      subscription,
      stripeCustomerId,
    })
  );

  const claimedLegacyKeys = new Set<string>();
  let synced = 0;
  for (const source of fetchedSources) {
    const matchedLegacySources = selectStripeLegacySourcesForCanonical({
      existingSources,
      canonicalSource: source,
      fetchedSources,
      stripeCustomerId,
      claimedLegacyKeys,
    });

    for (const matchedSource of matchedLegacySources) {
      claimedLegacyKeys.add(matchedSource.sourceKey);
    }

    const existingCanonicalSources = existingSources.filter((candidate) =>
      candidate.sourceKey === source.sourceKey
    );
    const mergedSource = mergeSourceWithFallbacks(source, [
      ...existingCanonicalSources,
      ...matchedLegacySources,
    ]);

    await upsertSubscriptionEntitlementSource({
      supabase: params.supabase,
      source: mergedSource,
    });

    await deleteSubscriptionEntitlementSourcesByKeys({
      supabase: params.supabase,
      provider: "stripe",
      userId: params.userId,
      sourceKeys: matchedLegacySources
        .map((candidate) => candidate.sourceKey)
        .filter((sourceKey) => sourceKey !== mergedSource.sourceKey),
    });

    synced += 1;
  }

  return synced;
}

export function mapStripeSubscriptionToSource(params: {
  userId: string;
  subscription: StripeSubscriptionLike;
  stripeCustomerId: string | null;
}): SubscriptionProjectionSource {
  const price = params.subscription.items.data[0]?.price;
  const planInfo = price?.id ? getPlanFromPriceId(price.id) : null;
  const metadataPlan = asPlan(params.subscription.metadata?.plan);
  const plan = metadataPlan || planInfo?.plan || "plus";
  const billingInterval =
    toBillingInterval(params.subscription.metadata?.billing_interval) ||
    toBillingInterval(price?.recurring?.interval) ||
    planInfo?.interval ||
    null;
  const status = normalizeStripeStatus(params.subscription.status);

  return {
    provider: "stripe",
    sourceKey: buildStripeSubscriptionSourceKey(params.subscription.id),
    userId: params.userId,
    plan,
    status,
    billingInterval,
    currentPeriodEnd: toIsoFromUnix(params.subscription.current_period_end),
    cancelAtPeriodEnd: params.subscription.cancel_at_period_end,
    trialStart: toIsoFromUnix(params.subscription.trial_start),
    trialEnd: toIsoFromUnix(params.subscription.trial_end),
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.subscription.id,
    storeProductId: null,
    appStoreTransactionId: null,
    appStoreOriginalTransactionId: null,
    appStoreEnvironment: null,
    playPurchaseToken: null,
    playOrderId: null,
    playPackageName: null,
    currentPriceId: price?.id ?? null,
    originalPriceId: null,
    previousPlan: null,
    previousInterval: null,
    lastEventId: null,
    createdAt: toIsoFromUnix(params.subscription.created),
    updatedAt: new Date().toISOString(),
  };
}

function toSourceRow(source: SubscriptionProjectionSource): SourceRow {
  return {
    user_id: source.userId,
    provider: source.provider,
    source_key: source.sourceKey,
    plan: source.plan,
    status: source.status,
    billing_interval: source.billingInterval,
    current_period_end: source.currentPeriodEnd,
    cancel_at_period_end: source.cancelAtPeriodEnd,
    trial_start: source.trialStart,
    trial_end: source.trialEnd,
    stripe_customer_id: source.stripeCustomerId,
    stripe_subscription_id: source.stripeSubscriptionId,
    store_product_id: source.storeProductId,
    app_store_transaction_id: source.appStoreTransactionId,
    app_store_original_transaction_id: source.appStoreOriginalTransactionId,
    app_store_environment: source.appStoreEnvironment,
    play_purchase_token: source.playPurchaseToken,
    play_order_id: source.playOrderId,
    play_package_name: source.playPackageName,
    current_price_id: source.currentPriceId,
    original_price_id: source.originalPriceId,
    previous_plan: source.previousPlan,
    previous_interval: source.previousInterval,
    last_event_id: source.lastEventId,
    source_created_at: source.createdAt,
    source_updated_at: source.updatedAt,
  };
}

function fromSourceRow(
  row: Record<string, unknown>,
): SubscriptionProjectionSource {
  return {
    provider: row.provider as SubscriptionProjectionSource["provider"],
    sourceKey: row.source_key as string,
    userId: row.user_id as string,
    plan: row.plan as PlanType,
    status: row.status as SubscriptionStatus,
    billingInterval: (row.billing_interval as BillingInterval | null) ?? null,
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    trialStart: (row.trial_start as string | null) ?? null,
    trialEnd: (row.trial_end as string | null) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    storeProductId: (row.store_product_id as string | null) ?? null,
    appStoreTransactionId: (row.app_store_transaction_id as string | null) ??
      null,
    appStoreOriginalTransactionId:
      (row.app_store_original_transaction_id as string | null) ?? null,
    appStoreEnvironment: (row.app_store_environment as string | null) ?? null,
    playPurchaseToken: (row.play_purchase_token as string | null) ?? null,
    playOrderId: (row.play_order_id as string | null) ?? null,
    playPackageName: (row.play_package_name as string | null) ?? null,
    currentPriceId: (row.current_price_id as string | null) ?? null,
    originalPriceId: (row.original_price_id as string | null) ?? null,
    previousPlan: (row.previous_plan as PlanType | null) ?? null,
    previousInterval: (row.previous_interval as BillingInterval | null) ?? null,
    lastEventId: (row.last_event_id as string | null) ?? null,
    createdAt: (row.source_created_at as string | null) ?? null,
    updatedAt: (row.source_updated_at as string | null) ?? null,
  };
}

function normalizeStripeStatus(
  status: string,
): SubscriptionProjectionSource["status"] {
  return status === "incomplete_expired"
    ? "canceled"
    : (status as SubscriptionProjectionSource["status"]);
}

function toBillingInterval(value: unknown): BillingInterval | null {
  if (value === "monthly" || value === "yearly") {
    return value;
  }
  if (value === "month") return "monthly";
  if (value === "year") return "yearly";
  return null;
}

function asPlan(value: unknown): PlanType | null {
  if (
    value === "free" ||
    value === "plus" ||
    value === "premium" ||
    value === "lifetime"
  ) {
    return value;
  }
  return null;
}

function toIsoFromUnix(value: number | null | undefined): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return new Date(value * 1000).toISOString();
}

function getAppStoreUserLookupRank(
  row: AppStoreSourceUserLookupRow,
  params: {
    originalTransactionId: string;
    transactionId: string | null;
  },
): number {
  if (row.source_key === buildAppStoreSourceKey(params.originalTransactionId)) {
    return 300;
  }

  if (row.app_store_original_transaction_id === params.originalTransactionId) {
    return 200;
  }

  if (
    params.transactionId &&
    row.source_key === buildLegacyAppStoreTransactionSourceKey(
        params.transactionId,
      )
  ) {
    return 150;
  }

  if (
    params.transactionId &&
    row.app_store_transaction_id === params.transactionId
  ) {
    return 100;
  }

  return 0;
}

function parseIsoToMs(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

async function getUserProviderSubscriptionEntitlementSources(params: {
  supabase: any;
  userId: string;
  provider: SubscriptionProjectionSource["provider"];
}): Promise<SubscriptionProjectionSource[]> {
  const { data, error } = await params.supabase
    .from(SOURCE_TABLE)
    .select("*")
    .eq("user_id", params.userId)
    .eq("provider", params.provider);

  if (error) {
    throw new Error(
      `Failed to load ${params.provider} entitlement sources: ${
        error.message ?? error.code ?? String(error)
      }`,
    );
  }

  return Array.isArray(data) ? data.map(fromSourceRow) : [];
}

async function loadAppStoreSourceLookupRowsByKeys(params: {
  supabase: any;
  sourceKeys: Array<string | null>;
}): Promise<AppStoreSourceUserLookupRow[]> {
  const rows: AppStoreSourceUserLookupRow[] = [];

  for (const sourceKey of params.sourceKeys) {
    if (!sourceKey) continue;

    const { data, error } = await params.supabase
      .from(SOURCE_TABLE)
      .select(
        "user_id, source_key, app_store_original_transaction_id, app_store_transaction_id, source_updated_at, updated_at",
      )
      .eq("provider", "app_store")
      .eq("source_key", sourceKey);

    if (error) {
      throw new Error(
        `Failed to load App Store entitlement source mapping by source key: ${
          error.message ?? error.code ?? String(error)
        }`,
      );
    }

    if (Array.isArray(data)) {
      rows.push(...(data as AppStoreSourceUserLookupRow[]));
    }
  }

  return rows;
}

function dedupeSourceLookupRows(
  rows: AppStoreSourceUserLookupRow[],
): AppStoreSourceUserLookupRow[] {
  const deduped = new Map<string, AppStoreSourceUserLookupRow>();

  for (const row of rows) {
    const dedupeKey = `${row.user_id ?? "null"}:${row.source_key}`;
    deduped.set(dedupeKey, row);
  }

  return Array.from(deduped.values());
}

function buildDeprecatedLegacyProviderUserSourceKey(
  provider: SubscriptionProjectionSource["provider"],
  userId: string,
): string {
  return `${provider}:legacy:${userId}`;
}

async function deleteSubscriptionEntitlementSourcesByKeys(params: {
  supabase: any;
  provider: SubscriptionProjectionSource["provider"];
  userId: string;
  sourceKeys: string[];
}): Promise<void> {
  for (const sourceKey of params.sourceKeys) {
    const { error } = await params.supabase
      .from(SOURCE_TABLE)
      .delete()
      .eq("provider", params.provider)
      .eq("user_id", params.userId)
      .eq("source_key", sourceKey);

    if (error) {
      throw new Error(
        `Failed to delete ${params.provider} entitlement source ${sourceKey}: ${
          error.message ?? error.code ?? String(error)
        }`,
      );
    }
  }
}

function mergeSourceWithFallbacks(
  source: SubscriptionProjectionSource,
  fallbacks: SubscriptionProjectionSource[],
): SubscriptionProjectionSource {
  return {
    ...source,
    billingInterval: source.billingInterval ??
      firstNonNull(fallbacks.map((candidate) => candidate.billingInterval)),
    currentPeriodEnd: source.currentPeriodEnd ??
      firstNonNull(fallbacks.map((candidate) => candidate.currentPeriodEnd)),
    trialStart: source.trialStart ??
      firstNonNull(fallbacks.map((candidate) => candidate.trialStart)),
    trialEnd: source.trialEnd ??
      firstNonNull(fallbacks.map((candidate) => candidate.trialEnd)),
    stripeCustomerId: source.stripeCustomerId ??
      firstNonNull(fallbacks.map((candidate) => candidate.stripeCustomerId)),
    stripeSubscriptionId: source.stripeSubscriptionId ??
      firstNonNull(
        fallbacks.map((candidate) => candidate.stripeSubscriptionId),
      ),
    storeProductId: source.storeProductId ??
      firstNonNull(fallbacks.map((candidate) => candidate.storeProductId)),
    appStoreTransactionId: source.appStoreTransactionId ??
      firstNonNull(
        fallbacks.map((candidate) => candidate.appStoreTransactionId),
      ),
    appStoreOriginalTransactionId: source.appStoreOriginalTransactionId ??
      firstNonNull(
        fallbacks.map((candidate) => candidate.appStoreOriginalTransactionId),
      ),
    appStoreEnvironment: source.appStoreEnvironment ??
      firstNonNull(fallbacks.map((candidate) => candidate.appStoreEnvironment)),
    playPurchaseToken: source.playPurchaseToken ??
      firstNonNull(fallbacks.map((candidate) => candidate.playPurchaseToken)),
    playOrderId: source.playOrderId ??
      firstNonNull(fallbacks.map((candidate) => candidate.playOrderId)),
    playPackageName: source.playPackageName ??
      firstNonNull(fallbacks.map((candidate) => candidate.playPackageName)),
    currentPriceId: source.currentPriceId ??
      firstNonNull(fallbacks.map((candidate) => candidate.currentPriceId)),
    originalPriceId: source.originalPriceId ??
      firstNonNull(fallbacks.map((candidate) => candidate.originalPriceId)),
    previousPlan: source.previousPlan ??
      firstNonNull(fallbacks.map((candidate) => candidate.previousPlan)),
    previousInterval: source.previousInterval ??
      firstNonNull(fallbacks.map((candidate) => candidate.previousInterval)),
    lastEventId: source.lastEventId ??
      firstNonNull(fallbacks.map((candidate) => candidate.lastEventId)),
    createdAt: pickEarlierIso([
      source.createdAt,
      ...fallbacks.map((candidate) => candidate.createdAt),
    ]),
    updatedAt: pickLaterIso([
      source.updatedAt,
      ...fallbacks.map((candidate) => candidate.updatedAt),
    ]),
  };
}

async function reconcileLegacyStripeLifetimeSource(params: {
  supabase: any;
  userId: string;
  stripeCustomerId: string;
  existingSources: SubscriptionProjectionSource[];
}): Promise<void> {
  const canonicalSourceKey = buildStripeLifetimeSourceKey({
    userId: params.userId,
    customerId: params.stripeCustomerId,
  });
  const lifetimeCandidates = params.existingSources.filter((source) =>
    source.plan === "lifetime" &&
    source.provider === "stripe" &&
    source.stripeCustomerId === params.stripeCustomerId
  );

  if (lifetimeCandidates.length === 0) return;

  const canonicalSource = lifetimeCandidates.find((source) =>
    source.sourceKey === canonicalSourceKey
  );
  const legacyCandidates = lifetimeCandidates.filter((source) =>
    source.sourceKey !== canonicalSourceKey
  );

  if (legacyCandidates.length === 0) return;

  const baseSource = canonicalSource ?? {
    ...legacyCandidates[0],
    sourceKey: canonicalSourceKey,
    stripeCustomerId: params.stripeCustomerId,
  };

  const mergedSource = mergeSourceWithFallbacks(baseSource, legacyCandidates);

  await upsertSubscriptionEntitlementSource({
    supabase: params.supabase,
    source: mergedSource,
  });

  await deleteSubscriptionEntitlementSourcesByKeys({
    supabase: params.supabase,
    provider: "stripe",
    userId: params.userId,
    sourceKeys: legacyCandidates.map((source) => source.sourceKey),
  });
}

function selectStripeLegacySourcesForCanonical(params: {
  existingSources: SubscriptionProjectionSource[];
  canonicalSource: SubscriptionProjectionSource;
  fetchedSources: SubscriptionProjectionSource[];
  stripeCustomerId: string;
  claimedLegacyKeys: Set<string>;
}): SubscriptionProjectionSource[] {
  const eligibleLegacySources = params.existingSources.filter((source) =>
    source.provider === "stripe" &&
    source.sourceKey !== params.canonicalSource.sourceKey &&
    !params.claimedLegacyKeys.has(source.sourceKey) &&
    isLegacyStripeSource(source)
  );

  const exactSubscriptionMatches = eligibleLegacySources.filter((source) =>
    source.stripeSubscriptionId === params.canonicalSource.stripeSubscriptionId
  );
  if (exactSubscriptionMatches.length > 0) {
    return exactSubscriptionMatches;
  }

  const periodMatches = eligibleLegacySources.filter((source) =>
    source.plan === params.canonicalSource.plan &&
    source.billingInterval === params.canonicalSource.billingInterval &&
    stripeSourceBelongsToCustomer(source, params.stripeCustomerId) &&
    isoWithinTolerance(
      source.currentPeriodEnd,
      params.canonicalSource.currentPeriodEnd,
      LEGACY_STRIPE_MATCH_TOLERANCE_MS,
    )
  );
  const unambiguousPeriodMatches = periodMatches.filter((legacySource) =>
    countFetchedStripeCompatibilityMatches({
      fetchedSources: params.fetchedSources,
      legacySource,
      stripeCustomerId: params.stripeCustomerId,
    }) === 1
  );
  if (unambiguousPeriodMatches.length === 1) {
    return unambiguousPeriodMatches;
  }

  const fetchedAccessGrantingSubscriptions = params.fetchedSources.filter((
    source,
  ) =>
    source.provider === "stripe" &&
    source.plan !== "lifetime" &&
    (source.status === "active" || source.status === "trialing")
  );
  const accessGrantingLegacySources = eligibleLegacySources.filter((source) =>
    source.plan !== "lifetime" &&
    sourceGrantsAccess(source)
  );

  if (
    fetchedAccessGrantingSubscriptions.length === 1 &&
    accessGrantingLegacySources.length === 1
  ) {
    return accessGrantingLegacySources;
  }

  return [];
}

function isLegacyStripeSource(source: SubscriptionProjectionSource): boolean {
  if (source.provider !== "stripe") return false;

  if (source.stripeSubscriptionId) {
    return source.sourceKey !==
      buildStripeSubscriptionSourceKey(source.stripeSubscriptionId);
  }

  if (source.plan === "lifetime" && source.stripeCustomerId) {
    return source.sourceKey !== buildStripeLifetimeSourceKey({
      userId: source.userId,
      customerId: source.stripeCustomerId,
    });
  }

  return true;
}

function stripeSourceBelongsToCustomer(
  source: SubscriptionProjectionSource,
  stripeCustomerId: string,
): boolean {
  return source.stripeCustomerId == null ||
    source.stripeCustomerId === stripeCustomerId;
}

function isoWithinTolerance(
  left: string | null,
  right: string | null,
  toleranceMs: number,
): boolean {
  const leftMs = parseIsoToMs(left);
  const rightMs = parseIsoToMs(right);

  if (leftMs === 0 || rightMs === 0) return false;
  return Math.abs(leftMs - rightMs) <= toleranceMs;
}

function countFetchedStripeCompatibilityMatches(params: {
  fetchedSources: SubscriptionProjectionSource[];
  legacySource: SubscriptionProjectionSource;
  stripeCustomerId: string;
}): number {
  return params.fetchedSources.filter((source) =>
    source.provider === "stripe" &&
    source.plan === params.legacySource.plan &&
    source.billingInterval === params.legacySource.billingInterval &&
    stripeSourceBelongsToCustomer(
      params.legacySource,
      params.stripeCustomerId,
    ) &&
    isoWithinTolerance(
      source.currentPeriodEnd,
      params.legacySource.currentPeriodEnd,
      LEGACY_STRIPE_MATCH_TOLERANCE_MS,
    )
  ).length;
}

function firstNonNull<T>(values: Array<T | null>): T | null {
  for (const value of values) {
    if (value !== null) return value;
  }
  return null;
}

function pickEarlierIso(values: Array<string | null>): string | null {
  const validValues = values.filter((value): value is string =>
    typeof value === "string" && parseIsoToMs(value) > 0
  );
  if (validValues.length === 0) {
    return values.find((value): value is string => typeof value === "string") ??
      null;
  }

  return [...validValues].sort((left, right) =>
    parseIsoToMs(left) - parseIsoToMs(right)
  )[0] ?? null;
}

function pickLaterIso(values: Array<string | null>): string | null {
  const validValues = values.filter((value): value is string =>
    typeof value === "string" && parseIsoToMs(value) > 0
  );
  if (validValues.length === 0) {
    return values.find((value): value is string => typeof value === "string") ??
      null;
  }

  return [...validValues].sort((left, right) =>
    parseIsoToMs(right) - parseIsoToMs(left)
  )[0] ?? null;
}
