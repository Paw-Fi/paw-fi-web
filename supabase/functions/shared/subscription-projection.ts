import { PLAN_HIERARCHY, type PlanType } from "./subscription-constants.ts";

export type SubscriptionProjectionProvider =
  | "stripe"
  | "app_store"
  | "play_store";

export type SubscriptionProjectionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export interface SubscriptionProjectionSource {
  provider: SubscriptionProjectionProvider;
  sourceKey: string;
  userId: string;
  plan: PlanType;
  status: SubscriptionProjectionStatus;
  billingInterval: "monthly" | "yearly" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialStart: string | null;
  trialEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  storeProductId: string | null;
  appStoreTransactionId: string | null;
  appStoreOriginalTransactionId: string | null;
  appStoreEnvironment: string | null;
  playPurchaseToken: string | null;
  playOrderId: string | null;
  playPackageName: string | null;
  currentPriceId: string | null;
  originalPriceId: string | null;
  previousPlan: PlanType | null;
  previousInterval: "monthly" | "yearly" | null;
  lastEventId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProjectedSubscriptionPayload {
  user_id: string;
  provider: SubscriptionProjectionProvider;
  plan: PlanType;
  status: SubscriptionProjectionStatus;
  billing_interval: "monthly" | "yearly" | null;
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
  previous_interval: "monthly" | "yearly" | null;
  last_event_id: string | null;
  updated_at: string;
}

export interface PreviousProjectedStripeSnapshot {
  provider?: string | null;
  plan?: string | null;
  stripe_subscription_id?: string | null;
}

export function pickPrimarySubscriptionSource(
  sources: SubscriptionProjectionSource[],
): SubscriptionProjectionSource | null {
  if (sources.length === 0) return null;

  const ranked = [...sources].sort((left, right) => {
    const accessRankDelta = getAccessRank(right) - getAccessRank(left);
    if (accessRankDelta !== 0) return accessRankDelta;

    const planRankDelta = (PLAN_HIERARCHY[right.plan] ?? 0) -
      (PLAN_HIERARCHY[left.plan] ?? 0);
    if (planRankDelta !== 0) return planRankDelta;

    const periodEndDelta = parseIsoToMs(right.currentPeriodEnd) -
      parseIsoToMs(left.currentPeriodEnd);
    if (periodEndDelta !== 0) return periodEndDelta;

    const updatedAtDelta = parseIsoToMs(right.updatedAt) -
      parseIsoToMs(left.updatedAt);
    if (updatedAtDelta !== 0) return updatedAtDelta;

    return parseIsoToMs(right.createdAt) - parseIsoToMs(left.createdAt);
  });

  return ranked[0] ?? null;
}

export function buildProjectedSubscription(
  source: SubscriptionProjectionSource,
): ProjectedSubscriptionPayload {
  return {
    user_id: source.userId,
    provider: source.provider,
    plan: source.plan,
    status: source.status,
    billing_interval: source.billingInterval,
    current_period_end: source.currentPeriodEnd,
    cancel_at_period_end: source.cancelAtPeriodEnd,
    trial_start: source.trialStart,
    trial_end: source.trialEnd,
    stripe_customer_id: source.provider === "stripe"
      ? source.stripeCustomerId
      : null,
    stripe_subscription_id: source.provider === "stripe"
      ? source.stripeSubscriptionId
      : null,
    store_product_id:
      source.provider === "app_store" || source.provider === "play_store"
        ? source.storeProductId
        : null,
    app_store_transaction_id: source.provider === "app_store"
      ? source.appStoreTransactionId
      : null,
    app_store_original_transaction_id: source.provider === "app_store"
      ? source.appStoreOriginalTransactionId
      : null,
    app_store_environment: source.provider === "app_store"
      ? source.appStoreEnvironment
      : null,
    play_purchase_token: source.provider === "play_store"
      ? source.playPurchaseToken
      : null,
    play_order_id: source.provider === "play_store" ? source.playOrderId : null,
    play_package_name: source.provider === "play_store"
      ? source.playPackageName
      : null,
    current_price_id: source.provider === "stripe"
      ? source.currentPriceId
      : null,
    original_price_id: source.provider === "stripe"
      ? source.originalPriceId
      : null,
    previous_plan: source.provider === "stripe" ? source.previousPlan : null,
    previous_interval: source.provider === "stripe"
      ? source.previousInterval
      : null,
    last_event_id: source.lastEventId,
    updated_at: new Date().toISOString(),
  };
}

export function sourceGrantsAccess(
  source: Pick<
    SubscriptionProjectionSource,
    "plan" | "status" | "currentPeriodEnd"
  >,
): boolean {
  if (source.status === "trialing") {
    const trialEndMs = parseIsoToMs(source.currentPeriodEnd);
    return trialEndMs > Date.now();
  }

  if (source.status !== "active") {
    return false;
  }

  if (source.plan === "lifetime") {
    return true;
  }

  const periodEndMs = parseIsoToMs(source.currentPeriodEnd);
  return periodEndMs > Date.now();
}

export function getCancelableStripeSubscriptionIdAfterProjection(params: {
  previous: PreviousProjectedStripeSnapshot | null;
  primary: SubscriptionProjectionSource | null;
  nextProvider: Exclude<SubscriptionProjectionProvider, "stripe">;
  nextSourceKey: string;
}): string | null {
  const stripeSubscriptionId =
    typeof params.previous?.stripe_subscription_id === "string"
      ? params.previous.stripe_subscription_id
      : null;

  if (!stripeSubscriptionId?.startsWith("sub_")) {
    return null;
  }

  if (
    params.previous?.provider !== "stripe" ||
    params.previous?.plan === "lifetime"
  ) {
    return null;
  }

  if (params.primary?.provider !== params.nextProvider) {
    return null;
  }

  if (params.primary.sourceKey !== params.nextSourceKey) {
    return null;
  }

  return sourceGrantsAccess(params.primary) ? stripeSubscriptionId : null;
}

function getAccessRank(source: SubscriptionProjectionSource): number {
  if (sourceGrantsAccess(source) && source.plan === "lifetime") {
    return 500;
  }

  if (sourceGrantsAccess(source) && source.status === "active") {
    return 400;
  }

  if (sourceGrantsAccess(source) && source.status === "trialing") {
    return 300;
  }

  if (source.status === "past_due" || source.status === "paused") {
    return 200;
  }

  if (source.status === "incomplete") {
    return 100;
  }

  if (source.status === "active") {
    return 50;
  }

  if (source.status === "trialing") {
    return 40;
  }

  return 0;
}

function parseIsoToMs(value: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}
