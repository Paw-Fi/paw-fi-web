export type AiToolValidationResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const INVALID_AMOUNT_ERROR =
  "Invalid amount. Ask the user for a value greater than 0.";

export function normalizeAiToolAmount(
  value: unknown,
): AiToolValidationResult<{ amount: number }> {
  const centsResult = normalizeAiToolMoneyCents(value, "amount", {
    required: true,
    allowZero: false,
    allowNegative: false,
    invalidError: INVALID_AMOUNT_ERROR,
  });
  if (!centsResult.ok) return centsResult;
  return { ok: true, amount: (centsResult.cents ?? 0) / 100 };
}

export function normalizeAiToolMoneyCents(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    allowZero?: boolean;
    allowNegative?: boolean;
    invalidError?: string;
  } = {},
): AiToolValidationResult<{ cents?: number }> {
  const required = options.required === true;
  if (!isProvided(value)) {
    if (!required) return { ok: true, cents: undefined };
    return {
      ok: false,
      error: options.invalidError || `${fieldName} is required.`,
    };
  }

  const amount = parseMoneyAmount(value);
  if (amount == null) {
    return {
      ok: false,
      error:
        options.invalidError || `${fieldName} must be a valid money amount.`,
    };
  }

  const cents = Math.round(amount * 100);
  const allowZero = options.allowZero !== false;
  const allowNegative = options.allowNegative !== false;
  if ((!allowZero && cents === 0) || (!allowNegative && cents < 0)) {
    return {
      ok: false,
      error:
        options.invalidError || `${fieldName} must be a valid money amount.`,
    };
  }

  return { ok: true, cents };
}

export function normalizeRequiredAiToolString(
  value: unknown,
  fieldName: string,
): AiToolValidationResult<{ value: string }> {
  if (typeof value !== "string") {
    return { ok: false, error: `${fieldName} is required.` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: `${fieldName} is required.` };
  }
  return { ok: true, value: trimmed };
}

export function normalizeAiToolTransactionFields(input: {
  amount?: unknown;
  category?: unknown;
  type?: unknown;
}): AiToolValidationResult<{
  amount: number;
  category: string;
  type: "expense" | "income";
}> {
  const amountResult = normalizeAiToolAmount(input.amount);
  if (!amountResult.ok) return amountResult;

  const categoryResult = normalizeRequiredAiToolString(
    input.category,
    "category",
  );
  if (!categoryResult.ok) return categoryResult;

  const typeResult = normalizeAiToolTransactionType(input.type);
  if (!typeResult.ok) return typeResult;

  return {
    ok: true,
    amount: amountResult.amount,
    category: categoryResult.value,
    type: typeResult.type,
  };
}

export function normalizeAiToolTransactionType(
  value: unknown,
): AiToolValidationResult<{ type: "expense" | "income" }> {
  if (!isProvided(value)) return { ok: true, type: "expense" };
  if (typeof value !== "string") {
    return { ok: false, error: "type must be expense or income." };
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "expense" || normalized === "income") {
    return { ok: true, type: normalized };
  }
  return { ok: false, error: "type must be expense or income." };
}

export function normalizeAiToolPercentage(
  value: unknown,
  fieldName: string,
): AiToolValidationResult<{ percentage: number }> {
  if (!isProvided(value)) {
    return { ok: false, error: `${fieldName} is required.` };
  }

  const percentage = parsePercentage(value);
  if (percentage == null) {
    return {
      ok: false,
      error: `${fieldName} must be a valid percentage.`,
    };
  }
  if (percentage < 0 || percentage > 100) {
    return {
      ok: false,
      error: `${fieldName} must be between 0 and 100.`,
    };
  }

  return { ok: true, percentage };
}

export function isProvided(value: unknown): boolean {
  return value != null && (typeof value !== "string" || value.trim() !== "");
}

function parseMoneyAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasGroupingSeparators = trimmed.includes(",");
  const validNumber = hasGroupingSeparators
    ? /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(trimmed)
    : /^[+-]?\d+(?:\.\d+)?$/.test(trimmed);
  if (!validNumber) return null;

  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentage(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/%$/, "").trim();
  if (!trimmed) return null;
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
