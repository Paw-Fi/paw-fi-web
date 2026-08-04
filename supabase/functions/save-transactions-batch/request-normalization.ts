import { sanitizeCategoryName } from "../shared/category-colors.ts";
import {
  type CategoryContext,
  resolveCategory,
} from "../shared/category-resolution.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";

export type BatchTransactionType = "expense" | "income";

export type NormalizedBatchTransactionInput =
  | {
    ok: true;
    type: BatchTransactionType;
    amount: number;
  }
  | {
    ok: false;
    error: "Invalid or missing type" | "Invalid amount";
  };

export function normalizeBatchTransactionInput(input: {
  type?: unknown;
  amount?: unknown;
}): NormalizedBatchTransactionInput {
  const amount = normalizeAmount(input.amount);
  if (amount == null || amount === 0) {
    return { ok: false, error: "Invalid amount" };
  }

  const explicitType = normalizeExplicitTransactionType(input.type);
  if (explicitType != null) {
    return { ok: true, type: explicitType, amount: Math.abs(amount) };
  }

  if (amount < 0) {
    return { ok: true, type: "expense", amount: Math.abs(amount) };
  }

  return { ok: false, error: "Invalid or missing type" };
}

export function normalizeBatchCategory(value: unknown): {
  category: string;
  usedFallback: boolean;
} {
  const raw = value == null ? "" : String(value);
  const sanitized = sanitizeCategoryName(raw);
  if (sanitized != null) {
    return { category: sanitized, usedFallback: false };
  }

  return {
    category: raw.trim().length === 0 ? "uncategorized" : "other",
    usedFallback: true,
  };
}

export function resolveBatchCategoryForStorage(input: {
  rawCategory: unknown;
  description?: unknown;
  merchant?: unknown;
  transactionType: BatchTransactionType;
  ctx: CategoryContext;
}): {
  category: string;
  usedFallback: boolean;
} {
  const normalizedCategory = normalizeBatchCategory(input.rawCategory);
  const description = resolvePreferenceSourceText({
    transactionType: input.transactionType,
    description: input.description,
    merchant: input.merchant,
  });
  const resolvedCategory = resolveCategory({
    initialGuess: normalizedCategory.category,
    description,
    transactionType: input.transactionType,
    ctx: input.ctx,
  });

  if (
    !normalizedCategory.usedFallback &&
    !isGenericBatchCategory(normalizedCategory.category) &&
    isGenericBatchCategory(resolvedCategory)
  ) {
    return {
      category: normalizedCategory.category,
      usedFallback: false,
    };
  }

  return {
    category: resolvedCategory,
    usedFallback: normalizedCategory.usedFallback,
  };
}

export function normalizeBatchDateInput(input: {
  value: unknown;
  manualImportMode?: boolean;
  referenceYear?: number;
}): string | null {
  if (typeof input.value !== "string") {
    return normalizeCalendarDateString(input.value);
  }

  const recovered = recoverZeroPaddedTwoDigitYearDate(
    input.value,
    input.referenceYear,
  );
  if (recovered != null) {
    return normalizeCalendarDateString(recovered);
  }
  if (/^\d{2}[/-]\d{2}[/-]\d{2}$/.test(input.value.trim())) {
    return null;
  }
  return normalizeCalendarDateString(input.value);
}

function normalizeExplicitTransactionType(
  value: unknown,
): BatchTransactionType | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "expense" || normalized === "income") {
    return normalized;
  }

  return null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function resolvePreferenceSourceText(input: {
  transactionType: BatchTransactionType;
  description?: unknown;
  merchant?: unknown;
}): string | null {
  const description = normalizeOptionalText(input.description);
  const merchant = normalizeOptionalText(input.merchant);
  return input.transactionType === "income"
    ? (merchant ?? description)
    : (description ?? merchant);
}

function isGenericBatchCategory(category: string): boolean {
  const normalized = category.trim().toLowerCase();
  return normalized === "other" || normalized === "uncategorized";
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function recoverZeroPaddedTwoDigitYearDate(
  value: string,
  referenceYear?: number,
): string | null {
  const match = /^00(\d{2})-(\d{2})-(\d{2})(?:[Tt\s].*)?$/.exec(value.trim());
  if (!match) return null;

  const year = expandTwoDigitYear(Number(match[1]), referenceYear);
  return `${year}-${match[2]}-${match[3]}`;
}

function expandTwoDigitYear(year: number, referenceYear?: number): number {
  const safeReferenceYear = Number.isInteger(referenceYear) &&
      referenceYear != null &&
      referenceYear >= 1900 &&
      referenceYear <= 9999
    ? referenceYear
    : new Date().getUTCFullYear();
  const century = Math.floor(safeReferenceYear / 100) * 100;
  let expanded = century + year;

  if (expanded > safeReferenceYear + 20) {
    expanded -= 100;
  } else if (expanded < safeReferenceYear - 80) {
    expanded += 100;
  }

  return expanded;
}
