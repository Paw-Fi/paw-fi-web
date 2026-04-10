const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

export interface PlaidBillingWindow {
  firstBillingMonthStart: string;
  secondBillingMonthStart: string;
  thirdBillingMonthStart: string;
  scheduledRemovalAt: string;
}

export interface DerivePlaidLinkProductsOptions {
  isConvertedPaidUser?: boolean;
  enableRecurringTransactionsProduct?: boolean;
}

export interface PlaidManualRefreshEligibilityParams {
  isConvertedPaidUser: boolean;
  isTrialingUser: boolean;
  itemStatus: string | null | undefined;
  itemHealthState: string | null | undefined;
  syncInProgress: boolean;
  lastSuccessfulSyncAt: string | null | undefined;
  nextManualRefreshEligibleAt: string | null | undefined;
  now?: Date;
}

export interface PlaidManualRefreshEligibility {
  allowed: boolean;
  reason:
    | "allowed"
    | "trial_blocked"
    | "paid_only"
    | "item_inactive"
    | "item_unhealthy"
    | "sync_in_progress"
    | "cooldown_active"
    | "recent_sync";
}

export interface PlaidKeepPolicyParams {
  subscriptionStatus: string | null | undefined;
  subscriptionPlan?: string | null | undefined;
  itemHealthState: string | null | undefined;
  billingKeepReason: string | null | undefined;
  lastFinancialFeatureUsedAt: string | null | undefined;
  now?: Date;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + months,
    1,
  ));
}

function subtractUtcHours(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

export function computePlaidBillingWindow(
  itemCreatedAt: string | Date,
): PlaidBillingWindow {
  const createdAt = toDate(itemCreatedAt);
  const firstBillingMonthStart = startOfUtcMonth(createdAt);
  const secondBillingMonthStart = addUtcMonths(firstBillingMonthStart, 1);
  const thirdBillingMonthStart = addUtcMonths(firstBillingMonthStart, 2);
  const scheduledRemovalAt = subtractUtcHours(thirdBillingMonthStart, 48);

  return {
    firstBillingMonthStart: firstBillingMonthStart.toISOString(),
    secondBillingMonthStart: secondBillingMonthStart.toISOString(),
    thirdBillingMonthStart: thirdBillingMonthStart.toISOString(),
    scheduledRemovalAt: scheduledRemovalAt.toISOString(),
  };
}

export function derivePlaidLinkProducts(
  products: string[],
  options: DerivePlaidLinkProductsOptions = {},
): string[] {
  const baseProducts = Array.from(new Set(products.filter(Boolean)));

  return baseProducts.filter((product) => {
    if (product !== "recurring_transactions") {
      return true;
    }

    return Boolean(
      options.isConvertedPaidUser &&
        options.enableRecurringTransactionsProduct,
    );
  });
}

export function canRequestPlaidManualRefresh(
  params: PlaidManualRefreshEligibilityParams,
): PlaidManualRefreshEligibility {
  const now = params.now ?? new Date();

  if (params.isTrialingUser) {
    return { allowed: false, reason: "trial_blocked" };
  }

  if (!params.isConvertedPaidUser) {
    return { allowed: false, reason: "paid_only" };
  }

  if (params.itemStatus !== "active") {
    return { allowed: false, reason: "item_inactive" };
  }

  if (params.itemHealthState !== "healthy") {
    return { allowed: false, reason: "item_unhealthy" };
  }

  if (params.syncInProgress) {
    return { allowed: false, reason: "sync_in_progress" };
  }

  if (params.nextManualRefreshEligibleAt) {
    const nextEligibleAt = new Date(params.nextManualRefreshEligibleAt);
    if (!Number.isNaN(nextEligibleAt.getTime()) && nextEligibleAt > now) {
      return { allowed: false, reason: "cooldown_active" };
    }
  }

  if (params.lastSuccessfulSyncAt) {
    const lastSyncAt = new Date(params.lastSuccessfulSyncAt);
    if (!Number.isNaN(lastSyncAt.getTime())) {
      const freshnessAge = now.getTime() - lastSyncAt.getTime();
      if (freshnessAge < SIX_HOURS_MS) {
        return { allowed: false, reason: "recent_sync" };
      }
    }
  }

  return { allowed: true, reason: "allowed" };
}

export function shouldKeepPlaidItemBeyondSecondMonth(
  params: PlaidKeepPolicyParams,
): boolean {
  const now = params.now ?? new Date();

  if (params.subscriptionStatus !== "active") {
    return false;
  }

  if (params.itemHealthState !== "healthy") {
    return false;
  }

  if (params.billingKeepReason !== "active_paid_use") {
    return false;
  }

  if (!params.lastFinancialFeatureUsedAt) {
    return false;
  }

  const lastUsedAt = new Date(params.lastFinancialFeatureUsedAt);
  if (Number.isNaN(lastUsedAt.getTime())) {
    return false;
  }

  return now.getTime() - lastUsedAt.getTime() <= THIRTY_DAYS_MS;
}
