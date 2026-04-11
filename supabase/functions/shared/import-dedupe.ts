export interface ImportSemanticKeyInput {
  userId?: string | null;
  householdId?: string | null;
  accountId?: string | null;
  type?: string | null;
  amountCents: number;
  currency?: string | null;
  date: string | Date;
  category?: string | null;
  description?: string | null;
}

export function normalizeImportDedupeText(value?: string | null): string {
  if (!value) return "";
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return cleaned.length <= 80 ? cleaned : cleaned.slice(0, 80);
}

function normalizeImportType(value?: string | null): string {
  return value?.trim().toLowerCase() === "income" ? "income" : "expense";
}

function normalizeImportCurrency(value?: string | null): string {
  return value?.trim().toUpperCase() ?? "";
}

function normalizeImportDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
}

export function buildImportSemanticKey(input: ImportSemanticKeyInput): string {
  return [
    "v1",
    input.userId?.trim() ?? "",
    input.householdId?.trim() ?? "",
    input.accountId?.trim() ?? "",
    normalizeImportType(input.type),
    normalizeImportDate(input.date),
    Math.max(0, Math.trunc(input.amountCents)).toString(),
    normalizeImportCurrency(input.currency),
    normalizeImportDedupeText(input.category),
    normalizeImportDedupeText(input.description),
  ].join("|");
}

export function buildImportRequestKey(
  debugTraceId?: string | null,
  index?: number,
): string | null {
  const traceId = debugTraceId?.trim();
  if (!traceId) return null;
  if (index == null || !Number.isFinite(index) || index < 0) return null;
  return `${traceId}:${Math.trunc(index)}`;
}
