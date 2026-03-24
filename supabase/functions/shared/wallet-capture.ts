export interface WalletTransactionLike {
  currency?: string | null;
  currencyCode?: string | null;
  date?: string | null;
  transactionDate?: string | null;
  packageName?: string | null;
  sourcePackage?: string | null;
}

export interface WalletCaptureScopeResolution {
  householdId: string | null;
  requiresHouseholdSplit: boolean;
}

const VALID_CAPTURE_SOURCES = new Set([
  "ios_wallet_shortcut",
  "android_notification_listener",
]);

export const WALLET_CAPTURE_CLAIM_STALE_MS = 10 * 60 * 1000;

function normalizeMerchantForDedup(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeWalletCaptureSource(
  rawValue: string | null | undefined,
): string | null {
  const normalized = (rawValue ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "android_notification") {
    return "android_notification_listener";
  }
  return VALID_CAPTURE_SOURCES.has(normalized) ? normalized : null;
}

export function resolveWalletTransactionCurrency(
  tx: WalletTransactionLike,
): string | null {
  const value = (tx.currency ?? tx.currencyCode ?? "").trim();
  return value || null;
}

export function resolveWalletTransactionDate(
  tx: WalletTransactionLike,
): string | null {
  const value = (tx.date ?? tx.transactionDate ?? "").trim();
  return value || null;
}

export function resolveWalletTransactionPackageName(
  tx: WalletTransactionLike,
): string | null {
  const value = (tx.packageName ?? tx.sourcePackage ?? "").trim();
  return value || null;
}

export function buildWalletCaptureIdempotencyKey(params: {
  explicitKey?: string | null;
  captureSource: string;
  userId: string;
  householdId: string | null;
  isPortfolio: boolean;
  transactionType?: "expense" | "income" | null;
  merchantName: string;
  amountCents: number;
  currency: string;
  date: string;
  cardLabel?: string | null;
  externalSourceId?: string | null;
  packageName?: string | null;
}): string {
  const explicitKey = (params.explicitKey ?? "").trim();
  if (explicitKey) return explicitKey;

  const scopeKey = params.householdId
    ? `${params.householdId}:${params.isPortfolio ? "portfolio" : "household"}`
    : "personal";
  const normalizedTransactionType = params.transactionType === "income"
    ? "income"
    : "expense";
  const normalizedMerchant = normalizeMerchantForDedup(params.merchantName);
  const normalizedCard = (params.cardLabel ?? "").trim().toLowerCase();
  const normalizedPackage = (params.packageName ?? "").trim().toLowerCase();
  const normalizedExternalId = (params.externalSourceId ?? "")
    .trim()
    .toLowerCase();

  return [
    "wallet_capture",
    params.captureSource,
    params.userId,
    scopeKey,
    normalizedTransactionType,
    normalizedMerchant,
    String(params.amountCents),
    params.currency,
    params.date,
    normalizedCard,
    normalizedPackage,
    normalizedExternalId,
  ].join("|");
}

export function isWalletCaptureIdempotencyClaimStale(
  createdAt: string | Date | null | undefined,
  nowMs = Date.now(),
  staleMs = WALLET_CAPTURE_CLAIM_STALE_MS,
): boolean {
  if (!createdAt) return true;

  const createdAtMs =
    createdAt instanceof Date
      ? createdAt.getTime()
      : new Date(createdAt).getTime();

  if (!Number.isFinite(createdAtMs)) return true;
  return nowMs - createdAtMs >= staleMs;
}

export function resolveWalletCaptureScope(params: {
  requestedHouseholdId: string | null;
  isPortfolio: boolean;
  hasMembership: boolean;
  householdMemberCount: number;
}): WalletCaptureScopeResolution {
  if (!params.requestedHouseholdId) {
    return {
      householdId: null,
      requiresHouseholdSplit: false,
    };
  }

  if (!params.hasMembership) {
    throw new Error("UNAUTHORIZED_HOUSEHOLD_SCOPE");
  }

  if (params.isPortfolio) {
    return {
      householdId: params.requestedHouseholdId,
      requiresHouseholdSplit: false,
    };
  }

  if (params.householdMemberCount <= 0) {
    throw new Error("NO_ACTIVE_HOUSEHOLD_MEMBERS");
  }

  return {
    householdId: params.requestedHouseholdId,
    requiresHouseholdSplit: true,
  };
}
