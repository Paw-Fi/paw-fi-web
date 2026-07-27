import {
  hasAmbiguousCurrencyEvidenceInOCRText,
  resolveCurrencyFromOCR,
  resolveSingleStrongCurrencyEvidenceFromOCRText,
} from "./ocr-currency-resolver.ts";

export interface WalletTransactionLike {
  currency?: string | null;
  currencyCode?: string | null;
  merchantName?: string | null;
  rawMerchant?: string | null;
  note?: string | null;
  date?: string | null;
  transactionDate?: string | null;
  packageName?: string | null;
  sourcePackage?: string | null;
  accountCurrency?: string | null;
  currencyEvidenceRaw?: string | null;
  currencyEvidenceType?: string | null;
  currencyAmbiguous?: boolean | null;
  isRecurring?: boolean | null;
  recurrenceRule?: {
    frequency?: string | null;
    anchor_date?: string | null;
    end_date?: string | null;
    interval?: number | null;
  } | null;
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

function walletCaptureCurrencyEvidenceText(tx: WalletTransactionLike): string {
  const verifiedEvidence = tx.currencyEvidenceRaw?.trim();
  if (verifiedEvidence) return verifiedEvidence;

  return [
    tx.note,
    tx.rawMerchant,
    tx.merchantName,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join("\n");
}

export function resolveWalletCaptureCurrency(params: {
  tx: WalletTransactionLike;
  preferredCurrency?: string | null;
  accountCurrency?: string | null;
  captureSource?: string | null;
}): string | null {
  const payloadCurrency = resolveWalletTransactionCurrency(params.tx);
  const preferredCurrency = (params.preferredCurrency || "").trim() || null;
  const accountCurrency =
    (params.accountCurrency || params.tx.accountCurrency || "").trim() || null;
  const captureSource = normalizeWalletCaptureSource(params.captureSource);

  if (captureSource !== "android_notification_listener") {
    return payloadCurrency || preferredCurrency;
  }

  const rawOcrText = walletCaptureCurrencyEvidenceText(params.tx);
  const normalizedPayloadCurrency = (payloadCurrency || "").trim();
  const detectedCurrencyCode = /^[A-Za-z]{3}$/.test(normalizedPayloadCurrency)
    ? normalizedPayloadCurrency.toUpperCase()
    : null;
  const detectedCurrencySymbol = detectedCurrencyCode
    ? params.tx.currencyEvidenceRaw || null
    : params.tx.currencyEvidenceRaw || normalizedPayloadCurrency || null;
  const fallbackCurrency = accountCurrency || preferredCurrency ||
    payloadCurrency || "USD";

  return resolveCurrencyFromOCR({
    detectedCurrencyCode,
    detectedCurrencySymbol,
    rawOcrText,
    userPreferredCurrency: fallbackCurrency,
  }).finalCurrencyCode;
}

export function resolveStrongWalletCaptureCurrencyEvidence(
  tx: WalletTransactionLike,
): string | null {
  const rawOcrText = walletCaptureCurrencyEvidenceText(tx);
  return resolveSingleStrongCurrencyEvidenceFromOCRText(rawOcrText);
}

export function hasAmbiguousWalletCaptureCurrencyEvidence(
  tx: WalletTransactionLike,
): boolean {
  const rawOcrText = walletCaptureCurrencyEvidenceText(tx);
  if (resolveSingleStrongCurrencyEvidenceFromOCRText(rawOcrText)) {
    return false;
  }
  if (tx.currencyAmbiguous === true) return true;
  return hasAmbiguousCurrencyEvidenceInOCRText(
    rawOcrText,
    tx.currencyEvidenceRaw,
  );
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

function parseUtcOffsetMinutes(timeZone: string): number | null {
  const normalized = timeZone.trim().toUpperCase();
  if (normalized === "UTC" || normalized === "GMT") {
    return 0;
  }

  const match = /^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(normalized);
  if (!match) return null;

  const [, sign, hoursRaw, minutesRaw] = match;
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? "0");
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    return null;
  }

  const direction = sign === "-" ? -1 : 1;
  return direction * (hours * 60 + minutes);
}

export function getLocalYyyyMmDdInTimeZone(
  timeZone: string | null | undefined,
  date = new Date(),
): string {
  const normalizedTimeZone = (timeZone || "UTC").trim();
  const offsetMinutes = parseUtcOffsetMinutes(normalizedTimeZone);
  if (offsetMinutes !== null) {
    return new Date(date.getTime() + offsetMinutes * 60_000)
      .toISOString()
      .slice(0, 10);
  }

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: normalizedTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = new Map(parts.map((part) => [part.type, part.value]));
    const year = map.get("year");
    const month = map.get("month");
    const day = map.get("day");
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.warn(
      "[save-wallet-transaction] Failed to derive local date from timezone:",
      normalizedTimeZone,
      error,
    );
  }

  return date.toISOString().slice(0, 10);
}

export async function resolveWalletCaptureDefaultAccount(
  supabase: {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  },
  params: {
    userId: string;
    householdId: string | null;
    currency: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase.rpc("resolve_default_account", {
    p_user_id: params.userId,
    p_household_id: params.householdId,
    p_currency: params.currency,
  });
  if (error) {
    throw new Error(
      `DEFAULT_ACCOUNT_RESOLUTION_FAILED:${error.message ?? "unknown error"}`,
    );
  }
  return typeof data === "string" && data ? data : null;
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

  const createdAtMs = createdAt instanceof Date
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

export function normalizeWalletCaptureRecurrenceRule(
  tx: WalletTransactionLike,
  fallbackDate: string,
): Record<string, unknown> | null {
  if (tx.isRecurring !== true || !tx.recurrenceRule) return null;
  const frequency = String(tx.recurrenceRule.frequency ?? "")
    .trim()
    .toLowerCase();
  if (
    !["daily", "weekly", "biweekly", "monthly", "yearly", "custom"].includes(
      frequency,
    )
  ) {
    return null;
  }
  const normalizeDate = (value: string | null | undefined): string | null => {
    const raw = String(value ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : raw;
  };
  const anchorDate = normalizeDate(
    tx.recurrenceRule.anchor_date ?? fallbackDate,
  );
  if (!anchorDate) return null;
  const endDate = normalizeDate(tx.recurrenceRule.end_date);
  const interval = Number(tx.recurrenceRule.interval);
  return {
    frequency,
    anchor_date: anchorDate,
    ...(endDate ? { end_date: endDate } : {}),
    ...(Number.isInteger(interval) && interval > 1 && interval <= 365
      ? { interval }
      : {}),
  };
}
