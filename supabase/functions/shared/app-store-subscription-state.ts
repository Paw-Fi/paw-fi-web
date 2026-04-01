import {
  Status,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
} from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";

export type AppStoreSubscriptionLifecycleStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled";

export function resolveAppStoreSubscriptionLifecycle(params: {
  transaction: Pick<
    JWSTransactionDecodedPayload,
    | "expiresDate"
    | "offerDiscountType"
    | "offerIdentifier"
    | "offerType"
    | "revocationDate"
  >;
  statusTransaction?: Pick<
    JWSTransactionDecodedPayload,
    "expiresDate" | "offerDiscountType" | "offerIdentifier" | "offerType"
  > | null;
  renewalInfo?: Pick<
    JWSRenewalInfoDecodedPayload,
    "gracePeriodExpiresDate" | "renewalDate"
  > | null;
  subscriptionStatus?: Status | number | null;
  nowMs: number;
}): {
  status: AppStoreSubscriptionLifecycleStatus;
  currentPeriodEnd: string | null;
} {
  const transactionExpiresMs = parseEpochMs(params.transaction.expiresDate);
  const renewalDateMs = parseEpochMs(params.renewalInfo?.renewalDate);
  const gracePeriodExpiresMs = parseEpochMs(
    params.renewalInfo?.gracePeriodExpiresDate,
  );

  const currentPeriodEndMs =
    params.subscriptionStatus === Status.BILLING_GRACE_PERIOD
      ? pickLatestEpochMs([
          gracePeriodExpiresMs,
          renewalDateMs,
          transactionExpiresMs,
        ])
      : pickLatestEpochMs([renewalDateMs, transactionExpiresMs]);

  if (
    params.transaction.revocationDate ||
    params.subscriptionStatus === Status.REVOKED
  ) {
    return {
      status: "canceled",
      currentPeriodEnd: toIsoOrNull(currentPeriodEndMs),
    };
  }

  if (params.subscriptionStatus === Status.BILLING_GRACE_PERIOD) {
    return {
      status: "past_due",
      currentPeriodEnd: toIsoOrNull(currentPeriodEndMs),
    };
  }

  if (
    params.subscriptionStatus === Status.BILLING_RETRY ||
    params.subscriptionStatus === Status.EXPIRED
  ) {
    return {
      status: "canceled",
      currentPeriodEnd: toIsoOrNull(currentPeriodEndMs),
    };
  }

  if (currentPeriodEndMs !== null && currentPeriodEndMs <= params.nowMs) {
    return {
      status: "canceled",
      currentPeriodEnd: toIsoOrNull(currentPeriodEndMs),
    };
  }

  const renewalExtendsBeyondSubmittedTransaction =
    renewalDateMs !== null &&
    (transactionExpiresMs === null || renewalDateMs > transactionExpiresMs);
  const currentEntitlementTransaction =
    params.statusTransaction ??
    (!renewalExtendsBeyondSubmittedTransaction ? params.transaction : null);

  return {
    status:
      currentEntitlementTransaction &&
      isFreeTrialTransaction(currentEntitlementTransaction)
        ? "trialing"
        : "active",
    currentPeriodEnd: toIsoOrNull(currentPeriodEndMs),
  };
}

function parseEpochMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickLatestEpochMs(values: Array<number | null>): number | null {
  const finiteValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (finiteValues.length === 0) return null;

  return finiteValues.reduce((latest, value) =>
    value > latest ? value : latest,
  );
}

function toIsoOrNull(value: number | null): string | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isFreeTrialTransaction(
  transaction: Pick<
    JWSTransactionDecodedPayload,
    "offerDiscountType" | "offerType" | "offerIdentifier"
  >,
): boolean {
  const offerDiscountType =
    typeof transaction.offerDiscountType === "string"
      ? transaction.offerDiscountType.toUpperCase()
      : "";
  const offerIdentifier =
    typeof transaction.offerIdentifier === "string"
      ? transaction.offerIdentifier.toLowerCase()
      : "";
  const offerType = Number(transaction.offerType);

  return (
    offerDiscountType === "FREE_TRIAL" ||
    (offerType === 1 && offerIdentifier.includes("trial"))
  );
}
