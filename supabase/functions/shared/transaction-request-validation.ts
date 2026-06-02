const ISO_TIMESTAMP_WITH_ZONE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

const EXPENSE_RECEIPT_PUBLIC_PATH_PREFIX =
  "/storage/v1/object/public/expense-receipts/receipts/";

export interface ReceiptImageUrlValidationResult {
  ok: boolean;
  value: string | null;
  error?: string;
}

export function normalizeIsoTimestampWithZone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!ISO_TIMESTAMP_WITH_ZONE_REGEX.test(trimmed)) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizeClientCreatedAt(value: unknown): string | null {
  if (value === undefined || value === null) return new Date().toISOString();
  return normalizeIsoTimestampWithZone(value);
}

export function normalizeReceiptImageUrl(
  value: unknown,
  supabaseUrl: string,
  fieldName: string,
): ReceiptImageUrlValidationResult {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, value: null, error: `${fieldName} must be a string` };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };

  if (trimmed.length > 2048) {
    return {
      ok: false,
      value: null,
      error: `${fieldName} must be less than 2048 characters`,
    };
  }

  if (!isReceiptStoragePublicUrl(trimmed, supabaseUrl)) {
    return {
      ok: false,
      value: null,
      error: `${fieldName} must be an expense receipt storage URL`,
    };
  }

  return { ok: true, value: trimmed };
}

function isReceiptStoragePublicUrl(
  value: string,
  supabaseUrl: string,
): boolean {
  try {
    const url = new URL(value);
    const expectedOrigin = new URL(supabaseUrl).origin;
    return (
      url.origin === expectedOrigin &&
      url.pathname.startsWith(EXPENSE_RECEIPT_PUBLIC_PATH_PREFIX)
    );
  } catch (_) {
    return false;
  }
}
