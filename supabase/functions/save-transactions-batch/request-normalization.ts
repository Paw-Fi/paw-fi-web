import { sanitizeCategoryName } from "../shared/category-colors.ts";

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
